import { supabase } from "@/lib/supabaseClient";
import { getClaraEffectiveFinanceContext } from "@/lib/clara-effective-finance-context";
import { buildClaraForecastPhaseOneSnapshot } from "@/lib/clara-forecast-phase-one-snapshot";

const ANALYTIC_LABEL = "Analytic";
const SMART_ACTIONS_LABEL = "Smart Actions";
const FORECAST_LABEL = "Forecast";
const CORE_FEATURES_LABEL = "Core Features";
const ANALYTIC_LOADING_ID = "clara-analytics-transition-loader";
const FALLBACK_USER_ID = "local-user";
const READY_EVENT = "clara:analytics-phase-one-ready";
const OPEN_EVENT = "clara:open-analytics-report";
const MIN_LOADING_MS = 3000;

let analyticRunId = 0;
let analyticIsPreparing = false;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return (
      (text.includes(FORECAST_LABEL) || text.includes(CORE_FEATURES_LABEL)) &&
      (text.includes(SMART_ACTIONS_LABEL) || text.includes(ANALYTIC_LABEL))
    );
  }) || null;
}

function getAssistantButtons() {
  const shell = getAssistantShell();
  if (!shell) return [];
  return Array.from(shell.querySelectorAll("button"));
}

function isSmartActionsTabButton(button) {
  if (!button) return false;

  const label = clean(button.textContent);
  if (![SMART_ACTIONS_LABEL, ANALYTIC_LABEL].includes(label)) return false;

  const shell = getAssistantShell();
  if (!shell || !shell.contains(button)) return false;

  const rowText = clean(button.parentElement?.textContent || "");
  return (
    (rowText.includes(FORECAST_LABEL) || rowText.includes(CORE_FEATURES_LABEL)) &&
    (rowText.includes(SMART_ACTIONS_LABEL) || rowText.includes(ANALYTIC_LABEL))
  );
}

function relabelAnalyticTab() {
  getAssistantButtons().forEach((button) => {
    if (!isSmartActionsTabButton(button)) return;
    if (clean(button.textContent) === ANALYTIC_LABEL && button.dataset.claraAnalyticTab === "true") return;

    button.textContent = ANALYTIC_LABEL;
    button.dataset.claraAnalyticTab = "true";
    button.setAttribute("aria-label", "Open CLARA Analytic");
    button.setAttribute("title", "Analytic");
  });
}

function removeAnalyticsLoader() {
  document.getElementById(ANALYTIC_LOADING_ID)?.remove();
}

function showAnalyticsLoader() {
  const shell = getAssistantShell();
  if (!shell) return null;

  removeAnalyticsLoader();

  const loader = document.createElement("div");
  loader.id = ANALYTIC_LOADING_ID;
  loader.className = "clara-forecast-transition-loader";
  loader.innerHTML = `
    <div class="clara-forecast-transition-card">
      <div class="clara-forecast-transition-orb" aria-hidden="true"></div>
      <p class="clara-forecast-transition-eyebrow">CURRENT MONEY ANALYTIC</p>
      <h3>Preparing your analysis</h3>
      <p>CLARA is reading local wallets, budgets, expenses, income, savings, debt, and money pressure before showing your current money situation.</p>
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

function setGlobalAnalyticsSnapshot(snapshot, effectiveContext = null) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const enriched = enrichSnapshotWithRecords(snapshot, effectiveContext || {});
  window.__CLARA_LAST_ANALYTICS_PHASE_ONE_SNAPSHOT__ = enriched;
  window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: { snapshot: enriched } }));
  return enriched;
}

async function prepareAnalyticsPhaseOneSnapshot() {
  const user = await getCurrentUser();
  const localUserId = clean(user?.id || user?.email || FALLBACK_USER_ID) || FALLBACK_USER_ID;
  const effectiveContext = await getClaraEffectiveFinanceContext(localUserId, { user, messages: [] });
  const analyticsSnapshot = buildClaraForecastPhaseOneSnapshot(effectiveContext, {});
  return setGlobalAnalyticsSnapshot(analyticsSnapshot, effectiveContext);
}

async function openAnalyticMode() {
  if (analyticIsPreparing) return;

  const runId = ++analyticRunId;
  analyticIsPreparing = true;
  showAnalyticsLoader();

  const startedAt = Date.now();

  try {
    await prepareAnalyticsPhaseOneSnapshot();
  } catch (error) {
    console.warn("[CLARA Analytic] Phase 1 snapshot failed safely.", error);
  }

  await delay(MIN_LOADING_MS - (Date.now() - startedAt));

  if (runId !== analyticRunId) return;

  removeAnalyticsLoader();
  window.dispatchEvent(new Event(OPEN_EVENT));
  analyticIsPreparing = false;
}

function installAnalyticClickCapture() {
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;

    const isAnalyticTab = button.dataset?.claraAnalyticTab === "true" || clean(button.textContent) === ANALYTIC_LABEL;
    if (!isAnalyticTab || !getAssistantShell()?.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openAnalyticMode();
  }, true);
}

function installAnalyticCleanupListeners() {
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-clara-analytics-report-close]")) removeAnalyticsLoader();
    if (event.target?.closest?.("[aria-label='Close CLARA AI mode']")) {
      analyticRunId += 1;
      analyticIsPreparing = false;
      removeAnalyticsLoader();
    }
  }, true);
}

function installAnalyticObserver() {
  const observer = new MutationObserver(() => {
    relabelAnalyticTab();
    const shell = getAssistantShell();
    if (!shell) removeAnalyticsLoader();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  relabelAnalyticTab();
}

function installClaraAssistantAnalyticTab() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_ASSISTANT_ANALYTIC_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_ANALYTIC_TAB_INSTALLED__ = true;
  installAnalyticClickCapture();
  installAnalyticCleanupListeners();
  installAnalyticObserver();
}

installClaraAssistantAnalyticTab();
