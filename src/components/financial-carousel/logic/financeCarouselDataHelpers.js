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

const readCarouselArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }

  return [];
};

const hasResetBoundary = (plan = {}) => Boolean(
  plan?.reset_start_at ||
    plan?.tracking_started_at ||
    plan?.tracking_start_date
);

export const normalizeCarouselBudgetPlan = (plan = {}, liveExpenseTotal = 0) => {
  const categories = Array.isArray(plan?.categories) ? plan.categories : [];
  const resetBoundary = hasResetBoundary(plan);

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

  const plannedBreakdownSpent =
    readCarouselNumber(plan?.planned_spent, plan?.plannedSpent) +
    readCarouselNumber(plan?.unplanned_spent, plan?.unplannedSpent) +
    readCarouselNumber(plan?.undocumented_spent, plan?.undocumentedSpent);

  const spentAmount = resetBoundary
    ? Math.max(plannedBreakdownSpent, categorySpentAmount)
    : Math.max(
        readCarouselNumber(liveExpenseTotal),
        readCarouselNumber(plan?.spent_amount),
        readCarouselNumber(plan?.spent),
        readCarouselNumber(plan?.spent_total),
        readCarouselNumber(plan?.total_spent),
        readCarouselNumber(plan?.totalSpent),
        plannedBreakdownSpent,
        categorySpentAmount
      );

  const remainingAmount = Math.max(declaredBudget - spentAmount, 0);
  const unplannedItems = readCarouselArray(plan?.unplanned_items, plan?.unplannedItems);
  const undocumentedItems = readCarouselArray(plan?.undocumented_items, plan?.undocumentedItems);
  const outsidePlanItems = readCarouselArray(
    plan?.outside_plan_items,
    plan?.outsidePlanItems,
    [...unplannedItems, ...undocumentedItems]
  );

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
    unallocatedAmount: readCarouselNumber(
      plan?.unallocated_amount,
      plan?.unallocated,
      plan?.unallocated_balance,
      plan?.unallocatedBalance
    ),
    budgetStatus: plan?.status || "",
    isComplete: plan?.is_complete === true,
    unplannedSpent: readCarouselNumber(plan?.unplanned_spent, plan?.unplannedSpent),
    undocumentedSpent: readCarouselNumber(plan?.undocumented_spent, plan?.undocumentedSpent),
    unplannedItems,
    undocumentedItems,
    outsidePlanItems,
    remainingAmount,
    amountLeft: remainingAmount,
    spentAmount,
    totalSpent: spentAmount,
  };
};
