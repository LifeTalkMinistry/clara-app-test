const RUNTIME_KEY = "__claraBuyCheckKeyboardGuardRuntime__";
const OVERLAY_SELECTOR =
  '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"][data-clara-buy-check-result-mode]';
const FORM_SELECTOR = '[data-clara-buy-check-react-form="true"]';
const VIEWPORT_SELECTOR = '[data-clara-ai-message-viewport="true"]';
const KEYBOARD_THRESHOLD_PX = 80;

/**
 * Ask Before You Spend keyboard/IME compatibility runtime.
 *
 * Ownership rule:
 * - React conversation code owns transcript position.
 * - This runtime owns only the fixed overlay geometry required by Android/iOS
 *   visualViewport changes while the composer is focused.
 * - Focus, resize, IME animation, and DOM growth must never pull the transcript
 *   to the bottom or otherwise write scrollTop.
 */
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

function setImportantStyle(element, property, value) {
  if (!element) return;
  if (
    element.style.getPropertyValue(property) === value &&
    element.style.getPropertyPriority(property) === "important"
  ) {
    return;
  }
  element.style.setProperty(property, value, "important");
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

  const form = overlay.querySelector(FORM_SELECTOR);
  form?.style.removeProperty("z-index");
}

function releaseKeyboardOwnedGeometry(overlay) {
  if (!overlay) return;
  clearOverlayViewportLock(overlay);
  overlay.dataset.claraBuyCheckKeyboardActive = "false";
  overlay.dataset.claraBuyCheckKeyboardInset = "0";
}

function syncBuyCheckToVisibleViewport() {
  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!overlay) return null;

  const form = overlay.querySelector(FORM_SELECTOR);

  // Once React removes the composer, Buy Check has left keyboard conversation
  // mode. Release every IME-owned inline measurement immediately. Transcript
  // position is deliberately untouched.
  if (!form) {
    releaseKeyboardOwnedGeometry(overlay);
    return overlay;
  }

  const visible = readVisibleViewport();
  const activeElement = document.activeElement;
  const inputFocused = Boolean(
    activeElement &&
      form.contains(activeElement) &&
      activeElement.matches?.("input, textarea, select")
  );
  const keyboardActive = inputFocused || visible.keyboardInset > KEYBOARD_THRESHOLD_PX;

  setImportantStyle(overlay, "top", `${visible.top}px`);
  setImportantStyle(overlay, "bottom", "auto");
  setImportantStyle(overlay, "height", `${visible.height}px`);
  setImportantStyle(overlay, "min-height", "0px");
  setImportantStyle(overlay, "max-height", `${visible.height}px`);

  overlay.dataset.claraBuyCheckKeyboardActive = keyboardActive ? "true" : "false";
  overlay.dataset.claraBuyCheckKeyboardInset = String(Math.round(visible.keyboardInset));

  setImportantStyle(form, "z-index", "60");

  const messageViewport = overlay.querySelector(VIEWPORT_SELECTOR);
  if (messageViewport) {
    const composerHeight = form.getBoundingClientRect?.().height || 0;
    setImportantStyle(
      messageViewport,
      "scroll-padding-bottom",
      `${Math.max(16, Math.round(composerHeight + 16))}px`
    );
  }

  return overlay;
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
      if (overlay !== lastOverlay && lastOverlay) clearOverlayViewportLock(lastOverlay);
      lastOverlay = syncBuyCheckToVisibleViewport();

      if (!settle) return;
      window.requestAnimationFrame(() => {
        const currentOverlay = document.querySelector(OVERLAY_SELECTOR);
        if (currentOverlay !== lastOverlay && lastOverlay) clearOverlayViewportLock(lastOverlay);
        lastOverlay = syncBuyCheckToVisibleViewport();
      });
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

    // Android IME geometry often settles in stages. Re-measure geometry only;
    // none of these passes is permitted to move the transcript.
    focusTimerA = window.setTimeout(() => queueSync(true), 90);
    focusTimerB = window.setTimeout(() => queueSync(true), 220);
    focusTimerC = window.setTimeout(() => queueSync(true), 420);
  };

  const handleFocusOut = (event) => {
    if (!event.target?.closest?.(OVERLAY_SELECTOR)) return;
    window.setTimeout(() => queueSync(true), 120);
  };

  const handleViewportChange = () => queueSync(false);

  document.addEventListener("focusin", handleFocusIn, true);
  document.addEventListener("focusout", handleFocusOut, true);
  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);

  queueSync(false);

  window[RUNTIME_KEY] = {
    destroy() {
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