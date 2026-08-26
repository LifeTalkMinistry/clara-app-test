import { CLARA_ORB_COMMAND_SELECT_EVENT } from "@/lib/clara-orb-command-ring";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

const RUNTIME_KEY = "__claraOrbChatHandoffRuntime__";
const READY_FLAG = "claraOrbTransitionReady";
const MAX_HANDOFF_AGE_MS = 2200;
const COPY_EXIT_LEAD_MS = 72;
const OVERLAY_CANDIDATE_SELECTOR =
  '[data-clara-pause-overlay="true"], [data-clara-weekly-cross-check-chat="true"]';
const CHAT_HEADER_SELECTOR =
  '[data-clara-chat-header="true"], [data-clara-buy-check-header="true"]';
const ORB_COMPOSITION_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-composition="true"]';
const ORB_LAUNCHER_SELECTOR = '[data-clara-orb-launcher="true"]';

function safeAnimate(element, keyframes, options) {
  if (!element || typeof element.animate !== "function") return null;

  try {
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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

function resolveChatOverlay() {
  const candidates = [...document.querySelectorAll(OVERLAY_CANDIDATE_SELECTOR)].filter(
    (candidate) => candidate.querySelector(CHAT_HEADER_SELECTOR)
  );

  if (!candidates.length) return null;

  // Prefer the most recently mounted matching chat surface. This avoids a
  // hidden legacy pause surface winning ownership if more than one candidate
  // temporarily exists during a React handoff.
  return candidates[candidates.length - 1] || null;
}

function resolveDirectForm(overlay) {
  if (!overlay) return null;
  return [...overlay.children].find((child) => child?.tagName === "FORM") || null;
}

function resolveChatRegions(overlay) {
  const sharedHeader = overlay.querySelector('[data-clara-chat-header="true"]');
  const legacyBuyCheckHeader = overlay.querySelector('[data-clara-buy-check-header="true"]');
  const header = sharedHeader || legacyBuyCheckHeader || null;
  const closeButton =
    header?.querySelector(
      '[data-clara-chat-close="true"], button[aria-label^="Close "]'
    ) || null;
  const viewport =
    overlay.querySelector(
      '[data-clara-chat-viewport="true"], [data-clara-ai-message-viewport="true"]'
    ) || overlay.querySelector("main");
  const primaryContent =
    overlay.querySelector(
      '[data-clara-chat-primary-content="true"], [data-clara-pause-entry-board="true"], [data-clara-ai-message-stack="true"]'
    ) ||
    viewport?.firstElementChild ||
    null;
  const rawComposer =
    overlay.querySelector(
      '[data-clara-chat-composer="true"], form[data-clara-buy-check-react-form="true"]'
    ) || resolveDirectForm(overlay);
  const composer =
    rawComposer && primaryContent?.contains(rawComposer) ? null : rawComposer || null;

  const legacyBoard = overlay.querySelector('[data-clara-pause-entry-board="true"]');
  const buyCheckLabel = legacyBoard?.querySelector(":scope > p") || null;
  const activeQuestion =
    legacyBoard?.querySelector('[data-clara-buy-check-active-question="true"]') || null;
  const acknowledgmentPanel = activeQuestion?.previousElementSibling || null;
  const acknowledgmentCopy = acknowledgmentPanel?.querySelector("p") || null;

  return {
    sharedHeader,
    legacyBuyCheckHeader,
    header,
    closeButton,
    viewport,
    primaryContent,
    composer,
    legacyBoard,
    buyCheckLabel,
    activeQuestion,
    acknowledgmentPanel,
    acknowledgmentCopy,
  };
}

function hideOrbHomeCopyImmediately() {
  const composition = document.querySelector(ORB_COMPOSITION_SELECTOR);
  if (!composition) return () => {};

  const statusCopy = composition.querySelector(".clara-orb-status-copy");
  const idleCopy = composition.querySelector(".clara-orb-idle-copy");
  const hiddenCopy = [statusCopy, idleCopy].filter(Boolean);

  hiddenCopy.forEach((element) => {
    element.style.opacity = "0";
    element.style.visibility = "hidden";
    element.style.pointerEvents = "none";
  });

  return () => {
    hiddenCopy.forEach((element) => {
      element.style.removeProperty("opacity");
      element.style.removeProperty("visibility");
      element.style.removeProperty("pointer-events");
    });
  };
}

function delayOrbLaunchMotion() {
  const launcher = document.querySelector(ORB_LAUNCHER_SELECTOR);
  const orbVisual = launcher?.querySelector?.(".clara-orb-asset-shell");
  if (!orbVisual) return () => {};

  // The copy exits first. Only after that clean frame may the Orb perform its
  // launch animation. This prevents the tap from reading as one busy combined motion.
  orbVisual.style.animationDelay = `${COPY_EXIT_LEAD_MS}ms`;

  return () => {
    orbVisual.style.removeProperty("animation-delay");
  };
}

function animateOrbHomeExit({ hideCopy = true } = {}) {
  const composition = document.querySelector(ORB_COMPOSITION_SELECTOR);
  if (!composition) return () => {};

  const launcher = composition.querySelector(ORB_LAUNCHER_SELECTOR);
  const cleanupCopy = hideCopy ? hideOrbHomeCopyImmediately() : () => {};
  const animations = [];

  if (launcher) {
    launcher.style.willChange = "transform, opacity";
    const animation = safeAnimate(
      launcher,
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(0.985)", opacity: 0 },
      ],
      {
        duration: 135,
        delay: COPY_EXIT_LEAD_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    );
    if (animation) animations.push(animation);
  }

  return () => {
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // Ignore cleanup failures from detached nodes.
      }
    });

    cleanupCopy();
    launcher?.style.removeProperty("will-change");
  };
}

function animateOrbToChat(overlay) {
  if (!overlay) return () => {};
  if (overlay.dataset.claraOrbChatHandoffPlayed === "true") return () => {};

  overlay.dataset.claraOrbChatHandoffPlayed = "true";

  const {
    sharedHeader,
    closeButton,
    primaryContent,
    composer,
    legacyBoard,
    buyCheckLabel,
    activeQuestion,
    acknowledgmentPanel,
    acknowledgmentCopy,
  } = resolveChatRegions(overlay);

  const contentSurface = legacyBoard || primaryContent;
  const animations = [];
  const touched = [
    overlay,
    sharedHeader,
    contentSurface,
    composer,
    closeButton,
    buyCheckLabel,
    acknowledgmentPanel,
    acknowledgmentCopy,
    activeQuestion,
  ].filter(Boolean);

  const remember = (animation) => {
    if (animation) animations.push(animation);
  };

  overlay.style.willChange = "opacity";
  [
    sharedHeader,
    contentSurface,
    composer,
    closeButton,
    buyCheckLabel,
    acknowledgmentPanel,
    acknowledgmentCopy,
    activeQuestion,
  ]
    .filter(Boolean)
    .forEach((element) => {
      element.style.willChange = "transform, opacity";
    });

  // Canonical destination takeover: the full chat surface fades into ownership.
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

  // Shared CLARA Chat headers enter as part of the same handoff. Ask Before You
  // Spend keeps its legacy zero-height header shell, so its existing close-only
  // entrance remains visually unchanged.
  remember(
    safeAnimate(
      sharedHeader,
      [
        { transform: "translateY(-8px)", opacity: 0 },
        { transform: "translateY(0px)", opacity: 1 },
      ],
      {
        duration: 240,
        delay: 35,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  // Every conversational destination gets the same main-surface rise used by
  // Ask Before You Spend's opening board. The semantic target may be a message
  // stack or a feature-specific first conversation surface.
  remember(
    safeAnimate(
      contentSurface,
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

  // Preserve the finer Ask Before You Spend choreography when those optional
  // sub-regions exist. Other CLARA chats do not need to impersonate Buy Check.
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
      composer,
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
  let cleanupTapLead = null;
  let cleanupLaunchDelay = null;
  let homeRestoreTimer = 0;
  let clearPendingTimer = 0;
  let queued = false;
  let pendingObserver = null;

  const clearAnimation = () => {
    cleanupAnimation?.();
    cleanupAnimation = null;
  };

  const clearTapLead = () => {
    cleanupTapLead?.();
    cleanupTapLead = null;
    cleanupLaunchDelay?.();
    cleanupLaunchDelay = null;
  };

  const beginHomeLead = () => {
    if (prefersReducedMotion()) return;
    clearTapLead();
    cleanupTapLead = hideOrbHomeCopyImmediately();
    cleanupLaunchDelay = delayOrbLaunchMotion();
  };

  const clearHomeExit = () => {
    window.clearTimeout(homeRestoreTimer);
    homeRestoreTimer = 0;
    cleanupHomeExit?.();
    cleanupHomeExit = null;
    clearTapLead();
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

    const overlay = resolveChatOverlay();
    if (!overlay) return;

    if (!prefersReducedMotion()) {
      clearAnimation();
      cleanupAnimation = animateOrbToChat(overlay);
      homeRestoreTimer = window.setTimeout(clearHomeExit, 390);
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

  const handleOrbClickCapture = (event) => {
    const launcher = event.target?.closest?.(ORB_LAUNCHER_SELECTOR);
    if (!launcher || launcher.disabled) return;
    if (!launcher.closest?.(ORB_COMPOSITION_SELECTOR)) return;

    // Direct Ask Before You Spend taps get the same clean copy-first lead.
    beginHomeLead();
  };

  const handleCommandSelectLead = () => {
    // Radial commands do not reliably emit the same launcher click as the direct
    // Buy Check tap. Arm the identical copy-first lead when the command is
    // actually committed, before routing dispatches the pause-open request.
    beginHomeLead();
  };

  const handlePauseOpenRequest = (event) => {
    const detail = event?.detail || {};
    if (detail?.[READY_FLAG] !== true) return;
    if (detail?.source !== "clara-orb-page") return;

    const launcher = document.querySelector(ORB_LAUNCHER_SELECTOR);
    if (!launcher) return;

    cleanupHomeExit?.();
    cleanupHomeExit = null;
    if (!prefersReducedMotion()) {
      // Direct taps and radial command selection both arm the copy-first lead
      // before the canonical Orb launch. Keep that state and finish only the
      // Orb-side exit here.
      cleanupHomeExit = animateOrbHomeExit({ hideCopy: !cleanupTapLead });
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

    startPendingObserver();
    queueHandoff();
  };

  document.addEventListener("click", handleOrbClickCapture, true);
  window.addEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleCommandSelectLead);
  window.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);

  window[RUNTIME_KEY] = {
    destroy() {
      stopPendingObserver();
      document.removeEventListener("click", handleOrbClickCapture, true);
      window.removeEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleCommandSelectLead);
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
