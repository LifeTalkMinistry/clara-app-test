const FORECAST_LOADER_ID = "clara-forecast-transition-loader";
let forecastHideSnapshotActive = false;
let forecastOpenQueued = false;

function shellText(node) {
  return String(node?.textContent || "");
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = shellText(shell);
    return text.includes("Future Money Forecast") || text.includes("Forecast snapshot") || text.includes("Smart Actions");
  }) || null;
}

function ensureForecastLoader() {
  const shell = getAssistantShell();
  if (!shell) return;

  let loader = document.getElementById(FORECAST_LOADER_ID);
  if (loader) return;

  loader = document.createElement("div");
  loader.id = FORECAST_LOADER_ID;
  loader.className = "clara-forecast-transition-loader";
  loader.innerHTML = `
    <div class="clara-forecast-transition-card">
      <div class="clara-forecast-transition-orb" aria-hidden="true"></div>
      <p class="clara-forecast-transition-eyebrow">FUTURE MONEY FORECAST</p>
      <h3>Preparing your forecast</h3>
      <p>CLARA is reading local wallets, budgets, expenses, income, savings, and money pressure before showing the report.</p>
      <div class="clara-forecast-transition-bar"><span></span></div>
    </div>
  `;
  shell.appendChild(loader);
}

function removeForecastSnapshotCards() {
  const shell = getAssistantShell();
  if (!shell) return false;
  let removedAny = false;

  Array.from(shell.querySelectorAll("div, button")).forEach((node) => {
    const text = shellText(node);
    const isSnapshotCard = text.includes("Forecast snapshot ready") || text.includes("Forecast snapshot needs more records");
    const isForecastReportAction = node.matches?.("[data-clara-open-forecast-report='true']") || text.trim() === "View Forecast Report";

    if (!isSnapshotCard && !isForecastReportAction) return;

    const removable = node.closest?.(".flex.w-full") || node.closest?.("[data-clara-forecast-report-inline-action='true']") || node;
    removable.remove?.();
    removedAny = true;
  });

  return removedAny;
}

function openForecastFlow() {
  if (forecastOpenQueued) return;
  forecastOpenQueued = true;

  window.setTimeout(() => {
    window.dispatchEvent(new Event("clara:open-forecast-report"));
  }, 1300);

  window.setTimeout(() => {
    document.getElementById(FORECAST_LOADER_ID)?.remove();
    forecastHideSnapshotActive = false;
    forecastOpenQueued = false;
  }, 2600);
}

function startForecastSnapshotBypass() {
  forecastHideSnapshotActive = true;
  ensureForecastLoader();
  removeForecastSnapshotCards();
  openForecastFlow();
}

function installForecastSnapshotBypass() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_HIDE_SNAPSHOT_CARD_INSTALLED__) return;
  window.__CLARA_FORECAST_HIDE_SNAPSHOT_CARD_INSTALLED__ = true;

  window.addEventListener("clara:forecast-phase-one-ready", () => {
    window.setTimeout(startForecastSnapshotBypass, 0);
  });

  const observer = new MutationObserver(() => {
    if (!forecastHideSnapshotActive) return;
    ensureForecastLoader();
    removeForecastSnapshotCards();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-forecast-report-close]")) forecastHideSnapshotActive = false;
    if (event.target?.closest?.("[aria-label='Close CLARA AI mode']")) forecastHideSnapshotActive = false;
  }, true);
}

installForecastSnapshotBypass();
