const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";

let installed = false;
let lastSettingsViewKey = "";
let scheduledFrame = null;
let scheduledScrollOwner = null;

function forceScrollTop(scrollOwner) {
  if (!scrollOwner?.isConnected) return;

  scrollOwner.scrollTop = 0;
  scrollOwner.scrollLeft = 0;

  try {
    scrollOwner.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    scrollOwner.scrollTop = 0;
    scrollOwner.scrollLeft = 0;
  }
}

function scheduleScrollReset(scrollOwner) {
  scheduledScrollOwner = scrollOwner;
  if (scheduledFrame !== null || typeof window === "undefined") return;

  scheduledFrame = window.requestAnimationFrame(() => {
    scheduledFrame = null;
    const owner = scheduledScrollOwner;
    scheduledScrollOwner = null;
    forceScrollTop(owner);
  });
}

function handleSettingsViewSync(event) {
  const viewKey = String(event?.detail?.viewKey || "");
  const scrollOwner = event?.detail?.scrollOwner || null;

  if (!viewKey || !scrollOwner) {
    lastSettingsViewKey = "";
    return;
  }

  if (viewKey === lastSettingsViewKey) return;

  lastSettingsViewKey = viewKey;
  scheduleScrollReset(scrollOwner);
}

export function installSettingsScrollReset() {
  if (installed || typeof window === "undefined") return;

  installed = true;
  window.addEventListener(SETTINGS_VIEW_SYNC_EVENT, handleSettingsViewSync);
}

installSettingsScrollReset();
