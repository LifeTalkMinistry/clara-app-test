const LIFE_STAGE_MODAL_SELECTOR =
  "#root div[class*='fixed'][class*='inset-y-0'][class*='left-1/2'][class*='z-[9999]']";

const STEP_INDEX = {
  "CURRENT SETUP": 0,
  "MONEY RHYTHM": 1,
  "WEEKLY LOAD": 2,
  "PRESSURE RIGHT NOW": 3,
  "WHEN PRESSURE HITS": 4,
  "PRESSURE RESPONSE": 4,
  "WHAT TO PROTECT": 5,
  "PROTECTION GOAL": 5,
};

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

const progressState = {
  index: null,
  x: null,
  width: null,
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

function getModal() {
  if (typeof document === "undefined") return null;
  return document.querySelector(LIFE_STAGE_MODAL_SELECTOR);
}

function isStagePicker(modal) {
  const labels = Array.from(modal?.querySelectorAll("main button") || []).map((button) =>
    clean(button.innerText || button.textContent)
  );
  return STAGE_NAMES.some((stage) => labels.includes(stage));
}

function getHeader(modal) {
  const marker = Array.from(modal?.querySelectorAll("p") || []).find(
    (node) => loud(node.textContent) === "CLARA CONTEXT BOARD"
  );
  return marker?.closest("header") || modal?.querySelector("header") || null;
}

function getProgressGroup(header) {
  return Array.from(header?.querySelectorAll("div") || []).find((group) => {
    const bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
    return bars.length >= 5 && bars.every((bar) => String(bar.className || "").includes("rounded-full"));
  });
}

function getActiveIndex(modal) {
  const labels = Array.from(modal?.querySelectorAll("section p") || []);
  for (const label of labels) {
    const index = STEP_INDEX[loud(label.textContent)];
    const section = label.closest("section");
    if (Number.isInteger(index) && section?.querySelector("button")) return index;
  }
  return null;
}

function getBars(group) {
  let bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  if (!bars.length) return [];

  while (bars.length < 6) {
    const clone = bars[bars.length - 1].cloneNode(false);
    group.insertBefore(clone, group.querySelector("[data-clara-moving-tile='true']") || null);
    bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  }

  return bars.slice(0, 6);
}

function getPill(group) {
  let pill = group.querySelector("[data-clara-moving-tile='true']");
  if (!pill) {
    pill = document.createElement("span");
    pill.dataset.claraMovingTile = "true";
    pill.setAttribute("aria-hidden", "true");
    group.appendChild(pill);
  }
  return pill;
}

function styleTrack(group, bars) {
  group.style.setProperty("display", "flex", "important");
  group.style.setProperty("position", "relative", "important");
  group.style.setProperty("align-items", "center", "important");
  group.style.setProperty("gap", "0.5rem", "important");
  group.style.setProperty("overflow", "visible", "important");

  bars.forEach((bar) => {
    bar.style.setProperty("width", "1.75rem", "important");
    bar.style.setProperty("height", "0.25rem", "important");
    bar.style.setProperty("border-radius", "9999px", "important");
    bar.style.setProperty("background", "rgba(255, 255, 255, 0.12)", "important");
    bar.style.setProperty("opacity", "0.72", "important");
    bar.style.setProperty("box-shadow", "none", "important");
  });
}

function stylePill(pill) {
  pill.style.setProperty("position", "absolute", "important");
  pill.style.setProperty("top", "50%", "important");
  pill.style.setProperty("left", "0", "important");
  pill.style.setProperty("height", "0.25rem", "important");
  pill.style.setProperty("border-radius", "9999px", "important");
  pill.style.setProperty("background", "rgb(165 243 252)", "important");
  pill.style.setProperty("box-shadow", "0 0 18px rgba(125, 211, 252, 0.42)", "important");
  pill.style.setProperty("z-index", "999", "important");
  pill.style.setProperty("pointer-events", "none", "important");
  pill.style.setProperty("will-change", "transform, width", "important");
}

function getTargetPosition(group, target) {
  const groupRect = group.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return {
    x: targetRect.left - groupRect.left - 5,
    width: Math.max(targetRect.width + 10, 32),
  };
}

function movePill(pill, next, shouldAnimate) {
  if (!shouldAnimate) {
    pill.style.setProperty("transition", "none", "important");
    pill.style.setProperty("width", `${next.width}px`, "important");
    pill.style.setProperty("transform", `translate3d(${next.x}px, -50%, 0)`, "important");
    return;
  }

  pill.style.setProperty("transition", "none", "important");
  pill.style.setProperty("width", `${progressState.width}px`, "important");
  pill.style.setProperty("transform", `translate3d(${progressState.x}px, -50%, 0)`, "important");

  // Force the browser to paint the previous position first, so the next transform visibly glides.
  void pill.offsetWidth;

  window.requestAnimationFrame(() => {
    pill.style.setProperty(
      "transition",
      "transform 520ms cubic-bezier(0.16, 1, 0.3, 1), width 520ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 520ms ease",
      "important"
    );
    pill.style.setProperty("width", `${next.width}px`, "important");
    pill.style.setProperty("transform", `translate3d(${next.x}px, -50%, 0)`, "important");
  });
}

function applyFinalTileFix() {
  const modal = getModal();
  if (!modal) return;

  const header = getHeader(modal);
  const group = getProgressGroup(header);
  if (!group) return;

  if (isStagePicker(modal)) {
    group.style.setProperty("display", "none", "important");
    return;
  }

  const activeIndex = getActiveIndex(modal);
  if (!Number.isInteger(activeIndex)) return;

  const bars = getBars(group);
  if (bars.length < 6) return;

  styleTrack(group, bars);

  const pill = getPill(group);
  const target = bars[Math.min(activeIndex, 5)];
  stylePill(pill);

  window.requestAnimationFrame(() => {
    const next = getTargetPosition(group, target);
    const previousExists = Number.isFinite(progressState.x) && Number.isFinite(progressState.width);
    const indexChanged = progressState.index !== null && progressState.index !== activeIndex;

    movePill(pill, next, previousExists && indexChanged);

    progressState.index = activeIndex;
    progressState.x = next.x;
    progressState.width = next.width;
  });
}

function installFinalTileFix() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraFinalTileFixInstalled) return;
  window.__claraFinalTileFixInstalled = true;

  let timer = null;
  const schedule = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        applyFinalTileFix();
        window.clearTimeout(timer);
        timer = window.setTimeout(applyFinalTileFix, 120);
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
  installFinalTileFix();
} catch (error) {
  console.warn("CLARA final progress tile fix failed:", error);
}
