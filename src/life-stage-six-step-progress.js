const LIFE_STAGE_MODAL_SELECTOR =
  "#root div[class*='fixed'][class*='inset-y-0'][class*='left-1/2'][class*='z-[9999]']";

const STAGE_NAMES = [
  "Working Student",
  "Young Professional",
  "Living with Partner",
  "Family Household",
  "Single Parent",
  "Full-Time Earner",
  "Freelance Season",
  "Business Builder",
];

const STEP_BY_LABEL = {
  "CURRENT SETUP": 0,
  "MONEY RHYTHM": 1,
  "WEEKLY LOAD": 2,
  "PRESSURE RIGHT NOW": 3,
  "WHEN PRESSURE HITS": 4,
  "PRESSURE RESPONSE": 4,
  "WHAT TO PROTECT": 5,
  "PROTECTION GOAL": 5,
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

function getLifeStageModal() {
  if (typeof document === "undefined") return null;
  return document.querySelector(LIFE_STAGE_MODAL_SELECTOR);
}

function getHeader(modal) {
  const marker = Array.from(modal?.querySelectorAll("p") || []).find(
    (node) => loud(node.textContent) === "CLARA CONTEXT BOARD"
  );
  return marker?.closest("header") || modal?.querySelector("header") || null;
}

function isStagePicker(modal) {
  const buttons = Array.from(modal?.querySelectorAll("main button") || []);
  const labels = buttons.map((button) => clean(button.innerText || button.textContent));
  return STAGE_NAMES.some((stage) => labels.includes(stage));
}

function getActiveStepIndex(modal) {
  const labels = Array.from(modal?.querySelectorAll("section p") || []);
  for (const label of labels) {
    const index = STEP_BY_LABEL[loud(label.textContent)];
    const section = label.closest("section");
    if (Number.isInteger(index) && section?.querySelector("button")) return index;
  }
  return null;
}

function getProgressWrap(header) {
  return Array.from(header?.querySelectorAll("div") || []).find((group) => {
    const bars = Array.from(group.children || []).filter((node) => node.dataset.claraMovingTile !== "true");
    return bars.length >= 5 && bars.every((bar) => String(bar.className || "").includes("rounded-full"));
  });
}

function ensureSixBaseTiles(progressWrap) {
  let bars = Array.from(progressWrap.children || []).filter((node) => node.dataset.claraMovingTile !== "true");
  if (!bars.length) return [];

  while (bars.length < 6) {
    const clone = bars[bars.length - 1].cloneNode(false);
    clone.removeAttribute("data-clara-moving-tile");
    progressWrap.insertBefore(clone, progressWrap.querySelector("[data-clara-moving-tile='true']") || null);
    bars = Array.from(progressWrap.children || []).filter((node) => node.dataset.claraMovingTile !== "true");
  }

  return bars.slice(0, 6);
}

function getMovingTile(progressWrap) {
  let tile = progressWrap.querySelector("[data-clara-moving-tile='true']");
  if (!tile) {
    tile = document.createElement("span");
    tile.dataset.claraMovingTile = "true";
    tile.setAttribute("aria-hidden", "true");
    progressWrap.appendChild(tile);
  }
  return tile;
}

function applySixStepProgress() {
  const modal = getLifeStageModal();
  if (!modal) return;

  const header = getHeader(modal);
  const progressWrap = getProgressWrap(header);
  if (!header || !progressWrap) return;

  if (isStagePicker(modal)) {
    progressWrap.style.setProperty("display", "none", "important");
    return;
  }

  progressWrap.style.removeProperty("display");

  const activeIndex = getActiveStepIndex(modal);
  if (!Number.isInteger(activeIndex)) return;

  const bars = ensureSixBaseTiles(progressWrap);
  if (bars.length < 6) return;

  progressWrap.style.setProperty("position", "relative", "important");
  progressWrap.style.setProperty("display", "flex", "important");
  progressWrap.style.setProperty("align-items", "center", "important");
  progressWrap.style.setProperty("gap", "0.55rem", "important");
  progressWrap.style.setProperty("overflow", "visible", "important");

  bars.forEach((bar) => {
    bar.style.setProperty("width", "1.85rem", "important");
    bar.style.setProperty("height", "0.25rem", "important");
    bar.style.setProperty("border-radius", "9999px", "important");
    bar.style.setProperty("background", "rgba(255, 255, 255, 0.12)", "important");
    bar.style.setProperty("opacity", "0.72", "important");
    bar.style.setProperty("box-shadow", "none", "important");
  });

  const movingTile = getMovingTile(progressWrap);
  const target = bars[Math.min(activeIndex, 5)];

  movingTile.style.setProperty("position", "absolute", "important");
  movingTile.style.setProperty("top", "50%", "important");
  movingTile.style.setProperty("left", "0", "important");
  movingTile.style.setProperty("height", "0.25rem", "important");
  movingTile.style.setProperty("border-radius", "9999px", "important");
  movingTile.style.setProperty("background", "rgb(165 243 252)", "important");
  movingTile.style.setProperty("box-shadow", "0 0 18px rgba(125, 211, 252, 0.42)", "important");
  movingTile.style.setProperty("z-index", "5", "important");
  movingTile.style.setProperty("pointer-events", "none", "important");
  movingTile.style.setProperty("transition", "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1)", "important");

  window.requestAnimationFrame(() => {
    const wrapRect = progressWrap.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const width = Math.max(targetRect.width + 10, 34);
    const x = targetRect.left - wrapRect.left - 5;
    movingTile.style.setProperty("width", `${width}px`, "important");
    movingTile.style.setProperty("transform", `translate3d(${x}px, -50%, 0)`, "important");
  });
}

function installSixStepProgress() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraSixStepProgressInstalled) return;
  window.__claraSixStepProgressInstalled = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduled = false;
        applySixStepProgress();
      });
    });
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  document.addEventListener("click", schedule, true);
}

try {
  installSixStepProgress();
} catch (error) {
  console.warn("CLARA six-step progress failed:", error);
}
