import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

const STYLE_ID = "clara-orb-launch-transition-style";
const ACTIVE_CLASS = "clara-orb-launch-transition-active";
const READY_FLAG = "claraOrbTransitionReady";
const OPEN_DELAY_MS = 620;
const CLEANUP_DELAY_MS = 980;

function ensureLaunchTransitionStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] {
      z-index: 30;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-asset-shell {
      overflow: visible !important;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-asset-shell::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 84%;
      height: 84%;
      border: 2px solid rgba(80, 199, 255, 0.86);
      border-radius: 50%;
      opacity: 0;
      pointer-events: none;
      box-shadow:
        -18px 0 36px rgba(22, 139, 255, 0.34),
        18px 0 36px rgba(243, 38, 69, 0.28),
        0 0 26px rgba(78, 168, 255, 0.24),
        inset -8px 0 24px rgba(243, 38, 69, 0.10),
        inset 8px 0 24px rgba(22, 139, 255, 0.12);
      transform: translate(-50%, -50%) scaleX(1) scaleY(1);
      transform-origin: center;
      will-change: transform, border-radius, opacity, box-shadow;
      animation: clara-orb-chat-bloom 720ms cubic-bezier(0.22, 1, 0.36, 1) 130ms both;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > rect {
      transform-box: fill-box;
      transform-origin: center;
      will-change: transform, opacity;
      animation: clara-orb-eye-close 240ms cubic-bezier(0.4, 0, 1, 1) both;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > path {
      transform-box: view-box;
      transform-origin: 160px 153px;
      will-change: transform, opacity;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > path:nth-of-type(1) {
      animation: clara-orb-segment-spin 610ms cubic-bezier(0.2, 0.8, 0.2, 1) 150ms both;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > path:nth-of-type(2) {
      animation: clara-orb-segment-spin 610ms cubic-bezier(0.2, 0.8, 0.2, 1) 180ms both;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > circle:nth-of-type(1) {
      transform-box: view-box;
      transform-origin: 160px 153px;
      animation: clara-orb-soft-glow-release 600ms ease-out 150ms both;
    }

    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > circle:nth-of-type(2),
    html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > circle:nth-of-type(3) {
      transform-box: view-box;
      transform-origin: 160px 153px;
      animation: clara-orb-core-dissolve 500ms ease-in 170ms both;
    }

    @keyframes clara-orb-eye-close {
      0% {
        transform: scaleY(1);
        opacity: 1;
      }
      52% {
        transform: scaleY(0.16);
        opacity: 0.92;
      }
      100% {
        transform: scaleY(0.015);
        opacity: 0;
      }
    }

    @keyframes clara-orb-segment-spin {
      0% {
        transform: rotate(0deg) scale(1);
        opacity: 1;
      }
      30% {
        transform: rotate(110deg) scale(0.99);
        opacity: 1;
      }
      78% {
        transform: rotate(395deg) scale(1.015);
        opacity: 0.96;
      }
      100% {
        transform: rotate(470deg) scale(0.90);
        opacity: 0.12;
      }
    }

    @keyframes clara-orb-core-dissolve {
      0%, 24% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(0.88);
        opacity: 0;
      }
    }

    @keyframes clara-orb-soft-glow-release {
      0% {
        transform: scale(1);
        opacity: 0.20;
      }
      100% {
        transform: scale(1.52);
        opacity: 0;
      }
    }

    @keyframes clara-orb-chat-bloom {
      0% {
        transform: translate(-50%, -50%) scaleX(0.96) scaleY(0.96);
        border-radius: 50%;
        opacity: 0;
        box-shadow:
          -10px 0 22px rgba(22, 139, 255, 0.18),
          10px 0 22px rgba(243, 38, 69, 0.14),
          0 0 12px rgba(78, 168, 255, 0.12);
      }
      18% {
        opacity: 0.92;
      }
      62% {
        transform: translate(-50%, -50%) scaleX(1.30) scaleY(1.78);
        border-radius: 38px;
        opacity: 0.76;
        box-shadow:
          -28px 0 58px rgba(22, 139, 255, 0.40),
          28px 0 58px rgba(243, 38, 69, 0.32),
          0 0 52px rgba(66, 153, 255, 0.30),
          inset -10px 0 30px rgba(243, 38, 69, 0.10),
          inset 10px 0 30px rgba(22, 139, 255, 0.14);
      }
      100% {
        transform: translate(-50%, -50%) scaleX(1.48) scaleY(2.54);
        border-radius: 28px;
        opacity: 0;
        box-shadow:
          -38px 0 88px rgba(22, 139, 255, 0.34),
          38px 0 88px rgba(243, 38, 69, 0.28),
          0 0 86px rgba(66, 153, 255, 0.24);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-asset-shell::after,
      html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > rect,
      html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > path,
      html.${ACTIVE_CLASS} [data-clara-orb-launcher="true"] .clara-orb-vector > circle {
        animation: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

export function installClaraOrbLaunchTransition() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  if (window.__claraOrbLaunchTransitionInstalled) {
    return () => {};
  }

  window.__claraOrbLaunchTransitionInstalled = true;
  ensureLaunchTransitionStyles();

  let redispatchTimer = 0;
  let cleanupTimer = 0;

  const clearActiveState = () => {
    document.documentElement.classList.remove(ACTIVE_CLASS);
  };

  const handlePauseOpenRequest = (event) => {
    const detail = event?.detail || {};

    if (detail?.[READY_FLAG] === true) return;
    if (detail?.source !== "clara-orb-page") return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) return;

    const launcher = document.querySelector('[data-clara-orb-launcher="true"]');
    if (!launcher) return;

    event.stopImmediatePropagation();

    window.clearTimeout(redispatchTimer);
    window.clearTimeout(cleanupTimer);
    clearActiveState();

    // Force a clean restart if the user re-enters the Orb page quickly.
    void document.documentElement.offsetWidth;
    document.documentElement.classList.add(ACTIVE_CLASS);

    const forwardedDetail = {
      ...detail,
      [READY_FLAG]: true,
      source: "clara-orb-page",
    };

    redispatchTimer = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
          detail: forwardedDetail,
        })
      );
    }, OPEN_DELAY_MS);

    cleanupTimer = window.setTimeout(() => {
      clearActiveState();
    }, CLEANUP_DELAY_MS);
  };

  window.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);

  return () => {
    window.clearTimeout(redispatchTimer);
    window.clearTimeout(cleanupTimer);
    clearActiveState();
    window.removeEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);
    window.__claraOrbLaunchTransitionInstalled = false;
  };
}
