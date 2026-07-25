import useDashboardMonthlyBudgetPlanEngine from "./useDashboardMonthlyBudgetPlanEngine";

const toAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(String(value).replace(/[₱,\s]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

const getProtectedKey = (row = {}) =>
  String(row?.key || row?.id || "").trim();

const getExpenseBudgetKey = (expense = {}) =>
  String(
    expense?.budgetListKey ||
      expense?.budget_list_key ||
      expense?.budget_category_id ||
      expense?.budgetCategoryId ||
      ""
  ).trim();

const getExpenseDate = (expense = {}) =>
  String(
    expense?.date ||
      expense?.created_at ||
      expense?.createdAt ||
      expense?.logged_at ||
      expense?.spent_at ||
      expense?.transaction_date ||
      expense?.transactionDate ||
      ""
  ).slice(0, 10);

const isInsidePlanCycle = (expense, plan = {}) => {
  const date = getExpenseDate(expense);
  const start = String(plan?.cycle_start || plan?.period_start || "").slice(0, 10);
  const end = String(plan?.cycle_end || plan?.period_end || "").slice(0, 10);
  if (!date || !start || !end) return true;
  return date >= start && date <= end;
};

function syncProtectedDisplayRows(plan = {}, expenses = []) {
  const rows = Array.isArray(plan?.budgetDisplayCategories)
    ? plan.budgetDisplayCategories
    : Array.isArray(plan?.budget_display_categories)
      ? plan.budget_display_categories
      : [];
  if (!rows.length) return rows;

  const activeExpenses = (Array.isArray(expenses) ? expenses : []).filter(
    (expense) => !expense?.deletedAt && !expense?.deleted_at && isInsidePlanCycle(expense, plan)
  );

  return rows.map((row) => {
    const protectedRow =
      row?.isProtectedCommitment === true || row?.is_protected_commitment === true;
    const key = getProtectedKey(row);
    if (!protectedRow || !key) return row;

    const spent = activeExpenses.reduce((sum, expense) => {
      return getExpenseBudgetKey(expense) === key
        ? sum + Math.abs(toAmount(expense?.amount, expense?.spent, expense?.value, expense?.total))
        : sum;
    }, 0);
    const allocated = toAmount(row?.allocated, row?.allocated_amount, row?.amount);
    const remaining = Math.max(allocated - spent, 0);

    return {
      ...row,
      spent,
      spent_amount: spent,
      used: spent,
      remaining,
    };
  });
}

export default function useDashboardMonthlyBudgetPlanCore(options = {}) {
  const plan = useDashboardMonthlyBudgetPlanEngine(options);

  // A budget is a plan, not a transaction. Creating categories, protecting
  // savings, or including an obligation must not reduce Available Balance.
  // Only actual logged spending reduces the cycle balance.
  const declared = toAmount(
    plan?.declared_budget,
    plan?.declaredBudget,
    plan?.declaredAmount,
  );
  const spent = toAmount(
    plan?.spent,
    plan?.spent_amount,
    plan?.spent_total,
    plan?.total_spent,
    plan?.totalSpent,
  );
  const remaining = Math.max(declared - spent, 0);
  const budgetDisplayCategories = syncProtectedDisplayRows(plan, options?.expenses);

  return {
    ...plan,
    remaining,
    remaining_amount: remaining,
    amount_left: remaining,
    totalRemaining: remaining,
    budgetDisplayCategories,
    budget_display_categories: budgetDisplayCategories,
    displayCategories: budgetDisplayCategories,
    display_categories: budgetDisplayCategories,
  };
}
