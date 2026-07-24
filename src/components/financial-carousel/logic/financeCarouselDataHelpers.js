import {
  normalizeCarouselBudgetPlan as normalizeCarouselBudgetPlanCore,
  readCarouselNumber,
} from "./financeCarouselDataHelpersCore";

export { readCarouselNumber };

const isDerivedPlan = (plan = {}) =>
  plan?.isDerivedBudget === true ||
  plan?.is_derived_budget === true ||
  String(plan?.budget_total_mode || plan?.budgetTotalMode || "")
    .trim()
    .toLowerCase() === "derived_from_items";

export const normalizeCarouselBudgetPlan = (plan = {}, liveExpenseTotal = 0) => {
  const normalized = normalizeCarouselBudgetPlanCore(plan, liveExpenseTotal);
  const activeBudget = normalized?.activeBudget || {};

  if (!isDerivedPlan(plan) && !isDerivedPlan(activeBudget)) return normalized;

  // Allocating money during setup is not a transaction. Protected money,
  // debt obligations, and regular categories all start untouched. Only actual
  // logged spending decreases the cycle's available balance.
  const declared = readCarouselNumber(
    normalized?.declaredBudget,
    activeBudget?.declared_budget,
    activeBudget?.declared_amount,
    activeBudget?.monthly_budget_amount,
  );
  const spent = readCarouselNumber(
    normalized?.spentAmount,
    normalized?.totalSpent,
    activeBudget?.spent,
    activeBudget?.spent_amount,
    activeBudget?.spent_total,
    activeBudget?.total_spent,
  );
  const remaining = Math.max(declared - spent, 0);

  return {
    ...normalized,
    remainingAmount: remaining,
    amountLeft: remaining,
    activeBudget: {
      ...activeBudget,
      remaining,
      remaining_amount: remaining,
      amount_left: remaining,
      totalRemaining: remaining,
    },
  };
};
