import { buildClaraBudgetSnapshot } from "./clara-budget-snapshot";

export const CLARA_LOCAL_INTENTS = Object.freeze({
  FUTURE_FORECAST: "future_forecast",
  SPENDING_CHECK: "spending_check",
  WALLET_HEALTH: "wallet_health",
  AVAILABLE_MONEY: "available_money",
  BUDGET_CHECK: "budget_check",
  SAVINGS_CHECK: "savings_check",
  EMERGENCY_FUND_CHECK: "emergency_fund_check",
  PURCHASE_DECISION: "purchase_decision",
  DAILY_WARNING: "daily_warning",
  UNKNOWN: "unknown",
});

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const number = typeof value === "number" ? value : Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function text(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return String(value).trim();
  }
  return "";
}

function readPath(source, path) {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
}

function firstArray(source, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstNumber(source, paths = []) {
  for (const path of paths) {
    const number = toNumber(readPath(source, path));
    if (number !== null) return number;
  }
  return null;
}

function sum(values = []) {
  return toArray(values).reduce((total, value) => total + (toNumber(value) ?? 0), 0);
}

function percent(saved, target) {
  if (!Number.isFinite(saved) || !Number.isFinite(target) || target <= 0) return null;
  return Math.max(0, Math.min((saved / target) * 100, 100));
}

function moneyField(wallet = {}) {
  return toNumber(
    wallet.derived_balance,
    wallet.balance,
    wallet.current_balance,
    wallet.wallet_balance,
    wallet.available_balance,
    wallet.starting_balance
  );
}

function normalizeWallet(wallet = {}) {
  const balance = moneyField(wallet);
  return {
    id: text(wallet.id, wallet.wallet_id, wallet.walletId, wallet.local_id, wallet.name, "wallet"),
    name: text(wallet.name, wallet.wallet_name, wallet.title, wallet.label, "Wallet"),
    balance,
    hasReadableBalance: balance !== null,
    protectedAmount: toNumber(wallet.protected_balance, wallet.reserve_balance, wallet.emergencyProtectedAmount, wallet.emergency_protected_amount) ?? 0,
    raw: wallet,
  };
}

function normalizeExpense(expense = {}) {
  const amount = toNumber(expense.amount, expense.total, expense.value, expense.price, expense.expense_amount, expense.spent_amount);
  return {
    id: text(expense.id, expense.expense_id, expense.local_id, `${text(expense.date, expense.created_at)}-${amount ?? 0}`),
    amount,
    date: text(expense.date, expense.created_at, expense.createdAt, expense.spent_at, expense.logged_at, expense.transaction_date, expense.transactionDate),
    category: text(expense.budget_category, expense.expense_category, expense.category, expense.category_name, expense.type, "Expense"),
    raw: expense,
  };
}

function normalizeSavingsGoal(goal = {}) {
  const saved = toNumber(goal.saved, goal.current, goal.saved_amount, goal.current_amount, goal.amount, goal.progress);
  const target = toNumber(goal.target, goal.goal, goal.target_amount, goal.goal_amount, goal.required_amount);
  return {
    id: text(goal.id, goal.goal_id, goal.local_id, goal.title, "savings-goal"),
    name: text(goal.name, goal.title, goal.goal_name, "Savings goal"),
    saved,
    target,
    percent: percent(saved, target),
    raw: goal,
  };
}

function emergencyFundSnapshot(source = {}, wallets = []) {
  const fund = source.emergencyFund || source.emergency_fund || {};
  const saved = toNumber(fund.saved, fund.current, fund.currentAmount, fund.current_amount, fund.amount, fund.saved_amount, source.emergencyFundSaved, source.emergency_fund_saved);
  const target = toNumber(fund.target, fund.goal, fund.targetAmount, fund.target_amount, fund.goal_amount, source.emergencyFundTarget, source.emergency_fund_target, source.survivalExpense);
  const protectedAmount = Math.min(sum(wallets.map((wallet) => wallet.protectedAmount)), sum(wallets.map((wallet) => wallet.balance)));
  return {
    saved,
    target,
    monthsCovered: toNumber(fund.monthsCovered, fund.months_covered, fund.months, source.emergencyFundMonths, source.emergency_fund_months),
    percent: percent(saved, target),
    remaining: saved !== null && target !== null ? Math.max(target - saved, 0) : null,
    protectedAmount,
    raw: fund,
  };
}

export function buildClaraFinanceSnapshot(context = {}) {
  const source = { ...(context?.financeSnapshot || {}), ...(context?.dashboardSnapshot || {}), ...(context || {}) };
  const rawExpenses = firstArray(source, ["expenses", "monthlyExpensesList", "recentExpenses", "finance.expenses"]);
  const expenses = rawExpenses.map(normalizeExpense);
  const wallets = firstArray(source, ["wallets", "userWallets", "finance.wallets"]).map(normalizeWallet);
  const walletTransactions = firstArray(source, ["walletTransactions", "wallet_transactions", "transactions", "finance.walletTransactions"]);
  const transfers = firstArray(source, ["transfers", "walletTransfers", "wallet_transfers", "finance.transfers"]);
  const budgetPlan = buildClaraBudgetSnapshot({ ...source, expenses: rawExpenses });
  const savingsGoals = firstArray(source, ["savingsGoals", "savings_goals", "goals", "finance.savingsGoals"]).map(normalizeSavingsGoal);
  const readableWallets = wallets.filter((wallet) => wallet.hasReadableBalance);
  const totalWalletBalance = readableWallets.length ? sum(readableWallets.map((wallet) => wallet.balance)) : 0;
  const emergencyFund = emergencyFundSnapshot(source, wallets);
  const protectedEmergencyAmount = readableWallets.length ? Math.min(emergencyFund.protectedAmount || 0, totalWalletBalance) : 0;
  const safeSpendableAmount = readableWallets.length ? Math.max(totalWalletBalance - protectedEmergencyAmount, 0) : null;
  const walletStatus = !wallets.length ? "no_wallets" : readableWallets.length ? "active_wallets" : "wallet_balance_unreadable";
  const topWallet = readableWallets.slice().sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))[0] || null;
  const monthlySpent = firstNumber(source, ["monthlySpent", "totalExpensesThisMonth", "thisMonthSpent", "monthlyExpenses", "spentThisMonth", "finance.monthlySpent"]) ?? (expenses.length ? sum(expenses.map((expense) => expense.amount)) : null);
  const savingsSaved = firstNumber(source, ["totalSavingsSaved", "savingsSaved", "savedAmount"]) ?? (savingsGoals.length ? sum(savingsGoals.map((goal) => goal.saved)) : null);
  const savingsTarget = firstNumber(source, ["totalSavingsTarget", "savingsTarget", "targetSavings"]) ?? (savingsGoals.length ? sum(savingsGoals.map((goal) => goal.target)) : null);
  const income = firstNumber(source, ["income", "monthlyIncome", "incomeThisMonth", "totalIncome", "addedFunds", "addFunds", "fundsAdded", "finance.income"]);
  const hasAnyData = Boolean(wallets.length || expenses.length || walletTransactions.length || transfers.length || savingsGoals.length || monthlySpent !== null || budgetPlan.hasDeclaredBudget || savingsSaved !== null || savingsTarget !== null || emergencyFund.saved !== null || emergencyFund.target !== null || income !== null);

  return {
    rawContext: source,
    hasAnyData,
    dataStatus: hasAnyData ? "ready" : "loading",
    hasActiveBudgetPlan: budgetPlan.hasDeclaredBudget,
    hasWallets: wallets.length > 0,
    hasReadableWalletBalances: readableWallets.length > 0,
    walletStatus,
    walletRows: wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: wallet.balance, protectedAmount: wallet.protectedAmount, hasReadableBalance: wallet.hasReadableBalance })),
    wallets,
    walletCount: wallets.length,
    walletBalances: wallets,
    topWallet,
    totalBalance: totalWalletBalance,
    totalWalletBalance,
    protectedEmergencyAmount,
    safeSpendableAmount,
    availableMoney: safeSpendableAmount,
    expenses,
    expenseCount: expenses.length,
    currentMonthExpenses: expenses,
    monthlySpent,
    totalExpensesCurrentMonth: monthlySpent,
    monthlySpentLabel: "visible expenses",
    totalSpent: expenses.length ? sum(expenses.map((expense) => expense.amount)) : null,
    plannedSpent: budgetPlan.plannedSpent,
    unplannedSpent: budgetPlan.unplannedSpent,
    undocumentedSpent: budgetPlan.undocumentedSpent,
    needsSpent: null,
    wantsSpent: null,
    spendingByCategory: {},
    topSpendingCategory: null,
    walletTransactions,
    transfers,
    budgets: budgetPlan.hasBudgetCategories ? budgetPlan.categories : [],
    budgetAllocated: budgetPlan.allocatedBudget,
    budgetSpent: budgetPlan.spentTotal,
    budgetRemaining: budgetPlan.remainingSpendableBudget,
    remainingBudget: budgetPlan.remainingSpendableBudget,
    effectiveBudgetRemaining: budgetPlan.hasDeclaredBudget ? budgetPlan.remainingSpendableBudget : null,
    budgetPressure: budgetPlan.hasDeclaredBudget ? "ready" : "none",
    budgetPlan,
    savingsGoals,
    savingsSaved,
    savingsTarget,
    savingsProgress: percent(savingsSaved, savingsTarget),
    emergencyFund,
    income,
  };
}

export function hasUsableClaraSnapshot(snapshot = {}) {
  return Boolean(snapshot?.hasAnyData);
}

export function detectClaraIntent() {
  return CLARA_LOCAL_INTENTS.UNKNOWN;
}

export function generateClaraLocalReply() {
  return "I need one more detail to answer that correctly. Can you clarify what you want CLARA to check or decide?";
}
