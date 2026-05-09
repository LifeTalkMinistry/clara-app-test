import { useMemo } from "react";
import {
  firstValidNumber,
  getPHMonthKey,
  getPHMonthRange,
  getTransactionDate,
  isInPHRange,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardMonthlyBudgetPlan({
  manualExpenseBudgetOptions = [],
  expenses = [],
  declaredMonthlyBudgetAmount = 0,
} = {}) {
  return useMemo(() => {
    const monthKey = getPHMonthKey();
    const monthRange = getPHMonthRange();
    const safeBudgetOptions = Array.isArray(manualExpenseBudgetOptions)
      ? manualExpenseBudgetOptions
      : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];

    const categories = safeBudgetOptions.map((item) => {
      const itemId = normalizeString(item?.id || item?.key || "");
      const itemTitle = normalizeString(item?.title || "");

      const spent = safeExpenses.reduce((sum, expense) => {
        const status = normalizeLower(expense?.planning_status);
        if (status && status !== "planned") return sum;

        const expenseCategory = normalizeString(
          expense?.budget_category ||
            expense?.expense_category ||
            expense?.category ||
            ""
        );
        const expenseBudgetId = normalizeString(
          expense?.budget_category_id || expense?.budget_item_id || ""
        );

        const matchesId = itemId && expenseBudgetId && expenseBudgetId === itemId;
        const matchesCategory =
          normalizeLower(expenseCategory) === normalizeLower(itemTitle);

        if (!matchesId && !matchesCategory) return sum;
        if (!isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end)) {
          return sum;
        }

        return sum + firstValidNumber(expense?.amount);
      }, 0);

      const allocated = firstValidNumber(item?.allocated);
      const remaining = Math.max(allocated - spent, 0);
      const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 999) : 0;

      return {
        ...item,
        allocated,
        spent,
        used: spent,
        remaining,
        pct,
      };
    });

    const allocatedTotal = categories.reduce(
      (sum, item) => sum + firstValidNumber(item?.allocated),
      0
    );
    const spentTotal = categories.reduce(
      (sum, item) => sum + firstValidNumber(item?.spent, item?.used),
      0
    );
    const declaredBudget = firstValidNumber(declaredMonthlyBudgetAmount, allocatedTotal);
    const unallocated = Math.max(declaredBudget - allocatedTotal, 0);
    const remaining = Math.max(declaredBudget - spentTotal, 0);
    const isComplete = declaredBudget > 0 && allocatedTotal >= declaredBudget && unallocated <= 0;

    return {
      monthKey,
      month_key: monthKey,
      monthRange,
      declared_budget: declaredBudget,
      declaredBudget,
      declaredAmount: declaredBudget,
      allocated: allocatedTotal,
      allocated_total: allocatedTotal,
      totalAllocated: allocatedTotal,
      spent: spentTotal,
      spent_total: spentTotal,
      totalSpent: spentTotal,
      remaining,
      totalRemaining: remaining,
      unallocated,
      unallocated_balance: unallocated,
      unallocatedBalance: unallocated,
      categories,
      categoryRows: categories,
      is_complete: isComplete,
      isComplete,
      hasDeclaredBudget: declaredBudget > 0,
      hasCategories: categories.length > 0,
    };
  }, [declaredMonthlyBudgetAmount, expenses, manualExpenseBudgetOptions]);
}
