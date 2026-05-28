function numberFrom(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const cleaned = String(value).replace(/php/gi, "").replace(/[₱,\s]/g, "").trim();
    const number = Number(cleaned);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function textFrom(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return String(value).trim();
  }
  return "";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function lower(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getPath(source, path) {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
}

function firstNumber(source, paths = []) {
  for (const path of paths) {
    const number = numberFrom(getPath(source, path));
    if (number !== null) return number;
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

function sum(values = []) {
  return safeArray(values).reduce((total, value) => total + (numberFrom(value) ?? 0), 0);
}

function toDateOnly(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

function getCycleRange(header = {}) {
  const fallback = currentMonthRange();
  return {
    start: toDateOnly(header?.cycle_start || header?.budget_cycle_start || header?.period_start || header?.range_start || header?.tracking_start_date) || fallback.start,
    end: toDateOnly(header?.cycle_end || header?.budget_cycle_end || header?.period_end || header?.range_end) || fallback.end,
  };
}

function isInRange(dateValue, range) {
  const date = toDateOnly(dateValue);
  if (!date) return true;
  if (range?.start && date < range.start) return false;
  if (range?.end && date > range.end) return false;
  return true;
}

function isBudgetHeader(row = {}) {
  const category = String(row?.category || row?.budget_category || "").trim();
  return row?.is_plan_header === true || row?.plan_type === "monthly_budget" || category === "__monthly_budget__" || lower(row?.type) === "monthly budget" || lower(category) === "monthly budget" || lower(category) === "monthly spending plan";
}

function isInactive(row = {}) {
  return row?.is_active === false || row?.active === false || ["inactive", "archived", "deleted", "closed"].includes(lower(row?.status));
}

function expenseDate(expense = {}) {
  return textFrom(expense.date, expense.created_at, expense.createdAt, expense.spent_at, expense.logged_at, expense.transaction_date, expense.transactionDate);
}

function expenseAmount(expense = {}) {
  return numberFrom(expense.amount, expense.total, expense.value, expense.expense_amount, expense.spent_amount, expense.price) ?? 0;
}

function expenseCategory(expense = {}) {
  return textFrom(expense.budget_category, expense.expense_category, expense.category, expense.budgetCategory, expense.category_name, expense.type);
}

function expenseBudgetId(expense = {}) {
  return textFrom(expense.budget_category_id, expense.budget_item_id, expense.budget_id, expense.budgetCategoryId);
}

function expenseStatus(expense = {}) {
  const status = lower(expense.planning_status || expense.budget_status || expense.plan_status || expense.budgetStatus || expense.status || "");
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

function categoryName(row = {}) {
  return textFrom(row.name, row.title, row.category, row.category_name, row.budget_category, row.label, row.budget_name, "Budget");
}

function categoryId(row = {}) {
  return textFrom(row.id, row.key, row.budget_id, row.local_id, row.section_key, categoryName(row));
}

function categoryAllocated(row = {}) {
  return numberFrom(row.allocated, row.allocated_amount, row.amount, row.limit, row.total, row.total_budget, row.budget_amount, row.budget) ?? 0;
}

function normalizeCategory(row = {}, activeExpenses = []) {
  const id = categoryId(row);
  const name = categoryName(row);
  const allocated = categoryAllocated(row);
  const explicitSpent = numberFrom(row.spent, row.used, row.current, row.spent_amount, row.used_amount);
  const matchedSpent = sum(activeExpenses.filter((expense) => {
    const status = expenseStatus(expense);
    if (!["planned", "budget_risk", "over_budget"].includes(status)) return false;
    const rowName = lower(name);
    const rowId = String(id || "");
    return (rowId && expenseBudgetId(expense) === rowId) || (rowName && lower(expenseCategory(expense)) === rowName);
  }).map(expenseAmount));
  const spent = explicitSpent !== null ? explicitSpent : matchedSpent;
  const remaining = numberFrom(row.remaining, row.left, row.available, row.remaining_amount) ?? Math.max(allocated - spent, 0);
  return { ...row, id, key: row.key || id, name, title: row.title || name, category: name, allocated, spent, used: spent, remaining, pct: allocated > 0 ? Math.min((spent / allocated) * 100, 999) : 0 };
}

function getHeader(source = {}) {
  if (source.monthlyBudgetHeader) return source.monthlyBudgetHeader;
  return safeArray(source.budgets || source.budgetList || source.finance?.budgets).find((row) => isBudgetHeader(row) && !isInactive(row)) || null;
}

function getRawCategories(source = {}) {
  const plan = source.monthlyBudgetPlan || source.budgetPlan || source.monthly_budget_plan || {};
  const rows = [...safeArray(plan.categories), ...safeArray(plan.categoryRows), ...safeArray(plan.items)];
  if (rows.length) return rows;
  const explicitRows = firstArray(source, ["manualExpenseBudgetOptions", "categoryRows", "budget_categories", "budgetCategories"]);
  if (explicitRows.length) return explicitRows;
  return safeArray(source.budgets || source.budgetList || source.finance?.budgets).filter((row) => !isBudgetHeader(row) && !isInactive(row));
}

function getDeclaredBudget(source = {}, allocatedBudget = 0) {
  const plan = source.monthlyBudgetPlan || source.budgetPlan || source.monthly_budget_plan || {};
  const header = getHeader(source) || {};
  return numberFrom(plan.declaredBudget, plan.declared_budget, plan.declaredAmount, plan.declared_amount, source.declaredMonthlyBudgetAmount, source.declared_monthly_budget_amount, source.declaredBudget, source.declared_budget, header.declared_amount, header.declared_budget, header.monthly_budget_amount, header.total_declared_budget, header.total_budget, header.budget_amount, header.amount, getPath(source, "budgetSummary.declaredBudget"), getPath(source, "budget_summary.declaredBudget")) ?? (allocatedBudget > 0 ? allocatedBudget : 0);
}

function budgetStatus({ declaredBudget, allocatedBudget, spentTotal, categoryCount }) {
  if (declaredBudget <= 0) return "no_budget";
  if (spentTotal > declaredBudget) return "overspent";
  if (categoryCount === 0) return "draft_no_categories";
  if (allocatedBudget < declaredBudget) return "unallocated";
  return "active_allocated";
}

function budgetExplanation(status) {
  if (status === "no_budget") return "User has not declared a monthly budget yet.";
  if (status === "draft_no_categories") return "User has declared a monthly budget but has not created categories yet.";
  if (status === "unallocated") return "User has a declared monthly budget, but some budget money is not assigned into categories yet.";
  if (status === "active_allocated") return "User has a declared monthly budget with category allocation active.";
  if (status === "overspent") return "User has spent more than the declared monthly budget.";
  return "Budget state is unclear.";
}

export function buildClaraBudgetSnapshot(context = {}) {
  const source = { ...(context?.financeSnapshot || {}), ...(context?.dashboardSnapshot || {}), ...(context || {}) };
  const plan = source.monthlyBudgetPlan || source.budgetPlan || source.monthly_budget_plan || {};
  const range = plan.monthRange || getCycleRange(getHeader(source));
  const expenses = firstArray(source, ["expenses", "monthlyExpensesList", "recentExpenses", "finance.expenses", "dashboardSnapshot.expenses"]);
  const activeExpenses = expenses.filter((expense) => isInRange(expenseDate(expense), range));
  const categories = getRawCategories(source).filter((row) => row && !isBudgetHeader(row) && !isInactive(row)).map((row) => normalizeCategory(row, activeExpenses));
  const allocatedBudget = firstNumber(plan, ["allocated", "allocated_total", "totalAllocated"]) ?? firstNumber(source, ["budgetAllocated", "totalBudgetAllocated", "budgetSummary.allocatedBudget"]) ?? sum(categories.map((category) => category.allocated));
  const declaredBudget = getDeclaredBudget(source, allocatedBudget);
  const plannedSpent = firstNumber(plan, ["plannedSpent", "planned_spent"]) ?? sum(categories.map((category) => category.spent));
  const unplannedSpent = firstNumber(plan, ["unplannedSpent", "unplanned_spent"]) ?? sum(activeExpenses.filter((expense) => expenseStatus(expense) === "unplanned").map(expenseAmount));
  const undocumentedSpent = firstNumber(plan, ["undocumentedSpent", "undocumented_spent"]) ?? sum(activeExpenses.filter((expense) => expenseStatus(expense) === "undocumented").map(expenseAmount));
  const computedSpentTotal = plannedSpent + unplannedSpent + undocumentedSpent;
  const fallbackSpent = firstNumber(source, ["monthlySpent", "budgetSpent", "totalBudgetSpent", "totalExpensesThisMonth", "thisMonthSpent", "monthlyExpenses", "spentThisMonth", "finance.monthlySpent"]);
  const spentTotal = firstNumber(plan, ["spent", "spent_total", "totalSpent", "budgetSpent"]) ?? (computedSpentTotal > 0 ? computedSpentTotal : fallbackSpent ?? sum(activeExpenses.map(expenseAmount)));
  const unallocatedBudget = Math.max(declaredBudget - allocatedBudget, 0);
  const remainingSpendableBudget = Math.max(declaredBudget - spentTotal, 0);
  const categoryCount = categories.length;
  const status = budgetStatus({ declaredBudget, allocatedBudget, spentTotal, categoryCount });

  return {
    declaredBudget,
    allocatedBudget,
    unallocatedBudget,
    spentTotal,
    plannedSpent,
    unplannedSpent,
    undocumentedSpent,
    remainingSpendableBudget,
    categoryCount,
    categories,
    budgetCategories: categories,
    hasDeclaredBudget: declaredBudget > 0,
    hasBudgetCategories: categoryCount > 0,
    isBudgetFullyAllocated: declaredBudget > 0 && allocatedBudget >= declaredBudget,
    isOverspent: declaredBudget > 0 && spentTotal > declaredBudget,
    budgetStatus: status,
    budgetExplanation: budgetExplanation(status),
    monthRange: range,
  };
}
