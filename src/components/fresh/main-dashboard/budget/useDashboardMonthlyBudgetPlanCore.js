import useDashboardMonthlyBudgetPlanEngine from "./useDashboardMonthlyBudgetPlanEngine";

const toAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(String(value).replace(/[₱,\s]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

const isDerivedPlan = (plan = {}) =>
  plan?.isDerivedBudget === true ||
  plan?.is_derived_budget === true ||
  String(plan?.budget_total_mode || plan?.budgetTotalMode || "")
    .trim()
    .toLowerCase() === "derived_from_items";

export default function useDashboardMonthlyBudgetPlanCore(options = {}) {
  const plan = useDashboardMonthlyBudgetPlanEngine(options);

  if (!isDerivedPlan(plan)) return plan;

  // Budget setup only assigns money to envelopes. It does not spend or reserve
  // the money automatically. The cycle balance moves only when a real expense
  // is logged against the budget after activation.
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

  return {
    ...plan,
    remaining,
    remaining_amount: remaining,
    amount_left: remaining,
    totalRemaining: remaining,
  };
}
