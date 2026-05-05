import { useCallback, useMemo, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const normalizeString = (value) => String(value ?? "").trim();

const getSavingsSaved = (goal) =>
  toNumber(
    goal?.saved_amount ??
      goal?.current_amount ??
      goal?.saved ??
      goal?.progress_amount ??
      goal?.amount_saved ??
      0
  );

const getSavingsTarget = (goal) =>
  toNumber(
    goal?.target_amount ??
      goal?.goal_amount ??
      goal?.target ??
      goal?.amount ??
      goal?.desired_amount ??
      0
  );

const getSavingsGoalTitle = (goal) =>
  normalizeString(goal?.title || goal?.name || goal?.goal_name || "Savings Goal");

const getBudgetAmount = (budget) =>
  toNumber(
    budget?.declared_budget ??
      budget?.declared_amount ??
      budget?.monthly_budget_amount ??
      budget?.total_budget ??
      budget?.allocated_amount ??
      budget?.budget_amount ??
      budget?.budget ??
      budget?.amount ??
      budget?.target_amount ??
      0
  );

const getBudgetSpent = (budget) =>
  toNumber(
    budget?.spent_amount ??
      budget?.spent ??
      budget?.total_spent ??
      budget?.used_amount ??
      0
  );

const getBudgetCategoryName = (budget) =>
  normalizeString(
    budget?.category ||
      budget?.budget_category ||
      budget?.expense_category ||
      budget?.classification ||
      budget?.type ||
      budget?.name ||
      budget?.title ||
      "Budget"
  );

const buildMonthlyBudgetPlan = (budgets = [], totalExpenses = 0) => {
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const categories = safeBudgets.map((budget) => {
    const allocatedAmount = getBudgetAmount(budget);
    const spentAmount = getBudgetSpent(budget);

    return {
      ...budget,
      category: getBudgetCategoryName(budget),
      allocated_amount: allocatedAmount,
      budget_amount: allocatedAmount,
      spent: spentAmount,
      spent_amount: spentAmount,
      remaining_amount: Math.max(allocatedAmount - spentAmount, 0),
    };
  });

  const declaredBudget = categories.reduce(
    (sum, budget) => sum + toNumber(budget.allocated_amount),
    0
  );
  const categorySpent = categories.reduce(
    (sum, budget) => sum + toNumber(budget.spent_amount),
    0
  );
  const spentAmount = categorySpent > 0 ? categorySpent : toNumber(totalExpenses);
  const remainingAmount = Math.max(declaredBudget - spentAmount, 0);

  return {
    declared_budget: declaredBudget,
    declared_amount: declaredBudget,
    monthly_budget_amount: declaredBudget,
    total_budget: declaredBudget,
    allocated_amount: declaredBudget,
    spent: spentAmount,
    spent_amount: spentAmount,
    total_spent: spentAmount,
    remaining: remainingAmount,
    remaining_amount: remainingAmount,
    amount_left: remainingAmount,
    categories,
    is_complete: categories.length > 0,
    status: categories.length > 0 ? "active" : "empty",
  };
};

export default function useDashboardFinancials() {
  const { user, profileData } = useUserRole() || {};
  const financialData = useFinancialData(user);
  const [expandedFinanceCard, setExpandedFinanceCard] = useState(null);
  const [financeActionLoading, setFinanceActionLoading] = useState(false);

  const walletMoney = toNumber(financialData.totalWalletBalance);
  const totalExpenses = toNumber(financialData.totalExpenses);

  const monthlyBudgetPlan = useMemo(
    () => buildMonthlyBudgetPlan(financialData.budgets, totalExpenses),
    [financialData.budgets, totalExpenses]
  );

  const savingsGoals = useMemo(
    () => (Array.isArray(financialData.savingsGoals) ? financialData.savingsGoals : []),
    [financialData.savingsGoals]
  );

  const totalSavingsSaved = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0),
    [savingsGoals]
  );

  const totalSavingsTarget = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0),
    [savingsGoals]
  );

  const primarySavingsGoal = useMemo(() => {
    if (!savingsGoals.length) return null;

    return [...savingsGoals].sort((a, b) => {
      const aProgress = getSavingsTarget(a) > 0 ? getSavingsSaved(a) / getSavingsTarget(a) : 0;
      const bProgress = getSavingsTarget(b) > 0 ? getSavingsSaved(b) / getSavingsTarget(b) : 0;
      return bProgress - aProgress;
    })[0];
  }, [savingsGoals]);

  const survivalExpense = useMemo(
    () =>
      toNumber(
        financialData.emergencyFund?.survivalExpense ??
          financialData.emergencyFund?.survival_expense ??
          financialData.emergencyFund?.monthly_survival_expense ??
          profileData?.monthly_survival_expense ??
          profileData?.survival_expense ??
          profileData?.clara_survival_expense ??
          0
      ),
    [financialData.emergencyFund, profileData]
  );

  const toggleFinanceDetails = useCallback((key, options = {}) => {
    setExpandedFinanceCard((current) => {
      if (options?.forceOpen) return key;
      return current === key ? null : key;
    });
  }, []);

  const withFinanceLoading = useCallback(async (task) => {
    try {
      setFinanceActionLoading(true);
      return await task();
    } finally {
      setFinanceActionLoading(false);
    }
  }, []);

  const onSaveBudget = useCallback(
    async (payload) => withFinanceLoading(() => financialData.upsertBudget(payload)),
    [financialData, withFinanceLoading]
  );

  const onEditBudgetCategory = useCallback(
    async (id, updates) => withFinanceLoading(() => financialData.updateBudget(id, updates)),
    [financialData, withFinanceLoading]
  );

  const onDeleteBudgetCategory = useCallback(
    async (id) => withFinanceLoading(() => financialData.deleteBudget(id)),
    [financialData, withFinanceLoading]
  );

  const onResetBudget = useCallback(
    async () =>
      withFinanceLoading(async () => {
        const budgets = Array.isArray(financialData.budgets) ? financialData.budgets : [];
        await Promise.all(
          budgets.map((budget) =>
            budget?.id ? financialData.deleteBudget(budget.id) : Promise.resolve()
          )
        );
        await financialData.refreshData?.();
      }),
    [financialData, withFinanceLoading]
  );

  const onSaveSavingsGoal = useCallback(
    async (goal) => withFinanceLoading(() => financialData.addSavingsGoal(goal)),
    [financialData, withFinanceLoading]
  );

  const onDeleteSavingsGoal = useCallback(
    async (id) => withFinanceLoading(() => financialData.deleteSavingsGoal(id)),
    [financialData, withFinanceLoading]
  );

  const onAddSavings = useCallback(
    async (goal, amount) =>
      withFinanceLoading(() => {
        const goalId = typeof goal === "object" ? goal?.id : goal;
        const currentGoal =
          typeof goal === "object"
            ? goal
            : savingsGoals.find((item) => item?.id === goalId);
        const nextSaved = getSavingsSaved(currentGoal) + toNumber(amount);
        return financialData.updateSavingsGoal(goalId, {
          ...currentGoal,
          saved_amount: nextSaved,
          current_amount: nextSaved,
        });
      }),
    [financialData, savingsGoals, withFinanceLoading]
  );

  const onSurvivalSaved = useCallback(
    async (payload) =>
      withFinanceLoading(() =>
        financialData.updateEmergencyFund({
          ...(typeof payload === "object" ? payload : { survivalExpense: payload }),
        })
      ),
    [financialData, withFinanceLoading]
  );

  const firstPositiveNumber = useCallback((...values) => {
    for (const value of values) {
      const number = toNumber(value);
      if (number > 0) return number;
    }
    return 0;
  }, []);

  const readStoredSurvivalExpense = useCallback(() => survivalExpense, [survivalExpense]);

  return {
    ...financialData,
    expandedFinanceCard,
    financeActionLoading,
    firstPositiveNumber,
    guardChecked: true,
    loading: financialData.loading,
    monthlyBudgetPlan,
    onAddSavings,
    onDeleteBudgetCategory,
    onDeleteSavingsGoal,
    onEditBudgetCategory,
    onResetBudget,
    onSaveBudget,
    onSaveSavingsGoal,
    onSurvivalSaved,
    primarySavingsGoal,
    profileData,
    readStoredSurvivalExpense,
    savingsGoals,
    survivalExpense,
    toggleFinanceDetails,
    totalSavingsSaved,
    totalSavingsTarget,
    totalExpenses,
    user,
    walletMoney,
    getSavingsGoalTitle,
  };
}
