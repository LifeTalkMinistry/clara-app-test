import { supabase } from "@/lib/supabaseClient";
import { getPHMonthKey, getTodayPHDateString } from "@/lib/ai-command/time";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function ownsRow(row, user) {
  const userId = String(user?.id || "");
  const email = normalize(user?.email);
  return (
    (userId && [row?.user_id, row?.owner_id, row?.profile_id].map(String).includes(userId)) ||
    (email && [row?.user_email, row?.created_by, row?.owner_email, row?.email].map(normalize).includes(email))
  );
}

async function safeRows(table, user) {
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.warn(`CLARA AI could not load ${table}:`, error);
      return [];
    }
    return (data || []).filter((row) => ownsRow(row, user));
  } catch (error) {
    console.warn(`CLARA AI ${table} snapshot failed:`, error);
    return [];
  }
}

function dateValue(row) {
  return row?.date || row?.created_at || row?.created_date || row?.updated_at || "";
}

function isSamePHMonth(row) {
  const month = getPHMonthKey();
  const value = String(dateValue(row) || "");
  return value.startsWith(month);
}

function isTodayPH(row) {
  const today = getTodayPHDateString();
  const value = String(dateValue(row) || "");
  return value.startsWith(today);
}

export function computeFinanceSummary(snapshot = {}) {
  const wallets = snapshot.wallets || [];
  const expenses = snapshot.expenses || [];
  const walletTransactions = snapshot.walletTransactions || [];
  const budgets = snapshot.budgets || [];
  const savingsGoals = snapshot.savingsGoals || [];

  const totalBalance = wallets.reduce((sum, wallet) => sum + toNumber(wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance), 0);
  const monthExpenses = expenses.filter(isSamePHMonth);
  const todayExpenses = expenses.filter(isTodayPH);
  const incomeThisMonth = walletTransactions
    .filter((txn) => isSamePHMonth(txn) && ["income", "transfer_in"].includes(normalize(txn.type)))
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
    moneyLeftThisMonth: incomeThisMonth - spentThisMonth,
    walletCount: wallets.length,
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
    safeRows("expenses", user),
    safeRows("wallets", user),
    safeRows("wallet_transactions", user),
    safeRows("budgets", user),
    safeRows("savings_goals", user),
    safeRows("transfers", user),
  ]);

  const snapshot = {
    expenses,
    wallets,
    walletTransactions,
    budgets,
    savingsGoals,
    transfers,
  };

  return {
    ...snapshot,
    summary: computeFinanceSummary(snapshot),
  };
}

export function compactFinanceSnapshot(snapshot = {}) {
  return {
    summary: snapshot.summary || computeFinanceSummary(snapshot),
    wallets: (snapshot.wallets || []).map((wallet) => ({
      id: wallet.id,
      name: wallet.name || wallet.wallet_name || "Wallet",
      balance: toNumber(wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance),
    })),
    recentExpenses: (snapshot.expenses || []).slice(-12).map((expense) => ({
      amount: toNumber(expense.amount),
      category: expense.category || "other",
      notes: expense.notes || expense.label || "",
      date: dateValue(expense),
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
