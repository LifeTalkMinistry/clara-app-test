const RUNTIME_KEY = "__claraBuyCheckKeyboardGuardRuntime__";
const OVERLAY_SELECTOR =
  '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"]';
const FORM_SELECTOR = '[data-clara-buy-check-react-form="true"]';
const VIEWPORT_SELECTOR = '[data-clara-ai-message-viewport="true"]';
const STACK_SELECTOR = '[data-clara-ai-message-stack="true"]';
const KEYBOARD_THRESHOLD_PX = 80;
const FOLLOW_LATEST_THRESHOLD_PX = 72;
const pendingScrollFrames = new WeakMap();
const migratedOverlays = new WeakSet();

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

function isConversationRow(row) {
  if (!(row instanceof HTMLElement)) return false;
  const bubble = row.firstElementChild;
  if (!(bubble instanceof HTMLElement)) return false;
  return Boolean(bubble.querySelector("span.whitespace-pre-wrap"));
}

function findFirstConversationRow(stack) {
  if (!stack) return null;
  for (const row of stack.children) {
    if (isConversationRow(row)) return row;
  }
  return null;
}

function migrateLegacyHiddenHistory(overlay) {
  if (!overlay || migratedOverlays.has(overlay)) return;
  migratedOverlays.add(overlay);

  const stack = overlay.querySelector(STACK_SELECTOR);
  if (!stack) return;

  // One-time cleanup for users upgrading from the former current-turn-only
  // implementation. Do not rescan the entire transcript on every keyboard or
  // message event; long histories must stay cheap to scroll and type in.
  Array.from(stack.children).forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    if (
      row.dataset.claraBuyCheckOlderTurn === "true" ||
      row.style.getPropertyValue("display") === "none"
    ) {
      row.style.removeProperty("display");
      delete row.dataset.claraBuyCheckOlderTurn;
    }
  });

  delete overlay.dataset.claraBuyCheckCurrentTurnMode;
}

function clearKeyboardAnchor(overlay) {
  if (!overlay) return;
  const anchor = overlay.querySelector('[data-clara-buy-check-keyboard-anchor="true"]');
  if (!anchor) return;
  anchor.style.removeProperty("margin-top");
  delete anchor.dataset.claraBuyCheckKeyboardAnchor;
}

function arrangeConversationForKeyboard(overlay, keyboardActive) {
  if (!overlay) return;

  const stack = overlay.querySelector(STACK_SELECTOR);
  if (!stack) return;

  migrateLegacyHiddenHistory(overlay);

  if (!keyboardActive) {
    stack.style.removeProperty("justify-content");
    stack.style.removeProperty("padding-bottom");
    clearKeyboardAnchor(overlay);
    delete overlay.dataset.claraBuyCheckCurrentTurnMode;
    return;
  }

  setImportantStyle(stack, "justify-content", "flex-start");
  setImportantStyle(stack, "padding-bottom", "12px");

  let anchor = overlay.querySelector('[data-clara-buy-check-keyboard-anchor="true"]');
  if (!anchor || !anchor.isConnected) {
    anchor = findFirstConversationRow(stack);
    if (anchor) anchor.dataset.claraBuyCheckKeyboardAnchor = "true";
  }
  if (anchor) setImportantStyle(anchor, "margin-top", "auto");

  overlay.dataset.claraBuyCheckCurrentTurnMode = "scrollable-history";
}

function distanceFromBottom(viewport) {
  if (!viewport) return Number.POSITIVE_INFINITY;
  return Math.max(
    0,
    viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
  );
}

function scrollLatestIntoPlace(overlay) {
  if (!overlay) return;
  const messageViewport = overlay.querySelector(VIEWPORT_SELECTOR);
  if (!messageViewport) return;

  // Streaming replies can mutate text many times per second. Coalesce all of
  // those requests into one two-frame bottom alignment instead of creating a
  // new pair of requestAnimationFrame callbacks for every text chunk.
  if (pendingScrollFrames.has(messageViewport)) return;

  const scrollToLatest = () => {
    const top = Math.max(0, messageViewport.scrollHeight - messageViewport.clientHeight);
    if (Math.abs(messageViewport.scrollTop - top) <= 1) return;
    messageViewport.scrollTop = top;
  };

  const firstFrame = window.requestAnimationFrame(() => {
    scrollToLatest();
    const secondFrame = window.requestAnimationFrame(() => {
      scrollToLatest();
      pendingScrollFrames.delete(messageViewport);
    });
    pendingScrollFrames.set(messageViewport, secondFrame);
  });

  pendingScrollFrames.set(messageViewport, firstFrame);
}

function cancelPendingScroll(viewport) {
  if (!viewport) return;
  const frame = pendingScrollFrames.get(viewport);
  if (frame) window.cancelAnimationFrame(frame);
  pendingScrollFrames.delete(viewport);
}

function clearOverlayViewportLock(overlay) {
  if (!overlay) return;

  ["top", "bottom", "height", "min-height", "max-height"].forEach((property) => {
    overlay.style.removeProperty(property);
  });

  delete overlay.dataset.claraBuyCheckKeyboardActive;
  delete overlay.dataset.claraBuyCheckKeyboardInset;
  delete overlay.dataset.claraBuyCheckCurrentTurnMode;

  const viewport = overlay.querySelector(VIEWPORT_SELECTOR);
  cancelPendingScroll(viewport);
  viewport?.style.removeProperty("scroll-padding-bottom");

  const stack = overlay.querySelector(STACK_SELECTOR);
  stack?.style.removeProperty("justify-content");
  stack?.style.removeProperty("padding-bottom");
  clearKeyboardAnchor(overlay);
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

  setImportantStyle(overlay, "top", `${visible.top}px`);
  setImportantStyle(overlay, "bottom", "auto");
  setImportantStyle(overlay, "height", `${visible.height}px`);
  setImportantStyle(overlay, "min-height", "0px");
  setImportantStyle(overlay, "max-height", `${visible.height}px`);

  overlay.dataset.claraBuyCheckKeyboardActive = keyboardActive ? "true" : "false";
  overlay.dataset.claraBuyCheckKeyboardInset = String(
    Math.round(visible.keyboardInset)
  );

  if (form) setImportantStyle(form, "z-index", "60");

  if (messageViewport) {
    const composerHeight = form?.getBoundingClientRect?.().height || 0;
    setImportantStyle(
      messageViewport,
      "scroll-padding-bottom",
      `${Math.max(16, Math.round(composerHeight + 16))}px`
    );
  }

  arrangeConversationForKeyboard(overlay, keyboardActive);

  if (keyboardActive && (forceLatest || shouldFollowLatest)) {
    scrollLatestIntoPlace(overlay);
  }

  if (keyboardActive && settle) {
    window.requestAnimationFrame(() => {
      const currentOverlay = document.querySelector(OVERLAY_SELECTOR);
      if (!currentOverlay) return;

      const currentVisible = readVisibleViewport();
      setImportantStyle(currentOverlay, "top", `${currentVisible.top}px`);
      setImportantStyle(currentOverlay, "bottom", "auto");
      setImportantStyle(currentOverlay, "height", `${currentVisible.height}px`);
      setImportantStyle(currentOverlay, "max-height", `${currentVisible.height}px`);

      arrangeConversationForKeyboard(currentOverlay, true);
      if (forceLatest || shouldFollowLatest) scrollLatestIntoPlace(currentOverlay);
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
  let transcriptObserver = null;
  let formResizeObserver = null;
  let followLatest = true;

  const handleMessageViewportScroll = () => {
    if (!activeMessageViewport) return;
    followLatest =
      distanceFromBottom(activeMessageViewport) <= FOLLOW_LATEST_THRESHOLD_PX;
  };

  const stopScopedObservers = () => {
    transcriptObserver?.disconnect();
    transcriptObserver = null;
    formResizeObserver?.disconnect();
    formResizeObserver = null;
  };

  const bindOverlay = (overlay) => {
    const nextViewport = overlay?.querySelector(VIEWPORT_SELECTOR) || null;
    if (overlay === lastOverlay && nextViewport === activeMessageViewport) return;

    activeMessageViewport?.removeEventListener(
      "scroll",
      handleMessageViewportScroll
    );
    stopScopedObservers();

    lastOverlay = overlay;
    activeMessageViewport = nextViewport;
    followLatest = true;

    activeMessageViewport?.addEventListener(
      "scroll",
      handleMessageViewportScroll,
      { passive: true }
    );

    if (!overlay) return;

    migrateLegacyHiddenHistory(overlay);

    // Watch only the conversation itself. The old whole-document observer woke
    // up for unrelated React work throughout the app and contributed to typing
    // lag on Android. Character data is still observed here so streamed CLARA
    // replies continue to follow the bottom when the user wants that behavior.
    const transcriptRoot = activeMessageViewport || overlay.querySelector(STACK_SELECTOR);
    if (transcriptRoot) {
      transcriptObserver = new MutationObserver(() => queueSync(false, false));
      transcriptObserver.observe(transcriptRoot, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    const form = overlay.querySelector(FORM_SELECTOR);
    if (form && typeof ResizeObserver !== "undefined") {
      formResizeObserver = new ResizeObserver(() => queueSync(false, false));
      formResizeObserver.observe(form);
    }
  };

  const queueSync = (settle = false, forceLatest = false) => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const overlay = document.querySelector(OVERLAY_SELECTOR);
      if (overlay !== lastOverlay) {
        if (lastOverlay) clearOverlayViewportLock(lastOverlay);
        bindOverlay(overlay);
      }
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

    followLatest = true;
    queueSync(true, true);
    window.clearTimeout(focusTimerA);
    window.clearTimeout(focusTimerB);
    window.clearTimeout(focusTimerC);

    focusTimerA = window.setTimeout(() => queueSync(true, true), 90);
    focusTimerB = window.setTimeout(() => queueSync(true, true), 220);
    focusTimerC = window.setTimeout(() => queueSync(true, true), 420);
  };

  const handleFocusOut = (event) => {
    if (!event.target?.closest?.(OVERLAY_SELECTOR)) return;
    window.setTimeout(() => queueSync(true, false), 120);
  };

  const handleViewportChange = () => queueSync(false, false);

  // This observer is now structural only. Once a Buy Check overlay is mounted,
  // mutations inside that overlay are ignored because its scoped transcript
  // observer owns them. This keeps normal typing and streaming off the global
  // document mutation path.
  const rootObserver = new MutationObserver((mutations) => {
    if (
      lastOverlay &&
      mutations.length > 0 &&
      mutations.every((mutation) =>
        mutation.target instanceof Node ? lastOverlay.contains(mutation.target) : false
      )
    ) {
      return;
    }
    queueSync(false, false);
  });
  const root = document.getElementById("root") || document.body;
  rootObserver.observe(root, {
    childList: true,
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
      rootObserver.disconnect();
      stopScopedObservers();
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      activeMessageViewport?.removeEventListener(
        "scroll",
        handleMessageViewportScroll
      );
      cancelPendingScroll(activeMessageViewport);
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
