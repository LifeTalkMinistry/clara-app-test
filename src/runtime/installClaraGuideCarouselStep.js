import "../guide-mode-next-buttons.css";

const SAMPLE_CLASS = "clara-guide-daily-tip-sample-active";
const CAROUSEL_CLASS = "clara-guide-finance-carousel-active";
const MONEY_LEFT_CLASS = "clara-guide-money-left-active";
const MONEY_LEFT_PRIVACY_CLASS = "clara-guide-money-left-privacy-active";
const MONEY_LEFT_ORB_CLASS = "clara-guide-money-left-orb-active";
const NEXT_CLASS = "clara-guide-next-button";
const CAROUSEL_NEXT_SELECTOR = ".clara-guide-carousel-next-button";
const ORB_PREVIEW_NEXT_SELECTOR = "[data-clara-guide-orb-preview-next='true']";
const TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_EXIT_EVENT = "clara:guide-exit";
const GUIDE_ORB_SELECTOR = "[data-clara-manual-expense-orb='true']";
const GUIDE_SUMMARY_SELECTOR = "[data-clara-dashboard-section='money-summary']";
const GUIDE_TOUCH_MOVE_LIMIT = 20;

let protectSingleTapUntil = 0;
let financeNextPointer = null;

function hasGuideSample() {
  return document.documentElement.classList.contains(SAMPLE_CLASS);
}

function hasCarouselStep() {
  return document.documentElement.classList.contains(CAROUSEL_CLASS);
}

function isAwaitSingleOrb(target) {
  if (!document.documentElement.classList.contains(MONEY_LEFT_ORB_CLASS)) return false;

  const orb = target?.closest?.(GUIDE_ORB_SELECTOR);
  const summary = orb?.closest?.(GUIDE_SUMMARY_SELECTOR);
  return summary?.dataset?.claraGuideOrbPhase === "await-single";
}

function rememberFinanceNextPointer(event) {
  if (event.pointerType === "mouse" || !hasCarouselStep()) return;

  const button = event.target?.closest?.(CAROUSEL_NEXT_SELECTOR);
  if (!button || button.disabled) return;

  financeNextPointer = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  };
}

function finishFinanceNextPointer(event, cancelled = false) {
  const pointer = financeNextPointer;
  if (!pointer || pointer.pointerId !== event.pointerId) return;

  financeNextPointer = null;
  if (cancelled || !hasCarouselStep()) return;

  const distance = Math.hypot(
    event.clientX - pointer.startX,
    event.clientY - pointer.startY,
  );
  if (distance > GUIDE_TOUCH_MOVE_LIMIT) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const dashboardScroller = getDashboardGuideScroller();
  const lockedScrollTop = Number(dashboardScroller?.scrollTop) || 0;

  window.dispatchEvent(
    new CustomEvent(TARGET_CHANGE_EVENT, {
      detail: { feature: "money-left" },
    }),
  );

  if (dashboardScroller && typeof window !== "undefined") {
    const restore = () => {
      dashboardScroller.scrollTop = lockedScrollTop;
    };
    window.requestAnimationFrame(() => {
      restore();
      window.requestAnimationFrame(restore);
    });
  }
}

function ensureNextButton() {
  if (!hasGuideSample() || hasCarouselStep()) return;

  const surface = document.querySelector(".clara-guide-bubble-surface");
  if (!surface || surface.querySelector(`.${NEXT_CLASS}`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = NEXT_CLASS;
  button.textContent = "NEXT";
  surface.appendChild(button);
}

function removeNextButton() {
  document.querySelectorAll(`.${NEXT_CLASS}`).forEach((button) => button.remove());
}

export function clearClaraGuideFeatureClasses() {
  document.documentElement.classList.remove(
    SAMPLE_CLASS,
    CAROUSEL_CLASS,
    MONEY_LEFT_CLASS,
    MONEY_LEFT_PRIVACY_CLASS,
    MONEY_LEFT_ORB_CLASS,
  );
  protectSingleTapUntil = 0;
  financeNextPointer = null;
}

function getDashboardGuideScroller() {
  const carouselAnchor = document.querySelector(".clara-guide-carousel-anchor");
  return carouselAnchor?.closest?.("main") || document.scrollingElement || null;
}

function scrollDashboardGuideToTop(behavior = "smooth") {
  const dashboardScroller = getDashboardGuideScroller();

  if (dashboardScroller?.scrollTo) {
    dashboardScroller.scrollTo({ top: 0, behavior });
    return;
  }

  window.scrollTo?.({ top: 0, behavior });
}

function goToCarouselStep() {
  if (!hasGuideSample()) {
    removeNextButton();
    return;
  }

  document.documentElement.classList.remove(
    SAMPLE_CLASS,
    MONEY_LEFT_CLASS,
    MONEY_LEFT_PRIVACY_CLASS,
    MONEY_LEFT_ORB_CLASS,
  );
  document.documentElement.classList.add(CAROUSEL_CLASS);

  window.dispatchEvent(
    new CustomEvent(TARGET_CHANGE_EVENT, {
      detail: { feature: "finance-carousel" },
    }),
  );

  removeNextButton();
  protectSingleTapUntil = 0;
  financeNextPointer = null;

  window.setTimeout(() => scrollDashboardGuideToTop("smooth"), 80);
}

export function installClaraGuideCarouselStep() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_GUIDE_CAROUSEL_STEP_INSTALLED__) return;
  window.__CLARA_GUIDE_CAROUSEL_STEP_INSTALLED__ = true;

  document.addEventListener("pointerdown", rememberFinanceNextPointer, true);
  document.addEventListener(
    "pointerup",
    (event) => finishFinanceNextPointer(event, false),
    true,
  );
  document.addEventListener(
    "pointercancel",
    (event) => finishFinanceNextPointer(event, true),
    true,
  );

  document.addEventListener(
    "pointerup",
    (event) => {
      if (isAwaitSingleOrb(event.target)) {
        protectSingleTapUntil = Date.now() + 400;
      }
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      const isProtectedPreviewAction = event.target?.closest?.(ORB_PREVIEW_NEXT_SELECTOR);
      if (Date.now() <= protectSingleTapUntil && isProtectedPreviewAction) {
        event.preventDefault();
        event.stopImmediatePropagation();
        protectSingleTapUntil = 0;
      }
    },
    true,
  );

  document.addEventListener(
    "pointerout",
    (event) => {
      if (Date.now() <= protectSingleTapUntil && isAwaitSingleOrb(event.target)) {
        event.stopPropagation();
      }
    },
    true,
  );

  document.addEventListener("click", (event) => {
    const nextButton = event.target?.closest?.(`.${NEXT_CLASS}`);

    if (nextButton) {
      event.preventDefault();
      event.stopPropagation();
      goToCarouselStep();
      return;
    }

    window.setTimeout(() => {
      if (hasGuideSample()) ensureNextButton();
    }, 60);
  });

  window.addEventListener(GUIDE_MODE_CHANGE_EVENT, () => {
    clearClaraGuideFeatureClasses();
    removeNextButton();
  });

  window.addEventListener(GUIDE_EXIT_EVENT, () => {
    clearClaraGuideFeatureClasses();
    removeNextButton();
  });

  window.addEventListener(TARGET_CHANGE_EVENT, (event) => {
    protectSingleTapUntil = 0;
    financeNextPointer = null;

    if (event?.detail?.feature !== "money-left-orb") {
      document.documentElement.classList.remove(MONEY_LEFT_ORB_CLASS);
    }
  });
}
