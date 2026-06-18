const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_SAMPLE_CLASS = "clara-guide-daily-tip-sample-active";

let guideModeActive = false;

function setSampleActive(active) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(GUIDE_SAMPLE_CLASS, Boolean(active));
}

function isDailyTipTarget(target) {
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(target.closest("[data-clara-daily-tip-card='true'] [role='button']"));
}

export function installClaraGuideDemoPatches() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_GUIDE_DEMO_PATCHES_INSTALLED__) return;

  window.__CLARA_GUIDE_DEMO_PATCHES_INSTALLED__ = true;

  window.addEventListener(GUIDE_MODE_CHANGE_EVENT, (event) => {
    guideModeActive = Boolean(event?.detail?.active);
    if (!guideModeActive) {
      setSampleActive(false);
    }
  });

  document.addEventListener(
    "click",
    (event) => {
      if (!guideModeActive || !isDailyTipTarget(event.target)) return;
      setSampleActive(true);
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (!guideModeActive || !isDailyTipTarget(event.target)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      setSampleActive(true);
    },
    true,
  );
}
