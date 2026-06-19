const SAMPLE_CLASS = "clara-guide-daily-tip-sample-active";
const CAROUSEL_CLASS = "clara-guide-finance-carousel-active";
const MONEY_LEFT_CLASS = "clara-guide-money-left-active";
const MONEY_LEFT_PRIVACY_CLASS = "clara-guide-money-left-privacy-active";
const NEXT_CLASS = "clara-guide-next-button";
const TARGET_CHANGE_EVENT = "clara:guide-target-change";

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
    MONEY_LEFT_CLASS,
    MONEY_LEFT_PRIVACY_CLASS
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

function goToCarouselStep() {
  if (!hasGuideSample()) {
    removeNextButton();
    return;
  }

  document.documentElement.classList.remove(
    SAMPLE_CLASS,
    MONEY_LEFT_CLASS,
    MONEY_LEFT_PRIVACY_CLASS
  );
  document.documentElement.classList.add(CAROUSEL_CLASS);

  window.dispatchEvent(
    new CustomEvent(TARGET_CHANGE_EVENT, {
      detail: { feature: "finance-carousel" },
    })
  );

  removeNextButton();

  // Keep the complete top navigation visible when the finance walkthrough starts.
  // This existing transition intentionally returns the guide to the dashboard top.
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

  window.addEventListener("clara:guide-mode-change", () => {
    clearFeatureClasses();
    removeNextButton();
  });
}
