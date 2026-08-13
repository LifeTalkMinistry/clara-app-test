import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

const RUNTIME_KEY = "__claraOrbChatHandoffRuntime__";
const READY_FLAG = "claraOrbTransitionReady";
const MAX_HANDOFF_AGE_MS = 2200;

function safeAnimate(element, keyframes, options) {
  if (!element || typeof element.animate !== "function") return null;

  try {
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function maximumRevealRadius(centerX, centerY) {
  const width = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0);
  const height = Math.max(window.innerHeight || 0, document.documentElement?.clientHeight || 0);
  const farX = Math.max(centerX, Math.max(0, width - centerX));
  const farY = Math.max(centerY, Math.max(0, height - centerY));
  return Math.hypot(farX, farY) + 48;
}

function animateOrbToChat(overlay, origin) {
  if (!overlay || !origin) return () => {};
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

  touched.forEach((element) => {
    element.style.willChange = "transform, opacity, filter, clip-path";
  });

  const centerX = clamp(origin.centerX, 0, window.innerWidth || origin.centerX);
  const centerY = clamp(origin.centerY, 0, window.innerHeight || origin.centerY);
  const startRadius = Math.max(34, Math.min(origin.width, origin.height) * 0.34);
  const endRadius = maximumRevealRadius(centerX, centerY);

  // Continue the Orb's expanding glow into the actual full-screen CLARA surface.
  // The overlay is clipped around the exact Orb center first, so there is no
  // separate full-screen panel pop between the two states.
  remember(
    safeAnimate(
      overlay,
      [
        {
          clipPath: `circle(${startRadius}px at ${centerX}px ${centerY}px)`,
          opacity: 0.76,
          filter: "brightness(1.22) saturate(1.14)",
          offset: 0,
        },
        {
          clipPath: `circle(${Math.max(startRadius * 1.72, 132)}px at ${centerX}px ${centerY}px)`,
          opacity: 0.94,
          filter: "brightness(1.13) saturate(1.08)",
          offset: 0.25,
        },
        {
          clipPath: `circle(${endRadius}px at ${centerX}px ${centerY}px)`,
          opacity: 1,
          filter: "brightness(1) saturate(1)",
          offset: 1,
        },
      ],
      {
        duration: 590,
        easing: "cubic-bezier(0.16, 0.82, 0.22, 1)",
        fill: "both",
      }
    )
  );

  if (board) {
    const boardRect = board.getBoundingClientRect();
    const boardCenterX = boardRect.left + boardRect.width / 2;
    const boardCenterY = boardRect.top + boardRect.height / 2;
    const translateX = centerX - boardCenterX;
    const translateY = centerY - boardCenterY;
    const uniformScale = clamp(
      Math.min(
        origin.width / Math.max(boardRect.width, 1),
        origin.height / Math.max(boardRect.height, 1)
      ),
      0.62,
      0.94
    );

    board.style.transformOrigin = "center center";

    // This is the important shared-object handoff: the first Buy Check card
    // begins where the Orb ended, then settles into its real layout position.
    remember(
      safeAnimate(
        board,
        [
          {
            transform: `translate(${translateX}px, ${translateY}px) scale(${uniformScale})`,
            borderRadius: "999px",
            opacity: 0.08,
            filter: "brightness(1.65) saturate(1.28) blur(0.7px)",
            offset: 0,
          },
          {
            transform: `translate(${translateX * 0.34}px, ${translateY * 0.34}px) scale(0.985)`,
            borderRadius: "52px",
            opacity: 0.88,
            filter: "brightness(1.18) saturate(1.08) blur(0px)",
            offset: 0.58,
          },
          {
            transform: "translate(0px, 0px) scale(1)",
            borderRadius: "30px",
            opacity: 1,
            filter: "brightness(1) saturate(1) blur(0px)",
            offset: 1,
          },
        ],
        {
          duration: 610,
          easing: "cubic-bezier(0.18, 0.86, 0.22, 1)",
          fill: "both",
        }
      )
    );
  }

  // Keep the board itself as the transforming object, then reveal its contents
  // in order. This prevents the fully populated card from appearing all at once.
  remember(
    safeAnimate(
      buyCheckLabel,
      [
        { transform: "translateY(5px)", opacity: 0, letterSpacing: "0.30em" },
        { transform: "translateY(0px)", opacity: 1, letterSpacing: "0.22em" },
      ],
      {
        duration: 260,
        delay: 150,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      acknowledgmentPanel,
      [
        { transform: "translateY(13px) scale(0.965)", opacity: 0 },
        { transform: "translateY(0px) scale(1)", opacity: 1 },
      ],
      {
        duration: 340,
        delay: 205,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      acknowledgmentCopy,
      [
        { transform: "translateY(4px)", opacity: 0, filter: "blur(2px)" },
        { transform: "translateY(0px)", opacity: 1, filter: "blur(0px)" },
      ],
      {
        duration: 300,
        delay: 255,
        easing: "ease-out",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      activeQuestion,
      [
        { transform: "translateY(11px)", opacity: 0, filter: "blur(1.6px)" },
        { transform: "translateY(0px)", opacity: 1, filter: "blur(0px)" },
      ],
      {
        duration: 350,
        delay: 315,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    )
  );

  // The composer is the final piece to arrive, making the transition read as
  // "CLARA became the conversation" rather than "a modal appeared".
  remember(
    safeAnimate(
      form,
      [
        { transform: "translateY(38px) scale(0.972)", opacity: 0 },
        { transform: "translateY(-2px) scale(1.004)", opacity: 1, offset: 0.78 },
        { transform: "translateY(0px) scale(1)", opacity: 1, offset: 1 },
      ],
      {
        duration: 430,
        delay: 330,
        easing: "cubic-bezier(0.18, 0.86, 0.22, 1)",
        fill: "both",
      }
    )
  );

  remember(
    safeAnimate(
      closeButton,
      [
        { transform: "scale(0.48) rotate(-20deg)", opacity: 0 },
        { transform: "scale(1.06) rotate(2deg)", opacity: 1, offset: 0.74 },
        { transform: "scale(1) rotate(0deg)", opacity: 1, offset: 1 },
      ],
      {
        duration: 330,
        delay: 405,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
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
      element.style.removeProperty("transform-origin");
    });
  }, 1050);

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
      element.style.removeProperty("transform-origin");
    });
  };
}

function installClaraOrbChatHandoff() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let pending = null;
  let cleanupAnimation = null;
  let clearPendingTimer = 0;
  let queued = false;

  const clearAnimation = () => {
    cleanupAnimation?.();
    cleanupAnimation = null;
  };

  const clearPending = () => {
    pending = null;
    window.clearTimeout(clearPendingTimer);
    clearPendingTimer = 0;
  };

  const tryHandoff = () => {
    queued = false;
    if (!pending) return;

    if (Date.now() - pending.capturedAt > MAX_HANDOFF_AGE_MS) {
      clearPending();
      return;
    }

    const overlay = document.querySelector(
      '[data-clara-pause-overlay="true"][data-clara-buy-check-react-owner="true"]'
    );
    if (!overlay) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reducedMotion) {
      clearAnimation();
      cleanupAnimation = animateOrbToChat(overlay, pending.origin);
    }

    clearPending();
  };

  const queueHandoff = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(tryHandoff);
  };

  const handlePauseOpenRequest = (event) => {
    const detail = event?.detail || {};
    if (detail?.[READY_FLAG] !== true) return;
    if (detail?.source !== "clara-orb-page") return;

    const launcher = document.querySelector('[data-clara-orb-launcher="true"]');
    if (!launcher) return;

    pending = {
      requestId: detail.requestId || "",
      capturedAt: Date.now(),
      origin: rectSnapshot(launcher.getBoundingClientRect()),
    };

    window.clearTimeout(clearPendingTimer);
    clearPendingTimer = window.setTimeout(clearPending, MAX_HANDOFF_AGE_MS + 120);
    queueHandoff();
  };

  const observer = new MutationObserver(queueHandoff);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      window.removeEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);
      window.clearTimeout(clearPendingTimer);
      clearAnimation();
      pending = null;
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbChatHandoff();
