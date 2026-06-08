import "./clara-forecast-header-center-fix.css";

const REPORT_OVERLAY_SELECTOR = "[data-clara-forecast-report-overlay='true']";
const FINAL_ACTION_SELECTOR = "[data-clara-forecast-final-affirmation='true']";

function removeDuplicateFinalAffirmation(overlay) {
  overlay?.querySelectorAll?.(FINAL_ACTION_SELECTOR)?.forEach((node) => node.remove());
}

function enhanceForecastReportExit(overlay) {
  if (!overlay) return;

  removeDuplicateFinalAffirmation(overlay);

  if (overlay.classList.contains("clara-forecast-horizon-overlay")) return;

  overlay.querySelector(".clara-forecast-report-close")?.remove?.();
  overlay.querySelector(".clara-forecast-report-footer")?.remove?.();
}

function enhanceExistingForecastReports() {
  document.querySelectorAll(REPORT_OVERLAY_SELECTOR).forEach(enhanceForecastReportExit);
}

function installClaraForecastFinalAffirmationExit() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_FINAL_AFFIRMATION_EXIT_INSTALLED__) return;
  window.__CLARA_FORECAST_FINAL_AFFIRMATION_EXIT_INSTALLED__ = true;

  const observer = new MutationObserver(() => enhanceExistingForecastReports());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(enhanceExistingForecastReports, 120);
}

installClaraForecastFinalAffirmationExit();
