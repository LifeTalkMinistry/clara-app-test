const RUNTIME_KEY = "__claraPwaFreshnessRuntime__";
const BASE_URL = import.meta.env.BASE_URL || "/";
const SERVICE_WORKER_PATH = `${BASE_URL}clara-task-reminder-sw.js`;
const BUILD_INFO_PATH = `${BASE_URL}build-info.json`;
const BUILD_QUERY = "__clara_build";
const LAST_FORCED_BUILD_KEY = "clara_last_forced_browser_build";
const PROTECTED_CONVERSATION_SELECTOR = '[data-clara-pause-overlay="true"]';

let deferredBuild = "";
let deferredRefreshObserver = null;

async function fetchLatestBuildInfo() {
  try {
    const response = await fetch(`${BUILD_INFO_PATH}?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const commit = String(payload?.commit || "").trim();
    return commit ? { ...payload, commit } : null;
  } catch {
    return null;
  }
}

function hasProtectedConversation() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(PROTECTED_CONVERSATION_SELECTOR));
}

function stopDeferredRefreshObserver() {
  deferredRefreshObserver?.disconnect?.();
  deferredRefreshObserver = null;
}

function scheduleDeferredDocumentRefresh(build) {
  deferredBuild = String(build || "").trim();
  if (!deferredBuild || typeof document === "undefined") return;
  if (deferredRefreshObserver) return;

  const tryDeferredRefresh = () => {
    if (!deferredBuild || hasProtectedConversation()) return;

    const nextBuild = deferredBuild;
    deferredBuild = "";
    stopDeferredRefreshObserver();
    forceLatestDocument(nextBuild, { allowDefer: false });
  };

  deferredRefreshObserver = new MutationObserver(tryDeferredRefresh);
  deferredRefreshObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function forceLatestDocument(build, { allowDefer = true } = {}) {
  if (!build || typeof window === "undefined") return false;

  try {
    const currentUrl = new URL(window.location.href);
    const currentBuild = currentUrl.searchParams.get(BUILD_QUERY) || "";
    const lastForcedBuild = sessionStorage.getItem(LAST_FORCED_BUILD_KEY) || "";

    if (currentBuild === build) {
      sessionStorage.setItem(LAST_FORCED_BUILD_KEY, build);
      if (deferredBuild === build) deferredBuild = "";
      return false;
    }

    if (lastForcedBuild === build) return false;

    // A release freshness check must never tear down an active CLARA chat.
    // Defer the document replacement until the overlay leaves the DOM, then
    // perform the same one-time build refresh immediately after the interaction.
    if (allowDefer && hasProtectedConversation()) {
      scheduleDeferredDocumentRefresh(build);
      return false;
    }

    sessionStorage.setItem(LAST_FORCED_BUILD_KEY, build);
    currentUrl.searchParams.set(BUILD_QUERY, build);
    currentUrl.searchParams.set("__clara_fresh", String(Date.now()));
    window.location.replace(currentUrl.href);
    return true;
  } catch {
    return false;
  }
}

async function refreshWorkerRegistration() {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
      updateViaCache: "none",
    });
    await registration.update().catch(() => undefined);

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  } catch (error) {
    console.warn("[CLARA PWA] update check failed safely:", error);
  }
}

async function refreshBrowserDocument() {
  const latest = await fetchLatestBuildInfo();
  if (!latest?.commit) return;
  forceLatestDocument(latest.commit);
}

async function checkForFreshBuild() {
  await refreshWorkerRegistration();
  await refreshBrowserDocument();
}

export function installClaraPwaFreshness() {
  if (typeof window === "undefined" || window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  const check = () => void checkForFreshBuild();

  if (document.readyState === "complete") check();
  else window.addEventListener("load", check, { once: true });

  window.addEventListener("pageshow", check);
  window.addEventListener("online", check);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
}

installClaraPwaFreshness();
