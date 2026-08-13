const RUNTIME_KEY = "__claraBuyCheckKeyboardGuardRuntime__";
const OVERLAY_SELECTOR =
  '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"]';
const FORM_SELECTOR = '[data-clara-buy-check-react-form="true"]';
const VIEWPORT_SELECTOR = '[data-clara-ai-message-viewport="true"]';
const KEYBOARD_THRESHOLD_PX = 80;

function readVisibleViewport() {
  const viewport = window.visualViewport;
  const layoutHeight = Math.max(
    window.innerHeight || 0,
    document.documentElement?.clientHeight || 0
  );

  if (!viewport) {
    return {
      top: 0,
      height: Math.max(240, layoutHeight),
      bottom: Math.max(240, layoutHeight),
      keyboardInset: 0,
    };
  }

  const top = Math.max(0, Number(viewport.offsetTop || 0));
  const height = Math.max(240, Number(viewport.height || layoutHeight));
  const bottom = top + height;
  const keyboardInset = Math.max(0, layoutHeight - bottom);

  return { top, height, bottom, keyboardInset };
}

function clearOverlayViewportLock(overlay) {
  if (!overlay) return;

  ["top", "bottom", "height", "min-height", "max-height"].forEach((property) => {
    overlay.style.removeProperty(property);
  });

  delete overlay.dataset.claraBuyCheckKeyboardActive;
  delete overlay.dataset.claraBuyCheckKeyboardInset;

  const viewport = overlay.querySelector(VIEWPORT_SELECTOR);
  viewport?.style.removeProperty("scroll-padding-bottom");
}

function syncBuyCheckToVisibleViewport({ settle = false } = {}) {
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!overlay) return;

  const visible = readVisibleViewport();
  const form = overlay.querySelector(FORM_SELECTOR);
  const messageViewport = overlay.querySelector(VIEWPORT_SELECTOR);
  const activeElement = document.activeElement;
  const inputFocused = Boolean(
    activeElement &&
      form?.contains(activeElement) &&
      activeElement.matches?.("input, textarea, select")
  );
  const keyboardActive =
    inputFocused || visible.keyboardInset > KEYBOARD_THRESHOLD_PX;

  // Android WebView keeps position:fixed elements attached to the layout
  // viewport while the software keyboard reduces the visual viewport. Lock the
  // Buy Check shell to that visible viewport so the composer always sits
  // directly above the keyboard rather than underneath it.
  overlay.style.setProperty("top", `${visible.top}px`, "important");
  overlay.style.setProperty("bottom", "auto", "important");
  overlay.style.setProperty("height", `${visible.height}px`, "important");
  overlay.style.setProperty("min-height", "0px", "important");
  overlay.style.setProperty("max-height", `${visible.height}px`, "important");

  overlay.dataset.claraBuyCheckKeyboardActive = keyboardActive ? "true" : "false";
  overlay.dataset.claraBuyCheckKeyboardInset = String(
    Math.round(visible.keyboardInset)
  );

  if (form) {
    form.style.setProperty("z-index", "60", "important");
  }

  if (messageViewport) {
    const composerHeight = form?.getBoundingClientRect?.().height || 0;
    messageViewport.style.setProperty(
      "scroll-padding-bottom",
      `${Math.max(16, Math.round(composerHeight + 16))}px`,
      "important"
    );
  }

  if (keyboardActive && settle) {
    // Re-measure after the keyboard animation has moved the visual viewport.
    // This second pass is especially important on slower Android devices where
    // the first focus event arrives before the final keyboard height is known.
    window.requestAnimationFrame(() => {
      const currentOverlay = document.querySelector(OVERLAY_SELECTOR);
      const currentForm = currentOverlay?.querySelector(FORM_SELECTOR);
      if (!currentOverlay || !currentForm) return;

      const currentVisible = readVisibleViewport();
      currentOverlay.style.setProperty(
        "top",
        `${currentVisible.top}px`,
        "important"
      );
      currentOverlay.style.setProperty("bottom", "auto", "important");
      currentOverlay.style.setProperty(
        "height",
        `${currentVisible.height}px`,
        "important"
      );
      currentOverlay.style.setProperty(
        "max-height",
        `${currentVisible.height}px`,
        "important"
      );
    });
  }
}

function installClaraBuyCheckKeyboardGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let frame = 0;
  let focusTimerA = 0;
  let focusTimerB = 0;
  let focusTimerC = 0;
  let lastOverlay = null;

  const queueSync = (settle = false) => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const overlay = document.querySelector(OVERLAY_SELECTOR);
      if (lastOverlay && lastOverlay !== overlay) {
        clearOverlayViewportLock(lastOverlay);
      }
      lastOverlay = overlay;
      syncBuyCheckToVisibleViewport({ settle });
    });
  };

  const handleFocusIn = (event) => {
    const target = event.target;
    if (!target?.matches?.("input, textarea, select")) return;
    if (!target.closest?.(OVERLAY_SELECTOR)) return;

    queueSync(true);
    window.clearTimeout(focusTimerA);
    window.clearTimeout(focusTimerB);
    window.clearTimeout(focusTimerC);

    // Follow the Android keyboard opening animation instead of assuming its
    // final size is available on the initial focus event.
    focusTimerA = window.setTimeout(() => queueSync(true), 90);
    focusTimerB = window.setTimeout(() => queueSync(true), 220);
    focusTimerC = window.setTimeout(() => queueSync(true), 420);
  };

  const handleFocusOut = (event) => {
    if (!event.target?.closest?.(OVERLAY_SELECTOR)) return;
    window.setTimeout(() => queueSync(true), 120);
  };

  const handleViewportChange = () => queueSync(false);

  const observer = new MutationObserver(() => queueSync(false));
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  document.addEventListener("focusin", handleFocusIn, true);
  document.addEventListener("focusout", handleFocusOut, true);
  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);

  queueSync(false);

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimerA);
      window.clearTimeout(focusTimerB);
      window.clearTimeout(focusTimerC);
      clearOverlayViewportLock(lastOverlay);
      lastOverlay = null;
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraBuyCheckKeyboardGuard();
