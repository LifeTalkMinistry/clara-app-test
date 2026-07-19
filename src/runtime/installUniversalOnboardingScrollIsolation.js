const DASHBOARD_ONBOARDING_LOCK_CLASS = "clara-onboarding-open";
const UNIVERSAL_ONBOARDING_ROUTE_CLASS = "clara-universal-onboarding-route";
const UNIVERSAL_ONBOARDING_SELECTOR = ".clara-universal-onboarding";

function getDocumentRoots() {
  return [document.documentElement, document.body].filter(Boolean);
}

function isUniversalOnboardingMounted() {
  return Boolean(document.querySelector(UNIVERSAL_ONBOARDING_SELECTOR));
}

function syncUniversalOnboardingScrollIsolation() {
  const isMounted = isUniversalOnboardingMounted();

  getDocumentRoots().forEach((root) => {
    root.classList.toggle(UNIVERSAL_ONBOARDING_ROUTE_CLASS, isMounted);

    if (isMounted) {
      // The dashboard onboarding hook owns this lock. It must never leak into
      // Universal Onboarding, whose phone layout owns scrolling inside its shell.
      root.classList.remove(DASHBOARD_ONBOARDING_LOCK_CLASS);
    }
  });
}

function installUniversalOnboardingScrollIsolation() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    window.__claraUniversalOnboardingScrollIsolationInstalled
  ) {
    return;
  }

  window.__claraUniversalOnboardingScrollIsolationInstalled = true;

  let syncQueued = false;
  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    queueMicrotask(() => {
      syncQueued = false;
      syncUniversalOnboardingScrollIsolation();
    });
  };

  const observer = new MutationObserver(queueSync);
  const startObserver = () => {
    const root = document.getElementById("root");
    if (root) observer.observe(root, { childList: true, subtree: true });

    getDocumentRoots().forEach((documentRoot) => {
      observer.observe(documentRoot, {
        attributes: true,
        attributeFilter: ["class"],
      });
    });

    syncUniversalOnboardingScrollIsolation();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  window.addEventListener("hashchange", queueSync);
  window.addEventListener("popstate", queueSync);
}

try {
  installUniversalOnboardingScrollIsolation();
} catch (error) {
  console.warn("CLARA Universal Onboarding scroll isolation failed:", error);
}
