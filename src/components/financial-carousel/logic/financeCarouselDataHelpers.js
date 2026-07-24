import {
  normalizeCarouselBudgetPlan as normalizeCarouselBudgetPlanCore,
  readCarouselNumber,
} from "./financeCarouselDataHelpersCore";

export { readCarouselNumber };

export const normalizeCarouselBudgetPlan = (plan = {}, liveExpenseTotal = 0) => {
  const normalized = normalizeCarouselBudgetPlanCore(plan, liveExpenseTotal);
  const activeBudget = normalized?.activeBudget || {};

  // Budget setup only assigns money to categories. It does not spend, transfer,
  // or reserve that money automatically. Available balance changes only when
  // actual spending has been logged into the active budget cycle.
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
