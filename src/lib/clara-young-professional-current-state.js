import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
  upsertLocalRecord,
} from "./localFinanceStore";
import { supabase } from "./supabaseClient";
import { upsertIncomeSource } from "./incomeHubRepository";
import { saveSelectedLifeStageProfile } from "@/life-stage-flow";

const SOURCE = "clara_young_professional_current_state";
const FAMILY = "young_professional_current_state";
const LIFE_STAGE = "Young Professional";
const ACTIVE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";
const MONTHLY_SALARY = 32000;
const PAYROLL_WALLET_NAME = "Payroll Wallet";
const PRIMARY_SALARY_NAME = "Primary Salary";

const STORES_TO_RESET = [
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
  LOCAL_FINANCE_STORES.privatePreferences,
];

const nowIso = () => new Date().toISOString();

function safeUserId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80) || "local_user";
}

function dateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthDate(day) {
  const date = new Date();
  date.setDate(Math.max(1, Math.min(day, 28)));
  return dateOnly(date);
}

function at(date, hour = 12) {
  return `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

async function resolveLocalUserId(explicitUser = null) {
  const fromExplicit = explicitUser?.id || explicitUser?.email;
  if (fromExplicit) return String(fromExplicit).trim();

  try {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;
    const fromAuth = authUser?.id || authUser?.email;
    if (fromAuth) return String(fromAuth).trim();
  } catch {
    // Local/offline mode can continue using the dashboard fallback id.
  }

  return "local-user";
}

function makeId(localUserId, type, key) {
  return `clara_yp_current_${safeUserId(localUserId)}_${type}_${key}`;
}

function base(localUserId, type, key, createdAt = nowIso()) {
  const timestamp = nowIso();
  return {
    id: makeId(localUserId, type, key),
    localUserId,
    source: SOURCE,
    setupFamily: FAMILY,
    activeCurrentState: true,
    lifeStage: LIFE_STAGE,
    createdAt,
    created_at: createdAt,
    updatedAt: timestamp,
    updated_at: timestamp,
    deletedAt: null,
    deleted_at: null,
    syncStatus: "local_only",
  };
}

function buildPrimarySalaryIncomeSource(localUserId, payrollWalletId) {
  const activityAt = at(monthDate(25), 9);
  return {
    ...base(localUserId, "income_source", "primary_salary", at(monthDate(1), 8)),
    kind: "income_source",
    recordType: "income_source",
    name: PRIMARY_SALARY_NAME,
    title: PRIMARY_SALARY_NAME,
    category: "Salary",
    stability: "Stable",
    expectedMonthlyAmount: MONTHLY_SALARY,
    expected_monthly_amount: MONTHLY_SALARY,
    totalMoneyIn: MONTHLY_SALARY,
    total_money_in: MONTHLY_SALARY,
    totalMoneyOut: MONTHLY_SALARY,
    total_money_out: MONTHLY_SALARY,
    currentBalance: 0,
    current_balance: 0,
    balance: 0,
    linkedWalletId: payrollWalletId,
    linked_wallet_id: payrollWalletId,
    linkedWalletName: PAYROLL_WALLET_NAME,
    linked_wallet_name: PAYROLL_WALLET_NAME,
    notes: "Primary Salary funds the Payroll Wallet. The income source is net zero after transferring ₱32,000 into the wallet.",
    lastActivityAt: activityAt,
    last_activity_at: activityAt,
  };
}

function buildPayrollWallet(localUserId, payrollWalletId) {
  const postedAt = at(monthDate(25), 9);
  return {
    ...base(localUserId, "wallet", "payroll", postedAt),
    id: payrollWalletId,
    name: PAYROLL_WALLET_NAME,
    title: PAYROLL_WALLET_NAME,
    label: PAYROLL_WALLET_NAME,
    type: "bank",
    wallet_type: "bank",
    balance: MONTHLY_SALARY,
    current_balance: MONTHLY_SALARY,
    wallet_balance: MONTHLY_SALARY,
    available_balance: MONTHLY_SALARY,
    starting_balance: 0,
    sort_order: 1,
  };
}

function buildSalaryTransferTransaction(localUserId, payrollWalletId, incomeSource) {
  const postedAt = at(monthDate(25), 9);
  return {
    ...base(localUserId, "wallet_txn", "primary_salary_to_payroll_wallet", postedAt),
    wallet_id: payrollWalletId,
    walletId: payrollWalletId,
    amount: MONTHLY_SALARY,
    type: "income",
    transaction_type: "income",
    category: "Income",
    source_type: "income_source",
    sourceType: "income_source",
    source_id: incomeSource.id,
    sourceId: incomeSource.id,
    source_label: PRIMARY_SALARY_NAME,
    sourceLabel: PRIMARY_SALARY_NAME,
    income_source_id: incomeSource.id,
    incomeSourceId: incomeSource.id,
    linked_income_source_id: incomeSource.id,
    linkedIncomeSourceId: incomeSource.id,
    income_source_name: PRIMARY_SALARY_NAME,
    incomeSourceName: PRIMARY_SALARY_NAME,
    funding_source: PRIMARY_SALARY_NAME,
    title: "Salary transferred to Payroll Wallet",
    label: "Salary transferred to Payroll Wallet",
    notes: "Primary Salary transferred ₱32,000 into Payroll Wallet.",
    created_at: postedAt,
    date: postedAt,
    details: {
      from: PRIMARY_SALARY_NAME,
      to: PAYROLL_WALLET_NAME,
      amount: MONTHLY_SALARY,
      previous_balance: 0,
      next_balance: MONTHLY_SALARY,
      source_type: "income_source",
      income_source_id: incomeSource.id,
      wallet_id: payrollWalletId,
    },
  };
}

function buildYoungProfessionalState(localUserId) {
  const payrollWalletId = makeId(localUserId, "wallet", "payroll");
  const salarySource = buildPrimarySalaryIncomeSource(localUserId, payrollWalletId);
  const payrollWallet = buildPayrollWallet(localUserId, payrollWalletId);
  const salaryTransferTransaction = buildSalaryTransferTransaction(localUserId, payrollWalletId, salarySource);

  return {
    incomeSources: [salarySource],
    wallets: [payrollWallet],
    walletTransactions: [salaryTransferTransaction],
    transfers: [],
    budgets: [],
    expenses: [],
    savingsGoals: [],
    memories: [],
    ledgerCheck: {
      incomeSourceName: PRIMARY_SALARY_NAME,
      incomeSourceMoneyIn: MONTHLY_SALARY,
      incomeSourceMoneyOut: MONTHLY_SALARY,
      incomeSourceCurrentBalance: 0,
      payrollWalletId,
      payrollWalletName: PAYROLL_WALLET_NAME,
      payrollWalletBalance: MONTHLY_SALARY,
      walletTransactionAmount: salaryTransferTransaction.amount,
      walletCount: 1,
    },
  };
}

function isYoungProfessionalCurrentStateRecord(record) {
  if (!record || typeof record !== "object") return false;
  return Boolean(
    record.source === SOURCE ||
      record.setupFamily === FAMILY ||
      (record.activeCurrentState === true && record.lifeStage === LIFE_STAGE) ||
      String(record.id || "").startsWith("clara_yp_current_")
  );
}

async function archiveExistingYoungProfessionalCurrentState(localUserId) {
  const timestamp = nowIso();
  await runLocalFinanceTransaction(STORES_TO_RESET, localUserId, async (tx) => {
    for (const storeName of STORES_TO_RESET) {
      const rows = await tx.getAllForUser(storeName, true);
      for (const row of rows || []) {
        if (isYoungProfessionalCurrentStateRecord(row)) {
          tx.store(storeName).put({
            ...row,
            activeCurrentState: false,
            deletedAt: timestamp,
            deleted_at: timestamp,
            updatedAt: timestamp,
            updated_at: timestamp,
            syncStatus: "local_deleted",
          });
        }
      }
    }
  });
}

async function upsertRows(storeName, rows, localUserId) {
  for (const row of rows) await upsertLocalRecord(storeName, row, localUserId);
}

async function upsertIncomeSources(rows, localUserId) {
  for (const row of rows) await upsertIncomeSource(localUserId, row);
}

function writeActiveState(localUserId, ledgerCheck) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ACTIVE_KEY,
    JSON.stringify({
      mode: "current_state",
      activeLifeStageKey: LIFE_STAGE,
      activeLifeStageTitle: LIFE_STAGE,
      localUserId,
      ledgerCheck,
      activatedAt: nowIso(),
    })
  );
}

function writeLifeStageProfile() {
  saveSelectedLifeStageProfile({
    stage: LIFE_STAGE,
    setup: "Full-time earner building independence",
    rhythm: "Primary Salary transferred into Payroll Wallet",
    workload: "Full-time work with commute, bills, and routine pressure",
    pressure: "Make salary visible first before budgeting, expenses, or savings are added",
    coping: "Payday confidence can make money feel available too quickly",
    goal: "Start with one clear wallet that receives the monthly salary",
    currentFocus: "Confirm income-to-wallet flow before adding budgets or expenses",
    financialFear: "Money movement becomes confusing when income and wallet balances do not match",
    nonNegotiable: "Primary Salary must explain the Payroll Wallet balance",
  });
}

function dispatchRefresh(result) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("clara-young-professional-current-state-loaded", { detail: result }));
  window.dispatchEvent(new Event("clara-income-hub-updated"));
  window.dispatchEvent(new Event("clara-wallets-updated"));
  window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
  window.dispatchEvent(new Event("clara-finance-updated"));
  window.dispatchEvent(new Event("clara:life-stage-profile-updated"));
}

export async function activateYoungProfessionalCurrentState({ user = null } = {}) {
  const localUserId = await resolveLocalUserId(user);
  const state = buildYoungProfessionalState(localUserId);

  await archiveExistingYoungProfessionalCurrentState(localUserId);
  await upsertIncomeSources(state.incomeSources, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.wallets, state.wallets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.walletTransactions, state.walletTransactions, localUserId);

  writeLifeStageProfile();
  writeActiveState(localUserId, state.ledgerCheck);

  const result = {
    mode: "current_state",
    lifeStage: LIFE_STAGE,
    localUserId,
    incomeSources: state.incomeSources.length,
    wallets: state.wallets.length,
    budgets: state.budgets.length,
    expenses: state.expenses.length,
    transfers: state.transfers.length,
    walletTransactions: state.walletTransactions.length,
    savingsGoals: state.savingsGoals.length,
    memories: state.memories.length,
    ledgerCheck: state.ledgerCheck,
  };

  dispatchRefresh(result);
  return result;
}
