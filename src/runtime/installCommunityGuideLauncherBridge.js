const GUIDE_SELECTOR = '[aria-label="Open CLARA Guide Mode"]';
const GUIDE_HOME_SELECTOR = `.clara-community-home-learning-hub ${GUIDE_SELECTOR}`;
const BRIDGE_ID = "clara-community-guide-launcher-hitbox";
const INTRO_TITLE_ID = "community-guide-intro-title";
const TOUR_TITLE_ID = "clara-community-guide-title";

function isCommunityHome() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").includes("/community?view=home");
}

function guideSurfaceOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.getElementById(INTRO_TITLE_ID) ||
      document.getElementById(TOUR_TITLE_ID),
  );
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

function syncBridgeToLauncher(bridge) {
  if (!bridge || !isCommunityHome() || guideSurfaceOpen()) {
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
