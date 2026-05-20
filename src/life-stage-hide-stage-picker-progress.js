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

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

function getLifeStageModal() {
  if (typeof document === "undefined") return null;
  return document.querySelector(LIFE_STAGE_MODAL_SELECTOR);
}

function getHeader(modal) {
  const marker = Array.from(modal?.querySelectorAll("p") || []).find(
    (node) => clean(node.textContent).toUpperCase() === "CLARA CONTEXT BOARD"
  );
  return marker?.closest("header") || modal?.querySelector("header") || null;
}

function getProgressWrap(header) {
  return Array.from(header?.children || []).find((child) => {
    const bars = Array.from(child.children || []).filter((node) => node.dataset.claraMovingTile !== "true");
    return bars.length >= 3 && bars.every((bar) => String(bar.className || "").includes("rounded-full"));
  });
}

function isStagePicker(modal) {
  const buttons = Array.from(modal?.querySelectorAll("main button") || []);
  const labels = buttons.map((button) => clean(button.innerText || button.textContent));
  return STAGE_NAMES.some((stage) => labels.includes(stage));
}

function applyStagePickerProgressVisibility() {
  const modal = getLifeStageModal();
  if (!modal) return;

  const header = getHeader(modal);
  const progressWrap = getProgressWrap(header);
  if (!progressWrap) return;

  if (isStagePicker(modal)) {
    progressWrap.dataset.claraHiddenOnStagePicker = "true";
    progressWrap.style.setProperty("display", "none", "important");
    return;
  }

  if (progressWrap.dataset.claraHiddenOnStagePicker === "true") {
    progressWrap.style.removeProperty("display");
    delete progressWrap.dataset.claraHiddenOnStagePicker;
  }
}

function installStagePickerProgressHide() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraStagePickerProgressHideInstalled) return;
  window.__claraStagePickerProgressHideInstalled = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduled = false;
        applyStagePickerProgressVisibility();
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
  installStagePickerProgressHide();
} catch (error) {
  console.warn("CLARA stage picker progress hide failed:", error);
}
