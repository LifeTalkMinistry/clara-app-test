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

  const categorySpentAmount = categories.reduce(
    (sum, item) =>
      sum +
      readCarouselNumber(item?.spent, item?.spent_amount, item?.total_spent, item?.used),
    0
  );

  const spentAmount = Math.max(
    readCarouselNumber(plan?.spent_amount),
    readCarouselNumber(plan?.spent),
    readCarouselNumber(plan?.spent_total),
    readCarouselNumber(plan?.total_spent),
    readCarouselNumber(plan?.totalSpent),
    readCarouselNumber(plan?.planned_spent) + readCarouselNumber(plan?.unplanned_spent) + readCarouselNumber(plan?.undocumented_spent),
    categorySpentAmount
  );

  const remainingAmount = Math.max(declaredBudget - spentAmount, 0);

  return {
    activeBudget: {
      ...(plan || {}),
      spent: spentAmount,
      spent_amount: spentAmount,
      spent_total: spentAmount,
      total_spent: spentAmount,
      totalSpent: spentAmount,
      remaining: remainingAmount,
      remaining_amount: remainingAmount,
      amount_left: remainingAmount,
    },
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
    totalSpent: spentAmount,
  };
};