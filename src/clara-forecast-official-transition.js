const LOADER_ID = "clara-forecast-transition-loader";
let openingForecastReport = false;

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = String(shell.textContent || "");
    return text.includes("Forecast") || text.includes("Smart Actions");
  }) || null;
}

function ensureOfficialForecastLoader() {
  const shell = getAssistantShell();
  if (!shell) return null;

  let loader = document.getElementById(LOADER_ID);
  if (loader) return loader;

  loader = document.createElement("div");
  loader.id = LOADER_ID;
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
  return loader;
}

function removeOfficialForecastLoader() {
  document.getElementById(LOADER_ID)?.remove();
}

function openForecastReportOnce() {
  if (openingForecastReport) return;
  openingForecastReport = true;
  ensureOfficialForecastLoader();

  window.setTimeout(() => {
    window.dispatchEvent(new Event("clara:open-forecast-report"));
  }, 260);

  window.setTimeout(() => {
    removeOfficialForecastLoader();
    openingForecastReport = false;
  }, 900);
}

function installOfficialForecastTransition() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_OFFICIAL_TRANSITION_INSTALLED__) return;
  window.__CLARA_FORECAST_OFFICIAL_TRANSITION_INSTALLED__ = true;

  window.addEventListener("clara:forecast-phase-one-ready", () => {
    openForecastReportOnce();
  });

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-open-forecast-report='true']")) removeOfficialForecastLoader();
    if (event.target?.closest?.("[data-clara-forecast-report-close]")) removeOfficialForecastLoader();
    if (event.target?.closest?.("[aria-label='Close CLARA AI mode']")) removeOfficialForecastLoader();
  }, true);
}

installOfficialForecastTransition();
