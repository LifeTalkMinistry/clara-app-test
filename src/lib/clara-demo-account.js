import {
  LOCAL_FINANCE_STORES,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "@/lib/localFinanceStore";
import { upsertDebtObligation } from "@/lib/debtObligationStore";
import { upsertInvestment } from "@/lib/investmentStore";

export const CLARA_DEMO_ACCOUNT_VERSION = "demo-minimum-earner-v1";
const DEMO_PREFIX = "clara_demo";
const DEMO_LOCAL_USER_FALLBACK = "local-user";

const normalizeLocalUserId = (localUserId) =>
  String(localUserId || DEMO_LOCAL_USER_FALLBACK).trim() || DEMO_LOCAL_USER_FALLBACK;

const nowIso = () => new Date().toISOString();

function phDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: byType.year,
    month: byType.month,
    day: byType.day,
  };
}

const getCurrentPHMonthKey = () => {
  const { year, month } = phDateParts();
  return `${year}-${month}`;
};

const daysAgoIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - Number(days || 0));
  return date.toISOString();
};

function makeBaseRecord(localUserId, id, extra = {}) {
  const timestamp = extra.updatedAt || extra.updated_at || nowIso();

  return {
    id,
    localUserId,
    demoAccount: true,
    demo_account: true,
    demoVersion: CLARA_DEMO_ACCOUNT_VERSION,
    demo_version: CLARA_DEMO_ACCOUNT_VERSION,
    syncStatus: "local_only",
    source: "clara_demo_account",
    createdAt: extra.createdAt || extra.created_at || timestamp,
    created_at: extra.created_at || extra.createdAt || timestamp,
    updatedAt: timestamp,
    updated_at: timestamp,
    deletedAt: null,
    deleted_at: null,
    ...extra,
  };
}

function makeWallet(localUserId, id, name, balance, type, sortOrder) {
  return makeBaseRecord(localUserId, id, {
    name,
    title: name,
    label: name,
    type,
    wallet_type: type,
    balance,
    current_balance: balance,
    wallet_balance: balance,
    available_balance: balance,
    starting_balance: balance,
    sort_order: sortOrder,
  });
}

function makeBudget(localUserId, id, title, amount, needType, sortOrder, monthKey) {
  return makeBaseRecord(localUserId, id, {
    title,
    category: title,
    budget_category: title,
    allocated_amount: amount,
    budget_amount: amount,
    total_budget: amount,
    amount,
    need_type: needType,
    type: "budget_category",
    month: monthKey,
    month_key: monthKey,
    budget_month: monthKey,
    is_active: true,
    active: true,
    status: "active",
    sort_order: sortOrder,
  });
}

function makeExpense(localUserId, id, walletId, amount, category, notes, daysAgo, planningStatus = "planned", reason = "") {
  const date = daysAgoIso(daysAgo);

  return makeBaseRecord(localUserId, id, {
    amount,
    wallet_id: walletId,
    category,
    budget_category: planningStatus === "planned" ? category : null,
    planning_status: planningStatus,
    unplanned_reason: planningStatus === "planned" ? null : reason,
    notes,
    source_type: "CLARA Demo Transaction",
    date,
    createdAt: date,
    created_at: date,
    updatedAt: date,
    updated_at: date,
  });
}

function makeWalletTransaction(localUserId, id, walletId, amount, type, notes, daysAgo, extra = {}) {
  const date = daysAgoIso(daysAgo);

  return makeBaseRecord(localUserId, id, {
    wallet_id: walletId,
    amount,
    type,
    category: extra.category || null,
    planning_status: extra.planning_status || null,
    expense_id: extra.expense_id || null,
    source_type: extra.source_type || "CLARA Demo Ledger",
    notes,
    date,
    createdAt: date,
    created_at: date,
    updatedAt: date,
    updated_at: date,
  });
}

function makeSavingsGoal(localUserId, id, name, savedAmount, targetAmount, monthlyTarget, note) {
  return makeBaseRecord(localUserId, id, {
    name,
    saved_amount: savedAmount,
    target_amount: targetAmount,
    monthly_target: monthlyTarget,
    notes: note,
    status: "active",
  });
}

export function buildClaraDemoAccountRecords(localUserIdInput) {
  const localUserId = normalizeLocalUserId(localUserIdInput);
  const monthKey = getCurrentPHMonthKey();

  const wallets = [
    makeWallet(localUserId, `${DEMO_PREFIX}_wallet_payroll`, "Payroll Wallet", 6120, "payroll", 1),
    makeWallet(localUserId, `${DEMO_PREFIX}_wallet_gcash`, "GCash", 2240, "digital_wallet", 2),
    makeWallet(localUserId, `${DEMO_PREFIX}_wallet_cash`, "Cash on Hand", 900, "cash", 3),
  ];

  const budgets = [
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_food`, "Food", 7000, "need", 1, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_transport`, "Transportation", 3500, "need", 2, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_bills`, "Bills", 7000, "need", 3, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_family`, "Family Support", 3000, "responsibility", 4, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_debt`, "Debt Payments", 3000, "responsibility", 5, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_emergency`, "Emergency Fund", 1000, "protection", 6, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_savings`, "Savings", 1500, "goal", 7, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_selfcare`, "Self Care", 1000, "want", 8, monthKey),
  ];

  const expenses = [
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_rent`, `${DEMO_PREFIX}_wallet_payroll`, 4500, "Bills", "Boarding house / rent share", 12),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_internet`, `${DEMO_PREFIX}_wallet_payroll`, 1200, "Bills", "Internet share", 11),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_motorcycle`, `${DEMO_PREFIX}_wallet_payroll`, 2800, "Debt Payments", "Motorcycle installment", 9),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_family`, `${DEMO_PREFIX}_wallet_payroll`, 1500, "Family Support", "Family contribution", 8),
  ];

  return {
    localUserId,
    profile: {
      name: "Alex Reyes",
      age: "27",
      status: "BPO employee",
      monthlyIncome: 27000,
    },
    wallets,
    budgets,
    expenses,
    walletTransactions: [],
    savingsGoals: [
      makeSavingsGoal(localUserId, `${DEMO_PREFIX}_goal_laptop`, "Laptop Upgrade", 7500, 45000, 1500, "Goal for better work and side hustle setup."),
    ],
    emergencyFund: makeBaseRecord(localUserId, `${DEMO_PREFIX}_emergency_fund`, {
      target_amount: 54000,
      saved_amount: 4000,
      monthly_target: 1000,
      monthly_survival_expense: 18000,
    }),
    debts: [
      {
        id: `${DEMO_PREFIX}_debt_credit_card`,
        title: "Credit Card Balance",
        totalDebt: 18000,
        monthlyDebt: 2000,
      },
    ],
    investments: [],
  };
}

async function upsertMany(storeName, records, localUserId) {
  for (const record of records) {
    await upsertLocalRecord(storeName, record, localUserId);
  }
}

export async function seedClaraDemoAccount(localUserIdInput) {
  const localUserId = normalizeLocalUserId(localUserIdInput);
  const data = buildClaraDemoAccountRecords(localUserId);

  await upsertMany(LOCAL_FINANCE_STORES.wallets, data.wallets, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.budgets, data.budgets, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.expenses, data.expenses, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.savingsGoals, data.savingsGoals, localUserId);
  await upsertLocalRecord(LOCAL_FINANCE_STORES.emergencyFund, data.emergencyFund, localUserId);

  for (const debt of data.debts) {
    await upsertDebtObligation(localUserId, debt);
  }

  for (const investment of data.investments) {
    await upsertInvestment(localUserId, investment);
  }

  return data;
}
