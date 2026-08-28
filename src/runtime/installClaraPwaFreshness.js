const RUNTIME_KEY = "__claraPwaFreshnessRuntime__";
const SERVICE_WORKER_PATH = `${import.meta.env.BASE_URL || "/"}clara-task-reminder-sw.js`;

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

export function installClaraPwaFreshness() {
  if (typeof window === "undefined" || window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  const check = () => void refreshWorkerRegistration();

  if (document.readyState === "complete") check();
  else window.addEventListener("load", check, { once: true });

  window.addEventListener("pageshow", check);
  window.addEventListener("online", check);
}

installClaraPwaFreshness();
