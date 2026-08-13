const RUNTIME_KEY = "__claraBuyCheckKeyboardGuardRuntime__";
const OVERLAY_SELECTOR =
  '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"]';
const FORM_SELECTOR = '[data-clara-buy-check-react-form="true"]';
const VIEWPORT_SELECTOR = '[data-clara-ai-message-viewport="true"]';
const STACK_SELECTOR = '[data-clara-ai-message-stack="true"]';
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

function getConversationRows(stack) {
  if (!stack) return [];

  return Array.from(stack.children).filter((row) => {
    if (!(row instanceof HTMLElement)) return false;
    const bubble = row.firstElementChild;
    if (!(bubble instanceof HTMLElement)) return false;
    return Boolean(bubble.querySelector("span.whitespace-pre-wrap"));
  });
}

function restoreConversationHistory(overlay) {
  if (!overlay) return;

  const stack = overlay.querySelector(STACK_SELECTOR);
  const rows = getConversationRows(stack);

  rows.forEach((row) => {
    row.style.removeProperty("display");
    delete row.dataset.claraBuyCheckOlderTurn;
  });

  if (stack) {
    stack.style.removeProperty("justify-content");
    stack.style.removeProperty("padding-bottom");
  }

  delete overlay.dataset.claraBuyCheckCurrentTurnMode;
}

function focusCurrentConversationTurn(overlay, keyboardActive) {
  if (!overlay) return;

  const stack = overlay.querySelector(STACK_SELECTOR);
  if (!stack) return;

  const rows = getConversationRows(stack);
  if (!keyboardActive || rows.length === 0) {
    restoreConversationHistory(overlay);
    return;
  }

  // Mobile Buy Check should behave like a focused conversation, not a transcript
  // viewer. While the keyboard is open, keep only the newest user turn and the
  // CLARA replies that belong to it. Earlier turns stay in the DOM and are
  // restored as soon as the keyboard closes, so no conversation data is lost.
  let currentTurnStart = -1;
  rows.forEach((row, index) => {
    if (row.classList.contains("justify-end")) currentTurnStart = index;
  });

  if (currentTurnStart < 0) currentTurnStart = Math.max(0, rows.length - 1);

  rows.forEach((row, index) => {
    if (index < currentTurnStart) {
      row.style.setProperty("display", "none", "important");
      row.dataset.claraBuyCheckOlderTurn = "true";
    } else {
      row.style.removeProperty("display");
      delete row.dataset.claraBuyCheckOlderTurn;
    }
  });

  // The composer is a flex sibling of the message viewport, so the current turn
  // can safely sit at the bottom of the viewport with a small breathing gap.
  // This keeps the newest CLARA reply directly above the typing bar instead of
  // leaving old messages between the reply and the composer.
  stack.style.setProperty("justify-content", "flex-end", "important");
  stack.style.setProperty("padding-bottom", "12px", "important");
  overlay.dataset.claraBuyCheckCurrentTurnMode = "true";
}

function scrollCurrentTurnIntoPlace(overlay, { smooth = false } = {}) {
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
    // One more frame catches React bubble reflow and Android keyboard height
    // changes that can happen immediately after a message is committed.
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
  restoreConversationHistory(overlay);
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

  focusCurrentConversationTurn(overlay, keyboardActive);

  if (keyboardActive) {
    scrollCurrentTurnIntoPlace(overlay, { smooth: !settle });
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

      focusCurrentConversationTurn(currentOverlay, true);
      scrollCurrentTurnIntoPlace(currentOverlay);
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
    characterData: true,
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