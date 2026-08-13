const RUNTIME_KEY = "__claraBuyCheckKeyboardGuardRuntime__";
const OVERLAY_SELECTOR =
  '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"]';
const FORM_SELECTOR = '[data-clara-buy-check-react-form="true"]';
const VIEWPORT_SELECTOR = '[data-clara-ai-message-viewport="true"]';
const STACK_SELECTOR = '[data-clara-ai-message-stack="true"]';
const KEYBOARD_THRESHOLD_PX = 80;
const FOLLOW_LATEST_THRESHOLD_PX = 72;

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

function getConversationRows(stack) {
  if (!stack) return [];

  return Array.from(stack.children).filter((row) => {
    if (!(row instanceof HTMLElement)) return false;
    const bubble = row.firstElementChild;
    if (!(bubble instanceof HTMLElement)) return false;
    return Boolean(bubble.querySelector("span.whitespace-pre-wrap"));
  });
}

function restoreFullConversationHistory(overlay) {
  if (!overlay) return;

  const stack = overlay.querySelector(STACK_SELECTOR);
  const rows = getConversationRows(stack);

  // Older versions of this guard hid previous turns while the keyboard was
  // open. Remove every trace of that behavior. Buy Check is a real transcript:
  // every message must remain rendered and reachable by scrolling at all times.
  rows.forEach((row) => {
    row.style.removeProperty("display");
    row.style.removeProperty("margin-top");
    delete row.dataset.claraBuyCheckOlderTurn;
  });

  if (stack) {
    stack.style.removeProperty("justify-content");
    stack.style.removeProperty("padding-bottom");
  }

  delete overlay.dataset.claraBuyCheckCurrentTurnMode;
}

function arrangeConversationForKeyboard(overlay, keyboardActive) {
  if (!overlay) return;

  const stack = overlay.querySelector(STACK_SELECTOR);
  if (!stack) return;

  const rows = getConversationRows(stack);

  // Always restore all turns first in case a user upgraded from the former
  // current-turn-only implementation while the overlay was already mounted.
  rows.forEach((row) => {
    row.style.removeProperty("display");
    delete row.dataset.claraBuyCheckOlderTurn;
    row.style.removeProperty("margin-top");
  });

  if (!keyboardActive) {
    stack.style.removeProperty("justify-content");
    stack.style.removeProperty("padding-bottom");
    delete overlay.dataset.claraBuyCheckCurrentTurnMode;
    return;
  }

  // ChatGPT-style mobile behavior: when the transcript is shorter than the
  // available message viewport, an auto top margin places the whole transcript
  // near the composer. Once the transcript is taller than the viewport, the
  // auto margin naturally collapses to zero, preserving the complete scrollable
  // history above. Nothing is hidden, removed, or recreated.
  stack.style.setProperty("justify-content", "flex-start", "important");
  stack.style.setProperty("padding-bottom", "12px", "important");

  const firstConversationRow = rows[0];
  if (firstConversationRow) {
    firstConversationRow.style.setProperty("margin-top", "auto", "important");
  }

  overlay.dataset.claraBuyCheckCurrentTurnMode = "scrollable-history";
}

function distanceFromBottom(viewport) {
  if (!viewport) return Number.POSITIVE_INFINITY;
  return Math.max(
    0,
    viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
  );
}

function scrollLatestIntoPlace(overlay, { smooth = false } = {}) {
  if (!overlay) return;
  const messageViewport = overlay.querySelector(VIEWPORT_SELECTOR);
  if (!messageViewport) return;

  const scrollToLatest = () => {
    const top = Math.max(0, messageViewport.scrollHeight - messageViewport.clientHeight);
    if (typeof messageViewport.scrollTo === "function") {
      messageViewport.scrollTo({
        top,
        behavior: smooth ? "smooth" : "auto",
      });
    } else {
      messageViewport.scrollTop = top;
    }
  };

  window.requestAnimationFrame(() => {
    scrollToLatest();
    // One more frame catches React bubble reflow and the final Android keyboard
    // resize without discarding any earlier messages.
    window.requestAnimationFrame(scrollToLatest);
  });
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
  restoreFullConversationHistory(overlay);
}

function syncBuyCheckToVisibleViewport({
  settle = false,
  forceLatest = false,
  shouldFollowLatest = true,
} = {}) {
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

  // Android WebView can keep fixed elements attached to the layout viewport
  // while the keyboard reduces the visual viewport. Lock the Buy Check shell to
  // the actual visible area so the composer sits directly above the keyboard.
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

  arrangeConversationForKeyboard(overlay, keyboardActive);

  // Follow the newest message only while the user is already at the bottom (or
  // when focus first opens the keyboard). If they intentionally scroll upward,
  // leave the viewport exactly where they put it so old messages can be read.
  if (keyboardActive && (forceLatest || shouldFollowLatest)) {
    scrollLatestIntoPlace(overlay, { smooth: false });
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

      arrangeConversationForKeyboard(currentOverlay, true);
      if (forceLatest || shouldFollowLatest) {
        scrollLatestIntoPlace(currentOverlay);
      }
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
  let activeMessageViewport = null;
  let followLatest = true;

  const handleMessageViewportScroll = () => {
    if (!activeMessageViewport) return;
    followLatest =
      distanceFromBottom(activeMessageViewport) <= FOLLOW_LATEST_THRESHOLD_PX;
  };

  const bindMessageViewport = (overlay) => {
    const nextViewport = overlay?.querySelector(VIEWPORT_SELECTOR) || null;
    if (nextViewport === activeMessageViewport) return;

    activeMessageViewport?.removeEventListener(
      "scroll",
      handleMessageViewportScroll
    );
    activeMessageViewport = nextViewport;
    followLatest = true;
    activeMessageViewport?.addEventListener(
      "scroll",
      handleMessageViewportScroll,
      { passive: true }
    );
  };

  const queueSync = (settle = false, forceLatest = false) => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const overlay = document.querySelector(OVERLAY_SELECTOR);
      if (lastOverlay && lastOverlay !== overlay) {
        clearOverlayViewportLock(lastOverlay);
      }
      if (overlay !== lastOverlay) followLatest = true;
      lastOverlay = overlay;
      bindMessageViewport(overlay);
      syncBuyCheckToVisibleViewport({
        settle,
        forceLatest,
        shouldFollowLatest: followLatest,
      });
    });
  };

  const handleFocusIn = (event) => {
    const target = event.target;
    if (!target?.matches?.("input, textarea, select")) return;
    if (!target.closest?.(OVERLAY_SELECTOR)) return;

    // Opening the keyboard should start at the newest turn, just like ChatGPT.
    // After this, a manual upward scroll disables auto-follow until the user
    // reaches the bottom again.
    followLatest = true;
    queueSync(true, true);
    window.clearTimeout(focusTimerA);
    window.clearTimeout(focusTimerB);
    window.clearTimeout(focusTimerC);

    // Follow the Android keyboard opening animation instead of assuming its
    // final size is available on the initial focus event.
    focusTimerA = window.setTimeout(() => queueSync(true, true), 90);
    focusTimerB = window.setTimeout(() => queueSync(true, true), 220);
    focusTimerC = window.setTimeout(() => queueSync(true, true), 420);
  };

  const handleFocusOut = (event) => {
    if (!event.target?.closest?.(OVERLAY_SELECTOR)) return;
    window.setTimeout(() => queueSync(true, false), 120);
  };

  const handleViewportChange = () => queueSync(false, false);

  const observer = new MutationObserver(() => queueSync(false, false));
  observer.observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  document.addEventListener("focusin", handleFocusIn, true);
  document.addEventListener("focusout", handleFocusOut, true);
  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);

  queueSync(false, false);

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      activeMessageViewport?.removeEventListener(
        "scroll",
        handleMessageViewportScroll
      );
      activeMessageViewport = null;
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