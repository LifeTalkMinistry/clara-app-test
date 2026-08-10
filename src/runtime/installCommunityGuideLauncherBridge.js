import "../community-top-nav-tools.css";

const GUIDE_SELECTOR = '[aria-label="Open CLARA Guide Mode"]';
const GUIDE_HOME_SELECTOR = `.clara-community-home-learning-hub ${GUIDE_SELECTOR}`;
const BRIDGE_ID = "clara-community-guide-launcher-hitbox";
const INTRO_TITLE_ID = "community-guide-intro-title";
const TOUR_TITLE_ID = "clara-community-guide-title";
const TOP_NAV_SELECTOR = ".clara-community-shell-nav";
const PROFILE_SELECTOR = 'a[aria-label="Open Community profile"]';
const PINNED_PROFILE_CLASS = "clara-community-profile-pinned";
const TOP_NAV_TOOL_ATTR = "data-clara-topnav-tool";

let pendingHomeTool = null;
let lastAutoScrollView = "";

const TOOL_ICONS = {
  learning: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  coaching: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" stroke="currentColor" stroke-linecap="round"/>
      <path d="M4 13a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Zm16 0a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z" stroke="currentColor" stroke-linejoin="round"/>
      <path d="M17 18.5c-.8 1-2.2 1.5-4 1.5h-1" stroke="currentColor" stroke-linecap="round"/>
    </svg>`,
  guide: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v10.5A2.5 2.5 0 0 1 15.5 20H6V4.5Z" stroke="currentColor" stroke-linejoin="round"/>
      <path d="M6 4.5A2.5 2.5 0 0 0 3.5 7v10.5A2.5 2.5 0 0 0 6 20" stroke="currentColor" stroke-linecap="round"/>
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" stroke-linecap="round"/>
    </svg>`,
};

function isCommunityHome() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").includes("/community?view=home");
}

function isCommunityRoute() {
  if (typeof window === "undefined") return false;
  return String(window.location.hash || "").includes("/community");
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

function findLegacyHomeTool(tool) {
  if (typeof document === "undefined") return null;
  const root = document.querySelector(".clara-community-home-learning-hub");
  if (!root) return null;

  if (tool === "learning") {
    return root.querySelector(
      '[data-clara-learning-hub-bridge="true"] button[data-clara-learning-hub-toggle="true"]',
    );
  }

  if (tool === "guide") {
    return root.querySelector(GUIDE_SELECTOR);
  }

  return null;
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

function navigateHash(path) {
  if (typeof window === "undefined") return;
  const nextHash = `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash === nextHash) return;
  window.location.hash = nextHash;
}

function activateHomeTool(tool) {
  const target = findLegacyHomeTool(tool);
  if (isCommunityHome() && target) {
    pendingHomeTool = null;
    target.click();
    return;
  }

  pendingHomeTool = tool;
  navigateHash("/community?view=home");
}

function createTopNavTool(tool) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "clara-community-nav-item clara-community-topnav-tool";
  button.setAttribute(TOP_NAV_TOOL_ATTR, tool);

  if (tool === "learning") {
    button.title = "Learning Hub";
    button.setAttribute("aria-label", "Open Learning Hub");
    button.setAttribute("data-clara-learning-hub-toggle", "true");
    button.innerHTML = TOOL_ICONS.learning;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateHomeTool("learning");
    });
    return button;
  }

  if (tool === "coaching") {
    button.title = "30-minute CLARA Coaching";
    button.setAttribute("aria-label", "Open 30-minute CLARA Coaching");
    button.innerHTML = `${TOOL_ICONS.coaching}<span class="clara-community-topnav-30m">30m</span>`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateHash("/welcome-session");
    });
    return button;
  }

  button.title = "CLARA Guide Mode";
  // Deliberately not the legacy exact aria-label. We proxy through the hidden
  // React launcher after moving Home into view, so Community.jsx remains the
  // single owner of Guide state and modal behavior.
  button.setAttribute("aria-label", "Open CLARA Guide from top navigation");
  button.innerHTML = TOOL_ICONS.guide;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    activateHomeTool("guide");
  });
  return button;
}

function ensureTopNavTools(nav) {
  if (!nav) return;
  const originalProfile = nav.querySelector(PROFILE_SELECTOR);
  if (!originalProfile) return;

  ["learning", "coaching", "guide"].forEach((tool) => {
    let button = nav.querySelector(`[${TOP_NAV_TOOL_ATTR}="${tool}"]`);
    if (!button) {
      button = createTopNavTool(tool);
      nav.insertBefore(button, originalProfile);
    }
  });

  if (!nav.dataset.claraHorizontalWheelBound) {
    nav.dataset.claraHorizontalWheelBound = "true";
    nav.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        if (nav.scrollWidth <= nav.clientWidth + 2) return;
        nav.scrollLeft += event.deltaY;
        event.preventDefault();
      },
      { passive: false },
    );
  }
}

function syncPinnedProfile(nav) {
  if (!nav) return;
  const header = nav.closest(".clara-community-shell-header");
  const original = nav.querySelector(PROFILE_SELECTOR);
  if (!header || !original) return;

  let pinned = header.querySelector(`.${PINNED_PROFILE_CLASS}`);
  if (!pinned) {
    pinned = original.cloneNode(true);
    pinned.classList.add(PINNED_PROFILE_CLASS);
    pinned.setAttribute("data-clara-pinned-profile", "true");
    header.appendChild(pinned);
  }

  const desiredClass = `${original.className} ${PINNED_PROFILE_CLASS}`.trim();
  if (pinned.className !== desiredClass) pinned.className = desiredClass;

  const desiredHref = original.getAttribute("href") || "#/community?view=profile";
  if (pinned.getAttribute("href") !== desiredHref) pinned.setAttribute("href", desiredHref);

  const desiredTitle = original.getAttribute("title") || "ME";
  if (pinned.getAttribute("title") !== desiredTitle) pinned.setAttribute("title", desiredTitle);

  if (pinned.getAttribute("aria-label") !== "Open Community profile") {
    pinned.setAttribute("aria-label", "Open Community profile");
  }

  if (pinned.innerHTML !== original.innerHTML) pinned.innerHTML = original.innerHTML;

  const active = original.getAttribute("aria-current");
  if (active) pinned.setAttribute("aria-current", active);
  else pinned.removeAttribute("aria-current");
}

function autoScrollActiveNav(nav) {
  if (!nav) return;
  const root = nav.closest(".clara-community-root");
  const activeView = root?.getAttribute?.("data-community-view") || "";
  if (!activeView || activeView === lastAutoScrollView) return;
  lastAutoScrollView = activeView;

  if (activeView === "profile") return;
  const active = nav.querySelector('[aria-current="page"]:not([aria-label="Open Community profile"])');
  if (!active) return;

  window.requestAnimationFrame(() => {
    const left = active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2;
    nav.scrollTo?.({ left: Math.max(0, left), behavior: "smooth" });
  });
}

function syncPendingHomeTool() {
  if (!pendingHomeTool || !isCommunityHome()) return;
  const target = findLegacyHomeTool(pendingHomeTool);
  if (!target) return;

  const tool = pendingHomeTool;
  pendingHomeTool = null;
  window.setTimeout(() => {
    const currentTarget = findLegacyHomeTool(tool);
    currentTarget?.click?.();
  }, 40);
}

function syncTopNavTools() {
  if (typeof document === "undefined") return;
  if (!isCommunityRoute()) return;

  const nav = document.querySelector(TOP_NAV_SELECTOR);
  if (!nav) return;

  ensureTopNavTools(nav);
  syncPinnedProfile(nav);
  autoScrollActiveNav(nav);
  syncPendingHomeTool();
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
      syncTopNavTools();
      syncBridgeToLauncher(bridge);
    });
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-label", "aria-current", "data-community-view"],
  });

  window.addEventListener("hashchange", queueSync);
  window.addEventListener("resize", queueSync);
  window.addEventListener("scroll", queueSync, true);
  window.visualViewport?.addEventListener("resize", queueSync);
  window.visualViewport?.addEventListener("scroll", queueSync);

  // The historical Guide hitbox still self-aligns while Home is visible. The
  // same low-cost sync also keeps the new command rail/proxy tools resilient to
  // Community re-renders and unread-count updates.
  window.setInterval(queueSync, 220);
  queueSync();
}

install();