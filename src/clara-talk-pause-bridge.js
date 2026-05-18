const PAUSE_KEY = "clara_talk_to_clara_pause_v1";
const MEMORY_KEY = "clara_behavioral_memory_v1";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const wait = (ms = 160) => new Promise((resolve) => window.setTimeout(resolve, ms));

const MEMORY_FLOW = [
  ["Stable monthly", "Every cutoff", "Changing", "Extra work", "Project-based"],
  ["Every 10 and 25", "15 and 30", "Weekly", "End of month", "Irregular cutoff"],
  ["Alone", "With family", "With partner", "Renting", "Shared place"],
];

const MEMORY_KEYS = [
  "incomePattern",
  "incomePattern.cutoffDates",
  "livingSituation",
];

function getOverlay() {
  return document.querySelector("[data-clara-ai-brain-version]");
}

function getLastQuestion(root) {
  return String(root?.innerText || "")
    .split("\n")
    .map(clean)
    .filter((line) => line.endsWith("?"))
    .at(-1) || "Talk to CLARA setup";
}

function getUserAnswers(root) {
  return Array.from(root?.querySelectorAll("main div") || [])
    .filter((node) => {
      const className = String(node.className || "");
      const text = clean(node.innerText || node.textContent || "");
      return text && className.includes("bg-emerald-300") && className.includes("text-slate-950");
    })
    .map((node) => clean(node.innerText || node.textContent || ""))
    .filter(Boolean);
}

function isTalkFlowOpen(root) {
  const text = String(root?.innerText || "");
  return /Would you like me to explain it in English or Tagalog|How does your income usually come in|Is anyone depending on your money or care right now/i.test(text);
}

function readPause() {
  try {
    return JSON.parse(localStorage.getItem(PAUSE_KEY) || "null");
  } catch {
    return null;
  }
}

function readMemory() {
  try {
    return { version: 2, updatedAt: "", items: {}, ...JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}") };
  } catch {
    return { version: 2, updatedAt: "", items: {} };
  }
}

function saveCoreMemory(answers = []) {
  const current = readMemory();
  const items = { ...(current.items || {}) };
  const now = new Date().toISOString();
  let saved = 0;

  MEMORY_FLOW.forEach((choices, index) => {
    const answer = answers.find((item) => choices.includes(item));
    const key = MEMORY_KEYS[index];
    if (!answer || !key) return;

    items[key] = {
      ...(items[key] || {}),
      key,
      label: key,
      value: answer,
      layer: 1,
      source: "talk-to-clara-guided-flow",
      updatedAt: now,
    };

    saved += 1;
  });

  if (saved > 0) {
    const payload = {
      version: 2,
      updatedAt: now,
      items,
    };

    localStorage.setItem(MEMORY_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: payload }));
  }

  return saved;
}

function savePause(root) {
  const userAnswers = getUserAnswers(root);
  const payload = {
    savedAt: new Date().toISOString(),
    lastQuestion: getLastQuestion(root),
    userAnswers,
    memorySavedCount: saveCoreMemory(userAnswers),
    visibleText: String(root?.innerText || "").slice(-3000),
  };

  localStorage.setItem(PAUSE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("clara-talk-pause-updated", { detail: payload }));
}

function clearPause() {
  localStorage.removeItem(PAUSE_KEY);
  window.dispatchEvent(new CustomEvent("clara-talk-pause-updated"));
}

function findChoiceButton(root, label) {
  return Array.from(root.querySelectorAll("button")).find((button) => clean(button.innerText || button.textContent) === label);
}

function findAllChoiceButtons(root, label) {
  return Array.from(root.querySelectorAll("button")).filter((button) => clean(button.innerText || button.textContent) === label);
}

function findSendButton(root) {
  return Array.from(root.querySelectorAll("button")).find((button) => /send to clara/i.test(button.getAttribute("aria-label") || ""));
}

async function playAnswer(root, answer) {
  const value = clean(answer);
  if (!value) return;
  await wait(180);

  const choice = findChoiceButton(root, value);
  if (choice && !choice.disabled) {
    choice.click();
    return;
  }

  const input = root.querySelector("input");
  const send = findSendButton(root);
  if (!input || !send || send.disabled) return;

  input.focus?.();
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(80);
  send.click();
}

async function continuePause(root, card) {
  const saved = readPause();
  const answers = Array.isArray(saved?.userAnswers) ? saved.userAnswers : [];
  const button = card.querySelector("[data-clara-resume-pause]");

  if (button) {
    button.disabled = true;
    button.textContent = "Continuing...";
  }

  for (const answer of answers) {
    await playAnswer(root, answer);
  }

  clearPause();
  card.remove();
}

function closeOverlay(root) {
  const close = Array.from(root.querySelectorAll("button")).find((item) => /close/i.test(item.getAttribute("aria-label") || ""));
  if (close) close.click();
}

function addButtonBesideNone(root, noneButton) {
  const holder = noneButton?.parentElement;
  if (!noneButton || !holder) return;
  if (holder.querySelector("[data-clara-continue-later]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.claraContinueLater = "true";
  button.textContent = "Continue later";
  button.className = noneButton.className;
  button.style.background = "rgba(255,255,255,.08)";
  button.style.borderColor = "rgba(255,255,255,.22)";
  button.style.color = "rgba(255,255,255,.86)";
  button.onclick = () => {
    savePause(root);
    closeOverlay(root);
  };
  holder.appendChild(button);
}

function addContinueLater() {
  const root = getOverlay();
  if (!root || !/None of these/i.test(root.innerText || "")) return;

  const noneButtons = findAllChoiceButtons(root, "None of these");
  noneButtons.forEach((noneButton) => addButtonBesideNone(root, noneButton));
}

function addResumeNotice() {
  const root = getOverlay();
  if (!root || root.querySelector("[data-clara-resume-notice]")) return;
  if (!isTalkFlowOpen(root)) return;

  const saved = readPause();
  if (!saved) return;

  const holder = root.querySelector("main > div");
  if (!holder) return;

  const card = document.createElement("div");
  card.dataset.claraResumeNotice = "true";
  card.style.cssText = "margin:12px 0;border:1px solid rgba(110,231,183,.18);background:rgba(110,231,183,.10);border-radius:22px;padding:12px;color:white;";

  const title = document.createElement("div");
  title.textContent = "Paused Talk to CLARA";
  title.style.cssText = "font-size:11px;font-weight:900;letter-spacing:.16em;color:rgba(167,243,208,.78);text-transform:uppercase;";

  const body = document.createElement("div");
  body.textContent = `You paused at: ${clean(saved.lastQuestion || "your setup")}`;
  body.style.cssText = "font-size:13px;line-height:1.55;color:rgba(226,232,240,.88);margin-top:6px;";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;";

  const resume = document.createElement("button");
  resume.type = "button";
  resume.dataset.claraResumePause = "true";
  resume.textContent = "Continue";
  resume.style.cssText = "border:1px solid rgba(110,231,183,.28);background:rgba(110,231,183,.16);color:white;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900;";
  resume.onclick = () => continuePause(root, card);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset";
  reset.style.cssText = "border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900;";
  reset.onclick = () => {
    clearPause();
    card.remove();
  };

  actions.appendChild(resume);
  actions.appendChild(reset);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(actions);
  holder.appendChild(card);
}

function run() {
  addContinueLater();
  addResumeNotice();
}

if (typeof window !== "undefined" && !window.__claraTalkPauseBridgeInstalled) {
  window.__claraTalkPauseBridgeInstalled = true;
  window.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (root) {
      new MutationObserver(() => setTimeout(run, 80)).observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    run();
  });
}
