let installed = false;
let loading = false;
let loaded = false;

function hasLifeStageSurface() {
  return Boolean(
    document.querySelector("[data-clara-guide-me-static-surface='true']")
  );
}

async function loadLifeStageBridge() {
  if (loading || loaded || !hasLifeStageSurface()) return;
  loading = true;

  try {
    // The current Me screen already renders its hero, support copy, and trend
    // snapshot in React. Only load the remaining pressure-signal bridge when the
    // Me surface actually exists instead of running many document-wide observers
    // across Home, Schedule, and Settings.
    await import("../life-stage-pressure-signals.js");
    loaded = true;
  } catch (error) {
    console.warn("CLARA Life Stage pressure signals failed to load:", error);
  } finally {
    loading = false;
  }
}

export function installLifeStageLegacyPatchLoader() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  let scheduled = false;
  const check = () => {
    if (loaded || scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      void loadLifeStageBridge();
    });
  };

  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("clara:life-stage-profile-updated", check, { passive: true });
  check();
}

installLifeStageLegacyPatchLoader();
