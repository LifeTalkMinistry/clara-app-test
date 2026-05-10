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

function toDateOnly(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return normalizeString(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function getBudgetCycleRange(monthlyBudgetHeader = null) {
  const fallbackRange = getPHMonthRange();
  const start = toDateOnly(
    monthlyBudgetHeader?.cycle_start ||
      monthlyBudgetHeader?.budget_cycle_start ||
      monthlyBudgetHeader?.period_start ||
      monthlyBudgetHeader?.range_start ||
      monthlyBudgetHeader?.tracking_start_date
  );
  const end = toDateOnly(
    monthlyBudgetHeader?.cycle_end ||
      monthlyBudgetHeader?.budget_cycle_end ||
      monthlyBudgetHeader?.period_end ||
      monthlyBudgetHeader?.range_end
  );

  return {
    start: start || fallbackRange.start,
    end: end || fallbackRange.end,
  };
}

function getExpenseBudgetCategory(expense = {}) {
  return normalizeString(
    expense?.budget_category ||
      expense?.expense_category ||
      expense?.category ||
      expense?.budgetCategory ||
      ""
  );
}

function getExpenseBudgetId(expense = {}) {
  return normalizeString(
    expense?.budget_category_id ||
      expense?.budget_item_id ||
      expense?.budget_id ||
      expense?.budgetCategoryId ||
      ""
  );
}

function getExpensePlanningStatus(expense = {}) {
  const status = normalizeLower(
    expense?.planning_status ||
      expense?.budget_status ||
      expense?.plan_status ||
      expense?.budgetStatus ||
      ""
  );

  if (status) return status;

  const category = normalizeLower(getExpenseBudgetCategory(expense));
  if (category.includes("unplanned")) return "unplanned";
  if (category.includes("undocumented")) return "undocumented";
  return "planned";
}

export default function useDashboardMonthlyBudgetPlan({
  manualExpenseBudgetOptions = [],
  expenses = [],
  declaredMonthlyBudgetAmount = 0,
  monthlyBudgetHeader = null,
} = {}) {
  return useMemo(() => {
    const monthKey = getPHMonthKey();
    const monthRange = getBudgetCycleRange(monthlyBudgetHeader);
    const safeBudgetOptions = Array.isArray(manualExpenseBudgetOptions)
      ? manualExpenseBudgetOptions
      : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const inActiveRange = (expense) =>
      isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end);

    const categories = safeBudgetOptions.map((item) => {
      const itemId = normalizeString(item?.id || item?.key || "");
      const itemTitle = normalizeString(item?.title || "");

      const spent = safeExpenses.reduce((sum, expense) => {
        const status = getExpensePlanningStatus(expense);
        if (!["planned", "budget_risk", "over_budget"].includes(status)) return sum;

        const expenseCategory = getExpenseBudgetCategory(expense);
        const expenseBudgetId = getExpenseBudgetId(expense);

        const matchesId = itemId && expenseBudgetId && expenseBudgetId === itemId;
        const matchesCategory =
          normalizeLower(expenseCategory) === normalizeLower(itemTitle);

        if (!matchesId && !matchesCategory) return sum;
        if (!inActiveRange(expense)) return sum;

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

    const unplannedSpent = safeExpenses.reduce((sum, expense) => {
      const status = getExpensePlanningStatus(expense);
      if (status !== "unplanned") return sum;
      if (!inActiveRange(expense)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const undocumentedSpent = safeExpenses.reduce((sum, expense) => {
      const status = getExpensePlanningStatus(expense);
      if (status !== "undocumented") return sum;
      if (!inActiveRange(expense)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const allocatedTotal = categories.reduce(
      (sum, item) => sum + firstValidNumber(item?.allocated),
      0
    );
    const plannedSpentTotal = categories.reduce(
      (sum, item) => sum + firstValidNumber(item?.spent, item?.used),
      0
    );
    const spentTotal = plannedSpentTotal + unplannedSpent + undocumentedSpent;
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
      planned_spent: plannedSpentTotal,
      plannedSpent: plannedSpentTotal,
      unplanned_spent: unplannedSpent,
      unplannedSpent,
      undocumented_spent: undocumentedSpent,
      undocumentedSpent,
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
  }, [declaredMonthlyBudgetAmount, expenses, manualExpenseBudgetOptions, monthlyBudgetHeader]);
}
