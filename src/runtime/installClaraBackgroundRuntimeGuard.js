const BACKGROUND_SUPPRESSED_EVENT_TYPES = new Set([
  "clara:finance-data-updated",
  "clara-finance-updated",
  "clara-local-finance-updated",
  "clara:notification-preferences-updated",
  "clara-settings-updated",
]);

let installed = false;
let appActive = true;
let originalDispatchEvent = null;

function computeActiveState() {
  if (typeof document !== "undefined" && document.hidden === true) return false;
  return true;
}

function setActiveState(nextActive) {
  appActive = Boolean(nextActive);
  if (typeof window === "undefined") return;

  window.__CLARA_APP_ACTIVE__ = appActive;
  try {
    originalDispatchEvent?.(
      new CustomEvent("clara:app-active-state-changed", {
        detail: { active: appActive },
      })
    );
  } catch {
    // Best effort only. Background guarding should never break the app.
  }
}

function shouldSuppressBackgroundEvent(event) {
  if (appActive) return false;
  if (!event?.type) return false;
  return BACKGROUND_SUPPRESSED_EVENT_TYPES.has(event.type);
}

export function installClaraBackgroundRuntimeGuard() {
  if (installed || typeof window === "undefined") return;

  installed = true;
  appActive = computeActiveState();
  window.__CLARA_APP_ACTIVE__ = appActive;

  originalDispatchEvent = window.dispatchEvent.bind(window);
  window.dispatchEvent = (event) => {
    if (shouldSuppressBackgroundEvent(event)) {
      return true;
    }
    return originalDispatchEvent(event);
  };

  const markInactive = () => setActiveState(false);
  const markActive = () => setActiveState(computeActiveState());
  const handleVisibilityChange = () => setActiveState(computeActiveState());

  window.addEventListener("pause", markInactive);
  window.addEventListener("pagehide", markInactive);
  window.addEventListener("resume", markActive);
  window.addEventListener("pageshow", markActive);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }
}
