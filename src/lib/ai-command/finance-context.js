import { getWalletBalance } from "@/utils/financialEngine";
import { getDateScopeMeta, getPHMonthKey, getTodayPHDateString } from "@/lib/ai-command/time";
import {
  getBudgets,
  getExpenses,
  getSavingsGoals,
  getTransfers,
  getWallets,
  getWalletTransactions,
} from "@/lib/financeRepository";
import { readClaraDevIdentityOverride } from "@/lib/clara-dev-simulator";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";

const DEFAULT_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "utilities",
  "entertainment",
  "shopping",
  "health",
  "education",
  "personal",
  "other",
];

const CLARA_DEMO_LOCAL_USER_ID = "clara-demo-user";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getFinanceIdentityMode() {
  try {
    return readClaraDevIdentityOverride()?.scenarioId || "real_user";
  } catch {
    return "real_user";
  }
}

export function getFinanceLocalUserId(user) {
  if (getFinanceIdentityMode() === "demo_user") return CLARA_DEMO_LOCAL_USER_ID;
  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

async function safeLocalRows(label, loader, user) {
  try {
    const localUserId = getFinanceLocalUserId(user);
    return await loader(localUserId);
  } catch (error) {
    console.warn(`CLARA AI could not load local ${label}:`, error);
    return [];
  }
}

function removeDeleted(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter((row) => !row?.deletedAt && !row?.deleted_at);
}

export function dateValue(row) {
  return row?.date || row?.created_at || row?.created_date || row?.createdAt || row?.updated_at || row?.updatedAt || "";
}

function getDateKey(row) {
  const value = String(dateValue(row) || "");
  return value.slice(0, 10);
}

function getMonthKey(row) {
  const value = String(dateValue(row) || "");
  return value.slice(0, 7);
}

export function computeFinanceSummary(snapshot = {}) {
  const wallets = snapshot.wallets || [];
  const expenses = snapshot.expenses || [];
  const walletTransactions = snapshot.walletTransactions || [];
  const budgets = snapshot.budgets || [];
  const savingsGoals = snapshot.savingsGoals || [];
  const transfers = snapshot.transfers || [];

  const normalizedWallets = wallets.map((wallet) => ({
    ...wallet,
    name: wallet.name || wallet.wallet_name || "Wallet",
    balance: getWalletBalance(wallet, walletTransactions, transfers),
  }));

  const totalBalance = normalizedWallets.reduce((sum, wallet) => sum + toNumber(wallet.balance), 0);
  const thisMonthKey = getPHMonthKey();
  const todayKey = getTodayPHDateString();
  const monthExpenses = expenses.filter((expense) => getMonthKey(expense) === thisMonthKey);
  const todayExpenses = expenses.filter((expense) => getDateKey(expense) === todayKey);

  const incomeThisMonth = walletTransactions
    .filter(
      (txn) =>
        getMonthKey(txn) === thisMonthKey &&
        ["income", "add", "cash_in", "deposit", "add_funds", "add_money", "opening_balance"].includes(normalize(txn.type))
    )
    .reduce((sum, txn) => sum + toNumber(txn.amount), 0);

  const spentThisMonth = monthExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const spentToday = todayExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);

  const categoryTotals = monthExpenses.reduce((acc, expense) => {
    const category = normalize(expense.category || "other") || "other";
    acc[category] = (acc[category] || 0) + toNumber(expense.amount);
    return acc;
  }, {});

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ["none", 0];
  const savingsTarget = savingsGoals.reduce((sum, goal) => sum + toNumber(goal.target_amount), 0);
  const savingsSaved = savingsGoals.reduce((sum, goal) => sum + toNumber(goal.saved_amount ?? goal.current_amount), 0);
  const budgetTotal = budgets.reduce((sum, budget) => sum + toNumber(budget.allocated_amount ?? budget.total_budget), 0);

  return {
    totalBalance,
    incomeThisMonth,
    spentThisMonth,
    spentToday,
    moneyLeftThisMonth: totalBalance,
    walletCount: normalizedWallets.length,
    expenseCountThisMonth: monthExpenses.length,
    categoryTotals,
    topCategory: { name: topCategory[0], amount: topCategory[1] },
    budgetTotal,
    savingsTarget,
    savingsSaved,
    savingsProgress: savingsTarget > 0 ? Math.round((savingsSaved / savingsTarget) * 100) : 0,
  };
}

export async function loadFinanceSnapshot(user) {
  const [expenses, wallets, walletTransactions, budgets, savingsGoals, transfers] = await Promise.all([
    safeLocalRows("expenses", getExpenses, user),
    safeLocalRows("wallets", getWallets, user),
    safeLocalRows("wallet transactions", getWalletTransactions, user),
    safeLocalRows("budgets", getBudgets, user),
    safeLocalRows("savings goals", getSavingsGoals, user),
    safeLocalRows("transfers", getTransfers, user),
  ]);

  const activeExpenses = removeDeleted(expenses);
  const activeWallets = removeDeleted(wallets);
  const activeTransactions = removeDeleted(walletTransactions);
  const activeBudgets = removeDeleted(budgets);
  const activeSavingsGoals = removeDeleted(savingsGoals);
  const activeTransfers = removeDeleted(transfers);

  const normalizedWallets = activeWallets.map((wallet) => ({
    ...wallet,
    id: String(wallet.id),
    name: wallet.name || wallet.wallet_name || "Wallet",
    balance: getWalletBalance(wallet, activeTransactions || [], activeTransfers || []),
  }));

  const normalizedExpenses = activeExpenses
    .map((expense) => ({
      ...expense,
      id: String(expense.id),
      wallet_id: expense.wallet_id ? String(expense.wallet_id) : "",
      amount: toNumber(expense.amount),
      category: normalize(expense.category || "other") || "other",
    }))
    .sort((a, b) => String(dateValue(b)).localeCompare(String(dateValue(a))));

  const normalizedTransactions = activeTransactions
    .map((txn) => ({
      ...txn,
      id: String(txn.id),
      wallet_id: txn.wallet_id ? String(txn.wallet_id) : "",
      amount: toNumber(txn.amount),
      type: normalize(txn.type),
    }))
    .sort((a, b) => String(dateValue(b)).localeCompare(String(dateValue(a))));

  const normalizedBudgets = activeBudgets.map((budget) => ({
    ...budget,
    id: String(budget.id),
    category: normalize(budget.category || budget.budget_category || "other") || "other",
    allocated_amount: toNumber(budget.allocated_amount ?? budget.total_budget),
  }));

  const normalizedSavingsGoals = activeSavingsGoals.map((goal) => ({
    ...goal,
    id: String(goal.id),
    title: goal.title || goal.name || "Savings Goal",
    target_amount: toNumber(goal.target_amount),
    saved_amount: toNumber(goal.saved_amount ?? goal.current_amount),
  }));

  const normalizedTransfers = activeTransfers.map((transfer) => ({
    ...transfer,
    id: String(transfer.id),
    from_wallet_id: transfer.from_wallet_id ? String(transfer.from_wallet_id) : "",
    to_wallet_id: transfer.to_wallet_id ? String(transfer.to_wallet_id) : "",
    amount: toNumber(transfer.amount),
  }));

  const snapshot = {
    expenses: normalizedExpenses,
    wallets: normalizedWallets,
    walletTransactions: normalizedTransactions,
    budgets: normalizedBudgets,
    savingsGoals: normalizedSavingsGoals,
    transfers: normalizedTransfers,
  };

  const lifeStageContext = buildClaraLifeStageAiContext();

  return {
    ...snapshot,
    categories: Array.from(
      new Set([
        ...DEFAULT_CATEGORIES,
        ...normalizedExpenses.map((expense) => expense.category),
        ...normalizedBudgets.map((budget) => budget.category),
      ])
    ),
    summary: computeFinanceSummary(snapshot),
    lifeStageContext,
    lifeStageAiContext: lifeStageContext,
    meLifeStageProfile: lifeStageContext,
  };
}

export function compactFinanceSnapshot(snapshot = {}) {
  const lifeStageContext =
    snapshot.lifeStageContext ||
    snapshot.lifeStageAiContext ||
    snapshot.meLifeStageProfile ||
    buildClaraLifeStageAiContext();

  return {
    summary: snapshot.summary || computeFinanceSummary(snapshot),
    lifeStageContext,
    wallets: (snapshot.wallets || []).map((wallet) => ({
      id: wallet.id,
      name: wallet.name || wallet.wallet_name || "Wallet",
      balance: toNumber(wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance),
    })),
    recentExpenses: (snapshot.expenses || []).slice(0, 12).map((expense) => ({
      amount: toNumber(expense.amount),
      category: expense.category || "other",
      notes: expense.notes || expense.label || "",
      date: dateValue(expense),
    })),
    recentTransactions: (snapshot.walletTransactions || []).slice(0, 12).map((txn) => ({
      amount: toNumber(txn.amount),
      type: txn.type,
      wallet_id: txn.wallet_id,
      notes: txn.notes || "",
      date: dateValue(txn),
    })),
    budgets: (snapshot.budgets || []).slice(0, 8).map((budget) => ({
      category: budget.category || budget.budget_category || "other",
      amount: toNumber(budget.allocated_amount ?? budget.total_budget),
      month: budget.month,
    })),
    savingsGoals: (snapshot.savingsGoals || []).slice(0, 8).map((goal) => ({
      title: goal.title || goal.name,
      target: toNumber(goal.target_amount),
      saved: toNumber(goal.saved_amount ?? goal.current_amount),
      deadline: goal.planned_use_date || goal.deadline,
    })),
  };
}

export function summarizeSpendForScope(snapshot = {}, scope = "today") {
  const meta = getDateScopeMeta(scope);
  const expenses = snapshot.expenses || [];

  if (meta.scope === "this_month" || meta.scope === "last_month") {
    const scopedExpenses = expenses.filter((expense) => getMonthKey(expense) === meta.month);
    const amount = scopedExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
    return { ...meta, amount, expenseCount: scopedExpenses.length };
  }

  const scopedExpenses = expenses.filter((expense) => getDateKey(expense) === meta.date);
  const amount = scopedExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  return { ...meta, amount, expenseCount: scopedExpenses.length };
}
