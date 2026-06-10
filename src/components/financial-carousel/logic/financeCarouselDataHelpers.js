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

export const normalizeCarouselBudgetPlan = (plan = {}, liveExpenseTotal = 0) => {
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
  const plannedBreakdownSpent =
    readCarouselNumber(plan?.planned_spent) +
    readCarouselNumber(plan?.unplanned_spent) +
    readCarouselNumber(plan?.undocumented_spent);
  const hasAuthoritativeCycle = Boolean(
    plan?.budget_cycle_header_id ||
      plan?.reset_start_at ||
      plan?.monthRange ||
      plan?.active_cycle_expense_count !== undefined ||
      Array.isArray(plan?.activeCycleExpenses) ||
      Array.isArray(plan?.active_cycle_expenses)
  );
  const spentAmount = Math.max(
    hasAuthoritativeCycle ? 0 : readCarouselNumber(liveExpenseTotal),
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
  const undocumentedItems = readCarouselArray(
    plan?.undocumented_items,
    plan?.undocumentedItems
  );
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
      plan?.unallocated_balance,
      plan?.unallocated
    ),
    budgetStatus: plan?.status || "",
    isComplete: plan?.is_complete === true,
    unplannedSpent: readCarouselNumber(plan?.unplanned_spent),
    undocumentedSpent: readCarouselNumber(plan?.undocumented_spent),
    unplannedItems,
    undocumentedItems,
    outsidePlanItems,
    remainingAmount,
    amountLeft: remainingAmount,
    spentAmount,
    totalSpent: spentAmount,
  };
};
