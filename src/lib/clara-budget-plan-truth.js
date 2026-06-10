const INACTIVE_BUDGET_STATUSES = new Set([
  "inactive",
  "archived",
  "deleted",
  "closed",
  "reset",
]);

const FINISHED_BUDGET_STATUSES = new Set([
  "active",
  "activated",
  "complete",
  "completed",
  "finished",
]);

function normalizeLower(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(
    String(value ?? "")
      .replace(/php/gi, "")
      .replace(/[₱,\s]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

export function isBudgetHeader(row = {}) {
  const category = normalizeLower(row?.category || row?.budget_category);
  const type = normalizeLower(row?.type);
  const planType = normalizeLower(row?.plan_type);

  return (
    row?.is_plan_header === true ||
    planType === "monthly budget" ||
    category === "monthly budget" ||
    category === "monthly spending plan" ||
    type === "monthly budget"
  );
}

export function isInactiveBudgetPlan(row = {}) {
  const status = normalizeLower(row?.status);

  return (
    row?.is_active === false ||
    row?.active === false ||
    INACTIVE_BUDGET_STATUSES.has(status)
  );
}

export function isFinishedBudgetPlan(row = {}) {
  const status = normalizeLower(row?.status);

  return (
    row?.is_complete === true ||
    row?.complete === true ||
    row?.planIsComplete === true ||
    row?.plan_is_complete === true ||
    FINISHED_BUDGET_STATUSES.has(status)
  );
}

export function isActiveBudgetHeader(row = {}) {
  return (
    Boolean(row) &&
    isBudgetHeader(row) &&
    !isInactiveBudgetPlan(row) &&
    isFinishedBudgetPlan(row)
  );
}

export function getActiveBudgetHeader(source = {}) {
  if (isActiveBudgetHeader(source?.monthlyBudgetHeader)) {
    return source.monthlyBudgetHeader;
  }

  const rows =
    source?.budgets ||
    source?.budgetList ||
    source?.finance?.budgets;

  return (Array.isArray(rows) ? rows : []).find(isActiveBudgetHeader) || null;
}

export function hasActiveBudgetPlan({
  header = null,
  declaredBudget = 0,
  fallbackActive = false,
} = {}) {
  if (toFiniteNumber(declaredBudget) <= 0) return false;
  if (header) return isActiveBudgetHeader(header);
  return fallbackActive === true;
}
