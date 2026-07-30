const CALCULATOR_SELECTOR = 'button[data-clara-money-calculator-toggle="true"]';
const PRIVACY_SELECTOR = 'button[data-clara-summary-privacy-toggle="true"]';
const SUMMARY_SELECTOR = '[data-clara-dashboard-section="money-summary"]';

const alignCalculatorButton = () => {
  const privacyButton = document.querySelector(PRIVACY_SELECTOR);
  const calculatorButton = document.querySelector(CALCULATOR_SELECTOR);
  const summary = privacyButton?.closest?.(SUMMARY_SELECTOR);

  if (!privacyButton || !calculatorButton || !summary) return false;

  const summaryRect = summary.getBoundingClientRect();
  const privacyRect = privacyButton.getBoundingClientRect();

  if (!summaryRect.width || !privacyRect.width || !privacyRect.height) return false;

  const buttonWidth = privacyRect.width;
  const buttonHeight = privacyRect.height;
  const gap = 6;

  Object.assign(calculatorButton.style, {
    position: "absolute",
    left: `${privacyRect.right - summaryRect.left + gap}px`,
    top: `${privacyRect.top - summaryRect.top}px`,
    width: `${buttonWidth}px`,
    height: `${buttonHeight}px`,
    transform: "none",
  });

  return true;
};

export function installMoneyLeftCalculatorAlignment() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  if (window.__claraMoneyLeftCalculatorAlignmentInstalled) return () => {};

  window.__claraMoneyLeftCalculatorAlignmentInstalled = true;

  let frame = null;
  let resizeObserver = null;
  let observedSummary = null;
  let observedPrivacyButton = null;

  const attachResizeObserver = () => {
    if (typeof ResizeObserver !== "function") return;

    const privacyButton = document.querySelector(PRIVACY_SELECTOR);
    const summary = privacyButton?.closest?.(SUMMARY_SELECTOR) || null;

    if (summary === observedSummary && privacyButton === observedPrivacyButton) return;

    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(schedule);
    observedSummary = summary;
    observedPrivacyButton = privacyButton || null;

    if (summary) resizeObserver.observe(summary);
    if (privacyButton) resizeObserver.observe(privacyButton);
  };

  const run = () => {
    frame = null;
    alignCalculatorButton();
    attachResizeObserver();
  };

  const schedule = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(run);
  };

  schedule();

  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });

  return () => {
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener("resize", schedule);
    if (frame !== null) window.cancelAnimationFrame(frame);
    window.__claraMoneyLeftCalculatorAlignmentInstalled = false;
  };
}
