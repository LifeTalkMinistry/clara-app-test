import { useMemo } from "react";
import {
  FINANCE_CATEGORIES,
  firstValidNumber,
  getBudgetCategoryKey,
  getBudgetTotal,
  getExpenseCategoryKey,
  getPHMonthKey,
  getPHMonthRange,
  getTransactionDate,
  isInPHRange,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardBudgetSummaries({
  budgets = [],
  expenses = [],
} = {}) {
  return useMemo(() => {
    const monthRange = getPHMonthRange();
    const activeBudgets = (Array.isArray(budgets) ? budgets : []).filter((budget) => {
      const month = normalizeString(budget?.month || budget?.budget_month);
      return !month || month === getPHMonthKey();
    });

    return FINANCE_CATEGORIES.map((category) => {
      const allocated = activeBudgets.reduce((sum, budget) => {
        const budgetCategory = getBudgetCategoryKey(budget);
        if (budgetCategory !== category) return sum;
        return sum + getBudgetTotal(budget);
      }, 0);

      const used = (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
        if (getExpenseCategoryKey(expense) !== category) return sum;
        if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) {
          return sum;
        }
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
      .sort((a, b) => b.used - a.used || b.allocated - a.allocated)
      .slice(0, 4);
  }, [budgets, expenses]);
}
