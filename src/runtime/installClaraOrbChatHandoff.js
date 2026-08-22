import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

const RUNTIME_KEY = "__claraOrbChatHandoffRuntime__";
const READY_FLAG = "claraOrbTransitionReady";
const MAX_HANDOFF_AGE_MS = 2200;
const OVERLAY_SELECTOR =
  '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"]';
const ORB_COMPOSITION_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-composition="true"]';

function safeAnimate(element, keyframes, options) {
  if (!element || typeof element.animate !== "function") return null;

  try {
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

function rectSnapshot(rect) {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  };
}

function animateOrbHomeExit() {
  const composition = document.querySelector(ORB_COMPOSITION_SELECTOR);
  if (!composition) return () => {};

  const statusCopy = composition.querySelector(".clara-orb-status-copy");
  const launcher = composition.querySelector('[data-clara-orb-launcher="true"]');
  const idleCopy = composition.querySelector(".clara-orb-idle-copy");
  const elements = [statusCopy, launcher, idleCopy].filter(Boolean);
  const animations = [];

  elements.forEach((element) => {
    element.style.willChange = "transform, opacity";
  });

  const remember = (animation) => {
    if (animation) animations.push(animation);
  };

  // Exit the Orb/home state immediately when the handoff begins so the old
  // greeting, Orb, tagline, and Means Score never sit behind the incoming chat.
  remember(
    safeAnimate(
      statusCopy,
      [
        { transform: "translateY(0px)", opacity: 1 },
        { transform: "translateY(-4px)", opacity: 0 },
      ],
      {
        duration: 105,
        easing: "ease-out",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      launcher,
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(0.985)", opacity: 0 },
      ],
      {
        duration: 135,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      idleCopy,
      [
        { transform: "translateY(0px)", opacity: 1 },
        { transform: "translateY(4px)", opacity: 0 },
      ],
      {
        duration: 115,
        easing: "ease-out",
        fill: "both",
      }
    )
  );

  return () => {
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // Ignore cleanup failures from detached nodes.
      }
    });
    elements.forEach((element) => {
      element.style.removeProperty("will-change");
    });
  };
}

function animateOrbToChat(overlay) {
  if (!overlay) return () => {};
  if (overlay.dataset.claraOrbChatHandoffPlayed === "true") return () => {};

  overlay.dataset.claraOrbChatHandoffPlayed = "true";

  const board = overlay.querySelector('[data-clara-pause-entry-board="true"]');
  const form = overlay.querySelector('[data-clara-buy-check-react-form="true"]');
  const closeButton = overlay.querySelector(
    '[data-clara-buy-check-header="true"] > button[aria-label="Close CLARA Ask Before You Spend"]'
  );
  const buyCheckLabel = board?.querySelector(":scope > p") || null;
  const activeQuestion = board?.querySelector('[data-clara-buy-check-active-question="true"]') || null;
  const acknowledgmentPanel = activeQuestion?.previousElementSibling || null;
  const acknowledgmentCopy = acknowledgmentPanel?.querySelector("p") || null;
  const mainViewport = overlay.querySelector('[data-clara-ai-message-viewport="true"]');

  const animations = [];
  const touched = [
    overlay,
    board,
    form,
    closeButton,
    buyCheckLabel,
    acknowledgmentPanel,
    acknowledgmentCopy,
    activeQuestion,
    mainViewport,
  ].filter(Boolean);

  const remember = (animation) => {
    if (animation) animations.push(animation);
  };

  // Keep this handoff deliberately restrained. The Orb is the visual anchor;
  // the destination should simply settle into place instead of expanding from
  // the Orb as a giant circular wipe.
  overlay.style.willChange = "opacity";
  [board, form, closeButton, buyCheckLabel, acknowledgmentPanel, acknowledgmentCopy, activeQuestion]
    .filter(Boolean)
    .forEach((element) => {
      element.style.willChange = "transform, opacity";
    });

  remember(
    safeAnimate(
      overlay,
      [
        { opacity: 0 },
        { opacity: 1 },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      board,
      [
        { transform: "translateY(14px) scale(0.992)", opacity: 0 },
        { transform: "translateY(0px) scale(1)", opacity: 1 },
      ],
      {
        duration: 320,
        delay: 35,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      buyCheckLabel,
      [
        { transform: "translateY(4px)", opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      {
        duration: 220,
        delay: 95,
        easing: "ease-out",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      acknowledgmentPanel,
      [
        { transform: "translateY(8px)", opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      {
        duration: 250,
        delay: 125,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      acknowledgmentCopy,
      [
        { transform: "translateY(3px)", opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      {
        duration: 220,
        delay: 155,
        easing: "ease-out",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      activeQuestion,
      [
        { transform: "translateY(7px)", opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      {
        duration: 250,
        delay: 175,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      form,
      [
        { transform: "translateY(16px)", opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      {
        duration: 280,
        delay: 190,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      closeButton,
      [
        { transform: "scale(0.92)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      {
        duration: 210,
        delay: 115,
        easing: "ease-out",
        fill: "both",
      }
    )
  );

  const cleanupTimer = window.setTimeout(() => {
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // Natural end state already matches the live React layout.
      }
    });

    touched.forEach((element) => {
      element.style.removeProperty("will-change");
    });
  }, 720);

  return () => {
    window.clearTimeout(cleanupTimer);
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // Ignore cleanup failures from detached nodes.
      }
    });
    touched.forEach((element) => {
      element.style.removeProperty("will-change");
    });
  };
}

function installClaraOrbChatHandoff() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let pending = null;
  let cleanupAnimation = null;
  let cleanupHomeExit = null;
  let clearPendingTimer = 0;
  let queued = false;
  let pendingObserver = null;

  const clearAnimation = () => {
    cleanupAnimation?.();
    cleanupAnimation = null;
  };

  const clearHomeExit = () => {
    cleanupHomeExit?.();
    cleanupHomeExit = null;
  };

  const stopPendingObserver = () => {
    pendingObserver?.disconnect();
    pendingObserver = null;
  };

  const clearPending = () => {
    pending = null;
    window.clearTimeout(clearPendingTimer);
    clearPendingTimer = 0;
    stopPendingObserver();
  };

  const tryHandoff = () => {
    queued = false;
    if (!pending) return;

    if (Date.now() - pending.capturedAt > MAX_HANDOFF_AGE_MS) {
      clearHomeExit();
      clearPending();
      return;
    }

    const overlay = document.querySelector(OVERLAY_SELECTOR);
    if (!overlay) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reducedMotion) {
      clearAnimation();
      cleanupAnimation = animateOrbToChat(overlay);
    } else {
      clearHomeExit();
    }

    clearPending();
  };

  const queueHandoff = () => {
    if (queued || !pending) return;
    queued = true;
    window.requestAnimationFrame(tryHandoff);
  };

  const startPendingObserver = () => {
    stopPendingObserver();
    pendingObserver = new MutationObserver(queueHandoff);
    const root = document.getElementById("root") || document.body;
    pendingObserver.observe(root, {
      childList: true,
      subtree: true,
    });
  };

  const handlePauseOpenRequest = (event) => {
    const detail = event?.detail || {};
    if (detail?.[READY_FLAG] !== true) return;
    if (detail?.source !== "clara-orb-page") return;

    const launcher = document.querySelector('[data-clara-orb-launcher="true"]');
    if (!launcher) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    clearHomeExit();
    if (!reducedMotion) {
      cleanupHomeExit = animateOrbHomeExit();
    }

    pending = {
      requestId: detail.requestId || "",
      capturedAt: Date.now(),
      origin: rectSnapshot(launcher.getBoundingClientRect()),
    };

    window.clearTimeout(clearPendingTimer);
    clearPendingTimer = window.setTimeout(() => {
      clearHomeExit();
      clearPending();
    }, MAX_HANDOFF_AGE_MS + 120);

    // Observe React only during the brief handoff window. The previous permanent
    // whole-document observer woke up on every chat render even long after the
    // opening transition had finished.
    startPendingObserver();
    queueHandoff();
  };

  window.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);

  window[RUNTIME_KEY] = {
    destroy() {
      stopPendingObserver();
      window.removeEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);
      window.clearTimeout(clearPendingTimer);
      clearAnimation();
      clearHomeExit();
      pending = null;
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbChatHandoff();