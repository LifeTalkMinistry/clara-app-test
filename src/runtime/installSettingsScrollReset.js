const SETTINGS_ACTIVE_NAV_SELECTOR =
  '.theme-page-shell button[aria-label="Settings"][aria-current="page"]';

let installed = false;
let lastSettingsViewKey = "";
let scheduledFrame = null;

function findActiveSettingsView() {
  if (typeof document === "undefined") return null;

  const activeSettingsNav = document.querySelector(SETTINGS_ACTIVE_NAV_SELECTOR);
  const shell = activeSettingsNav?.closest(".theme-page-shell");
  if (!shell) return null;

  const detailRoot = shell.querySelector(".min-h-full.space-y-4.pb-6");
  const overviewRoot = detailRoot ? null : shell.querySelector(".space-y-5.pb-6");
  const viewRoot = detailRoot || overviewRoot;
  if (!viewRoot) return null;

  const scrollOwner = viewRoot.closest(".overflow-y-auto");
  if (!scrollOwner) return null;

  const detailTitle = detailRoot?.querySelector("h2")?.textContent?.trim() || "detail";
  const viewKey = detailRoot ? `detail:${detailTitle}` : "overview";

  return { scrollOwner, viewKey };
}

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

function resetSettingsScroll(scrollOwner) {
  forceScrollTop(scrollOwner);

  window.requestAnimationFrame(() => {
    forceScrollTop(scrollOwner);
    window.requestAnimationFrame(() => forceScrollTop(scrollOwner));
  });

  window.setTimeout(() => forceScrollTop(scrollOwner), 80);
}

function syncSettingsView() {
  scheduledFrame = null;

  const activeView = findActiveSettingsView();
  if (!activeView) {
    lastSettingsViewKey = "";
    return;
  }

  if (activeView.viewKey === lastSettingsViewKey) return;

  lastSettingsViewKey = activeView.viewKey;
  resetSettingsScroll(activeView.scrollOwner);
}

function scheduleSettingsViewSync() {
  if (scheduledFrame !== null || typeof window === "undefined") return;
  scheduledFrame = window.requestAnimationFrame(syncSettingsView);
}

export function installSettingsScrollReset() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;

  installed = true;

  const observer = new MutationObserver(scheduleSettingsViewSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("pageshow", scheduleSettingsViewSync);
  window.addEventListener("resize", scheduleSettingsViewSync, { passive: true });
  scheduleSettingsViewSync();
}

installSettingsScrollReset();
