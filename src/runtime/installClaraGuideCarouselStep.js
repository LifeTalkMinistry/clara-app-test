const SAMPLE_CLASS = "clara-guide-daily-tip-sample-active";
const CAROUSEL_CLASS = "clara-guide-finance-carousel-active";
const MONEY_LEFT_CLASS = "clara-guide-money-left-active";
const NEXT_CLASS = "clara-guide-next-button";
const TARGET_CHANGE_EVENT = "clara:guide-target-change";
const MONEY_LEFT_SCROLL_LOCK_MS = 1200;

let releaseMoneyLeftScrollLock = null;
let moneyLeftScrollLockTimer = null;

function hasGuideSample() {
  return document.documentElement.classList.contains(SAMPLE_CLASS);
}

function hasCarouselStep() {
  return document.documentElement.classList.contains(CAROUSEL_CLASS);
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

function clearFeatureClasses() {
  document.documentElement.classList.remove(
    SAMPLE_CLASS,
    CAROUSEL_CLASS,
    MONEY_LEFT_CLASS
  );
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

function clearMoneyLeftScrollLock() {
  if (moneyLeftScrollLockTimer && typeof window !== "undefined") {
    window.clearTimeout(moneyLeftScrollLockTimer);
  }
  moneyLeftScrollLockTimer = null;

  if (typeof releaseMoneyLeftScrollLock === "function") {
    releaseMoneyLeftScrollLock();
  }
  releaseMoneyLeftScrollLock = null;
}

function suppressTargetScrollIntoView(target) {
  if (!target || typeof target.scrollIntoView !== "function") {
    return () => {};
  }

  const hadOwnScrollIntoView = Object.prototype.hasOwnProperty.call(
    target,
    "scrollIntoView"
  );
  const previousDescriptor = hadOwnScrollIntoView
    ? Object.getOwnPropertyDescriptor(target, "scrollIntoView")
    : null;

  try {
    Object.defineProperty(target, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: () => {},
    });
  } catch {
    return () => {};
  }

  return () => {
    try {
      if (hadOwnScrollIntoView && previousDescriptor) {
        Object.defineProperty(target, "scrollIntoView", previousDescriptor);
      } else {
        delete target.scrollIntoView;
      }
    } catch {
      // The temporary instance override is safe to leave if a browser refuses
      // restoration; it is scoped only to the mounted Money Left element.
    }
  };
}

function lockDashboardPositionForMoneyLeft() {
  clearMoneyLeftScrollLock();

  const dashboardScroller = getDashboardGuideScroller();
  if (!dashboardScroller) return;

  const lockedScrollTop = Number(dashboardScroller.scrollTop) || 0;
  const moneyLeftTarget = document.querySelector(
    "[data-clara-dashboard-section='money-summary']"
  );
  const restoreScrollIntoView = suppressTargetScrollIntoView(moneyLeftTarget);

  const preserveExactPosition = () => {
    const currentScrollTop = Number(dashboardScroller.scrollTop) || 0;
    if (Math.abs(currentScrollTop - lockedScrollTop) > 0.5) {
      dashboardScroller.scrollTop = lockedScrollTop;
    }
  };

  dashboardScroller.addEventListener?.("scroll", preserveExactPosition, {
    passive: true,
  });
  preserveExactPosition();

  releaseMoneyLeftScrollLock = () => {
    dashboardScroller.removeEventListener?.("scroll", preserveExactPosition);
    restoreScrollIntoView();
  };

  if (typeof window !== "undefined") {
    moneyLeftScrollLockTimer = window.setTimeout(() => {
      clearMoneyLeftScrollLock();
    }, MONEY_LEFT_SCROLL_LOCK_MS);
  }
}

function goToCarouselStep() {
  if (!hasGuideSample()) {
    removeNextButton();
    return;
  }

  document.documentElement.classList.remove(SAMPLE_CLASS, MONEY_LEFT_CLASS);
  document.documentElement.classList.add(CAROUSEL_CLASS);

  window.dispatchEvent(
    new CustomEvent(TARGET_CHANGE_EVENT, {
      detail: { feature: "finance-carousel" },
    })
  );

  removeNextButton();

  // Keep the complete top navigation visible when the finance walkthrough starts.
  // Centering the carousel here pushed the dashboard scroll container downward.
  window.setTimeout(() => scrollDashboardGuideToTop("smooth"), 80);
}

export function installClaraGuideCarouselStep() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_GUIDE_CAROUSEL_STEP_INSTALLED__) return;
  window.__CLARA_GUIDE_CAROUSEL_STEP_INSTALLED__ = true;

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

  window.addEventListener(TARGET_CHANGE_EVENT, (event) => {
    const feature = event?.detail?.feature;

    if (feature === "money-left") {
      // Preserve the exact Debt-step viewport. DashboardHomePanel still schedules
      // a smooth scrollIntoView for Money Left, so temporarily suppress that call
      // and lock the actual dashboard scroller until the transition has settled.
      lockDashboardPositionForMoneyLeft();
      return;
    }

    clearMoneyLeftScrollLock();
  });

  window.addEventListener("clara:guide-mode-change", (event) => {
    clearFeatureClasses();
    clearMoneyLeftScrollLock();
    removeNextButton();

    if (event?.detail?.active) return;
  });
}
