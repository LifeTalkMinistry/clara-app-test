import { useMemo } from "react";
import {
  normalizeString,
  normalizeLower,
  INCOME_TRANSACTION_TYPES,
  isClaraOnline,
  firstPositiveNumber,
  getPHMonthKey,
  sortByNewestDate,
  getWalletDisplayName,
  getWalletDisplayBalance,
  getBudgetTotal,
  getBudgetSpent,
  getBudgetRemaining,
  getSavingsSaved,
  getSavingsTarget,
  getSavingsGoalTitle,
  getTransactionDate,
  getExpenseCategoryKey,
  getBudgetListTitle,
  getBudgetNeedType,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardClaraAssistantContext({
  budgetSummaries = [],
  budgets = [],
  derivedActiveBudget = null,
  emergencyFund = null,
  expenses = [],
  fmt = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`,
  manualExpenseBudgetOptions = [],
  moneyLeftThisMonth = null,
  monthlyBudgetPlan = null,
  nickname = "",
  offlineReady = false,
  pendingExpenses = [],
  profileData = null,
  savingsGoals = [],
  survivalExpense = null,
  thisMonthIncome = null,
  thisMonthSpent = null,
  totalSavingsSaved = null,
  totalSavingsTarget = null,
  transfers = [],
  user = null,
  walletMoney = null,
  walletTransactions = [],
  wallets = [],
} = {}) {
  return useMemo(() => {
    const safeWallets = Array.isArray(wallets) ? wallets : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeBudgets = Array.isArray(budgets) ? budgets : [];
    const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];
    const safeWalletTransactions = Array.isArray(walletTransactions)
      ? walletTransactions
      : [];
    const safePendingExpenses = Array.isArray(pendingExpenses) ? pendingExpenses : [];
    const currentMonthKey = getPHMonthKey();

    const readNumber = (...values) => {
      for (const value of values) {
        if (value === null || value === undefined || value === "") continue;
        const number =
          typeof value === "number"
            ? value
            : Number(String(value).replace(/[₱,\s]/g, ""));

        if (Number.isFinite(number)) return number;
      }

      return null;
    };

    const sumNumbers = (items, getValue) =>
      items.reduce((sum, item) => sum + (readNumber(getValue(item)) ?? 0), 0);

    const isCurrentMonthItem = (item) => {
      const itemDate = getTransactionDate(item);
      return Boolean(itemDate && getPHMonthKey(itemDate) === currentMonthKey);
    };

    const getExpensePlanningStatus = (expense) =>
      normalizeLower(
        expense?.planning_status ||
          expense?.planningStatus ||
          expense?.status ||
          ""
      );

    const getExpenseNeedType = (expense) =>
      normalizeLower(
        expense?.need_type ||
          expense?.needType ||
          expense?.spending_type ||
          expense?.type ||
          ""
      );

    const currentMonthExpenses = safeExpenses.filter(isCurrentMonthItem);
    const safeMonthlySpent = readNumber(thisMonthSpent) ?? sumNumbers(
      currentMonthExpenses,
      (expense) => expense?.amount
    );
    const recentExpenseRows = sortByNewestDate(safeExpenses).slice(0, 8);

    const plannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "planned";
    });
    const unplannedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "unplanned";
    });
    const undocumentedExpenseRows = currentMonthExpenses.filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      return status === "undocumented";
    });
    const needsExpenseRows = currentMonthExpenses.filter((expense) => {
      const type = getExpenseNeedType(expense);
      return type === "need" || type === "needs" || type === "essential";
    });
    const wantsExpenseRows = currentMonthExpenses.filter((expense) => {
      const type = getExpenseNeedType(expense);
      return type === "want" || type === "wants" || type === "lifestyle";
    });

    const walletTotalFromRows = safeWallets.length
      ? sumNumbers(safeWallets, getWalletDisplayBalance)
      : null;
    const walletMoneyValue = readNumber(walletMoney);
    const safeTotalWalletBalance =
      walletTotalFromRows ?? (walletMoneyValue !== 0 ? walletMoneyValue : null);
    const safeTotalMoneyLeft =
      safeTotalWalletBalance ??
      readNumber(moneyLeftThisMonth) ??
      null;

    const incomeTransactionRows = safeWalletTransactions.filter((transaction) => {
      const type = normalizeLower(
        transaction?.type || transaction?.transaction_type || transaction?.kind
      );
      return INCOME_TRANSACTION_TYPES.has(type);
    });
    const currentMonthIncomeRows = incomeTransactionRows.filter(isCurrentMonthItem);
    const monthlyIncomeValue =
      currentMonthIncomeRows.length > 0
        ? sumNumbers(currentMonthIncomeRows, (transaction) => transaction?.amount)
        : readNumber(thisMonthIncome);
    const totalIncomeValue = incomeTransactionRows.length
      ? sumNumbers(incomeTransactionRows, (transaction) => transaction?.amount)
      : null;

    const declaredBudgetAmount = readNumber(
      monthlyBudgetPlan?.declared_budget,
      monthlyBudgetPlan?.declared_amount,
      monthlyBudgetPlan?.monthly_budget_amount
    );
    const hasBudgetData =
      safeBudgets.length > 0 ||
      Number(monthlyBudgetPlan?.category_count || 0) > 0 ||
      (declaredBudgetAmount !== null && declaredBudgetAmount > 0) ||
      Boolean(derivedActiveBudget);

    const budgetAllocated = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.allocated_amount,
          monthlyBudgetPlan?.allocated_total,
          monthlyBudgetPlan?.total_budget,
          derivedActiveBudget?.allocated_amount,
          derivedActiveBudget?.total_budget,
          derivedActiveBudget ? getBudgetTotal(derivedActiveBudget) : null
        )
      : null;
    const budgetSpent = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.spent,
          monthlyBudgetPlan?.spent_amount,
          monthlyBudgetPlan?.total_spent,
          derivedActiveBudget?.spent,
          derivedActiveBudget?.spent_amount,
          derivedActiveBudget?.total_spent,
          derivedActiveBudget ? getBudgetSpent(derivedActiveBudget) : null
        )
      : null;
    const budgetRemaining = hasBudgetData
      ? readNumber(
          monthlyBudgetPlan?.remaining,
          monthlyBudgetPlan?.remaining_amount,
          derivedActiveBudget?.remaining,
          derivedActiveBudget?.remaining_amount,
          derivedActiveBudget?.amount_left,
          derivedActiveBudget ? getBudgetRemaining(derivedActiveBudget) : null
        )
      : null;

    const savingsSaved = safeSavingsGoals.length
      ? readNumber(totalSavingsSaved) ?? sumNumbers(safeSavingsGoals, getSavingsSaved)
      : null;
    const savingsTarget = safeSavingsGoals.length
      ? readNumber(totalSavingsTarget) ?? sumNumbers(safeSavingsGoals, getSavingsTarget)
      : null;

    const emergencyTarget = firstPositiveNumber(
      survivalExpense,
      profileData?.monthly_survival_expense,
      profileData?.survival_expense,
      profileData?.clara_survival_expense,
      profileData?.emergency_fund_target,
      profileData?.emergencyFundTarget
    );
    const emergencySaved = readNumber(
      profileData?.emergency_fund_saved,
      profileData?.emergencyFundSaved,
      profileData?.current_emergency_fund,
      profileData?.emergency_fund_amount,
      profileData?.emergency_saved
    );

    const categoryTotals = currentMonthExpenses.reduce((acc, expense) => {
      const category = getExpenseCategoryKey(expense);
      acc[category] = (acc[category] || 0) + (readNumber(expense?.amount) ?? 0);
      return acc;
    }, {});
    const topSpendingCategory =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const normalizedWallets = safeWallets.map((wallet) => ({
      ...(wallet || {}),
      id: wallet?.id || null,
      name: getWalletDisplayName(wallet),
      balance: readNumber(getWalletDisplayBalance(wallet)),
    }));

    const normalizedExpenses = safeExpenses.map((expense) => ({
      ...(expense || {}),
      id: expense?.id || null,
      amount: readNumber(expense?.amount),
      category: getExpenseCategoryKey(expense),
      date: expense?.date || expense?.expense_date || expense?.created_at || null,
      need_type:
        expense?.need_type ||
        expense?.needType ||
        expense?.spending_type ||
        null,
      planning_status:
        expense?.planning_status ||
        expense?.planningStatus ||
        expense?.status ||
        null,
      unplanned_reason: expense?.unplanned_reason || null,
      notes: normalizeString(expense?.notes || expense?.description || ""),
    }));

    const normalizedBudgets = safeBudgets.map((budget) => ({
      ...(budget || {}),
      id: budget?.id || null,
      name: getBudgetListTitle(budget),
      allocated: readNumber(getBudgetTotal(budget)),
      allocated_amount: readNumber(getBudgetTotal(budget)),
      spent: readNumber(getBudgetSpent(budget)),
      spent_amount: readNumber(getBudgetSpent(budget)),
      remaining: readNumber(getBudgetRemaining(budget)),
      remaining_amount: readNumber(getBudgetRemaining(budget)),
      need_type: getBudgetNeedType(budget),
    }));

    const normalizedSavingsGoals = safeSavingsGoals.map((goal) => ({
      ...(goal || {}),
      id: goal?.id || null,
      name: getSavingsGoalTitle(goal),
      title: getSavingsGoalTitle(goal),
      saved: readNumber(getSavingsSaved(goal)),
      saved_amount: readNumber(getSavingsSaved(goal)),
      target: readNumber(getSavingsTarget(goal)),
      target_amount: readNumber(getSavingsTarget(goal)),
    }));

    const normalizeExpenseList = (rows) =>
      rows.map((expense) => ({
        ...(expense || {}),
        id: expense?.id || null,
        amount: readNumber(expense?.amount),
        category: getExpenseCategoryKey(expense),
        date: expense?.date || expense?.expense_date || expense?.created_at || null,
        need_type:
          expense?.need_type ||
          expense?.needType ||
          expense?.spending_type ||
          null,
        planning_status:
          expense?.planning_status ||
          expense?.planningStatus ||
          expense?.status ||
          null,
        notes: normalizeString(expense?.notes || expense?.description || ""),
      }));

    return {
      userName:
        nickname ||
        profileData?.full_name ||
        profileData?.display_name ||
        profileData?.nickname ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")?.[0] ||
        "there",
      offlineReady,
      online: isClaraOnline(),
      pendingExpenses: safePendingExpenses,
      localExpenses: normalizedExpenses.filter((expense) => expense?.local_only),
      pendingLocalExpenses: safePendingExpenses,

      wallets: normalizedWallets,
      expenses: normalizedExpenses,
      budgets: normalizedBudgets,
      savingsGoals: normalizedSavingsGoals,
      emergencyFund: {
        saved: emergencySaved,
        current: emergencySaved,
        current_amount: emergencySaved,
        target: emergencyTarget > 0 ? emergencyTarget : null,
        target_amount: emergencyTarget > 0 ? emergencyTarget : null,
        summary:
          emergencyTarget > 0
            ? `Your emergency baseline is ${fmt(emergencyTarget)}.`
            : "",
      },
      walletTransactions: safeWalletTransactions,
      transfers: [],

      totalWalletBalance: safeTotalWalletBalance,
      totalAvailableMoney: safeTotalMoneyLeft,
      availableMoney: safeTotalMoneyLeft,
      totalMoneyLeft: safeTotalMoneyLeft,
      moneyLeftThisMonth: readNumber(moneyLeftThisMonth),

      monthlySpent: safeMonthlySpent,
      totalExpensesThisMonth: safeMonthlySpent,
      thisMonthSpent: safeMonthlySpent,
      monthlyExpenses: safeMonthlySpent,
      currentMonthExpenses: normalizeExpenseList(currentMonthExpenses),

      monthlyIncome: monthlyIncomeValue,
      totalIncome: totalIncomeValue,
      addedFunds: totalIncomeValue,

      budgetAllocated,
      budgetSpent,
      budgetRemaining,
      budget: {
        ...(monthlyBudgetPlan || {}),
        allocated: budgetAllocated,
        allocated_amount: budgetAllocated,
        spent: budgetSpent,
        spent_amount: budgetSpent,
        remaining: budgetRemaining,
        remaining_amount: budgetRemaining,
        summary:
          budgetAllocated !== null
            ? `Your current budget shows ${fmt(budgetSpent || 0)} spent out of ${fmt(
                budgetAllocated
              )} allocated.`
            : "",
        categories: Array.isArray(budgetSummaries) ? budgetSummaries : [],
      },

      totalSavingsSaved: savingsSaved,
      totalSavingsTarget: savingsTarget,
      savings: {
        saved: savingsSaved,
        saved_amount: savingsSaved,
        target: savingsTarget,
        target_amount: savingsTarget,
        summary:
          savingsTarget !== null
            ? `Your savings progress is ${fmt(savingsSaved || 0)} out of ${fmt(
                savingsTarget
              )}.`
            : safeSavingsGoals.length
              ? `You have ${safeSavingsGoals.length} savings goal${
                  safeSavingsGoals.length === 1 ? "" : "s"
                } tracked.`
              : "",
      },

      emergencyFundSaved: emergencySaved,
      emergencyFundTarget: emergencyTarget > 0 ? emergencyTarget : null,

      needsSpending: needsExpenseRows.length
        ? sumNumbers(needsExpenseRows, (expense) => expense?.amount)
        : null,
      wantsSpending: wantsExpenseRows.length
        ? sumNumbers(wantsExpenseRows, (expense) => expense?.amount)
        : null,
      plannedExpenses: normalizeExpenseList(plannedExpenseRows),
      unplannedExpenses: normalizeExpenseList(unplannedExpenseRows),
      undocumentedExpenses: normalizeExpenseList(undocumentedExpenseRows),

      plannedSpent: plannedExpenseRows.length
        ? sumNumbers(plannedExpenseRows, (expense) => expense?.amount)
        : null,
      unplannedSpent:
        readNumber(monthlyBudgetPlan?.unplanned_spent) ??
        (unplannedExpenseRows.length
          ? sumNumbers(unplannedExpenseRows, (expense) => expense?.amount)
          : null),
      undocumentedSpent:
        readNumber(monthlyBudgetPlan?.undocumented_spent) ??
        (undocumentedExpenseRows.length
          ? sumNumbers(undocumentedExpenseRows, (expense) => expense?.amount)
          : null),

      topSpendingCategory,
      recentExpenses: normalizeExpenseList(recentExpenseRows),
      budgetCategories: Array.isArray(budgetSummaries) ? budgetSummaries : [],
      manualExpenseBudgetOptions: Array.isArray(manualExpenseBudgetOptions)
        ? manualExpenseBudgetOptions
        : [],
    };
  }, [
    budgetSummaries,
    budgets,
    derivedActiveBudget,
    expenses,
    manualExpenseBudgetOptions,
    moneyLeftThisMonth,
    monthlyBudgetPlan,
    nickname,
    offlineReady,
    pendingExpenses,
    profileData,
    savingsGoals,
    survivalExpense,
    thisMonthIncome,
    thisMonthSpent,
    totalSavingsSaved,
    totalSavingsTarget,
    user,
    walletMoney,
    walletTransactions,
    wallets,
  ]);
}
