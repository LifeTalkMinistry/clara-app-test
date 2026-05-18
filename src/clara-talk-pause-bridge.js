const PAUSE_KEY = "clara_talk_to_clara_pause_v1";

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

function savePause(root) {
  localStorage.setItem(PAUSE_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    lastQuestion: getLastQuestion(root),
    visibleText: String(root?.innerText || "").slice(-3000)
  }));
  window.dispatchEvent(new CustomEvent("clara-talk-pause-updated"));
}

function findChoiceButton(root, label) {
  return Array.from(root.querySelectorAll("button")).find((button) => clean(button.innerText || button.textContent) === label);
}

function addContinueLater() {
  const root = getOverlay();
  if (!root || root.querySelector("[data-clara-continue-later]")) return;
  if (!/None of these/i.test(root.innerText || "")) return;

  const noneButton = findChoiceButton(root, "None of these");
  const holder = noneButton?.parentElement;
  if (!noneButton || !holder) return;

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
    const close = Array.from(root.querySelectorAll("button")).find((item) => /close/i.test(item.getAttribute("aria-label") || ""));
    if (close) close.click();
  };
  holder.appendChild(button);
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

  const card = document.createElement("div");
  card.dataset.claraResumeNotice = "true";
  card.style.cssText = "margin-top:12px;border:1px solid rgba(110,231,183,.18);background:rgba(110,231,183,.10);border-radius:22px;padding:12px;color:white;";
  card.innerHTML = `<div style="font-size:11px;font-weight:900;letter-spacing:.16em;color:rgba(167,243,208,.78);text-transform:uppercase;">Paused Talk to CLARA</div><div style="font-size:13px;line-height:1.55;color:rgba(226,232,240,.88);margin-top:6px;">You paused at: ${clean(parsed.lastQuestion || "your setup")}</div><button type="button" data-clear-pause style="margin-top:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:white;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900;">Start over</button>`;
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
