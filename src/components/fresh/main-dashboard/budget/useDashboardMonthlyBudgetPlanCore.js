import useDashboardMonthlyBudgetPlanEngine from "./useDashboardMonthlyBudgetPlanEngine";

const toAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(String(value).replace(/[₱,\s]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

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

  return {
    ...plan,
    remaining,
    remaining_amount: remaining,
    amount_left: remaining,
    totalRemaining: remaining,
  };
}
