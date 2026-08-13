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

  // Allocate the bloom at its final footprint once. The old animation changed
  // width and height every frame, forcing Android WebView to repeatedly run
  // layout and repaint the large glow. ScaleX/scaleY reproduce the same visible
  // geometry while staying on the compositor path.
  Object.assign(bloom.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "164%",
    height: "232%",
    borderRadius: "30px",
    border: "2px solid rgba(92, 207, 255, 0.92)",
    background:
      "linear-gradient(115deg, rgba(22,139,255,0.13), rgba(28,73,255,0.05) 46%, rgba(243,38,69,0.11))",
    boxShadow:
      "-24px 0 58px rgba(22,139,255,0.46), 24px 0 58px rgba(243,38,69,0.38), 0 0 46px rgba(63,157,255,0.30), inset 10px 0 26px rgba(22,139,255,0.12), inset -10px 0 26px rgba(243,38,69,0.10)",
    opacity: "0",
    pointerEvents: "none",
    transform: "translate(-50%, -50%) scaleX(0.36) scaleY(0.2545)",
    transformOrigin: "center",
    zIndex: "8",
    willChange: "transform, opacity, border-radius",
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
  shell.style.willChange = "transform, opacity";

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
    element.style.willChange = "transform, opacity";
  });

  // Same text choreography, using only transform + opacity. Animating blur and
  // text-shadow on Android caused a raster repaint on each frame.
  remember(
    safeAnimate(
      ctaHint,
      [
        { transform: "translateY(0) scale(1)", opacity: 1, offset: 0 },
        { transform: "translateY(2px) scale(0.985)", opacity: 0.72, offset: 0.36 },
        { transform: "translateY(7px) scale(0.96)", opacity: 0, offset: 1 },
      ],
      {
        duration: 230,
        easing: "cubic-bezier(0.4, 0, 0.6, 1)",
        fill: "forwards",
      }
    )
  );

  remember(
    safeAnimate(
      greetingLabel,
      [
        { transform: "translateY(0) scale(1)", opacity: 1, offset: 0 },
        { transform: "translateY(-2px) scale(1.025)", opacity: 1, offset: 0.34 },
        { transform: "translateY(-17px) scale(0.985)", opacity: 0, offset: 1 },
      ],
      {
        duration: 455,
        delay: 55,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    )
  );

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

  remember(
    safeAnimate(
      ctaTitle,
      [
        { transform: "translateY(0) scale(1)", opacity: 1, offset: 0 },
        { transform: "translateY(-2px) scale(1.012)", opacity: 1, offset: 0.32 },
        { transform: "translateY(-15px) scale(0.965)", opacity: 0, offset: 1 },
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
    eye.style.willChange = "transform, opacity";

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
    segment.style.willChange = "transform, opacity";

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
    circle.style.willChange = "transform, opacity";

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

  // 3) Same release pulse, without brightness filter repainting the SVG.
  remember(
    safeAnimate(
      shell,
      [
        { transform: "scale(1)", opacity: 1, offset: 0 },
        { transform: "scale(0.965)", opacity: 1, offset: 0.18 },
        { transform: "scale(1.035)", opacity: 1, offset: 0.48 },
        { transform: "scale(0.91)", opacity: 0, offset: 1 },
      ],
      {
        duration: 790,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    )
  );

  // 4) Exact same apparent bloom sizes as before, but expressed entirely as
  // transforms against one pre-sized layer instead of animating layout geometry.
  remember(
    safeAnimate(
      bloom,
      [
        {
          borderRadius: "999px",
          transform: "translate(-50%, -50%) scaleX(0.36) scaleY(0.2545)",
          opacity: 0,
          offset: 0,
        },
        {
          borderRadius: "999px",
          transform: "translate(-50%, -50%) scaleX(0.5122) scaleY(0.3621)",
          opacity: 1,
          offset: 0.18,
        },
        {
          borderRadius: "44px",
          transform: "translate(-50%, -50%) scaleX(0.7961) scaleY(0.6683)",
          opacity: 0.92,
          offset: 0.57,
        },
        {
          borderRadius: "30px",
          transform: "translate(-50%, -50%) scaleX(1.04) scaleY(1.04)",
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
    shell.style.removeProperty("will-change");

    copyElements.forEach((element) => {
      element.style.removeProperty("will-change");
    });

    [...circles, ...paths, ...rects].forEach((element) => {
      element.style.removeProperty("transform-box");
      element.style.removeProperty("transform-origin");
      element.style.removeProperty("will-change");
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
