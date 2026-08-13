/*
 * CLARA Orb immersive navigation.
 *
 * The Orb is the only Community view that owns a full-screen assistant canvas.
 * Its shared top navigation therefore becomes an overlay: hidden outside the
 * viewport by default, revealed by an Orb-page background/content interaction,
 * then automatically dismissed after a short idle period. The CLARA Orb itself
 * remains the sole intentional reveal exclusion and keeps its own interaction.
 */

const RUNTIME_KEY = "__claraOrbImmersiveNavRuntime__";
const STYLE_ID = "clara-orb-immersive-nav-style";
const ROOT_SELECTOR = ".clara-community-root";
const PAGE_SELECTOR = ".clara-community-orb-view";
const HEADER_SELECTOR = ".clara-community-shell-header";
const ORB_INTERACTIVE_SELECTOR = '[data-clara-orb-launcher="true"]';
const AUTO_HIDE_MS = 3200;
const SWIPE_THRESHOLD_PX = 38;

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-community-root[data-community-view="orb"]
      > .clara-community-shell-header {
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
      > .clara-community-shell-header {
      transform: translate3d(0, 0, 0) !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .clara-community-root[data-community-view="orb"]
        > .clara-community-shell-header {
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function isOrbInteractionTarget(target, activePage) {
  if (!(target instanceof Element) || !activePage) return false;
  const orbBoundary = target.closest(ORB_INTERACTIVE_SELECTOR);
  return Boolean(orbBoundary && activePage.contains(orbBoundary));
}

function installClaraOrbImmersiveNav() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();
  ensureStyles();

  let activeRoot = null;
  let activePage = null;
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

  const handlePagePointerDown = (event) => {
    if (!activePage || event.currentTarget !== activePage) return;

    pointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      orbOwned: isOrbInteractionTarget(event.target, activePage),
    };
  };

  const handlePagePointerUp = (event) => {
    const start = pointerStart;
    pointerStart = null;

    if (!start || start.pointerId !== event.pointerId) return;
    if (!activeRoot || activeRoot.dataset.communityView !== "orb" || !activePage) return;

    // The Orb launcher owns every interaction that begins or ends anywhere in
    // its stable component boundary. Never turn an Orb interaction into a
    // background navigation reveal.
    if (start.orbOwned || isOrbInteractionTarget(event.target, activePage)) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Preserve the existing explicit upward-dismiss gesture while the nav is
    // awake. All other non-Orb pointer completions reveal/wake the nav. The Orb
    // screen does not scroll, so a tiny amount of touch drift must not create a
    // dead zone as it did under the old tap-slop gate.
    if (navVisible && dy <= -SWIPE_THRESHOLD_PX && absY > absX) {
      setVisible(false);
      return;
    }

    setVisible(true);
  };

  const handlePagePointerCancel = (event) => {
    if (!pointerStart || pointerStart.pointerId === event.pointerId) pointerStart = null;
  };

  const handleHeaderPointerDown = () => {
    if (navVisible) clearHideTimer();
  };

  const handleHeaderPointerUp = () => {
    if (navVisible) scheduleHide();
  };

  const bindInteractionAuthority = () => {
    activePage?.addEventListener("pointerdown", handlePagePointerDown, true);
    activePage?.addEventListener("pointerup", handlePagePointerUp, true);
    activePage?.addEventListener("pointercancel", handlePagePointerCancel, true);
    activeHeader?.addEventListener("pointerdown", handleHeaderPointerDown, true);
    activeHeader?.addEventListener("pointerup", handleHeaderPointerUp, true);
    activeHeader?.addEventListener("pointercancel", handleHeaderPointerUp, true);
  };

  const unbindInteractionAuthority = () => {
    activePage?.removeEventListener("pointerdown", handlePagePointerDown, true);
    activePage?.removeEventListener("pointerup", handlePagePointerUp, true);
    activePage?.removeEventListener("pointercancel", handlePagePointerCancel, true);
    activeHeader?.removeEventListener("pointerdown", handleHeaderPointerDown, true);
    activeHeader?.removeEventListener("pointerup", handleHeaderPointerUp, true);
    activeHeader?.removeEventListener("pointercancel", handleHeaderPointerUp, true);
  };

  const releaseCurrentElements = () => {
    clearHideTimer();
    pointerStart = null;
    navVisible = false;
    unbindInteractionAuthority();

    if (activeRoot) activeRoot.removeAttribute("data-clara-orb-nav-visible");
    if (activeHeader) {
      activeHeader.removeAttribute("data-clara-orb-immersive-nav");
      activeHeader.removeAttribute("aria-hidden");
      activeHeader.inert = false;
    }

    activeRoot = null;
    activePage = null;
    activeHeader = null;
  };

  const sync = () => {
    syncQueued = false;

    const nextRoot = document.querySelector(`${ROOT_SELECTOR}[data-community-view="orb"]`);
    const nextPage = nextRoot?.querySelector(PAGE_SELECTOR) || null;
    const nextHeader = nextRoot?.querySelector(HEADER_SELECTOR) || null;

    if (!nextRoot || !nextPage || !nextHeader) {
      if (activeRoot || activePage || activeHeader) releaseCurrentElements();
      return;
    }

    if (
      nextRoot === activeRoot &&
      nextPage === activePage &&
      nextHeader === activeHeader
    ) {
      return;
    }

    releaseCurrentElements();
    activeRoot = nextRoot;
    activePage = nextPage;
    activeHeader = nextHeader;
    activeHeader.dataset.claraOrbImmersiveNav = "true";
    bindInteractionAuthority();
    setVisible(false);
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
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

  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("focusin", handleFocusIn, true);

  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      releaseCurrentElements();
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbImmersiveNav();
