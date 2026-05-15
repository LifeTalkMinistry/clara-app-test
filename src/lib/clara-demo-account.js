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

function nowIso() {
  return new Date().toISOString();
}

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

function getCurrentPHMonthKey() {
  const { year, month } = phDateParts();
  return `${year}-${month}`;
}

function daysAgoIso(days) {
  const date = new Date();
  date.setDate(date.getDate() - Number(days || 0));
  return date.toISOString();
}

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
    updatedAt: nowIso(),
  });
}

function makeBudget(localUserId, id, title, amount, needType, sortOrder, monthKey) {
  return makeBaseRecord(localUserId, id, {
    title,
    name: title,
    label: title,
    category: title,
    budget_category: title,
    allocated_amount: amount,
    budget_amount: amount,
    total_budget: amount,
    amount,
    budget: amount,
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
    walletId,
    category,
    budget_category: planningStatus === "planned" ? category : null,
    budget_category_name: planningStatus === "planned" ? category : null,
    expense_category: category,
    need_type: planningStatus === "planned" ? "planned" : "other",
    planning_status: planningStatus,
    unplanned_reason: planningStatus === "planned" ? null : reason,
    unexpected_reason: planningStatus === "planned" ? null : reason,
    behavior_reason: planningStatus === "planned" ? null : reason,
    notes,
    description: notes,
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
    walletId,
    amount,
    type,
    category: extra.category || null,
    planning_status: extra.planning_status || null,
    expense_id: extra.expense_id || null,
    source_type: extra.source_type || "CLARA Demo Ledger",
    tag: extra.tag || null,
    notes,
    description: notes,
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
    title: name,
    label: name,
    saved_amount: savedAmount,
    savedAmount,
    saved: savedAmount,
    current_amount: savedAmount,
    target_amount: targetAmount,
    targetAmount,
    target: targetAmount,
    monthly_target: monthlyTarget,
    monthlyTarget,
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
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_debt", "Debt Payments", 3000, "responsibility", 5, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_emergency`, "Emergency Fund", 1000, "protection", 6, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_savings`, "Savings", 1500, "goal", 7, monthKey),
    makeBudget(localUserId, `${DEMO_PREFIX}_budget_selfcare`, "Self Care", 1000, "want", 8, monthKey),
  ];

  const expenses = [
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_rent`, `${DEMO_PREFIX}_wallet_payroll`, 4500, "Bills", "Boarding house / rent share", 12),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_internet`, `${DEMO_PREFIX}_wallet_payroll`, 1200, "Bills", "Internet share", 11),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_motorcycle`, `${DEMO_PREFIX}_wallet_payroll`, 2800, "Debt Payments", "Motorcycle installment", 9),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_family", `${DEMO_PREFIX}_wallet_payroll`, 1500, "Family Support", "Family contribution", 8),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_lunches`, `${DEMO_PREFIX}_wallet_gcash`, 1180, "Food", "Workday lunches", 7),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_commute`, `${DEMO_PREFIX}_wallet_cash`, 760, "Transportation", "Jeepney and occasional Grab commute", 6),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_load`, `${DEMO_PREFIX}_wallet_gcash`, 350, "Bills", "Mobile load", 5),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_grabfood`, `${DEMO_PREFIX}_wallet_gcash`, 1250, "Food", "GrabFood after stressful shift", 4, "unplanned", "Stress spending after work"),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_shopee`, `${DEMO_PREFIX}_wallet_gcash`, 490, "Self Care", "Random Shopee purchase", 3, "unplanned", "Small reward spending"),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_coffee`, `${DEMO_PREFIX}_wallet_cash`, 180, "Food", "Coffee before shift", 2, "unplanned", "Energy boost before work"),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_dinner`, `${DEMO_PREFIX}_wallet_gcash`, 950, "Food", "Dinner out with coworkers", 1, "unplanned", "Social spending"),
    makeExpense(localUserId, `${DEMO_PREFIX}_expense_buko`, `${DEMO_PREFIX}_wallet_cash`, 120, "Food", "Buko juice", 0, "unplanned", "Craving / thirst"),
  ];

  const walletTransactions = [
    makeWalletTransaction(localUserId, `${DEMO_PREFIX}_income_salary`, `${DEMO_PREFIX}_wallet_payroll`, 27000, "income", "Monthly salary — above minimum earner sample", 14, {
      category: "Salary",
      source_type: "salary",
      tag: "income",
    }),
    ...expenses.map((expense) =>
      makeWalletTransaction(
        localUserId,
        `${DEMO_PREFIX}_txn_${expense.id.replace(`${DEMO_PREFIX}_expense_`, "")}`,
        expense.wallet_id,
        expense.amount,
        "expense",
        expense.notes,
        Math.max(0, Math.round((Date.now() - new Date(expense.date).getTime()) / 86400000)),
        {
          category: expense.category,
          planning_status: expense.planning_status,
          expense_id: expense.id,
          source_type: "expense",
        }
      )
    ),
    makeWalletTransaction(localUserId, `${DEMO_PREFIX}_txn_emergency_topup`, `${DEMO_PREFIX}_wallet_payroll`, 1000, "savings_goal", "Emergency fund top-up", 10, {
      category: "Emergency Fund",
      source_type: "savings",
    }),
    makeWalletTransaction(localUserId, `${DEMO_PREFIX}_txn_laptop_savings`, `${DEMO_PREFIX}_wallet_payroll`, 1500, "savings_goal", "Laptop upgrade savings", 10, {
      category: "Savings",
      source_type: "savings",
    }),
  ];

  const savingsGoals = [
    makeSavingsGoal(localUserId, `${DEMO_PREFIX}_goal_laptop`, "Laptop Upgrade", 7500, 45000, 1500, "Goal for better work and side hustle setup."),
    makeSavingsGoal(localUserId, `${DEMO_PREFIX}_goal_christmas`, "December Buffer", 1800, 12000, 800, "Small yearly buffer so holidays do not become debt."),
  ];

  const emergencyFund = makeBaseRecord(localUserId, `${DEMO_PREFIX}_emergency_fund`, {
    name: "Emergency Fund",
    title: "Emergency Fund",
    target_amount: 54000,
    targetAmount: 54000,
    target: 54000,
    saved_amount: 4000,
    savedAmount: 4000,
    saved: 4000,
    current_amount: 4000,
    monthly_target: 1000,
    monthlyTarget: 1000,
    monthly_survival_expense: 18000,
    survival_months_target: 3,
    status: "building",
    notes: "Demo user wants a 3-month emergency fund but is still inconsistent with impulse spending.",
  });

  const debts = [
    {
      id: `${DEMO_PREFIX}_debt_credit_card`,
      title: "Credit Card Balance",
      lender: "Credit Card",
      type: "credit_card",
      debtType: "credit_card",
      totalDebt: 18000,
      balance: 18000,
      monthlyDebt: 2000,
      monthlyPayment: 2000,
      interestRate: 3,
      dueDate: "25",
      notes: "Mostly small online purchases and food delivery from previous months.",
    },
    {
      id: `${DEMO_PREFIX}_debt_motorcycle`,
      title: "Motorcycle Installment",
      lender: "Motorcycle Loan",
      type: "installment",
      debtType: "installment",
      totalDebt: 28000,
      balance: 28000,
      monthlyDebt: 2800,
      monthlyPayment: 2800,
      interestRate: 1.2,
      dueDate: "10",
      notes: "Work commute obligation.",
    },
    {
      id: `${DEMO_PREFIX}_debt_family_loan`,
      title: "Family Loan",
      lender: "Family",
      type: "personal_loan",
      debtType: "personal_loan",
      totalDebt: 6000,
      balance: 6000,
      monthlyDebt: 1000,
      monthlyPayment: 1000,
      interestRate: 0,
      dueDate: "15",
      notes: "Small family obligation being paid back gradually.",
    },
  ];

  const investments = [
    {
      id: `${DEMO_PREFIX}_investment_mp2`,
      title: "Pag-IBIG MP2 Starter",
      name: "Pag-IBIG MP2 Starter",
      type: "savings_investment",
      investmentType: "savings_investment",
      currentValue: 1500,
      value: 1500,
      monthlyContribution: 500,
      riskType: "low",
      goal: "Start investing only after emergency fund becomes stronger.",
      notes: "Tiny starter amount for demo only.",
    },
  ];

  return {
    localUserId,
    profile: {
      name: "Alex Reyes",
      age: "27",
      status: "BPO employee",
      personality: "Emotion-aware spender",
      incomeRhythm: "Monthly salary",
      monthlyIncome: 27000,
      currentFocus: "Build emergency fund while controlling stress spending.",
      spendingTrigger: "Stress after work and small online rewards.",
      meaningfulGoal: "Laptop upgrade and 3-month emergency fund.",
      financialFear: "Running out of money before payday.",
    },
    wallets,
    budgets,
    expenses,
    walletTransactions,
    savingsGoals,
    emergencyFund,
    debts,
    investments,
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
  await upsertMany(LOCAL_FINANCE_STORES.walletTransactions, data.walletTransactions, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.savingsGoals, data.savingsGoals, localUserId);
  await upsertLocalRecord(LOCAL_FINANCE_STORES.emergencyFund, data.emergencyFund, localUserId);

  for (const debt of data.debts) {
    await upsertDebtObligation(localUserId, {
      ...debt,
      demoAccount: true,
      demo_account: true,
      demoVersion: CLARA_DEMO_ACCOUNT_VERSION,
      demo_version: CLARA_DEMO_ACCOUNT_VERSION,
    });
  }

  for (const investment of data.investments) {
    await upsertInvestment(localUserId, {
      ...investment,
      demoAccount: true,
      demo_account: true,
      demoVersion: CLARA_DEMO_ACCOUNT_VERSION,
      demo_version: CLARA_DEMO_ACCOUNT_VERSION,
    });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clara-finance-updated"));
    window.dispatchEvent(new CustomEvent("clara-wallets-updated"));
    window.dispatchEvent(new CustomEvent("clara-expenses-updated"));
    window.dispatchEvent(new CustomEvent("clara-wallet-transactions-updated"));
    window.dispatchEvent(new CustomEvent("clara:debt-obligations-updated"));
    window.dispatchEvent(new CustomEvent("clara:investments-updated"));
  }

  return data;
}

const DEMO_RECORD_IDS_BY_STORE = {
  [LOCAL_FINANCE_STORES.wallets]: [
    `${DEMO_PREFIX}_wallet_payroll`,
    `${DEMO_PREFIX}_wallet_gcash`,
    `${DEMO_PREFIX}_wallet_cash`,
  ],
  [LOCAL_FINANCE_STORES.budgets]: [
    `${DEMO_PREFIX}_budget_food`,
    `${DEMO_PREFIX}_budget_transport`,
    `${DEMO_PREFIX}_budget_bills`,
    `${DEMO_PREFIX}_budget_family`,
    `${DEMO_PREFIX}_budget_debt`,
    `${DEMO_PREFIX}_budget_emergency`,
    `${DEMO_PREFIX}_budget_savings`,
    `${DEMO_PREFIX}_budget_selfcare`,
  ],
  [LOCAL_FINANCE_STORES.expenses]: [
    `${DEMO_PREFIX}_expense_rent`,
    `${DEMO_PREFIX}_expense_internet`,
    `${DEMO_PREFIX}_expense_motorcycle`,
    `${DEMO_PREFIX}_expense_family`,
    `${DEMO_PREFIX}_expense_lunches`,
    `${DEMO_PREFIX}_expense_commute`,
    `${DEMO_PREFIX}_expense_load`,
    `${DEMO_PREFIX}_expense_grabfood`,
    `${DEMO_PREFIX}_expense_shopee`,
    `${DEMO_PREFIX}_expense_coffee`,
    `${DEMO_PREFIX}_expense_dinner`,
    `${DEMO_PREFIX}_expense_buko`,
  ],
  [LOCAL_FINANCE_STORES.walletTransactions]: [
    `${DEMO_PREFIX}_income_salary`,
    `${DEMO_PREFIX}_txn_rent`,
    `${DEMO_PREFIX}_txn_internet`,
    `${DEMO_PREFIX}_txn_motorcycle`,
    `${DEMO_PREFIX}_txn_family`,
    `${DEMO_PREFIX}_txn_lunches`,
    `${DEMO_PREFIX}_txn_commute`,
    `${DEMO_PREFIX}_txn_load`,
    `${DEMO_PREFIX}_txn_grabfood`,
    `${DEMO_PREFIX}_txn_shopee`,
    `${DEMO_PREFIX}_txn_coffee`,
    `${DEMO_PREFIX}_txn_dinner`,
    `${DEMO_PREFIX}_txn_buko`,
    `${DEMO_PREFIX}_txn_emergency_topup`,
    `${DEMO_PREFIX}_txn_laptop_savings`,
  ],
  [LOCAL_FINANCE_STORES.savingsGoals]: [
    `${DEMO_PREFIX}_goal_laptop`,
    `${DEMO_PREFIX}_goal_christmas`,
  ],
  [LOCAL_FINANCE_STORES.emergencyFund]: [`${DEMO_PREFIX}_emergency_fund`],
};

export async function clearClaraDemoAccount(localUserIdInput) {
  const localUserId = normalizeLocalUserId(localUserIdInput);

  for (const [storeName, ids] of Object.entries(DEMO_RECORD_IDS_BY_STORE)) {
    for (const id of ids) {
      try {
        await softDeleteLocalRecord(storeName, id, localUserId);
      } catch {
        // Ignore missing demo records.
      }
    }
  }

  const extraIds = [
    `${DEMO_PREFIX}_debt_credit_card`,
    `${DEMO_PREFIX}_debt_motorcycle`,
    `${DEMO_PREFIX}_debt_family_loan`,
    `${DEMO_PREFIX}_investment_mp2`,
  ];

  for (const id of extraIds) {
    try {
      await softDeleteLocalRecord(LOCAL_FINANCE_STORES.privatePreferences, id, localUserId);
    } catch {
      // Ignore missing demo records.
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clara-finance-updated"));
    window.dispatchEvent(new CustomEvent("clara-wallets-updated"));
    window.dispatchEvent(new CustomEvent("clara-expenses-updated"));
    window.dispatchEvent(new CustomEvent("clara-wallet-transactions-updated"));
    window.dispatchEvent(new CustomEvent("clara:debt-obligations-updated"));
    window.dispatchEvent(new CustomEvent("clara:investments-updated"));
  }
}
