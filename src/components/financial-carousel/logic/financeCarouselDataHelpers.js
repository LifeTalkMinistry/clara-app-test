export const readCarouselNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    const number =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[₱,\s]/g, ""));

    if (Number.isFinite(number)) return number;
  }

  return 0;
};

export const normalizeCarouselBudgetPlan = (plan = {}) => {
  const categories = Array.isArray(plan?.categories) ? plan.categories : [];

  const declaredBudget = readCarouselNumber(
    plan?.declared_budget,
    plan?.declared_amount,
    plan?.monthly_budget_amount,
    plan?.total_budget,
    plan?.allocated_amount
  );

  const spentAmount = readCarouselNumber(
    plan?.spent_amount,
    plan?.spent,
    plan?.total_spent,
    categories.reduce(
      (sum, item) =>
        sum +
        readCarouselNumber(item?.spent, item?.spent_amount, item?.total_spent),
      0
    )
  );

  const remainingAmount = Math.max(
    readCarouselNumber(
      plan?.remaining_amount,
      plan?.remaining,
      plan?.amount_left,
      declaredBudget - spentAmount
    ),
    0
  );

  return {
    activeBudget: plan || null,
    budgetCategories: categories,
    declaredBudget,
    unallocatedAmount: readCarouselNumber(plan?.unallocated_amount),
    budgetStatus: plan?.status || "",
    isComplete: plan?.is_complete === true,
    unplannedSpent: readCarouselNumber(plan?.unplanned_spent),
    undocumentedSpent: readCarouselNumber(plan?.undocumented_spent),
    remainingAmount,
    amountLeft: remainingAmount,
    spentAmount,
    totalSpent: readCarouselNumber(plan?.total_spent, spentAmount),
  };
};
