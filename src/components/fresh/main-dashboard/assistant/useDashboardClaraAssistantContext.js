import { useMemo } from "react";
import {
  getPHMonthKey,
  getTransactionDate,
  sortByNewestDate,
} from "@/utils/dashboard/dashboardHelpers";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

const readNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const number =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));

    if (Number.isFinite(number)) return number;
  }

  return null;
};

const normalizeLower = (value) => String(value || "").trim().toLowerCase();

const sumNumbers = (items, getValue) =>
  safeArray(items).reduce((sum, item) => sum + (readNumber(getValue(item)) ?? 0), 0);

const getExpensePlanningStatus = (expense) =>
  normalizeLower(
    expense?.planning_status ||
      expense?.planningStatus ||
      expense?.budgetStatus ||
      expense?.status ||
      ""
  );

const getExpenseNeedType = (expense) =>
  normalizeLower(
    expense?.need_type ||
      expense?.needType ||
      expense?.spending_type ||
      expense?.spendingType ||
      expense?.type ||
      ""
  );

const getExpenseCategory = (expense) =>
  String(
    expense?.category ||
      expense?.budget_category ||
      expense?.budgetCategory ||
      expense?.type ||
      "Uncategorized"
  ).trim() || "Uncategorized";

const getWalletBalance = (wallet) =>
  readNumber(
    wallet?.derived_balance,
    wallet?.balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.starting_balance
  );

const buildCategoryBreakdown = (expenses) => {
  const totals = new Map();

  safeArray(expenses).forEach((expense) => {
    const category = getExpenseCategory(expense);
    const amount = readNumber(expense?.amount, expense?.value, expense?.total) ?? 0;
    totals.set(category, (totals.get(category) || 0) + amount);
  });

  const byCategory = Object.fromEntries(totals.entries());
  const topCategory =
    [...totals.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([category, amount]) => ({ category, amount }))[0] || null;

  return {
    byCategory,
    topCategory,
  };
};

export default function useDashboardClaraAssistantContext({
  user = null,
  profileData = null,
  wallets = [],
  expenses = [],
  budgets = [],
  savingsGoals = [],
  walletTransactions = [],
  transfers = [],
  pendingExpenses = [],
  emergencyFund = null,
  thisMonthSpent = null,
  thisMonthIncome = null,
  moneyLeftThisMonth = null,
  walletMoney = null,
  totalSavingsSaved = null,
  totalSavingsTarget = null,
  primarySavingsGoal = null,
  topWallet = null,
  activeBudget = null,
  derivedActiveBudget = null,
} = {}) {
  return useMemo(() => {
    const safeWallets = safeArray(wallets);
    const safeExpenses = safeArray(expenses);
    const safeBudgets = safeArray(budgets);
    const safeSavingsGoals = safeArray(savingsGoals);
    const safeWalletTransactions = safeArray(walletTransactions);
    const safeTransfers = safeArray(transfers);
    const safePendingExpenses = safeArray(pendingExpenses);
    const safeEmergencyFund = safeObject(emergencyFund);
    const lifeStageContext = buildClaraLifeStageAiContext();
    const currentMonthKey = getPHMonthKey();

    const currentMonthExpenses = safeExpenses.filter((expense) => {
      const itemDate = getTransactionDate(expense);
      return Boolean(itemDate && getPHMonthKey(itemDate) === currentMonthKey);
    });

    const monthlySpent =
      readNumber(thisMonthSpent) ??
      sumNumbers(currentMonthExpenses, (expense) => expense?.amount);

    const monthlyIncome = readNumber(thisMonthIncome) ??
      sumNumbers(
        safeWalletTransactions.filter((transaction) => {
          const type = normalizeLower(transaction?.type || transaction?.source_type);
          const itemDate = getTransactionDate(transaction);
          const isCurrentMonth = itemDate && getPHMonthKey(itemDate) === currentMonthKey;
          return isCurrentMonth && ["income", "add", "cash_in", "deposit", "opening_balance", "credit"].includes(type);
        }),
        (transaction) => transaction?.amount
      );

    const walletBalances = safeWallets
      .map((wallet) => getWalletBalance(wallet))
      .filter((balance) => Number.isFinite(balance));
    const walletRecordTotal = safeWallets.length && walletBalances.length
      ? walletBalances.reduce((sum, balance) => sum + balance, 0)
      : null;

    const plannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "planned" || status === "good decision";
    });

    const unplannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "unplanned" || status === "budget risk";
    });

    const needsExpenseRows = currentMonthExpenses.filter((expense) =>
      getExpenseNeedType(expense).includes("need")
    );

    const wantsExpenseRows = currentMonthExpenses.filter((expense) =>
      getExpenseNeedType(expense).includes("want")
    );

    const categoryBreakdown = buildCategoryBreakdown(currentMonthExpenses);
    const recentExpenses = sortByNewestDate(safeExpenses).slice(0, 8);

    const savingsSaved =
      readNumber(totalSavingsSaved) ??
      sumNumbers(safeSavingsGoals, (goal) =>
        goal?.saved ?? goal?.saved_amount ?? goal?.current_amount ?? goal?.current ?? goal?.amount
      );

    const savingsTarget =
      readNumber(totalSavingsTarget) ??
      sumNumbers(safeSavingsGoals, (goal) =>
        goal?.target ?? goal?.target_amount ?? goal?.goal_amount ?? goal?.goal
      );

    return {
      user,
      profile: profileData,
      userId: user?.id || user?.user_id || profileData?.user_id || profileData?.id || null,

      lifeStageContext,
      lifeStageAiContext: lifeStageContext,
      meLifeStageProfile: lifeStageContext,

      wallets: safeWallets,
      expenses: safeExpenses,
      budgets: safeBudgets,
      savingsGoals: safeSavingsGoals,
      walletTransactions: safeWalletTransactions,
      transfers: safeTransfers,
      pendingExpenses: safePendingExpenses,
      emergencyFund: safeEmergencyFund,

      currentMonthKey,
      currentMonthExpenses,
      recentExpenses,
      plannedExpensesThisMonth: plannedExpenseRows,
      unplannedExpensesThisMonth: unplannedExpenseRows,

      thisMonthSpent: monthlySpent,
      monthlySpent,
      totalExpensesThisMonth: monthlySpent,
      thisMonthIncome: monthlyIncome,
      monthlyIncome,
      incomeThisMonth: monthlyIncome,
      moneyLeftThisMonth: walletRecordTotal,
      availableMoney: walletRecordTotal,
      totalWalletBalance: walletRecordTotal,
      walletMoney: walletRecordTotal,

      plannedSpent: sumNumbers(plannedExpenseRows, (expense) => expense?.amount),
      unplannedSpent: sumNumbers(unplannedExpenseRows, (expense) => expense?.amount),
      needsSpent: sumNumbers(needsExpenseRows, (expense) => expense?.amount),
      wantsSpent: sumNumbers(wantsExpenseRows, (expense) => expense?.amount),
      spendingByCategory: categoryBreakdown.byCategory,
      topSpendingCategory: categoryBreakdown.topCategory,

      totalSavingsSaved: savingsSaved,
      savingsSaved,
      totalSavingsTarget: savingsTarget,
      savingsTarget,
      primarySavingsGoal,

      topWallet,
      activeBudget,
      derivedActiveBudget,
    };
  }, [
    user,
    profileData,
    wallets,
    expenses,
    budgets,
    savingsGoals,
    walletTransactions,
    transfers,
    pendingExpenses,
    emergencyFund,
    thisMonthSpent,
    thisMonthIncome,
    moneyLeftThisMonth,
    walletMoney,
    totalSavingsSaved,
    totalSavingsTarget,
    primarySavingsGoal,
    topWallet,
    activeBudget,
    derivedActiveBudget,
  ]);
}
