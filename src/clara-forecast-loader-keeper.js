const FORECAST_LOADER_ID = "clara-forecast-transition-loader";
let forecastKeeperActive = false;
let forecastKeeperInterval = null;

function getForecastShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = String(shell.textContent || "");
    return text.includes("Forecast") || text.includes("Smart Actions");
  }) || null;
}

function ensureForecastLoader() {
  const shell = getForecastShell();
  if (!shell) return null;

  let loader = document.getElementById(FORECAST_LOADER_ID);
  if (loader) return loader;

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
  return loader;
}

function stopKeeper() {
  if (forecastKeeperInterval) {
    window.clearInterval(forecastKeeperInterval);
    forecastKeeperInterval = null;
  }
  forecastKeeperActive = false;
}

function removeForecastLoader() {
  document.getElementById(FORECAST_LOADER_ID)?.remove();
}

function startKeeper() {
  forecastKeeperActive = true;
  ensureForecastLoader();

  if (forecastKeeperInterval) window.clearInterval(forecastKeeperInterval);
  const startedAt = Date.now();

  forecastKeeperInterval = window.setInterval(() => {
    if (!forecastKeeperActive || Date.now() - startedAt > 2600) {
      stopKeeper();
      return;
    }
    ensureForecastLoader();
  }, 70);

  window.setTimeout(() => {
    window.dispatchEvent(new Event("clara:open-forecast-report"));
  }, 1700);

  window.setTimeout(() => {
    removeForecastLoader();
    stopKeeper();
  }, 2850);
}

function installForecastLoaderKeeper() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_LOADER_KEEPER_INSTALLED__) return;
  window.__CLARA_FORECAST_LOADER_KEEPER_INSTALLED__ = true;

  window.addEventListener("clara:forecast-phase-one-ready", () => {
    window.setTimeout(startKeeper, 0);
  });

  window.addEventListener("clara:open-forecast-report", () => {
    window.setTimeout(() => {
      removeForecastLoader();
      stopKeeper();
    }, 1200);
  });

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-forecast-report-close]")) {
      removeForecastLoader();
      stopKeeper();
    }
    if (event.target?.closest?.("[aria-label='Close CLARA AI mode']")) {
      removeForecastLoader();
      stopKeeper();
    }
  }, true);
}

installForecastLoaderKeeper();
