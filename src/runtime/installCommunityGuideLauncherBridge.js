const GUIDE_SELECTOR = '[aria-label="Open CLARA Guide Mode"]';
const GUIDE_HOME_SELECTOR = `.clara-community-home-learning-hub ${GUIDE_SELECTOR}`;
const BRIDGE_ID = "clara-community-guide-launcher-hitbox";
const INTRO_TITLE_ID = "community-guide-intro-title";
const TOUR_TITLE_ID = "clara-community-guide-title";

function isCommunityHome() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").includes("/community?view=home");
}

function getIntroDialog() {
  if (typeof document === "undefined") return null;
  return document.getElementById(INTRO_TITLE_ID)?.closest?.("[role='dialog']") || null;
}

function getTourRoot() {
  if (typeof document === "undefined") return null;
  const tourDialog = document.getElementById(TOUR_TITLE_ID)?.closest?.("[role='dialog']");
  return tourDialog?.parentElement || null;
}

function guideSurfaceOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(getIntroDialog() || getTourRoot());
}

function findGuideButton() {
  if (typeof document === "undefined") return null;
  return document.querySelector(GUIDE_HOME_SELECTOR);
}

function setBridgeHidden(bridge) {
  if (!bridge) return;
  bridge.style.display = "none";
  bridge.style.pointerEvents = "none";
}

function setImportantStyle(element, property, value) {
  element?.style?.setProperty?.(property, value, "important");
}

function forceViewportGuideSurface(element, { centerContent = false } = {}) {
  if (!element) return;

  // Community has several historical mobile/layout rules that use !important.
  // Normal inline styles lose to those rules, which made the Guide mount as a
  // flex child below the visible page. Apply the Guide's viewport ownership at
  // the same priority so the intro/tour cannot be pushed into Home/My Circle.
  const viewportStyles = {
    position: "fixed",
    inset: "0px",
    left: "0px",
    top: "0px",
    right: "0px",
    bottom: "0px",
    width: "100vw",
    height: "100dvh",
    "min-width": "100vw",
    "min-height": "100dvh",
    "max-width": "none",
    "max-height": "none",
    margin: "0px",
    transform: "none",
    "z-index": "2147483550",
    visibility: "visible",
    opacity: "1",
    "pointer-events": "auto",
    "box-sizing": "border-box",
  };

  Object.entries(viewportStyles).forEach(([property, value]) => {
    setImportantStyle(element, property, value);
  });

  if (centerContent) {
    const centerStyles = {
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      overflow: "auto",
      padding: "24px 16px",
    };

    Object.entries(centerStyles).forEach(([property, value]) => {
      setImportantStyle(element, property, value);
    });
  } else {
    setImportantStyle(element, "display", "block");
    setImportantStyle(element, "overflow", "visible");
  }
}

function normalizeGuideSurfaces() {
  // Community is a viewport-owned shell. Keep Guide surfaces viewport-owned too
  // so they never become a flex child at the bottom of Home/My Circle/etc.
  forceViewportGuideSurface(getIntroDialog(), { centerContent: true });
  forceViewportGuideSurface(getTourRoot());
}

function closeStaleIntroOutsideHome() {
  if (isCommunityHome()) return;

  const introDialog = getIntroDialog();
  if (!introDialog) return;

  const closeButton = introDialog.querySelector(
    "button[aria-label='Close CLARA Guide intro']",
  );
  closeButton?.click?.();
}

function syncBridgeToLauncher(bridge) {
  normalizeGuideSurfaces();

  if (!bridge) return;

  if (!isCommunityHome()) {
    setBridgeHidden(bridge);
    closeStaleIntroOutsideHome();
    return;
  }

  if (guideSurfaceOpen()) {
    setBridgeHidden(bridge);
    return;
  }

  const launcher = findGuideButton();
  if (!launcher) {
    setBridgeHidden(bridge);
    return;
  }

  const rect = launcher.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    setBridgeHidden(bridge);
    return;
  }

  const width = Math.max(52, rect.width + 14);
  const height = Math.max(52, rect.height + 14);
  const left = rect.left + rect.width / 2 - width / 2;
  const top = rect.top + rect.height / 2 - height / 2;

  Object.assign(bridge.style, {
    display: "block",
    pointerEvents: "auto",
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
  });
}

function createBridge() {
  const bridge = document.createElement("button");
  bridge.id = BRIDGE_ID;
  bridge.type = "button";
  bridge.tabIndex = -1;
  bridge.setAttribute("aria-hidden", "true");
  bridge.setAttribute("data-clara-community-guide-launcher-bridge", "true");
  bridge.title = "";

  Object.assign(bridge.style, {
    position: "fixed",
    zIndex: "2147483647",
    margin: "0",
    padding: "0",
    border: "0",
    borderRadius: "999px",
    background: "transparent",
    boxShadow: "none",
    opacity: "0.001",
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  });

  const activate = (event) => {
    if (!isCommunityHome() || guideSurfaceOpen()) return;

    const launcher = findGuideButton();
    if (!launcher) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    // Get this transparent hit target out of the way immediately so the
    // intro/tour can own the full viewport without a stale invisible layer.
    bridge.style.pointerEvents = "none";
    bridge.style.display = "none";

    // Programmatic click bypasses any transparent/intermediate layer that may
    // be stealing the user's physical tap. Community.jsx then opens the real
    // React-owned Safe Walkthrough modal.
    launcher.click();

    // React mounts the intro on the next render. Normalize on several frames so
    // late Community/mobile CSS cannot move it after React paints.
    window.requestAnimationFrame(normalizeGuideSurfaces);
    window.setTimeout(normalizeGuideSurfaces, 0);
    window.setTimeout(normalizeGuideSurfaces, 30);
    window.setTimeout(normalizeGuideSurfaces, 120);
    window.setTimeout(() => syncBridgeToLauncher(bridge), 180);
  };

  bridge.addEventListener("pointerup", activate, true);
  bridge.addEventListener("click", activate, true);
  return bridge;
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_COMMUNITY_GUIDE_LAUNCHER_BRIDGE__) return;
  window.__CLARA_COMMUNITY_GUIDE_LAUNCHER_BRIDGE__ = true;

  const bridge = document.getElementById(BRIDGE_ID) || createBridge();
  if (!bridge.isConnected) document.body.appendChild(bridge);

  let syncQueued = false;
  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(() => {
      syncQueued = false;
      syncBridgeToLauncher(bridge);
    });
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-label"],
  });

  window.addEventListener("hashchange", queueSync);
  window.addEventListener("resize", queueSync);
  window.addEventListener("scroll", queueSync, true);
  window.visualViewport?.addEventListener("resize", queueSync);
  window.visualViewport?.addEventListener("scroll", queueSync);

  // The launcher gently floats, so keep the invisible hit target aligned with
  // it even when no DOM mutation or scroll event fires.
  window.setInterval(queueSync, 220);
  queueSync();
}

install();