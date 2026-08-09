import "../guide-mode-next-buttons.css";

const SAMPLE_CLASS = "clara-guide-daily-tip-sample-active";
const CAROUSEL_CLASS = "clara-guide-finance-carousel-active";
const LEARNING_HUB_AWAIT_CLASS = "clara-guide-learning-hub-await-active";
const LEARNING_HUB_PREVIEW_CLASS = "clara-guide-learning-hub-preview-active";
const MONEY_LEFT_CLASS = "clara-guide-money-left-active";
const MONEY_LEFT_PRIVACY_CLASS = "clara-guide-money-left-privacy-active";
const MONEY_CALCULATOR_CLASS = "clara-guide-money-calculator-active";
const MONEY_LEFT_ORB_CLASS = "clara-guide-money-left-orb-active";
const NEXT_CLASS = "clara-guide-next-button";
const CAROUSEL_NEXT_SELECTOR = ".clara-guide-carousel-next-button";
const ORB_PREVIEW_NEXT_SELECTOR = "[data-clara-guide-orb-preview-next='true']";
const TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_EXIT_EVENT = "clara:guide-exit";
const LEARNING_HUB_PHASE_EVENT = "clara:guide-learning-hub-phase";
const GUIDE_ORB_SELECTOR = "[data-clara-manual-expense-orb='true']";
const GUIDE_SUMMARY_SELECTOR = "[data-clara-dashboard-section='money-summary']";
const GUIDE_TOUCH_MOVE_LIMIT = 20;

const ORB_COPY_PATCH = {
  intro: {
    title: "MEET THE CLARA ORB",
    body: "One control gives you three quick actions.",
    footer: "LEARN EACH ACTION ONE AT A TIME.",
    thirdItem: "Pause Before Buying",
  },
  "await-single": {
    title: "1 TAP — LOG EXPENSE",
    body: "Tap the CLARA orb once to open the quick expense logger.",
    footer: "TAP THE ORB ONCE.",
  },
  "await-double": {
    title: "2 TAPS — TRANSACTION HUB",
    body: "Tap the orb twice quickly to open your complete transaction history.",
    footer: "DOUBLE-TAP THE ORB NOW.",
  },
  "await-hold": {
    title: "HOLD — PAUSE BEFORE BUYING",
    body: "Press and hold the orb to open CLARA’s Pause Before Buying flow before a purchase.",
    footer: "PRESS AND HOLD THE ORB NOW.",
  },
  complete: {
    title: "ORB READY",
    body: "Tap once to log an expense, tap twice for Transaction Hub, or hold to pause before buying.",
    footer: "YOU NOW KNOW ALL THREE ORB ACTIONS.",
  },
};

let protectSingleTapUntil = 0;
let financeNextPointer = null;
let orbCopyObserver = null;
let orbCopyFrame = null;

function hasGuideSample() {
  return document.documentElement.classList.contains(SAMPLE_CLASS);
}

function hasCarouselStep() {
  return document.documentElement.classList.contains(CAROUSEL_CLASS);
}

function hasLearningHubStep() {
  const root = document.documentElement;
  return (
    root.classList.contains(LEARNING_HUB_AWAIT_CLASS) ||
    root.classList.contains(LEARNING_HUB_PREVIEW_CLASS)
  );
}

function applyLearningHubPhase(phase, { emit = true } = {}) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const isAwaitOpen = phase === "await-open";
  const isPreview = phase === "preview";

  root.classList.toggle(LEARNING_HUB_AWAIT_CLASS, isAwaitOpen);
  root.classList.toggle(LEARNING_HUB_PREVIEW_CLASS, isPreview);

  if ((isAwaitOpen || isPreview) && root.classList.contains(CAROUSEL_CLASS)) {
    root.classList.remove(CAROUSEL_CLASS);
  }

  if (emit && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(LEARNING_HUB_PHASE_EVENT, {
        detail: { phase: isAwaitOpen ? "await-open" : isPreview ? "preview" : "inactive" },
      }),
    );
  }
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
  if (!hasGuideSample() || hasCarouselStep() || hasLearningHubStep()) return;

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

function setTextIfChanged(element, text) {
  if (!element || !text || element.textContent === text) return;
  element.textContent = text;
}

function refreshOrbGuideCopy() {
  if (typeof document === "undefined") return;
  if (!document.documentElement.classList.contains(MONEY_LEFT_ORB_CLASS)) return;

  const summary = document.querySelector(GUIDE_SUMMARY_SELECTOR);
  const phase = summary?.dataset?.claraGuideOrbPhase;
  const copy = ORB_COPY_PATCH[phase];
  if (!copy) return;

  const surface = document.querySelector(
    ".clara-guide-carousel-bubble-shell [aria-labelledby='clara-guide-carousel-bubble-title']",
  );
  if (!surface) return;

  const paragraphs = Array.from(surface.querySelectorAll(":scope > p"));
  const title = surface.querySelector("#clara-guide-carousel-bubble-title");
  const body = paragraphs.find((paragraph) => paragraph !== title && !paragraph.className.includes("border-t"));
  const footer = paragraphs.find((paragraph) => paragraph.className.includes("border-t"));

  setTextIfChanged(title, copy.title);
  setTextIfChanged(body, copy.body);
  setTextIfChanged(footer, copy.footer);

  if (copy.thirdItem) {
    const values = surface.querySelectorAll(".clara-guide-carousel-bubble-item-value");
    setTextIfChanged(values[2], copy.thirdItem);
  }
}

function scheduleOrbGuideCopyRefresh() {
  if (typeof window === "undefined" || orbCopyFrame !== null) return;
  orbCopyFrame = window.requestAnimationFrame(() => {
    orbCopyFrame = null;
    refreshOrbGuideCopy();
  });
}

function installOrbGuideCopyRepair() {
  if (typeof MutationObserver !== "function" || orbCopyObserver) return;
  orbCopyObserver = new MutationObserver(scheduleOrbGuideCopyRefresh);
  orbCopyObserver.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-clara-guide-orb-phase"],
  });
}

export function clearClaraGuideFeatureClasses() {
  document.documentElement.classList.remove(
    SAMPLE_CLASS,
    CAROUSEL_CLASS,
    LEARNING_HUB_AWAIT_CLASS,
    LEARNING_HUB_PREVIEW_CLASS,
    MONEY_LEFT_CLASS,
    MONEY_LEFT_PRIVACY_CLASS,
    MONEY_CALCULATOR_CLASS,
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

function scrollLearningHubIntoView() {
  const learningHubToggle = document.querySelector(
    "[data-clara-guide-learning-hub-toggle='true']",
  );
  learningHubToggle?.scrollIntoView?.({ block: "center", behavior: "smooth" });
}

function scrollCalculatorIntoView() {
  document
    .querySelector("[data-clara-money-calculator-toggle='true']")
    ?.scrollIntoView?.({ block: "center", behavior: "smooth" });
}

function goToLearningHubStep() {
  if (!hasGuideSample()) {
    removeNextButton();
    return;
  }

  document.documentElement.classList.remove(
    SAMPLE_CLASS,
    CAROUSEL_CLASS,
    MONEY_LEFT_CLASS,
    MONEY_LEFT_PRIVACY_CLASS,
    MONEY_CALCULATOR_CLASS,
    MONEY_LEFT_ORB_CLASS,
  );
  applyLearningHubPhase("await-open");

  removeNextButton();
  protectSingleTapUntil = 0;
  financeNextPointer = null;

  window.setTimeout(scrollLearningHubIntoView, 80);
}

function interceptPrivacyNextForCalculator(event) {
  const root = document.documentElement;
  if (!root.classList.contains(MONEY_LEFT_PRIVACY_CLASS)) return;

  const nextButton = event.target?.closest?.(CAROUSEL_NEXT_SELECTOR);
  if (!nextButton || nextButton.disabled) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  root.classList.remove(MONEY_LEFT_PRIVACY_CLASS);
  root.classList.add(MONEY_CALCULATOR_CLASS);

  window.dispatchEvent(
    new CustomEvent(TARGET_CHANGE_EVENT, {
      detail: { feature: "money-calculator" },
    }),
  );

  window.setTimeout(scrollCalculatorIntoView, 80);
}

export function installClaraGuideCarouselStep() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_GUIDE_CAROUSEL_STEP_INSTALLED__) return;
  window.__CLARA_GUIDE_CAROUSEL_STEP_INSTALLED__ = true;

  installOrbGuideCopyRepair();

  document.addEventListener("click", interceptPrivacyNextForCalculator, true);
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
      goToLearningHubStep();
      return;
    }

    window.setTimeout(() => {
      if (hasGuideSample()) ensureNextButton();
      scheduleOrbGuideCopyRefresh();
    }, 60);
  });

  window.addEventListener(LEARNING_HUB_PHASE_EVENT, (event) => {
    applyLearningHubPhase(event?.detail?.phase, { emit: false });
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
    const feature = event?.detail?.feature;

    if (feature !== "learning-hub") {
      applyLearningHubPhase("inactive", { emit: false });
    }

    if (feature !== "money-calculator") {
      document.documentElement.classList.remove(MONEY_CALCULATOR_CLASS);
    }

    if (feature !== "money-left-orb") {
      document.documentElement.classList.remove(MONEY_LEFT_ORB_CLASS);
    }

    if (feature === "money-left-orb") {
      document.documentElement.classList.add(MONEY_LEFT_ORB_CLASS);
      window.setTimeout(scheduleOrbGuideCopyRefresh, 0);
    }
  });

  window.setTimeout(() => {
    if (hasGuideSample()) ensureNextButton();
    scheduleOrbGuideCopyRefresh();
  }, 0);
}
