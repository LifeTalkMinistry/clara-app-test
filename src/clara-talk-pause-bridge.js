const PAUSE_KEY = "clara_talk_to_clara_pause_v1";
const MEMORY_KEY = "clara_behavioral_memory_v1";

const QUESTION_MEMORY_MAP = [
  ["How does your income usually come in?", "incomePattern", 1],
  ["What exact cutoff dates do you usually receive income?", "incomePattern.cutoffDates", 1],
  ["What part of the month does your income usually arrive?", "incomePattern.monthlyDate", 1],
  ["How predictable is that income for planning?", "incomePattern.predictability", 1],
  ["What is your living situation right now?", "livingSituation", 1],
  ["Who or what are you financially responsible for right now?", "responsibilities", 1],
  ["What best describes your work or daily role?", "workType", 1],
  ["Does your relationship situation affect your emotions or spending lately?", "relationshipStatus", 1],
  ["Is anyone depending on your money or care right now?", "dependents", 1],
  ["What money pressure do you feel the most right now?", "currentFinancialPressure", 1],
  ["How heavy does that money pressure feel right now?", "survivalPressureLevel", 1],
  ["What is your main financial goal right now?", "mainFinancialGoal", 1],
  ["How have you been feeling lately around money decisions?", "emotionalStateTrend", 1],
];

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

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

function labelFor(key = "") {
  return String(key)
    .split(".")
    .map((part) => part.replace(/([A-Z])/g, " $1"))
    .join(" — ")
    .replace(/^\w/, (letter) => letter.toUpperCase())
    .trim();
}

function readMemory() {
  try {
    return { version: 2, updatedAt: "", items: {}, ...JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}") };
  } catch {
    return { version: 2, updatedAt: "", items: {} };
  }
}

function writeMemoryItem(key, value, layer) {
  const nextValue = clean(value);
  if (!key || !nextValue) return false;

  if (window.CLARA_BEHAVIORAL_MEMORY?.updateItem) {
    window.CLARA_BEHAVIORAL_MEMORY.updateItem(key, {
      label: labelFor(key),
      value: nextValue,
      layer,
      source: "talk-to-clara-pause",
    });
    return true;
  }

  const current = readMemory();
  const previous = current.items?.[key] || {};
  const now = new Date().toISOString();
  const next = {
    version: 2,
    updatedAt: now,
    items: {
      ...(current.items || {}),
      [key]: {
        key,
        label: previous.label || labelFor(key),
        value: nextValue,
        layer: Number(layer || previous.layer || 2),
        weight: Math.min(10, Number(previous.weight || 0) + 2),
        pinned: Boolean(previous.pinned),
        source: "talk-to-clara-pause",
        createdAt: previous.createdAt || now,
        updatedAt: now,
      },
    },
  };

  localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: next }));
  return true;
}

function getMessageBubbles(root) {
  return Array.from(root?.querySelectorAll("main div") || [])
    .filter((node) => {
      const className = String(node.className || "");
      const text = clean(node.innerText || node.textContent || "");
      return text && className.includes("rounded-[24px]") && className.includes("py-3.5");
    })
    .map((node) => {
      const className = String(node.className || "");
      return {
        role: className.includes("bg-emerald-300") && className.includes("text-slate-950") ? "user" : "clara",
        text: clean(node.innerText || node.textContent || ""),
      };
    })
    .filter((message, index, list) => index === 0 || message.text !== list[index - 1].text || message.role !== list[index - 1].role);
}

function findMemoryQuestion(messageText = "") {
  return QUESTION_MEMORY_MAP.find(([question]) => String(messageText || "").includes(question)) || null;
}

function nextUserAnswer(messages, startIndex) {
  for (let index = startIndex + 1; index < messages.length; index += 1) {
    if (messages[index]?.role === "user") return messages[index].text;
    if (messages[index]?.role === "clara" && findMemoryQuestion(messages[index].text)) return "";
  }
  return "";
}

function captureGuidedProfileMemory(root) {
  const messages = getMessageBubbles(root);
  const savedKeys = new Set();

  messages.forEach((message, index) => {
    if (message.role !== "clara") return;
    const match = findMemoryQuestion(message.text);
    if (!match) return;

    const [, key, layer] = match;
    const answer = nextUserAnswer(messages, index);
    if (writeMemoryItem(key, answer, layer)) savedKeys.add(key);
  });

  return savedKeys.size;
}

function savePause(root) {
  const profileSavedCount = captureGuidedProfileMemory(root);
  const payload = {
    savedAt: new Date().toISOString(),
    lastQuestion: getLastQuestion(root),
    visibleText: String(root?.innerText || "").slice(-3000),
    profileSavedCount,
  };

  localStorage.setItem(PAUSE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("clara-talk-pause-updated", { detail: payload }));
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: readMemory() }));
  return profileSavedCount;
}

function findChoiceButton(root, label) {
  return Array.from(root.querySelectorAll("button")).find((button) => clean(button.innerText || button.textContent) === label);
}

function findAllChoiceButtons(root, label) {
  return Array.from(root.querySelectorAll("button")).filter((button) => clean(button.innerText || button.textContent) === label);
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
  const saved = localStorage.getItem(PAUSE_KEY);
  const talkButton = findChoiceButton(root, "Talk to CLARA");
  const holder = talkButton?.closest("div")?.parentElement;
  if (!saved || !holder) return;

  let parsed = {};
  try { parsed = JSON.parse(saved); } catch {}

  const count = Number(parsed.profileSavedCount || 0);
  const savedLine = count > 0 ? `<div style="font-size:12px;line-height:1.55;color:rgba(167,243,208,.88);margin-top:6px;">Saved ${count} memory point${count === 1 ? "" : "s"} to Me.</div>` : "";
  const card = document.createElement("div");
  card.dataset.claraResumeNotice = "true";
  card.style.cssText = "margin-top:12px;border:1px solid rgba(110,231,183,.18);background:rgba(110,231,183,.10);border-radius:22px;padding:12px;color:white;";
  card.innerHTML = `<div style="font-size:11px;font-weight:900;letter-spacing:.16em;color:rgba(167,243,208,.78);text-transform:uppercase;">Paused Talk to CLARA</div><div style="font-size:13px;line-height:1.55;color:rgba(226,232,240,.88);margin-top:6px;">You paused at: ${clean(parsed.lastQuestion || "your setup")}</div>${savedLine}<button type="button" data-clear-pause style="margin-top:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900;">Start over</button>`;
  card.querySelector("[data-clear-pause]").onclick = () => {
    localStorage.removeItem(PAUSE_KEY);
    card.remove();
  };
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
    if (root) new MutationObserver(() => setTimeout(run, 80)).observe(root, { childList: true, subtree: true, characterData: true });
    run();
  });
}
