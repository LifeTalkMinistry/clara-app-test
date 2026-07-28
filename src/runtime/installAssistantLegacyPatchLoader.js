let installed = false;
let loading = false;
let loaded = false;
let observer = null;

function hasAssistantSurface() {
  if (typeof document === "undefined") return false;
  return (
    document.body?.classList?.contains("clara-ai-environment-active") ||
    Boolean(document.querySelector("[data-clara-ai-brain-version]"))
  );
}

async function loadAssistantBridges() {
  if (loading || loaded || !hasAssistantSurface()) return;
  loading = true;

  try {
    await Promise.all([
      import("../clara-forecast-report-router.js"),
      import("../clara-analytics-report-router.js"),
      import("../clara-forecast-slide5-final.js"),
      import("../clara-forecast-report-final-affirmation.js"),
      import("../clara-buy-check-report-content-polish.js"),
      import("../clara-buy-check-report-focus-mode.js"),
      import("../clara-assistant-forecast-tab.js"),
      import("../clara-assistant-analytic-tab.js"),
      import("../clara-assistant-feature-dock-polish.js"),
      import("../clara-assistant-memory-tab.js"),
      import("../clara-talk-pause-bridge.js"),
    ]);
    loaded = true;
    observer?.disconnect();
    observer = null;
  } catch (error) {
    console.warn("CLARA assistant compatibility bridges failed to load:", error);
  } finally {
    loading = false;
  }
}

export function installAssistantLegacyPatchLoader() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  let scheduled = false;
  const check = () => {
    if (loaded || scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      void loadAssistantBridges();
    });
  };

  observer = new MutationObserver(check);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("clara:open-ai-environment", check, { passive: true });
  check();
}

installAssistantLegacyPatchLoader();
