import { supabase } from "../supabaseClient";
import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
} from "../localFinanceStore";
import {
  ACTIVE_CURRENT_STATE_KEY,
  SAMPLE_DATA_LOCAL_USER_ID,
  exitYoungProfessionalCurrentState,
} from "../clara-young-professional-current-state";
import {
  getActiveDemoProfileState,
  YOUNG_PROFESSIONAL_DEMO_PROFILE_ID,
  YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME,
  YOUNG_PROFESSIONAL_DEMO_SOURCE,
  YOUNG_PROFESSIONAL_DEMO_SETUP_FAMILY,
} from "./activeDemoProfile";
import { generateYoungProfessionalDemoData } from "./generateYoungProfessionalDemoData";

const DEMO_STORES = [
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.privatePreferences,
].filter(Boolean);

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function resolveDemoLocalUserId(options = {}) {
  const explicit = clean(options.localUserId);
  if (explicit) return explicit;
  try {
    const { data } = await supabase.auth.getUser();
    return clean(data?.user?.id || data?.user?.email) || SAMPLE_DATA_LOCAL_USER_ID;
  } catch {
    return SAMPLE_DATA_LOCAL_USER_ID;
  }
}

async function writeDemoRecords(localUserId, dataset) {
  const records = dataset.records || {};

  await runLocalFinanceTransaction(DEMO_STORES, localUserId, async (tx) => {
    for (const wallet of records.wallets || []) await tx.put(LOCAL_FINANCE_STORES.wallets, wallet);
    for (const expense of records.expenses || []) await tx.put(LOCAL_FINANCE_STORES.expenses, expense);
    for (const transaction of records.walletTransactions || []) await tx.put(LOCAL_FINANCE_STORES.walletTransactions, transaction);
    for (const transfer of records.transfers || []) await tx.put(LOCAL_FINANCE_STORES.transfers, transfer);
    for (const budget of records.budgets || []) await tx.put(LOCAL_FINANCE_STORES.budgets, budget);
    for (const goal of records.savingsGoals || []) await tx.put(LOCAL_FINANCE_STORES.savingsGoals, goal);
    for (const emergencyFund of records.emergencyFund || []) await tx.put(LOCAL_FINANCE_STORES.emergencyFund, emergencyFund);
    for (const incomeSource of records.incomeSources || []) await tx.put(LOCAL_FINANCE_STORES.privatePreferences, incomeSource);
  });
}

function saveDemoModeState(localUserId, dataset) {
  if (typeof window === "undefined") return;
  const timestamp = new Date().toISOString();

  try {
    window.localStorage.setItem(ACTIVE_CURRENT_STATE_KEY, JSON.stringify({
      mode: "current_state",
      dataMode: "sample_data",
      demoModeActive: true,
      activeDemoProfile: YOUNG_PROFESSIONAL_DEMO_PROFILE_ID,
      activeDemoProfileName: YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME,
      activeLifeStageKey: "sample_data",
      activeLifeStageTitle: "Sample Data",
      samplePersonName: YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME,
      sampleRole: "BPO employee",
      demoLocalUserId: localUserId,
      loadedParts: ["wallets", "income_sources", "income_records", "expenses", "transactions", "budgets", "savings_goals", "emergency_fund"],
      source: YOUNG_PROFESSIONAL_DEMO_SOURCE,
      setupFamily: YOUNG_PROFESSIONAL_DEMO_SETUP_FAMILY,
      monthRange: dataset?.profile?.monthRange || null,
      demoLoadedAt: timestamp,
      activatedAt: timestamp,
    }));
  } catch {
    // Demo records still exist in local finance storage.
  }
}

function resetCachedSnapshots() {
  if (typeof window === "undefined") return;
  try {
    window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ = null;
    if (window.__CLARA_FORECAST_REPORT_ROUTER_STATE__) {
      window.__CLARA_FORECAST_REPORT_ROUTER_STATE__ = {
        ...window.__CLARA_FORECAST_REPORT_ROUTER_STATE__,
        snapshot: null,
        effectiveContext: null,
        busy: false,
        selectedHorizonMonths: 1,
      };
    }
  } catch {
    // Best-effort refresh only.
  }
}

function dispatchDemoEvents() {
  if (typeof window === "undefined") return;
  resetCachedSnapshots();
  [
    "clara:demo-data-loaded",
    "clara:finance-data-updated",
    "clara-finance-updated",
    "clara-local-finance-updated",
    "clara-income-hub-updated",
    "clara-wallets-updated",
    "clara-wallet-transactions-updated",
    "clara-expenses-updated",
    "clara-budgets-updated",
    "clara-savings-updated",
    "clara-young-professional-current-state-loaded",
    "storage",
  ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
}

export function isYoungProfessionalDemoProfileActive() {
  return Boolean(getActiveDemoProfileState());
}

export async function loadYoungProfessionalDemoProfile(options = {}) {
  const localUserId = await resolveDemoLocalUserId(options);
  await exitYoungProfessionalCurrentState();
  const dataset = generateYoungProfessionalDemoData({ localUserId, now: options.now || new Date() });
  await writeDemoRecords(localUserId, dataset);
  saveDemoModeState(localUserId, dataset);
  dispatchDemoEvents();
  return { success: true, localUserId, profile: dataset.profile, summary: dataset.summary };
}
