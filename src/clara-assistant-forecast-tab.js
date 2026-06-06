import { supabase } from "@/lib/supabaseClient";
import { getClaraEffectiveFinanceContext } from "@/lib/clara-effective-finance-context";
import { buildClaraForecastPhaseOneSnapshot } from "@/lib/clara-forecast-phase-one-snapshot";

const FORECAST_LABEL = "Forecast";
const CORE_FEATURES_LABEL = "Core Features";
const SMART_ACTIONS_LABELS = ["Smart Actions", "Analytic"];
const FORECAST_LOADING_ID = "clara-forecast-transition-loader";
const FALLBACK_USER_ID = "local-user";
const READY_EVENT = "clara:forecast-phase-one-ready";
const OPEN_EVENT = "clara:open-forecast-report";
const MIN_LOADING_MS = 2400;

let forecastRunId = 0;
let forecastIsPreparing = false;

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
  }) || null;
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
  if (!shell) return null;

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
  return loader;
}

function delay(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

function enrichSnapshotWithRecords(snapshot = {}, effectiveContext = {}) {
  if (!snapshot || typeof snapshot !== "object") return snapshot;

  return {
    ...snapshot,
    forecastRecords: {
      ...(snapshot.forecastRecords || {}),
      wallets: effectiveContext.wallets || snapshot.forecastRecords?.wallets || [],
      incomes: effectiveContext.incomes || snapshot.forecastRecords?.incomes || [],
      incomeSources: effectiveContext.incomeSources || snapshot.forecastRecords?.incomeSources || [],
      expenses: effectiveContext.expenses || snapshot.forecastRecords?.expenses || [],
      walletTransactions: effectiveContext.walletTransactions || snapshot.forecastRecords?.walletTransactions || [],
      transfers: effectiveContext.transfers || snapshot.forecastRecords?.transfers || [],
      budgets: effectiveContext.budgets || snapshot.forecastRecords?.budgets || [],
      savingsGoals: effectiveContext.savingsGoals || snapshot.forecastRecords?.savingsGoals || [],
      debtObligations: effectiveContext.debtObligations || snapshot.forecastRecords?.debtObligations || [],
      emergencyFund: effectiveContext.emergencyFund || snapshot.forecastRecords?.emergencyFund || null,
    },
  };
}

function setGlobalSnapshot(snapshot, effectiveContext = null) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const enriched = enrichSnapshotWithRecords(snapshot, effectiveContext || {});
  window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ = enriched;
  window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: { snapshot: enriched } }));
  return enriched;
}

async function prepareForecastPhaseOneSnapshot() {
  const user = await getCurrentUser();
  const localUserId = clean(user?.id || user?.email || FALLBACK_USER_ID) || FALLBACK_USER_ID;
  const effectiveContext = await getClaraEffectiveFinanceContext(localUserId, { user, messages: [] });
  const forecastSnapshot = buildClaraForecastPhaseOneSnapshot(effectiveContext, {});
  return setGlobalSnapshot(forecastSnapshot, effectiveContext);
}

async function openForecastMode() {
  if (forecastIsPreparing) return;

  const runId = ++forecastRunId;
  forecastIsPreparing = true;
  showForecastLoader();

  const startedAt = Date.now();

  try {
    await prepareForecastPhaseOneSnapshot();
  } catch (error) {
    console.warn("[CLARA Forecast] Phase 1 snapshot failed safely.", error);
  }

  await delay(MIN_LOADING_MS - (Date.now() - startedAt));

  if (runId !== forecastRunId) return;

  removeForecastLoader();
  window.dispatchEvent(new Event(OPEN_EVENT));
  forecastIsPreparing = false;
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

function installForecastCleanupListeners() {
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-forecast-report-close]")) removeForecastLoader();
    if (event.target?.closest?.("[aria-label='Close CLARA AI mode']")) {
      forecastRunId += 1;
      forecastIsPreparing = false;
      removeForecastLoader();
    }
  }, true);
}

function installForecastObserver() {
  const observer = new MutationObserver(() => {
    relabelForecastTab();
    const shell = getAssistantShell();
    if (!shell) removeForecastLoader();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  relabelForecastTab();
}

function installClaraAssistantForecastTab() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_ASSISTANT_FORECAST_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_FORECAST_TAB_INSTALLED__ = true;
  installForecastClickCapture();
  installForecastCleanupListeners();
  installForecastObserver();
}

installClaraAssistantForecastTab();
