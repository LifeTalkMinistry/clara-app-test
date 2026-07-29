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

const readBudgetPlanCategories = (plan = {}) => {
  if (Array.isArray(plan?.budgetDisplayCategories)) return plan.budgetDisplayCategories;
  if (Array.isArray(plan?.budget_display_categories)) return plan.budget_display_categories;
  if (Array.isArray(plan?.displayCategories)) return plan.displayCategories;
  if (Array.isArray(plan?.display_categories)) return plan.display_categories;
  if (Array.isArray(plan?.categories)) return plan.categories;

  return [];
};

const hasResetBoundary = (plan = {}) => Boolean(
  plan?.reset_at ||
    plan?.reset_start_at ||
    plan?.tracking_started_at ||
    plan?.tracking_start_date
);

const hasActiveBudgetTruth = (plan = {}, declaredBudget = 0) => {
  if (typeof plan?.hasActiveBudgetPlan === "boolean") return plan.hasActiveBudgetPlan;
  if (typeof plan?.has_active_budget_plan === "boolean") return plan.has_active_budget_plan;

  const status = String(plan?.normalizedBudgetStatus || plan?.status || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const inactiveStatuses = new Set([
    "no plan",
    "inactive",
    "archived",
    "deleted",
    "closed",
    "reset",
  ]);

  return declaredBudget > 0 && !inactiveStatuses.has(status);
};

export const normalizeCarouselBudgetPlan = (plan = {}, liveExpenseTotal = 0) => {
  const rawCategories = readBudgetPlanCategories(plan);
  const rawDeclaredBudget = readCarouselNumber(
    plan?.declared_budget,
    plan?.declared_amount,
    plan?.monthly_budget_amount,
    plan?.total_budget,
    plan?.allocated_amount
  );
  const hasActiveBudgetPlan = hasActiveBudgetTruth(plan, rawDeclaredBudget);
  const categories = hasActiveBudgetPlan ? rawCategories : [];
  const declaredBudget = hasActiveBudgetPlan ? rawDeclaredBudget : 0;
  const resetBoundary = hasResetBoundary(plan);

  const categorySpentAmount = categories.reduce(
    (sum, item) =>
      sum +
      readCarouselNumber(item?.spent, item?.spent_amount, item?.total_spent, item?.used),
    0
  );

  const unplannedSpent = hasActiveBudgetPlan
    ? readCarouselNumber(plan?.unplanned_spent, plan?.unplannedSpent)
    : 0;
  const undocumentedSpent = hasActiveBudgetPlan
    ? readCarouselNumber(plan?.undocumented_spent, plan?.undocumentedSpent)
    : 0;
  const plannedBreakdownSpent = hasActiveBudgetPlan
    ? readCarouselNumber(plan?.planned_spent, plan?.plannedSpent) +
      unplannedSpent +
      undocumentedSpent
    : 0;

  const spentAmount = hasActiveBudgetPlan
    ? resetBoundary
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
        )
    : 0;

  const remainingAmount = Math.max(declaredBudget - spentAmount, 0);
  const rawUnplannedItems = readCarouselArray(plan?.unplanned_items, plan?.unplannedItems);
  const rawUndocumentedItems = readCarouselArray(plan?.undocumented_items, plan?.undocumentedItems);
  const unplannedItems = hasActiveBudgetPlan ? rawUnplannedItems : [];
  const undocumentedItems = hasActiveBudgetPlan ? rawUndocumentedItems : [];
  const outsidePlanItems = hasActiveBudgetPlan
    ? readCarouselArray(
        plan?.outside_plan_items,
        plan?.outsidePlanItems,
        [...unplannedItems, ...undocumentedItems]
      )
    : [];

  return {
    activeBudget: {
      ...(plan || {}),
      declared_budget: declaredBudget,
      declared_amount: declaredBudget,
      spent: spentAmount,
      spent_amount: spentAmount,
      spent_total: spentAmount,
      total_spent: spentAmount,
      totalSpent: spentAmount,
      planned_spent: hasActiveBudgetPlan
        ? readCarouselNumber(plan?.planned_spent, plan?.plannedSpent)
        : 0,
      unplanned_spent: unplannedSpent,
      undocumented_spent: undocumentedSpent,
      unplanned_items: unplannedItems,
      undocumented_items: undocumentedItems,
      outside_plan_items: outsidePlanItems,
      remaining: remainingAmount,
      remaining_amount: remainingAmount,
      amount_left: remainingAmount,
    },
    budgetCategories: categories,
    declaredBudget,
    unallocatedAmount: hasActiveBudgetPlan
      ? readCarouselNumber(
          plan?.unallocated_amount,
          plan?.unallocated,
          plan?.unallocated_balance,
          plan?.unallocatedBalance
        )
      : 0,
    budgetStatus: hasActiveBudgetPlan ? plan?.status || "" : "no_plan",
    isComplete: hasActiveBudgetPlan && plan?.is_complete === true,
    unplannedSpent,
    undocumentedSpent,
    unplannedItems,
    undocumentedItems,
    outsidePlanItems,
    remainingAmount,
    amountLeft: remainingAmount,
    spentAmount,
    totalSpent: spentAmount,
  };
};
