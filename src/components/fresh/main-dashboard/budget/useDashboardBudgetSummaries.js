import { useMemo } from "react";
import {
  FINANCE_CATEGORIES,
  firstValidNumber,
  getBudgetCategoryKey,
  getBudgetTotal,
  getExpenseCategoryKey,
  getPHMonthKey,
} from "@/utils/dashboard/dashboardHelpers";
import {
  doesBudgetRowBelongToCycle,
  getBudgetCycleRange,
  isBudgetHeader,
  isBudgetRowInactive,
  isExpenseInBudgetCycle,
  selectDashboardBudgetHeaders,
} from "@/lib/clara-budget-cycle-authority";

export default function useDashboardBudgetSummaries({
  budgets = [],
  expenses = [],
  budgetCycleHeader = null,
} = {}) {
  return useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const resolvedCycleHeader =
      budgetCycleHeader ||
      selectDashboardBudgetHeaders({ budgets, currentMonthKey }).budgetCycleHeader;
    const cycleRange = getBudgetCycleRange(resolvedCycleHeader || {}, currentMonthKey);
    const activeBudgets = (Array.isArray(budgets) ? budgets : []).filter(
      (budget) =>
        !isBudgetHeader(budget) &&
        !isBudgetRowInactive(budget) &&
        doesBudgetRowBelongToCycle(budget, resolvedCycleHeader)
    );
    const activeCycleExpenses = (Array.isArray(expenses) ? expenses : []).filter(
      (expense) => isExpenseInBudgetCycle(expense, cycleRange)
    );

    return FINANCE_CATEGORIES.map((category) => {
      const allocated = activeBudgets.reduce((sum, budget) => {
        if (getBudgetCategoryKey(budget) !== category) return sum;
        return sum + getBudgetTotal(budget);
      }, 0);

      const used = activeCycleExpenses.reduce((sum, expense) => {
        if (getExpenseCategoryKey(expense) !== category) return sum;
        return sum + firstValidNumber(expense?.amount);
      }, 0);

      return {
        category,
        allocated,
        used,
        remaining: Math.max(allocated - used, 0),
        pct: allocated > 0 ? Math.min((used / allocated) * 100, 999) : 0,
      };
    })
      .filter((item) => item.allocated > 0 || item.used > 0)
      .sort((left, right) => right.used - left.used || right.allocated - left.allocated)
      .slice(0, 4);
  }, [budgetCycleHeader, budgets, expenses]);
}
