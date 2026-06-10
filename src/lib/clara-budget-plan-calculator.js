import {
  getBudgetCycleRange,
  getPHBudgetMonthKey,
  isExpenseInBudgetCycle,
  normalizeBudgetLower,
  normalizeBudgetString,
} from "./clara-budget-cycle-authority.js";

function firstValidNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const number =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[₱,\s]/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function getBudgetCycleSource({
  budgetCycleHeader = null,
  monthlyBudgetHeader = null,
  safeBudgetOptions = [],
} = {}) {
  if (budgetCycleHeader) return budgetCycleHeader;
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

function getBudgetCycleType(source = null) {
  const raw = normalizeBudgetLower(
    source?.budget_cycle ||
      source?.cycle_type ||
      source?.budget_rhythm ||
      source?.period_type ||
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

function getExpenseBudgetCategory(expense = {}) {
  return normalizeBudgetString(
    expense?.budget_category ||
      expense?.expense_category ||
      expense?.category ||
      expense?.budgetCategory ||
      ""
  );
}

function getExpenseBudgetId(expense = {}) {
  return normalizeBudgetString(
    expense?.budget_category_id ||
      expense?.budget_item_id ||
      expense?.budget_id ||
      expense?.budgetCategoryId ||
      ""
  );
}

function getExpensePlanningStatus(expense = {}) {
  const status = normalizeBudgetLower(
    expense?.planning_status ||
      expense?.budget_status ||
      expense?.plan_status ||
      expense?.budgetStatus ||
      ""
  );

  if (status) return status;

  const category = normalizeBudgetLower(getExpenseBudgetCategory(expense));
  if (category.includes("unplanned")) return "unplanned";
  if (category.includes("undocumented")) return "undocumented";
  return "planned";
}

function findMatchingBudgetOptionForExpense(expense = {}, safeBudgetOptions = []) {
  const expenseCategory = normalizeBudgetLower(getExpenseBudgetCategory(expense));
  const expenseBudgetId = getExpenseBudgetId(expense);

  return (
    safeBudgetOptions.find((item) => {
      const itemId = normalizeBudgetString(item?.id || item?.key || "");
      const itemTitle = normalizeBudgetLower(item?.title);
      return (
        (itemId && expenseBudgetId && itemId === expenseBudgetId) ||
        (itemTitle && expenseCategory && itemTitle === expenseCategory)
      );
    }) || null
  );
}

function normalizeOutsidePlanExpense(expense = {}, type = "unplanned", index = 0) {
  const amount = firstValidNumber(
    expense?.amount,
    expense?.spent,
    expense?.value,
    expense?.total
  );
  const rawDate =
    expense?.created_at ||
    expense?.createdAt ||
    expense?.logged_at ||
    expense?.spent_at ||
    expense?.transaction_date ||
    expense?.transactionDate ||
    expense?.date ||
    "";
  const parsedTime = new Date(rawDate).getTime();

  return {
    ...expense,
    id: expense?.id || expense?.key || `${type}-${index}-${rawDate || amount}`,
    type,
    status: type,
    planning_status: type,
    title:
      expense?.title ||
      expense?.name ||
      expense?.merchant ||
      expense?.description ||
      getExpenseBudgetCategory(expense) ||
      (type === "undocumented" ? "Undocumented expense" : "Unplanned expense"),
    category: getExpenseBudgetCategory(expense) || "No category",
    amount,
    date: rawDate,
    sortTime: Number.isNaN(parsedTime) ? 0 : parsedTime,
  };
}

const PLANNED_STATUSES = new Set(["planned", "budget_risk", "over_budget"]);

export function buildDashboardMonthlyBudgetPlan({
  manualExpenseBudgetOptions = [],
  expenses = [],
  declaredMonthlyBudgetAmount = 0,
  budgetCycleHeader = null,
  monthlyBudgetHeader = null,
} = {}) {
  const safeBudgetOptions = Array.isArray(manualExpenseBudgetOptions)
    ? manualExpenseBudgetOptions
    : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const budgetCycleSource = getBudgetCycleSource({
    budgetCycleHeader,
    monthlyBudgetHeader,
    safeBudgetOptions,
  });
  const monthKey = normalizeBudgetString(
    budgetCycleSource?.month ||
      budgetCycleSource?.budget_month ||
      budgetCycleSource?.month_key ||
      getPHBudgetMonthKey()
  );
  const monthRange = getBudgetCycleRange(budgetCycleSource || {}, monthKey);
  const cycleType = getBudgetCycleType(budgetCycleSource);
  const cycleLabel = getBudgetCycleLabel(cycleType);
  const activeCycleExpenses = safeExpenses.filter((expense) =>
    isExpenseInBudgetCycle(expense, monthRange)
  );

  const categories = safeBudgetOptions.map((item) => {
    const itemId = normalizeBudgetString(item?.id || item?.key || "");
    const itemTitle = normalizeBudgetString(item?.title || "");

    const spent = activeCycleExpenses.reduce((sum, expense) => {
      const status = getExpensePlanningStatus(expense);
      const expenseCategory = getExpenseBudgetCategory(expense);
      const expenseBudgetId = getExpenseBudgetId(expense);
      const matchesId = itemId && expenseBudgetId && expenseBudgetId === itemId;
      const matchesCategory =
        normalizeBudgetLower(expenseCategory) === normalizeBudgetLower(itemTitle);

      if (!matchesId && !matchesCategory) return sum;
      if (![...PLANNED_STATUSES, "unplanned"].includes(status)) return sum;
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

  const unplannedExpenseItems = activeCycleExpenses
    .filter((expense) => {
      const status = getExpensePlanningStatus(expense);
      if (status !== "unplanned") return false;
      return !findMatchingBudgetOptionForExpense(expense, safeBudgetOptions);
    })
    .map((expense, index) =>
      normalizeOutsidePlanExpense(expense, "unplanned", index)
    );

  const undocumentedExpenseItems = activeCycleExpenses
    .filter((expense) => getExpensePlanningStatus(expense) === "undocumented")
    .map((expense, index) =>
      normalizeOutsidePlanExpense(expense, "undocumented", index)
    );

  const unplannedSpent = unplannedExpenseItems.reduce(
    (sum, expense) => sum + firstValidNumber(expense?.amount),
    0
  );
  const undocumentedSpent = undocumentedExpenseItems.reduce(
    (sum, expense) => sum + firstValidNumber(expense?.amount),
    0
  );
  const outsidePlanItems = [...unplannedExpenseItems, ...undocumentedExpenseItems].sort(
    (left, right) => firstValidNumber(right?.sortTime) - firstValidNumber(left?.sortTime)
  );
  const outsidePlanSpent = unplannedSpent + undocumentedSpent;
  const allocatedTotal = categories.reduce(
    (sum, item) => sum + firstValidNumber(item?.allocated),
    0
  );
  const plannedSpentTotal = matchedPlannedSpent + unmatchedPlannedSpent;
  const spentTotal = plannedSpentTotal + outsidePlanSpent;
  const declaredBudget = firstValidNumber(declaredMonthlyBudgetAmount);
  const unallocated = Math.max(declaredBudget - allocatedTotal, 0);
  const remaining = Math.max(declaredBudget - spentTotal, 0);
  const progress =
    declaredBudget > 0
      ? Math.min((spentTotal / declaredBudget) * 100, 999)
      : allocatedTotal > 0
        ? Math.min((spentTotal / allocatedTotal) * 100, 999)
        : 0;
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
    reset_start_at: budgetCycleSource?.reset_start_at || null,
    budget_cycle_header_id: budgetCycleHeader?.id || budgetCycleSource?.id || null,
    declared_budget: declaredBudget,
    declaredBudget,
    declaredAmount: declaredBudget,
    allocated: allocatedTotal,
    allocated_amount: allocatedTotal,
    allocated_total: allocatedTotal,
    totalAllocated: allocatedTotal,
    matched_planned_spent: matchedPlannedSpent,
    unmatched_planned_spent: unmatchedPlannedSpent,
    planned_spent: plannedSpentTotal,
    plannedSpent: plannedSpentTotal,
    unplanned_spent: unplannedSpent,
    unplannedSpent,
    undocumented_spent: undocumentedSpent,
    undocumentedSpent,
    outside_plan_spent: outsidePlanSpent,
    outsidePlanSpent,
    unplanned_items: unplannedExpenseItems,
    unplannedItems: unplannedExpenseItems,
    undocumented_items: undocumentedExpenseItems,
    undocumentedItems: undocumentedExpenseItems,
    outside_plan_items: outsidePlanItems,
    outsidePlanItems,
    active_cycle_expenses: activeCycleExpenses,
    activeCycleExpenses,
    active_cycle_expense_count: activeCycleExpenses.length,
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
    unallocated_amount: unallocated,
    unallocated_balance: unallocated,
    unallocatedBalance: unallocated,
    progress,
    used_percentage: progress,
    usedPercentage: progress,
    categories,
    categoryRows: categories,
    is_complete: isComplete,
    isComplete,
    hasDeclaredBudget: declaredBudget > 0,
    hasCategories: categories.length > 0,
    status: isComplete ? "active" : declaredBudget > 0 ? "draft" : "empty",
  };
}
