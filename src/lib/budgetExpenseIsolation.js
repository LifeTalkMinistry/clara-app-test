export const FRESH_BUDGET_EXPENSE_SCOPE_MODE = "fresh_session_v1";

const clean = (value) => String(value ?? "").trim();

const amountValue = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

export function budgetExpenseIsolationKey(expense = {}) {
  const id = clean(
    expense?.id ||
      expense?.key ||
      expense?.expense_id ||
      expense?.expenseId ||
      expense?.local_id ||
      expense?.localId,
  );

  if (id) return `id:${id}`;

  const wallet = clean(
    expense?.wallet_id || expense?.walletId || expense?.wallet || expense?.wallet_name,
  );
  const title = clean(
    expense?.title || expense?.name || expense?.merchant || expense?.description,
  ).toLowerCase();
  const category = clean(
    expense?.budget_category || expense?.expense_category || expense?.category,
  ).toLowerCase();
  const note = clean(expense?.notes || expense?.note || expense?.reason).toLowerCase();
  const createdMarker = clean(
    expense?.created_at ||
      expense?.createdAt ||
      expense?.logged_at ||
      expense?.loggedAt ||
      expense?.spent_at ||
      expense?.spentAt ||
      expense?.date,
  );
  const amount = amountValue(expense?.amount ?? expense?.spent ?? expense?.value ?? expense?.total);

  return `fingerprint:${createdMarker}|${amount}|${wallet}|${title}|${category}|${note}`;
}

export function buildBudgetExpenseBaselineKeys(expenses = []) {
  return [
    ...new Set(
      (Array.isArray(expenses) ? expenses : [])
        .filter((expense) => !expense?.deletedAt && !expense?.deleted_at)
        .map((expense) => budgetExpenseIsolationKey(expense))
        .filter(Boolean),
    ),
  ];
}

export function readBudgetExpenseBaselineKeys(header = {}) {
  const values =
    header?.budget_baseline_expense_keys ||
    header?.budgetBaselineExpenseKeys ||
    header?.baseline_expense_keys ||
    header?.baselineExpenseKeys ||
    [];

  return Array.isArray(values)
    ? [...new Set(values.map((value) => clean(value)).filter(Boolean))]
    : [];
}

export function isBudgetExpenseScopeInitialized(header = {}) {
  const hasBaselineField = [
    "budget_baseline_expense_keys",
    "budgetBaselineExpenseKeys",
    "baseline_expense_keys",
    "baselineExpenseKeys",
  ].some((key) => Object.prototype.hasOwnProperty.call(header || {}, key));

  return Boolean(
    header?.budget_expense_scope_initialized === true ||
      header?.budgetExpenseScopeInitialized === true ||
      clean(header?.budget_expense_scope_mode || header?.budgetExpenseScopeMode) ===
        FRESH_BUDGET_EXPENSE_SCOPE_MODE ||
      hasBaselineField,
  );
}

export function isDerivedActiveBudgetHeader(header = {}) {
  const mode = clean(header?.budget_total_mode || header?.budgetTotalMode).toLowerCase();
  const status = clean(header?.status).toLowerCase();
  const type = clean(header?.type || header?.plan_type).toLowerCase();
  const category = clean(header?.category || header?.budget_category).toLowerCase();
  const isHeader = Boolean(
    header?.is_plan_header === true ||
      type === "monthly_budget" ||
      type === "monthly budget" ||
      category === "__monthly_budget__" ||
      category === "monthly budget",
  );
  const isInactive = Boolean(
    header?.is_active === false ||
      header?.active === false ||
      ["archived", "inactive", "deleted", "reset"].includes(status),
  );
  const isActive = Boolean(
    header?.is_complete === true || header?.complete === true || status === "active",
  );

  return isHeader && mode === "derived_from_items" && isActive && !isInactive;
}

export function seedFreshBudgetExpenseScope(header = {}, expenses = []) {
  if (!isDerivedActiveBudgetHeader(header) || isBudgetExpenseScopeInitialized(header)) {
    return header;
  }

  return {
    ...header,
    budget_expense_scope_mode: FRESH_BUDGET_EXPENSE_SCOPE_MODE,
    budget_expense_scope_initialized: true,
    budget_baseline_expense_keys: buildBudgetExpenseBaselineKeys(expenses),
    budget_session_id: clean(header?.budget_session_id || header?.setup_draft_id || header?.id) || null,
  };
}

export function isExpenseFreshForBudget(expense = {}, header = {}) {
  if (!isBudgetExpenseScopeInitialized(header)) return true;
  const baseline = new Set(readBudgetExpenseBaselineKeys(header));
  return !baseline.has(budgetExpenseIsolationKey(expense));
}
