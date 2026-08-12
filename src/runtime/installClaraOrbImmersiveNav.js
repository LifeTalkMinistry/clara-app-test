/*
 * CLARA Orb immersive navigation.
 *
 * The Orb is the only Community view that owns a full-screen assistant canvas.
 * Its shared top navigation therefore becomes an overlay: hidden outside the
 * viewport by default, revealed by an empty-canvas tap or a downward swipe,
 * then automatically dismissed after a short idle period. Other Community
 * views keep the normal always-visible navigation and geometry.
 */

const RUNTIME_KEY = "__claraOrbImmersiveNavRuntime__";
const STYLE_ID = "clara-orb-immersive-nav-style";
const ROOT_SELECTOR = ".clara-community-root";
const HEADER_SELECTOR = ".clara-community-shell-header";
const AUTO_HIDE_MS = 3200;
const TAP_SLOP_PX = 12;
const SWIPE_THRESHOLD_PX = 38;

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-community-root[data-community-view="orb"]
      > .clara-community-shell-header[data-clara-orb-immersive-nav="true"] {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      left: 0 !important;
      z-index: 210 !important;
      width: 100% !important;
      margin: 0 !important;
      transform: translate3d(0, calc(-100% - 8px), 0) !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition:
        transform 340ms cubic-bezier(.22, 1, .36, 1),
        opacity 220ms ease !important;
      will-change: transform, opacity;
    }

    .clara-community-root[data-community-view="orb"][data-clara-orb-nav-visible="true"]
      > .clara-community-shell-header[data-clara-orb-immersive-nav="true"] {
      transform: translate3d(0, 0, 0) !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .clara-community-root[data-community-view="orb"]
        > .clara-community-shell-header[data-clara-orb-immersive-nav="true"] {
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function isInteractiveTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'a, button, input, textarea, select, summary, [role="button"], [contenteditable="true"], [data-clara-orb-launcher="true"]'
    )
  );
}

function installClaraOrbImmersiveNav() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();
  ensureStyles();

  let activeRoot = null;
  let activeHeader = null;
  let navVisible = false;
  let hideTimer = 0;
  let pointerStart = null;
  let syncQueued = false;

  const clearHideTimer = () => {
    if (!hideTimer) return;
    window.clearTimeout(hideTimer);
    hideTimer = 0;
  };

  const scheduleHide = () => {
    clearHideTimer();
    if (!navVisible || !activeRoot || activeRoot.dataset.communityView !== "orb") return;
    hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_HIDE_MS);
  };

  const applyAccessibilityState = () => {
    if (!activeHeader) return;
    if (navVisible) {
      activeHeader.removeAttribute("aria-hidden");
      activeHeader.inert = false;
    } else {
      activeHeader.setAttribute("aria-hidden", "true");
      activeHeader.inert = true;
    }
  };

  function setVisible(nextVisible) {
    if (!activeRoot || activeRoot.dataset.communityView !== "orb" || !activeHeader) return;

    navVisible = Boolean(nextVisible);
    activeRoot.dataset.claraOrbNavVisible = navVisible ? "true" : "false";
    applyAccessibilityState();

    if (navVisible) scheduleHide();
    else clearHideTimer();
  }

  const releaseCurrentElements = () => {
    clearHideTimer();
    pointerStart = null;
    navVisible = false;

    if (activeRoot) activeRoot.removeAttribute("data-clara-orb-nav-visible");
    if (activeHeader) {
      activeHeader.removeAttribute("data-clara-orb-immersive-nav");
      activeHeader.removeAttribute("aria-hidden");
      activeHeader.inert = false;
    }

    activeRoot = null;
    activeHeader = null;
  };

  const sync = () => {
    syncQueued = false;

    const nextRoot = document.querySelector(ROOT_SELECTOR);
    const isOrb = nextRoot?.dataset?.communityView === "orb";
    const nextHeader = isOrb ? nextRoot.querySelector(HEADER_SELECTOR) : null;

    if (!isOrb || !nextHeader) {
      if (activeRoot || activeHeader) releaseCurrentElements();
      return;
    }

    if (nextRoot === activeRoot && nextHeader === activeHeader) return;

    releaseCurrentElements();
    activeRoot = nextRoot;
    activeHeader = nextHeader;
    activeHeader.dataset.claraOrbImmersiveNav = "true";
    setVisible(false);
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  };

  const handlePointerDown = (event) => {
    if (!activeRoot || activeRoot.dataset.communityView !== "orb") return;
    if (!(event.target instanceof Node) || !activeRoot.contains(event.target)) return;

    const insideHeader = Boolean(activeHeader?.contains(event.target));
    pointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      insideHeader,
      interactive: isInteractiveTarget(event.target),
    };

    if (insideHeader && navVisible) clearHideTimer();
  };

  const handlePointerUp = (event) => {
    const start = pointerStart;
    pointerStart = null;

    if (!start || start.pointerId !== event.pointerId) return;
    if (!activeRoot || activeRoot.dataset.communityView !== "orb") return;

    if (start.insideHeader) {
      if (navVisible) scheduleHide();
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // An upward swipe dismisses the overlay immediately.
    if (navVisible && dy <= -SWIPE_THRESHOLD_PX && absY > absX) {
      setVisible(false);
      return;
    }

    if (start.interactive || isInteractiveTarget(event.target)) return;

    // A downward swipe on the empty Orb canvas reveals navigation from above.
    if (!navVisible && dy >= SWIPE_THRESHOLD_PX && absY > absX) {
      setVisible(true);
      return;
    }

    // A simple tap on empty canvas is the easiest reveal gesture.
    if (Math.hypot(dx, dy) <= TAP_SLOP_PX) {
      setVisible(true);
    }
  };

  const handlePointerCancel = () => {
    pointerStart = null;
  };

  const handleKeyDown = (event) => {
    if (!activeRoot || activeRoot.dataset.communityView !== "orb") return;

    if (event.key === "Escape" && navVisible) {
      setVisible(false);
      return;
    }

    if (!navVisible && (event.key === "ArrowDown" || event.key === "Home")) {
      setVisible(true);
    }
  };

  const handleFocusIn = (event) => {
    if (!activeHeader || !navVisible) return;
    if (event.target instanceof Node && activeHeader.contains(event.target)) scheduleHide();
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-community-view"],
  });

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("focusin", handleFocusIn, true);

  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerCancel, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      releaseCurrentElements();
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbImmersiveNav();
