import {
  getActiveBudgetHeader,
  hasActiveBudgetPlan as resolveActivePlan,
  isBudgetHeader,
  isFinishedBudgetPlan,
  isInactiveBudgetPlan,
} from "@/lib/clara-budget-plan-truth";

const safeArray = (value) => Array.isArray(value) ? value : [];
const lower = (value = "") => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hasTime = (value) => /T\d{2}:\d{2}/.test(String(value || ""));
function numberFrom(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const number = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, "").trim());
    if (Number.isFinite(number)) return number;
  }
  return null;
}
function textFrom(...values) {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  return value === undefined ? "" : String(value).trim();
}
const getPath = (source, path) => String(path || "").split(".").reduce((current, key) => current?.[key], source);
function firstNumber(source, paths = []) {
  for (const path of paths) {
    const value = numberFrom(getPath(source, path));
    if (value !== null) return value;
  }
  return null;
}
function firstArray(source, paths = []) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}
const sum = (values = []) => safeArray(values).reduce(
  (total, value) => total + (numberFrom(value) ?? 0), 0
);
const toTime = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
};
const toDateOnly = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
};

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end, hasTimestampStart: false };
}
function cycleRange(header = {}) {
  const fallback = currentMonthRange();
  const start = header?.reset_start_at || header?.tracking_started_at ||
    header?.tracking_start_date || header?.cycle_start || header?.budget_cycle_start ||
    header?.period_start || header?.range_start;
  const end = header?.cycle_end || header?.budget_cycle_end || header?.period_end || header?.range_end;
  return { start: start || fallback.start, end: end || fallback.end, hasTimestampStart: hasTime(start) };
}
function comparableExpenseDate(expense = {}, range = {}) {
  return range?.hasTimestampStart
    ? textFrom(expense.created_at, expense.createdAt, expense.logged_at, expense.spent_at,
        expense.transaction_date, expense.transactionDate, expense.date)
    : textFrom(expense.date, expense.created_at, expense.createdAt, expense.spent_at,
        expense.logged_at, expense.transaction_date, expense.transactionDate);
}
function inRange(expense, range) {
  const value = comparableExpenseDate(expense, range);
  if (range?.hasTimestampStart) {
    const time = toTime(value);
    const start = toTime(range.start);
    const end = toTime(range.end);
    return !(start !== null && (time === null || time < start)) &&
      !(end !== null && time !== null && time > end);
  }
  const date = toDateOnly(value);
  if (!date) return true;
  return !(range?.start && date < toDateOnly(range.start)) &&
    !(range?.end && date > toDateOnly(range.end));
}

const expenseAmount = (expense = {}) => numberFrom(
  expense.amount, expense.total, expense.value, expense.expense_amount,
  expense.spent_amount, expense.price
) ?? 0;
const expenseCategory = (expense = {}) => textFrom(
  expense.budget_category, expense.expense_category, expense.category,
  expense.budgetCategory, expense.category_name, expense.type
);
const expenseBudgetId = (expense = {}) => textFrom(
  expense.budget_category_id, expense.budget_item_id, expense.budget_id, expense.budgetCategoryId
);
function expenseStatus(expense = {}) {
  const status = lower(expense.planning_status || expense.budget_status ||
    expense.plan_status || expense.budgetStatus || expense.status || "");
  if (status.includes("unplanned")) return "unplanned";
  if (status.includes("undocumented")) return "undocumented";
  if (status.includes("budget risk")) return "budget_risk";
  if (status.includes("over budget")) return "over_budget";
  if (status.includes("planned")) return "planned";
  const category = lower(expenseCategory(expense));
  if (category.includes("unplanned")) return "unplanned";
  if (category.includes("undocumented")) return "undocumented";
  return "planned";
}

const categoryName = (row = {}) => textFrom(
  row.name, row.title, row.category, row.category_name, row.budget_category,
  row.label, row.budget_name, "Budget"
);
const categoryId = (row = {}) => textFrom(
  row.id, row.key, row.budget_id, row.local_id, row.section_key, categoryName(row)
);
const categoryAllocated = (row = {}) => numberFrom(
  row.allocated, row.allocated_amount, row.amount, row.limit, row.total,
  row.total_budget, row.budget_amount, row.budget
) ?? 0;
function normalizeCategory(row, activeExpenses) {
  const id = categoryId(row);
  const name = categoryName(row);
  const allocated = categoryAllocated(row);
  const explicitSpent = numberFrom(row.spent, row.used, row.current, row.spent_amount, row.used_amount);
  const matchedSpent = sum(activeExpenses.filter((expense) => {
    if (!["planned", "budget_risk", "over_budget"].includes(expenseStatus(expense))) return false;
    return (id && expenseBudgetId(expense) === String(id)) ||
      (name && lower(expenseCategory(expense)) === lower(name));
  }).map(expenseAmount));
  const spent = explicitSpent !== null ? explicitSpent : matchedSpent;
  const remaining = numberFrom(row.remaining, row.left, row.available, row.remaining_amount) ??
    Math.max(allocated - spent, 0);
  return {
    ...row, id, key: row.key || id, name, title: row.title || name, category: name,
    allocated, spent, used: spent, remaining,
    pct: allocated > 0 ? Math.min((spent / allocated) * 100, 999) : 0,
  };
}

function rawCategories(source) {
  const plan = source.monthlyBudgetPlan || source.budgetPlan || source.monthly_budget_plan || {};
  const planRows = [...safeArray(plan.categories), ...safeArray(plan.categoryRows), ...safeArray(plan.items)];
  if (planRows.length) return planRows;
  const explicit = firstArray(source, [
    "manualExpenseBudgetOptions", "categoryRows", "budget_categories", "budgetCategories",
  ]);
  if (explicit.length) return explicit;
  return safeArray(source.budgets || source.budgetList || source.finance?.budgets)
    .filter((row) => !isBudgetHeader(row) && !isInactiveBudgetPlan(row));
}
function firstDeclared(candidates) {
  for (const [sourceUsed, value] of candidates) {
    const number = numberFrom(value);
    if (number !== null) return { value: number, sourceUsed };
  }
  return { value: 0, sourceUsed: "none" };
}
function declaredBudget(source, header) {
  const plan = source.monthlyBudgetPlan || source.budgetPlan || source.monthly_budget_plan || {};
  const sourceCanDeclare = Boolean(
    header || source.hasActiveBudgetPlan === true || source.has_active_budget_plan === true ||
    source.budgetCardTruth?.hasDeclaredBudget === true ||
    source.budgetCardTruth?.normalizedBudgetStatus === "active"
  );
  return firstDeclared([
    ...(isFinishedBudgetPlan(plan) ? [
      ["monthlyBudgetPlan.declaredBudget", plan.declaredBudget],
      ["monthlyBudgetPlan.declared_budget", plan.declared_budget],
      ["monthlyBudgetPlan.declaredAmount", plan.declaredAmount],
      ["monthlyBudgetPlan.declared_amount", plan.declared_amount],
    ] : []),
    ...(sourceCanDeclare ? [
      ["source.declaredMonthlyBudgetAmount", source.declaredMonthlyBudgetAmount],
      ["source.declared_monthly_budget_amount", source.declared_monthly_budget_amount],
      ["source.declaredBudget", source.declaredBudget],
      ["source.declared_budget", source.declared_budget],
      ["budgetSummary.declaredBudget", getPath(source, "budgetSummary.declaredBudget")],
      ["budget_summary.declaredBudget", getPath(source, "budget_summary.declaredBudget")],
    ] : []),
    ...(header ? [
      ["monthlyBudgetHeader.declared_amount", header.declared_amount],
      ["monthlyBudgetHeader.declared_budget", header.declared_budget],
      ["monthlyBudgetHeader.monthly_budget_amount", header.monthly_budget_amount],
      ["monthlyBudgetHeader.total_declared_budget", header.total_declared_budget],
      ["monthlyBudgetHeader.total_budget", header.total_budget],
      ["monthlyBudgetHeader.budget_amount", header.budget_amount],
      ["monthlyBudgetHeader.amount", header.amount],
    ] : []),
  ]);
}
function budgetStatus(active, declared, allocated, spent, categories) {
  if (!active || declared <= 0) return "no_budget";
  if (spent > declared) return "overspent";
  if (categories === 0) return "draft_no_categories";
  if (allocated < declared) return "unallocated";
  return "active_allocated";
}
const explanation = (status) => ({
  no_budget: "User has not declared an active monthly budget yet.",
  draft_no_categories: "User has declared a monthly budget but has not created categories yet.",
  unallocated: "User has a declared monthly budget, but some budget money is not assigned into categories yet.",
  active_allocated: "User has a declared monthly budget with category allocation active.",
  overspent: "User has spent more than the declared monthly budget.",
}[status] || "Budget state is unclear.");
function shouldDebug() {
  try {
    return import.meta.env.DEV || ["true", "1"].includes(import.meta.env.VITE_CLARA_DEBUG_AI);
  } catch {
    return false;
  }
}

export function buildClaraBudgetSnapshot(context = {}) {
  const source = {
    ...(context?.financeSnapshot || {}),
    ...(context?.dashboardSnapshot || {}),
    ...(context || {}),
  };
  const plan = source.monthlyBudgetPlan || source.budgetPlan || source.monthly_budget_plan || {};
  const header = getActiveBudgetHeader(source);
  const declaredResult = declaredBudget(source, header);
  const rawDeclared = declaredResult.value;
  const active = resolveActivePlan({
    header,
    declaredBudget: rawDeclared,
    fallbackActive: source.hasActiveBudgetPlan === true ||
      source.has_active_budget_plan === true || isFinishedBudgetPlan(plan),
  });
  const range = plan.monthRange || cycleRange(header || plan || {});
  const expenses = firstArray(source, [
    "expenses", "monthlyExpensesList", "recentExpenses",
    "finance.expenses", "dashboardSnapshot.expenses",
  ]);
  const activeExpenses = expenses.filter((expense) => inRange(expense, range));
  const rawCategoryRows = rawCategories(source)
    .filter((row) => row && !isBudgetHeader(row) && !isInactiveBudgetPlan(row))
    .map((row) => normalizeCategory(row, activeExpenses));
  const rawAllocated = firstNumber(plan, ["allocated", "allocated_total", "totalAllocated"]) ??
    firstNumber(source, ["budgetAllocated", "totalBudgetAllocated", "budgetSummary.allocatedBudget"]) ??
    sum(rawCategoryRows.map((category) => category.allocated));
  const rawPlanned = firstNumber(plan, ["plannedSpent", "planned_spent"]) ??
    sum(rawCategoryRows.map((category) => category.spent));
  const rawUnplanned = firstNumber(plan, ["unplannedSpent", "unplanned_spent"]) ??
    sum(activeExpenses.filter((expense) => expenseStatus(expense) === "unplanned").map(expenseAmount));
  const rawUndocumented = firstNumber(plan, ["undocumentedSpent", "undocumented_spent"]) ??
    sum(activeExpenses.filter((expense) => expenseStatus(expense) === "undocumented").map(expenseAmount));
  const computed = rawPlanned + rawUnplanned + rawUndocumented;
  const fallbackSpent = firstNumber(source, [
    "monthlySpent", "budgetSpent", "totalBudgetSpent", "totalExpensesThisMonth",
    "thisMonthSpent", "monthlyExpenses", "spentThisMonth", "finance.monthlySpent",
  ]);
  const rawSpent = firstNumber(plan, [
    "spent", "spent_amount", "spent_total", "total_spent", "totalSpent", "budgetSpent",
  ]) ?? (computed > 0 ? computed : fallbackSpent ?? sum(activeExpenses.map(expenseAmount)));

  const declared = active ? rawDeclared : 0;
  const allocated = active ? rawAllocated : 0;
  const planned = active ? rawPlanned : 0;
  const unplanned = active ? rawUnplanned : 0;
  const undocumented = active ? rawUndocumented : 0;
  const spent = active ? rawSpent : 0;
  const categories = active ? rawCategoryRows : [];
  const unallocated = active ? Math.max(declared - allocated, 0) : 0;
  const remaining = active ? Math.max(declared - spent, 0) : 0;
  const status = budgetStatus(active, declared, allocated, spent, categories.length);
  const budgetExplanation = explanation(status);

  if (shouldDebug()) {
    console.log("[CLARA AI Budget Truth]", {
      declaredBudget: declared,
      allocatedBudget: allocated,
      categoryCount: categories.length,
      hasActiveBudgetPlan: active,
      budgetStatus: status,
      budgetExplanation,
      sourceUsed: declaredResult.sourceUsed,
      activeHeaderFound: Boolean(header),
    });
  }

  return {
    declaredBudget: declared, declared_budget: declared,
    allocatedBudget: allocated, allocated_budget: allocated,
    unallocatedBudget: unallocated, unallocated_budget: unallocated,
    spentTotal: spent, spent, spent_amount: spent, spent_total: spent,
    total_spent: spent, totalSpent: spent,
    plannedSpent: planned, planned_spent: planned,
    unplannedSpent: unplanned, unplanned_spent: unplanned,
    undocumentedSpent: undocumented, undocumented_spent: undocumented,
    remainingSpendableBudget: remaining, remaining_spendable_budget: remaining,
    categoryCount: categories.length, categories, budgetCategories: categories,
    hasActiveBudgetPlan: active, has_active_budget_plan: active,
    hasDeclaredBudget: active,
    hasBudgetCategories: active && categories.length > 0,
    isBudgetFullyAllocated: active && allocated >= declared,
    isOverspent: active && spent > declared,
    budgetStatus: status,
    normalizedBudgetStatus: active ? "active" : "no_plan",
    budgetExplanation,
    budgetTruthSource: declaredResult.sourceUsed,
    sourceUsed: declaredResult.sourceUsed,
    activeHeaderFound: Boolean(header),
    monthRange: range,
  };
}
