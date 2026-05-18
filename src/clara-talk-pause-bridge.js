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

function savePause(root) {
  const payload = {
    savedAt: new Date().toISOString(),
    lastQuestion: getLastQuestion(root),
    userAnswers: getUserAnswers(root),
    visibleText: String(root?.innerText || "").slice(-3000),
  };

  localStorage.setItem(PAUSE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("clara-talk-pause-updated", { detail: payload }));
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

if (typeof window !== "undefined" && !window.__claraTalkPauseBridgeInstalled) {
  window.__claraTalkPauseBridgeInstalled = true;
  window.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (root) {
      new MutationObserver(() => setTimeout(addContinueLater, 80)).observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    addContinueLater();
  });
}
