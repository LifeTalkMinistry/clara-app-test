import { useMemo } from "react";
import {
  firstValidNumber,
  getPHMonthKey,
  getPHMonthRange,
  getTransactionDate,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

function hasTime(value) {
  return /T\d{2}:\d{2}/.test(String(value || ""));
}

function toDateOnly(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly && !hasTime(raw)) return dateOnly[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return normalizeString(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function toTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

function getComparableExpenseDate(expense = {}, startValue = "") {
  if (hasTime(startValue)) {
    return (
      expense?.created_at ||
      expense?.createdAt ||
      expense?.logged_at ||
      expense?.spent_at ||
      expense?.transaction_date ||
      expense?.transactionDate ||
      expense?.date ||
      getTransactionDate(expense)
    );
  }

  return getTransactionDate(expense);
}

function getBudgetCycleSource(monthlyBudgetHeader = null, safeBudgetOptions = []) {
  if (monthlyBudgetHeader) return monthlyBudgetHeader;

  const option = safeBudgetOptions.find((item) => {
    const budget = item?.budget || item;
    return Boolean(
      budget?.reset_start_at ||
        budget?.tracking_started_at ||
        budget?.tracking_start_date ||
        budget?.budget_cycle ||
        budget?.cycle_type ||
        budget?.budget_rhythm ||
        budget?.period_type ||
        budget?.cycle_start ||
        budget?.cycle_end ||
        budget?.period_start ||
        budget?.period_end
    );
  });

  return option?.budget || option || null;
}

function getBudgetCycleRange(budgetCycleSource = null) {
  const fallbackRange = getPHMonthRange();
  const rawStart =
    budgetCycleSource?.reset_start_at ||
    budgetCycleSource?.tracking_started_at ||
    budgetCycleSource?.tracking_start_date ||
    budgetCycleSource?.cycle_start ||
    budgetCycleSource?.budget_cycle_start ||
    budgetCycleSource?.period_start ||
    budgetCycleSource?.range_start;
  const rawEnd =
    budgetCycleSource?.cycle_end ||
    budgetCycleSource?.budget_cycle_end ||
    budgetCycleSource?.period_end ||
    budgetCycleSource?.range_end;

  return {
    start: rawStart || fallbackRange.start,
    end: rawEnd || fallbackRange.end,
    hasTimestampStart: hasTime(rawStart),
  };
}

function getBudgetCycleType(budgetCycleSource = null) {
  const raw = normalizeLower(
    budgetCycleSource?.budget_cycle ||
      budgetCycleSource?.cycle_type ||
      budgetCycleSource?.budget_rhythm ||
      budgetCycleSource?.period_type ||
      "monthly"
  );

  if (raw.includes("week") && !raw.includes("bi")) return "weekly";
  if (raw.includes("bi") || raw.includes("2")) return "biweekly";
  if (raw.includes("custom")) return "custom";
  return "monthly";
}

function getBudgetCycleLabel(type = "monthly") {
  if (type === "weekly") return "Weekly";
  if (type === "biweekly") return "Bi-weekly";
  if (type === "custom") return "Custom";
  return "Monthly";
}

function isInBudgetCycle(expense = {}, monthRange = {}) {
  if (monthRange.hasTimestampStart) {
    const startTime = toTime(monthRange.start);
    const endTime = toTime(monthRange.end);
    const expenseTime = toTime(getComparableExpenseDate(expense, monthRange.start));

    if (startTime !== null && (expenseTime === null || expenseTime < startTime)) return false;
    if (endTime !== null && expenseTime !== null && expenseTime > endTime) return false;
    return true;
  }

  const expenseKey = toDateOnly(getComparableExpenseDate(expense, monthRange.start));
  const startKey = toDateOnly(monthRange.start);
  const endKey = toDateOnly(monthRange.end);

  if (!expenseKey || !startKey || !endKey) return false;
  return expenseKey >= startKey && expenseKey <= endKey;
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

function findMatchingBudgetOptionForExpense(expense = {}, safeBudgetOptions = []) {
  const expenseCategory = normalizeLower(getExpenseBudgetCategory(expense));
  const expenseBudgetId = getExpenseBudgetId(expense);

  return safeBudgetOptions.find((item) => {
    const itemId = normalizeString(item?.id || item?.key || "");
    const itemTitle = normalizeLower(item?.title);
    return (
      (itemId && expenseBudgetId && itemId === expenseBudgetId) ||
      (itemTitle && expenseCategory && itemTitle === expenseCategory)
    );
  }) || null;
}

const PLANNED_STATUSES = new Set(["planned", "budget_risk", "over_budget"]);

export default function useDashboardMonthlyBudgetPlan({
  manualExpenseBudgetOptions = [],
  expenses = [],
  declaredMonthlyBudgetAmount = 0,
  monthlyBudgetHeader = null,
} = {}) {
  return useMemo(() => {
    const safeBudgetOptions = Array.isArray(manualExpenseBudgetOptions)
      ? manualExpenseBudgetOptions
      : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const budgetCycleSource = getBudgetCycleSource(monthlyBudgetHeader, safeBudgetOptions);
    const monthKey = normalizeString(
      budgetCycleSource?.month ||
        budgetCycleSource?.budget_month ||
        budgetCycleSource?.month_key ||
        getPHMonthKey()
    );
    const monthRange = getBudgetCycleRange(budgetCycleSource);
    const cycleType = getBudgetCycleType(budgetCycleSource);
    const cycleLabel = getBudgetCycleLabel(cycleType);
    const inActiveRange = (expense) => isInBudgetCycle(expense, monthRange);
    const activeCycleExpenses = safeExpenses.filter(inActiveRange);

    const categories = safeBudgetOptions.map((item) => {
      const itemId = normalizeString(item?.id || item?.key || "");
      const itemTitle = normalizeString(item?.title || "");

      const spent = activeCycleExpenses.reduce((sum, expense) => {
        const status = getExpensePlanningStatus(expense);
        const expenseCategory = getExpenseBudgetCategory(expense);
        const expenseBudgetId = getExpenseBudgetId(expense);

        const matchesId = itemId && expenseBudgetId && expenseBudgetId === itemId;
        const matchesCategory =
          normalizeLower(expenseCategory) === normalizeLower(itemTitle);

        if (!matchesId && !matchesCategory) return sum;

        if (![...PLANNED_STATUSES, "unplanned"].includes(status)) {
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

    const matchedPlannedSpent = categories.reduce(
      (sum, item) => sum + firstValidNumber(item?.spent, item?.used),
      0
    );

    const unmatchedPlannedSpent = activeCycleExpenses.reduce((sum, expense) => {
      const status = getExpensePlanningStatus(expense);
      if (!PLANNED_STATUSES.has(status)) return sum;
      if (findMatchingBudgetOptionForExpense(expense, safeBudgetOptions)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const unplannedSpent = activeCycleExpenses.reduce((sum, expense) => {
      const status = getExpensePlanningStatus(expense);
      if (status !== "unplanned") return sum;
      if (findMatchingBudgetOptionForExpense(expense, safeBudgetOptions)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const undocumentedSpent = activeCycleExpenses.reduce((sum, expense) => {
      const status = getExpensePlanningStatus(expense);
      if (status !== "undocumented") return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);

    const allocatedTotal = categories.reduce(
      (sum, item) => sum + firstValidNumber(item?.allocated),
      0
    );
    const plannedSpentTotal = matchedPlannedSpent + unmatchedPlannedSpent;
    const spentTotal = plannedSpentTotal + unplannedSpent + undocumentedSpent;

    const declaredBudget = firstValidNumber(declaredMonthlyBudgetAmount);
    const unallocated = Math.max(declaredBudget - allocatedTotal, 0);
    const remaining = Math.max(declaredBudget - spentTotal, 0);
    const isComplete =
      declaredBudget > 0 &&
      categories.length > 0 &&
      allocatedTotal >= declaredBudget &&
      unallocated <= 0;

    return {
      monthKey,
      month_key: monthKey,
      month: monthKey,
      monthRange,
      budget_cycle: cycleType,
      cycle_type: cycleType,
      budget_rhythm: cycleType,
      period_type: cycleType,
      cycle_label: cycleLabel,
      cycle_start: monthRange.start,
      cycle_end: monthRange.end,
      period_start: monthRange.start,
      period_end: monthRange.end,
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
      spent_amount: spentTotal,
      spent_total: spentTotal,
      total_spent: spentTotal,
      totalSpent: spentTotal,
      remaining,
      remaining_amount: remaining,
      amount_left: remaining,
      totalRemaining: remaining,
      unallocated,
      unallocated_balance: unallocated,
      unallocatedBalance: unallocated,
      categories,
      categoryRows: categories,
      active_cycle_expense_count: activeCycleExpenses.length,
      is_complete: isComplete,
      isComplete,
      hasDeclaredBudget: declaredBudget > 0,
      hasCategories: categories.length > 0,
    };
  }, [declaredMonthlyBudgetAmount, expenses, manualExpenseBudgetOptions, monthlyBudgetHeader]);
}
