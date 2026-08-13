import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";

const READY_FLAG = "claraOrbTransitionReady";
const OPEN_DELAY_MS = 820;
const CLEANUP_DELAY_MS = 1180;

function safeAnimate(element, keyframes, options) {
  if (!element || typeof element.animate !== "function") return null;

  try {
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

function createBloomLayer(launcher) {
  const existing = launcher.querySelector('[data-clara-orb-bloom-layer="true"]');
  if (existing) existing.remove();

  const bloom = document.createElement("span");
  bloom.setAttribute("data-clara-orb-bloom-layer", "true");
  bloom.setAttribute("aria-hidden", "true");

  Object.assign(bloom.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "72%",
    height: "72%",
    borderRadius: "999px",
    border: "2px solid rgba(92, 207, 255, 0.92)",
    background:
      "linear-gradient(115deg, rgba(22,139,255,0.13), rgba(28,73,255,0.05) 46%, rgba(243,38,69,0.11))",
    boxShadow:
      "-24px 0 58px rgba(22,139,255,0.46), 24px 0 58px rgba(243,38,69,0.38), 0 0 46px rgba(63,157,255,0.30), inset 10px 0 26px rgba(22,139,255,0.12), inset -10px 0 26px rgba(243,38,69,0.10)",
    opacity: "0",
    pointerEvents: "none",
    transform: "translate(-50%, -50%) scale(0.82)",
    transformOrigin: "center",
    zIndex: "8",
    willChange: "transform, opacity, width, height, border-radius, box-shadow",
  });

  launcher.appendChild(bloom);
  return bloom;
}

function resolveCopyElements(launcher) {
  const greetingBlock = launcher.previousElementSibling;
  const ctaBlock = launcher.nextElementSibling;

  return {
    greetingLabel:
      greetingBlock?.querySelector('[data-clara-orb-user-greeting="true"]') ||
      greetingBlock?.querySelector("p") ||
      null,
    greetingRule: greetingBlock?.querySelector("div") || null,
    ctaTitle: ctaBlock?.querySelector("h1") || null,
    ctaHint: ctaBlock?.querySelector("p") || null,
  };
}

function playLaunchAnimation(launcher) {
  const shell = launcher.querySelector(".clara-orb-asset-shell");
  const svg = launcher.querySelector(".clara-orb-vector");
  if (!shell || !svg) return () => {};

  shell.style.overflow = "visible";

  const circles = [...svg.querySelectorAll(":scope > circle")];
  const paths = [...svg.querySelectorAll(":scope > path")];
  const rects = [...svg.querySelectorAll(":scope > rect")];
  const bloom = createBloomLayer(launcher);
  const { greetingLabel, greetingRule, ctaTitle, ctaHint } = resolveCopyElements(launcher);
  const copyElements = [greetingLabel, greetingRule, ctaTitle, ctaHint].filter(Boolean);
  const animations = [];

  const remember = (animation) => {
    if (animation) animations.push(animation);
  };

  copyElements.forEach((element) => {
    element.style.willChange = "transform, opacity, filter";
  });

  // The instruction disappears first: the user's tap has already completed it.
  remember(
    safeAnimate(
      ctaHint,
      [
        { transform: "translateY(0) scale(1)", opacity: 1, filter: "blur(0px)", offset: 0 },
        { transform: "translateY(2px) scale(0.985)", opacity: 0.72, filter: "blur(0px)", offset: 0.36 },
        { transform: "translateY(7px) scale(0.96)", opacity: 0, filter: "blur(1.6px)", offset: 1 },
      ],
      {
        duration: 230,
        easing: "cubic-bezier(0.4, 0, 0.6, 1)",
        fill: "forwards",
      }
    )
  );

  // The personalized greeting gets its own soft acknowledgement before clearing upward.
  remember(
    safeAnimate(
      greetingLabel,
      [
        {
          transform: "translateY(0) scale(1)",
          opacity: 1,
          filter: "blur(0px)",
          textShadow: "0 0 0 rgba(67, 184, 255, 0)",
          offset: 0,
        },
        {
          transform: "translateY(-2px) scale(1.025)",
          opacity: 1,
          filter: "blur(0px)",
          textShadow: "0 0 18px rgba(67, 184, 255, 0.42)",
          offset: 0.34,
        },
        {
          transform: "translateY(-17px) scale(0.985)",
          opacity: 0,
          filter: "blur(2.4px)",
          textShadow: "0 0 24px rgba(67, 184, 255, 0.12)",
          offset: 1,
        },
      ],
      {
        duration: 455,
        delay: 55,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    )
  );

  // Its small CLARA color rule retracts separately instead of vanishing with the name.
  remember(
    safeAnimate(
      greetingRule,
      [
        { transform: "scaleX(1)", opacity: 0.7, offset: 0 },
        { transform: "scaleX(0.72)", opacity: 0.82, offset: 0.32 },
        { transform: "scaleX(0.08)", opacity: 0, offset: 1 },
      ],
      {
        duration: 330,
        delay: 95,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    )
  );

  // The main promise lingers a fraction longer, then travels toward the Orb as it transforms.
  remember(
    safeAnimate(
      ctaTitle,
      [
        { transform: "translateY(0) scale(1)", opacity: 1, filter: "blur(0px)", offset: 0 },
        { transform: "translateY(-2px) scale(1.012)", opacity: 1, filter: "blur(0px)", offset: 0.32 },
        { transform: "translateY(-15px) scale(0.965)", opacity: 0, filter: "blur(2px)", offset: 1 },
      ],
      {
        duration: 470,
        delay: 105,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    )
  );

  // 1) CLARA closes its yellow eyes first.
  rects.forEach((eye, index) => {
    eye.style.transformBox = "fill-box";
    eye.style.transformOrigin = "center";

    remember(
      safeAnimate(
        eye,
        [
          { transform: "scaleY(1)", opacity: 1, offset: 0 },
          { transform: "scaleY(0.18)", opacity: 1, offset: 0.62 },
          { transform: "scaleY(0.01)", opacity: 0, offset: 1 },
        ],
        {
          duration: 265,
          delay: index > 1 ? 20 : 0,
          easing: "cubic-bezier(0.4, 0, 1, 1)",
          fill: "forwards",
        }
      )
    );
  });

  // 2) Blue and red CLARA pieces visibly spin while the center gives way.
  paths.forEach((segment, index) => {
    segment.style.transformBox = "view-box";
    segment.style.transformOrigin = "160px 153px";

    remember(
      safeAnimate(
        segment,
        [
          { transform: "rotate(0deg) scale(1)", opacity: 1, offset: 0 },
          { transform: `rotate(${index === 0 ? 120 : -105}deg) scale(1.04)`, opacity: 1, offset: 0.32 },
          { transform: `rotate(${index === 0 ? 455 : -430}deg) scale(1.01)`, opacity: 0.96, offset: 0.78 },
          { transform: `rotate(${index === 0 ? 540 : -515}deg) scale(0.86)`, opacity: 0.06, offset: 1 },
        ],
        {
          duration: 670,
          delay: 120 + index * 35,
          easing: "cubic-bezier(0.18, 0.76, 0.2, 1)",
          fill: "forwards",
        }
      )
    );
  });

  circles.forEach((circle, index) => {
    circle.style.transformBox = "view-box";
    circle.style.transformOrigin = "160px 153px";

    remember(
      safeAnimate(
        circle,
        index === 0
          ? [
              { transform: "scale(1)", opacity: 0.2 },
              { transform: "scale(1.22)", opacity: 0.32, offset: 0.35 },
              { transform: "scale(1.78)", opacity: 0 },
            ]
          : [
              { transform: "scale(1)", opacity: 1 },
              { transform: "scale(0.96)", opacity: 0.9, offset: 0.32 },
              { transform: "scale(0.84)", opacity: 0 },
            ],
        {
          duration: index === 0 ? 720 : 520,
          delay: 145,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      )
    );
  });

  // 3) The whole orb releases outward so it feels like it becomes the chat surface.
  remember(
    safeAnimate(
      shell,
      [
        { transform: "scale(1)", opacity: 1, filter: "brightness(1)", offset: 0 },
        { transform: "scale(0.965)", opacity: 1, filter: "brightness(1.12)", offset: 0.18 },
        { transform: "scale(1.035)", opacity: 1, filter: "brightness(1.25)", offset: 0.48 },
        { transform: "scale(0.91)", opacity: 0, filter: "brightness(1.35)", offset: 1 },
      ],
      {
        duration: 790,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    )
  );

  // 4) Outer CLARA glow stretches from a circle into a rounded chat-box silhouette.
  remember(
    safeAnimate(
      bloom,
      [
        {
          width: "72%",
          height: "72%",
          borderRadius: "999px",
          transform: "translate(-50%, -50%) scale(0.82)",
          opacity: 0,
          offset: 0,
        },
        {
          width: "84%",
          height: "84%",
          borderRadius: "999px",
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
          offset: 0.18,
        },
        {
          width: "128%",
          height: "152%",
          borderRadius: "44px",
          transform: "translate(-50%, -50%) scale(1.02)",
          opacity: 0.92,
          offset: 0.57,
        },
        {
          width: "164%",
          height: "232%",
          borderRadius: "30px",
          transform: "translate(-50%, -50%) scale(1.04)",
          opacity: 0.18,
          offset: 1,
        },
      ],
      {
        duration: 770,
        delay: 95,
        easing: "cubic-bezier(0.18, 0.84, 0.24, 1)",
        fill: "forwards",
      }
    )
  );

  return () => {
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // Nothing to clean up.
      }
    });

    bloom.remove();
    shell.style.removeProperty("overflow");

    copyElements.forEach((element) => {
      element.style.removeProperty("will-change");
    });

    [...circles, ...paths, ...rects].forEach((element) => {
      element.style.removeProperty("transform-box");
      element.style.removeProperty("transform-origin");
    });
  };
}

export function installClaraOrbLaunchTransition() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  if (window.__claraOrbLaunchTransitionInstalled) {
    return () => {};
  }

  window.__claraOrbLaunchTransitionInstalled = true;

  let redispatchTimer = 0;
  let cleanupTimer = 0;
  let cleanupAnimation = null;

  const clearAnimation = () => {
    cleanupAnimation?.();
    cleanupAnimation = null;
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

    // The first event is intentionally held for the animation. The re-dispatched
    // event below is the one the CLARA chat bridge receives.
    event.stopImmediatePropagation();

    window.clearTimeout(redispatchTimer);
    window.clearTimeout(cleanupTimer);
    clearAnimation();

    cleanupAnimation = playLaunchAnimation(launcher);

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
      clearAnimation();
    }, CLEANUP_DELAY_MS);
  };

  window.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);

  return () => {
    window.clearTimeout(redispatchTimer);
    window.clearTimeout(cleanupTimer);
    clearAnimation();
    window.removeEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest, true);
    window.__claraOrbLaunchTransitionInstalled = false;
  };
}
