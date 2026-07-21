const DASHBOARD_ONBOARDING_LOCK_CLASS = "clara-onboarding-open";
const UNIVERSAL_ONBOARDING_ROUTE_CLASS = "clara-universal-onboarding-route";
const UNIVERSAL_ONBOARDING_SELECTOR = ".clara-universal-onboarding";
const UNIVERSAL_ONBOARDING_VIEWPORT_STYLE_ID =
  "clara-universal-onboarding-viewport-style";
const UNIVERSAL_ONBOARDING_VIEWPORT_HEIGHT_PROPERTY =
  "--clara-universal-onboarding-viewport-height";

function getDocumentRoots() {
  return [document.documentElement, document.body].filter(Boolean);
}

function isUniversalOnboardingMounted() {
  return Boolean(document.querySelector(UNIVERSAL_ONBOARDING_SELECTOR));
}

function getVisibleViewportHeight() {
  const visualViewportHeight = Number(window.visualViewport?.height);
  if (Number.isFinite(visualViewportHeight) && visualViewportHeight > 0) {
    return Math.round(visualViewportHeight);
  }

  const innerHeight = Number(window.innerHeight);
  if (Number.isFinite(innerHeight) && innerHeight > 0) {
    return Math.round(innerHeight);
  }

  const clientHeight = Number(document.documentElement?.clientHeight);
  return Number.isFinite(clientHeight) && clientHeight > 0
    ? Math.round(clientHeight)
    : 0;
}

function ensureViewportOverrideStyle() {
  if (document.getElementById(UNIVERSAL_ONBOARDING_VIEWPORT_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = UNIVERSAL_ONBOARDING_VIEWPORT_STYLE_ID;
  style.textContent = `
    @media (max-width: 640px) {
      html.${UNIVERSAL_ONBOARDING_ROUTE_CLASS} #root .clara-universal-onboarding,
      html.${UNIVERSAL_ONBOARDING_ROUTE_CLASS} #root .clara-universal-onboarding > .relative {
        height: var(${UNIVERSAL_ONBOARDING_VIEWPORT_HEIGHT_PROPERTY}, 100vh) !important;
      }

      html.${UNIVERSAL_ONBOARDING_ROUTE_CLASS} #root .clara-universal-onboarding {
        min-height: var(${UNIVERSAL_ONBOARDING_VIEWPORT_HEIGHT_PROPERTY}, 100vh) !important;
        overflow: hidden !important;
      }

      html.${UNIVERSAL_ONBOARDING_ROUTE_CLASS} #root .clara-universal-onboarding > .relative {
        min-height: 0 !important;
      }

      html.${UNIVERSAL_ONBOARDING_ROUTE_CLASS} #root .clara-universal-onboarding-shell {
        height: calc(var(${UNIVERSAL_ONBOARDING_VIEWPORT_HEIGHT_PROPERTY}, 100vh) - 24px) !important;
        min-height: 0 !important;
        max-height: calc(var(${UNIVERSAL_ONBOARDING_VIEWPORT_HEIGHT_PROPERTY}, 100vh) - 24px) !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior-y: contain;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
    }
  `;
  document.head.appendChild(style);
}

function syncVisibleViewportHeight(isMounted) {
  const root = document.documentElement;
  if (!root) return;

  if (!isMounted) {
    root.style.removeProperty(UNIVERSAL_ONBOARDING_VIEWPORT_HEIGHT_PROPERTY);
    return;
  }

  const viewportHeight = getVisibleViewportHeight();
  if (viewportHeight > 0) {
    root.style.setProperty(
      UNIVERSAL_ONBOARDING_VIEWPORT_HEIGHT_PROPERTY,
      `${viewportHeight}px`
    );
  }
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

  syncVisibleViewportHeight(isMounted);
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
  ensureViewportOverrideStyle();

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
  window.addEventListener("resize", queueSync, { passive: true });
  window.addEventListener("orientationchange", queueSync, { passive: true });
  window.visualViewport?.addEventListener("resize", queueSync, { passive: true });
}

try {
  installUniversalOnboardingScrollIsolation();
} catch (error) {
  console.warn("CLARA Universal Onboarding scroll isolation failed:", error);
}
