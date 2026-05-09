import { useMemo } from "react";
import {
  firstValidNumber,
  getBudgetSpent,
  getBudgetTotal,
  isExpenseInsideBudgetWindow,
  isTruthyActive,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardBudgetPreviewState({
  budgets = [],
  expenses = [],
} = {}) {
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const activeBudget = useMemo(() => {
    if (!safeBudgets.length) return null;

    return (
      safeBudgets.find(
        (budget) =>
          isTruthyActive(budget?.is_active) ||
          normalizeLower(budget?.status) === "active"
      ) ||
      safeBudgets[0] ||
      null
    );
  }, [safeBudgets]);

  const derivedActiveBudget = useMemo(() => {
    if (!activeBudget) return null;

    const spentFromExpenses = safeExpenses.reduce((sum, expense) => {
      if (!isExpenseInsideBudgetWindow(expense, activeBudget)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const explicitSpent = getBudgetSpent(activeBudget);
    const spent = spentFromExpenses > 0 ? spentFromExpenses : explicitSpent;
    const total = getBudgetTotal(activeBudget);
    const remaining = Math.max(total - spent, 0);

    return {
      ...activeBudget,
      spent,
      spent_amount: spent,
      total_spent: spent,
      remaining,
      remaining_amount: remaining,
      amount_left: remaining,
    };
  }, [activeBudget, safeExpenses]);

  return {
    activeBudget,
    derivedActiveBudget,
  };
}
