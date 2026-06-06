const FORECAST_LABEL = "Forecast";
const CORE_FEATURES_LABEL = "Core Features";
const SMART_ACTIONS_LABELS = ["Smart Actions", "Analytic"];
const FORECAST_ACTION_MATCHERS = ["Future Money Forecast", "Forecast"];
const FORECAST_LOADING_ID = "clara-forecast-transition-loader";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function includesAny(text = "", labels = []) {
  return labels.some((label) => text.includes(label));
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return (
      (text.includes(CORE_FEATURES_LABEL) || text.includes(FORECAST_LABEL)) &&
      includesAny(text, SMART_ACTIONS_LABELS)
    );
  });
}

function getAssistantButtons() {
  const shell = getAssistantShell();
  if (!shell) return [];
  return Array.from(shell.querySelectorAll("button"));
}

function isCoreFeaturesTabButton(button) {
  if (!button) return false;

  const label = clean(button.textContent);
  if (![CORE_FEATURES_LABEL, FORECAST_LABEL].includes(label)) return false;

  const shell = getAssistantShell();
  if (!shell || !shell.contains(button)) return false;

  const rowText = clean(button.parentElement?.textContent || "");
  return (
    (rowText.includes(CORE_FEATURES_LABEL) || rowText.includes(FORECAST_LABEL)) &&
    includesAny(rowText, SMART_ACTIONS_LABELS)
  );
}

function findButtonByAnyLabel(labels = []) {
  return getAssistantButtons().find((button) => labels.includes(clean(button.textContent))) || null;
}

function findForecastActionButton() {
  return getAssistantButtons().find((button) => {
    const text = clean(button.innerText || button.textContent);
    return FORECAST_ACTION_MATCHERS.some((matcher) => text.includes(matcher)) &&
      (text.includes("Predict") || text.includes("money") || text.includes("heading"));
  }) || getAssistantButtons().find((button) => {
    const text = clean(button.innerText || button.textContent);
    return FORECAST_ACTION_MATCHERS.some((matcher) => text.includes(matcher));
  }) || null;
}

function relabelForecastTab() {
  getAssistantButtons().forEach((button) => {
    if (!isCoreFeaturesTabButton(button)) return;
    if (clean(button.textContent) === FORECAST_LABEL && button.dataset.claraForecastTab === "true") return;

    button.textContent = FORECAST_LABEL;
    button.dataset.claraForecastTab = "true";
    button.setAttribute("aria-label", "Open CLARA Forecast");
    button.setAttribute("title", "Forecast");
  });
}

function removeForecastLoader() {
  document.getElementById(FORECAST_LOADING_ID)?.remove();
}

function showForecastLoader() {
  const shell = getAssistantShell();
  if (!shell) return;
  removeForecastLoader();

  const loader = document.createElement("div");
  loader.id = FORECAST_LOADING_ID;
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

  window.setTimeout(removeForecastLoader, 4200);
}

function submitForecastFallback() {
  const shell = getAssistantShell();
  const input = shell?.querySelector("input, textarea");
  const form = input?.closest("form");
  const submitButton = form?.querySelector('button[type="submit"], button[aria-label*="Send"]');
  if (!input || !form) return;

  const nextValue = "Run my Future Money Forecast using income, expenses, budgets, savings, wallets, unplanned spending, and hidden risks.";
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));

  window.setTimeout(() => {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else submitButton?.click?.();
  }, 30);
}

function clickSmartActionsPanel(button) {
  if (!button) return false;

  button.dataset.claraProgrammaticOpenSmart = "true";
  button.click();
  window.setTimeout(() => {
    delete button.dataset.claraProgrammaticOpenSmart;
  }, 180);
  return true;
}

function openForecastMode() {
  showForecastLoader();
  const smartActionsButton = findButtonByAnyLabel(SMART_ACTIONS_LABELS);
  if (!smartActionsButton) {
    submitForecastFallback();
    return;
  }

  clickSmartActionsPanel(smartActionsButton);

  window.setTimeout(() => {
    const forecastButton = findForecastActionButton();
    if (forecastButton) forecastButton.click();
    else submitForecastFallback();
  }, 90);
}

function installForecastClickCapture() {
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;

    const isForecastTab = button.dataset?.claraForecastTab === "true" || clean(button.textContent) === FORECAST_LABEL;
    if (!isForecastTab || !getAssistantShell()?.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openForecastMode();
  }, true);
}

function installForecastReadyCleaner() {
  window.addEventListener("clara:forecast-phase-one-ready", removeForecastLoader);
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-open-forecast-report='true']")) removeForecastLoader();
    if (event.target?.closest?.("[aria-label='Close CLARA AI mode']")) removeForecastLoader();
  }, true);
}

function installForecastObserver() {
  const observer = new MutationObserver(() => {
    relabelForecastTab();
    const shell = getAssistantShell();
    if (!shell) removeForecastLoader();
    if (shell && /Forecast snapshot ready|Forecast snapshot needs more records/i.test(shell.textContent || "")) removeForecastLoader();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  relabelForecastTab();
}

function installClaraAssistantForecastTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_FORECAST_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_FORECAST_TAB_INSTALLED__ = true;
  installForecastClickCapture();
  installForecastReadyCleaner();
  installForecastObserver();
}

installClaraAssistantForecastTab();
