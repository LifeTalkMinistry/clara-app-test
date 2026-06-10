import { useMemo } from "react";
import { hasActiveBudgetPlan as resolveActivePlan } from "@/lib/clara-budget-plan-truth";
import {
  firstValidNumber,
  getPHMonthKey,
  getPHMonthRange,
  getTransactionDate,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

const PLANNED_STATUSES = new Set(["planned", "budget_risk", "over_budget"]);
const hasTime = (value) => /T\d{2}:\d{2}/.test(String(value || ""));
const toTime = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
};
const toEndTime = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    const time = new Date(`${dateOnly[1]}T23:59:59.999`).getTime();
    return Number.isNaN(time) ? null : time;
  }
  return toTime(value);
};
const toDateOnly = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match && !hasTime(raw)) return match[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? normalizeString(value).slice(0, 10) : date.toISOString().slice(0, 10);
};

function expenseDate(expense = {}, start = "") {
  if (!hasTime(start)) return getTransactionDate(expense);
  return expense.created_at || expense.createdAt || expense.logged_at || expense.spent_at ||
    expense.transaction_date || expense.transactionDate || expense.date || getTransactionDate(expense);
}

function cycleSource(header, options) {
  if (header) return header;
  const option = options.find((item) => {
    const budget = item?.budget || item;
    return Boolean(budget?.reset_start_at || budget?.tracking_started_at ||
      budget?.tracking_start_date || budget?.budget_cycle || budget?.cycle_type ||
      budget?.budget_rhythm || budget?.period_type || budget?.cycle_start ||
      budget?.cycle_end || budget?.period_start || budget?.period_end);
  });
  return option?.budget || option || null;
}

function cycleRange(source) {
  const fallback = getPHMonthRange();
  const start = source?.reset_start_at || source?.tracking_started_at ||
    source?.tracking_start_date || source?.cycle_start || source?.budget_cycle_start ||
    source?.period_start || source?.range_start;
  const end = source?.cycle_end || source?.budget_cycle_end || source?.period_end || source?.range_end;
  return { start: start || fallback.start, end: end || fallback.end, hasTimestampStart: hasTime(start) };
}

function inCycle(expense, range) {
  if (range.hasTimestampStart) {
    const start = toTime(range.start);
    const end = toEndTime(range.end);
    const time = toTime(expenseDate(expense, range.start));
    return !(start !== null && (time === null || time < start)) &&
      !(end !== null && time !== null && time > end);
  }
  const date = toDateOnly(expenseDate(expense, range.start));
  const start = toDateOnly(range.start);
  const end = toDateOnly(range.end);
  return Boolean(date && start && end && date >= start && date <= end);
}

function cycleType(source) {
  const raw = normalizeLower(source?.budget_cycle || source?.cycle_type ||
    source?.budget_rhythm || source?.period_type || "monthly");
  if (raw.includes("week") && !raw.includes("bi")) return "weekly";
  if (raw.includes("bi") || raw.includes("2")) return "biweekly";
  return raw.includes("custom") ? "custom" : "monthly";
}

const cycleLabel = (type) =>
  type === "weekly" ? "Weekly" : type === "biweekly" ? "Bi-weekly" :
    type === "custom" ? "Custom" : "Monthly";

const expenseCategory = (expense = {}) => normalizeString(
  expense.budget_category || expense.expense_category || expense.category || expense.budgetCategory || ""
);
const expenseBudgetId = (expense = {}) => normalizeString(
  expense.budget_category_id || expense.budget_item_id || expense.budget_id || expense.budgetCategoryId || ""
);
function expenseStatus(expense = {}) {
  const status = normalizeLower(expense.planning_status || expense.budget_status ||
    expense.plan_status || expense.budgetStatus || "");
  if (status) return status;
  const category = normalizeLower(expenseCategory(expense));
  if (category.includes("unplanned")) return "unplanned";
  if (category.includes("undocumented")) return "undocumented";
  return "planned";
}

function matchingOption(expense, options) {
  const category = normalizeLower(expenseCategory(expense));
  const budgetId = expenseBudgetId(expense);
  return options.find((item) => {
    const id = normalizeString(item?.id || item?.key || "");
    const title = normalizeLower(item?.title);
    return (id && budgetId && id === budgetId) || (title && category && title === category);
  }) || null;
}

function outsideItem(expense, type, index) {
  const amount = firstValidNumber(expense?.amount, expense?.spent, expense?.value, expense?.total);
  const date = expense?.created_at || expense?.createdAt || expense?.logged_at ||
    expense?.spent_at || expense?.transaction_date || expense?.transactionDate ||
    expense?.date || getTransactionDate(expense);
  return {
    ...expense,
    id: expense?.id || expense?.key || `${type}-${index}-${date || amount}`,
    type,
    status: type,
    planning_status: type,
    title: expense?.title || expense?.name || expense?.merchant || expense?.description ||
      expenseCategory(expense) || (type === "undocumented" ? "Undocumented expense" : "Unplanned expense"),
    category: expenseCategory(expense) || "No category",
    amount,
    date,
    sortTime: toTime(date) || 0,
  };
}

export default function useDashboardMonthlyBudgetPlan({
  manualExpenseBudgetOptions = [],
  expenses = [],
  declaredMonthlyBudgetAmount = 0,
  monthlyBudgetHeader = null,
} = {}) {
  return useMemo(() => {
    const options = Array.isArray(manualExpenseBudgetOptions) ? manualExpenseBudgetOptions : [];
    const allExpenses = Array.isArray(expenses) ? expenses : [];
    const source = cycleSource(monthlyBudgetHeader, options);
    const monthKey = normalizeString(source?.month || source?.budget_month || source?.month_key || getPHMonthKey());
    const monthRange = cycleRange(source);
    const type = cycleType(source);
    const resetStartAt = source?.reset_start_at || source?.tracking_started_at || source?.tracking_start_date || "";
    const activeExpenses = allExpenses.filter((expense) => inCycle(expense, monthRange));

    const rawCategories = options.map((item) => {
      const id = normalizeString(item?.id || item?.key || "");
      const title = normalizeString(item?.title || "");
      const spent = activeExpenses.reduce((sum, expense) => {
        const matches = (id && expenseBudgetId(expense) === id) ||
          normalizeLower(expenseCategory(expense)) === normalizeLower(title);
        return matches && [...PLANNED_STATUSES, "unplanned"].includes(expenseStatus(expense))
          ? sum + firstValidNumber(expense?.amount) : sum;
      }, 0);
      const allocated = firstValidNumber(item?.allocated);
      return {
        ...item,
        allocated,
        spent,
        used: spent,
        remaining: Math.max(allocated - spent, 0),
        pct: allocated > 0 ? Math.min((spent / allocated) * 100, 999) : 0,
      };
    });

    const matchedPlanned = rawCategories.reduce(
      (sum, item) => sum + firstValidNumber(item?.spent, item?.used), 0
    );
    const unmatchedPlanned = activeExpenses.reduce((sum, expense) => {
      if (!PLANNED_STATUSES.has(expenseStatus(expense)) || matchingOption(expense, options)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);
    const rawUnplannedItems = activeExpenses
      .filter((expense) => expenseStatus(expense) === "unplanned" && !matchingOption(expense, options))
      .map((expense, index) => outsideItem(expense, "unplanned", index));
    const rawUndocumentedItems = activeExpenses
      .filter((expense) => expenseStatus(expense) === "undocumented")
      .map((expense, index) => outsideItem(expense, "undocumented", index));
    const sumAmounts = (items) => items.reduce(
      (sum, expense) => sum + firstValidNumber(expense?.amount), 0
    );
    const rawPlannedSpent = matchedPlanned + unmatchedPlanned;
    const rawUnplannedSpent = sumAmounts(rawUnplannedItems);
    const rawUndocumentedSpent = sumAmounts(rawUndocumentedItems);
    const rawSpent = rawPlannedSpent + rawUnplannedSpent + rawUndocumentedSpent;
    const rawAllocated = rawCategories.reduce(
      (sum, item) => sum + firstValidNumber(item?.allocated), 0
    );
    const rawDeclared = firstValidNumber(declaredMonthlyBudgetAmount);
    const hasActiveBudgetPlan = resolveActivePlan({
      header: monthlyBudgetHeader,
      declaredBudget: rawDeclared,
      fallbackActive: rawDeclared > 0,
    });

    const declared = hasActiveBudgetPlan ? rawDeclared : 0;
    const allocated = rawAllocated;
    const plannedSpent = hasActiveBudgetPlan ? rawPlannedSpent : 0;
    const unplannedSpent = hasActiveBudgetPlan ? rawUnplannedSpent : 0;
    const undocumentedSpent = hasActiveBudgetPlan ? rawUndocumentedSpent : 0;
    const spent = hasActiveBudgetPlan ? rawSpent : 0;
    const categories = rawCategories;
    const unplannedItems = hasActiveBudgetPlan ? rawUnplannedItems : [];
    const undocumentedItems = hasActiveBudgetPlan ? rawUndocumentedItems : [];
    const outsidePlanItems = hasActiveBudgetPlan
      ? [...rawUnplannedItems, rawUndocumentedItems].flat().sort(
          (a, b) => firstValidNumber(b?.sortTime) - firstValidNumber(a?.sortTime)
        )
      : [];
    const unallocated = rawDeclared > 0 ? Math.max(rawDeclared - rawAllocated, 0) : 0;
    const remaining = hasActiveBudgetPlan ? Math.max(declared - spent, 0) : 0;
    const complete = hasActiveBudgetPlan && categories.length > 0 &&
      allocated >= declared && unallocated <= 0;

    return {
      monthKey, month_key: monthKey, month: monthKey, monthRange,
      budget_cycle: type, cycle_type: type, budget_rhythm: type, period_type: type,
      cycle_label: cycleLabel(type), cycle_start: monthRange.start, cycle_end: monthRange.end,
      period_start: monthRange.start, period_end: monthRange.end,
      reset_start_at: resetStartAt || null,
      tracking_started_at: resetStartAt || null,
      tracking_start_date: resetStartAt || null,
      declared_budget: declared, declaredBudget: declared, declaredAmount: declared,
      allocated, allocated_total: allocated, totalAllocated: allocated,
      planned_spent: plannedSpent, plannedSpent,
      unplanned_spent: unplannedSpent, unplannedSpent,
      undocumented_spent: undocumentedSpent, undocumentedSpent,
      unplanned_items: unplannedItems, unplannedItems,
      undocumented_items: undocumentedItems, undocumentedItems,
      outside_plan_items: outsidePlanItems, outsidePlanItems,
      spent, spent_amount: spent, spent_total: spent, total_spent: spent, totalSpent: spent,
      remaining, remaining_amount: remaining, amount_left: remaining, totalRemaining: remaining,
      unallocated, unallocated_balance: unallocated, unallocatedBalance: unallocated,
      categories, categoryRows: categories,
      active_cycle_expense_count: hasActiveBudgetPlan ? activeExpenses.length : 0,
      is_complete: complete, isComplete: complete,
      hasActiveBudgetPlan, has_active_budget_plan: hasActiveBudgetPlan,
      hasDeclaredBudget: hasActiveBudgetPlan,
      hasCategories: hasActiveBudgetPlan && categories.length > 0,
      status: hasActiveBudgetPlan ? "active" : "no_plan",
      normalizedBudgetStatus: hasActiveBudgetPlan ? "active" : "no_plan",
    };
  }, [declaredMonthlyBudgetAmount, expenses, manualExpenseBudgetOptions, monthlyBudgetHeader]);
}
