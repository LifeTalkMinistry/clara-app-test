const SAMPLE_CLASS = "clara-guide-daily-tip-sample-active";
const CAROUSEL_CLASS = "clara-guide-finance-carousel-active";
const NEXT_CLASS = "clara-guide-next-button";

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

function goToCarouselStep() {
  if (!hasGuideSample()) {
    removeNextButton();
    return;
  }

  document.documentElement.classList.remove(SAMPLE_CLASS);
  document.documentElement.classList.add(CAROUSEL_CLASS);
  removeNextButton();

  window.setTimeout(() => {
    document.querySelector(".clara-dashboard-bottom-finance-rail")?.scrollIntoView?.({
      block: "center",
      behavior: "smooth",
    });
  }, 80);
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

  window.addEventListener("clara:guide-mode-change", (event) => {
    if (event?.detail?.active) {
      document.documentElement.classList.remove(SAMPLE_CLASS, CAROUSEL_CLASS);
      removeNextButton();
      return;
    }

    document.documentElement.classList.remove(SAMPLE_CLASS, CAROUSEL_CLASS);
    removeNextButton();
  });
}
