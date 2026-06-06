const REPORT_OVERLAY_SELECTOR = "[data-clara-forecast-report-overlay='true']:not(.clara-forecast-horizon-overlay)";
const FINAL_ACTION_SELECTOR = "[data-clara-forecast-final-affirmation='true']";

function closeForecastReportFromFinalAction(target) {
  const overlay = target?.closest?.("[data-clara-forecast-report-overlay='true']");
  overlay?.remove?.();
}

function enhanceForecastReportExit(overlay) {
  if (!overlay || overlay.classList.contains("clara-forecast-horizon-overlay")) return;

  overlay.querySelector(".clara-forecast-report-close")?.remove?.();
  overlay.querySelector(".clara-forecast-report-footer")?.remove?.();

  const finalCard =
    overlay.querySelector(".clara-forecast-report-card.is-final") ||
    Array.from(overlay.querySelectorAll(".clara-forecast-report-card")).at(-1);

  if (!finalCard || finalCard.querySelector(FINAL_ACTION_SELECTOR)) return;

  const action = document.createElement("div");
  action.className = "clara-forecast-report-final-affirmation";
  action.dataset.claraForecastFinalAffirmation = "true";
  action.innerHTML = `
    <button type="button" data-clara-forecast-final-close="true">
      I got it now
    </button>
  `;

  finalCard.appendChild(action);
}

function enhanceExistingForecastReports() {
  document.querySelectorAll(REPORT_OVERLAY_SELECTOR).forEach(enhanceForecastReportExit);
}

function installClaraForecastFinalAffirmationExit() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_FINAL_AFFIRMATION_EXIT_INSTALLED__) return;
  window.__CLARA_FORECAST_FINAL_AFFIRMATION_EXIT_INSTALLED__ = true;

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("[data-clara-forecast-final-close='true']");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      closeForecastReportFromFinalAction(button);
    },
    true
  );

  const observer = new MutationObserver(() => enhanceExistingForecastReports());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(enhanceExistingForecastReports, 120);
}

installClaraForecastFinalAffirmationExit();
