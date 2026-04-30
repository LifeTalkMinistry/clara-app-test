import { useMemo } from "react";
import { getEnabledCarouselItems } from "./carouselConfig";

const readNumber = (...values) => {
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

const normalizeBudgetPlan = (plan = {}) => {
  const categories = Array.isArray(plan?.categories) ? plan.categories : [];
  const declaredBudget = readNumber(
    plan?.declared_budget,
    plan?.declared_amount,
    plan?.monthly_budget_amount,
    plan?.total_budget,
    plan?.allocated_amount
  );
  const spentAmount = readNumber(
    plan?.spent_amount,
    plan?.spent,
    plan?.total_spent,
    categories.reduce(
      (sum, item) => sum + readNumber(item?.spent, item?.spent_amount, item?.total_spent),
      0
    )
  );
  const remainingAmount = Math.max(
    readNumber(plan?.remaining_amount, plan?.remaining, plan?.amount_left, declaredBudget - spentAmount),
    0
  );

  return {
    activeBudget: plan || null,
    budgetCategories: categories,
    declaredBudget,
    unallocatedAmount: readNumber(plan?.unallocated_amount),
    budgetStatus: plan?.status || "",
    isComplete: plan?.is_complete === true,
    unplannedSpent: readNumber(plan?.unplanned_spent),
    undocumentedSpent: readNumber(plan?.undocumented_spent),
    remainingAmount,
    amountLeft: remainingAmount,
    spentAmount,
    totalSpent: readNumber(plan?.total_spent, spentAmount),
  };
};

export default function useCarouselData({
  monthlyBudgetPlan,
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  walletMoney = 0,
  survivalExpense = 0,
  user = null,
  guardChecked = false,
  loading = false,
  profileData = null,
  firstPositiveNumber,
  readStoredSurvivalExpense,
} = {}) {
  return useMemo(() => {
    const hasSurvivalSetup =
      Boolean(profileData?.survival_setup_done) ||
      (typeof firstPositiveNumber === "function"
        ? firstPositiveNumber(
            profileData?.monthly_survival_expense,
            profileData?.survival_expense,
            profileData?.clara_survival_expense,
            survivalExpense,
            typeof readStoredSurvivalExpense === "function"
              ? readStoredSurvivalExpense(user?.id)
              : 0
          ) > 0
        : readNumber(
            profileData?.monthly_survival_expense,
            profileData?.survival_expense,
            profileData?.clara_survival_expense,
            survivalExpense
          ) > 0);

    const budgetData = normalizeBudgetPlan(monthlyBudgetPlan || {});
    const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];

    const dataByType = {
      budget: {
        ...budgetData,
      },
      emergencyFund: {
        moneyLeft: walletMoney,
        survivalExpense,
        retentionRate: 0,
        canAutoPrompt: Boolean(user?.id) && guardChecked && !loading,
        hasSurvivalSetup,
      },
      savingsGoals: {
        savingsGoals: safeSavingsGoals,
        totalSavingsSaved,
        totalSavingsTarget,
        primarySavingsGoal,
      },
      investmentFund: {
        title: "Investment Fund",
        amount: 0,
        subtitle: "Investment tracking is ready for setup.",
        description: "This card is reserved for future investment fund data without breaking Dashboard.jsx.",
        ctaLabel: "Coming soon",
        state: "comingSoon",
      },
      debtObligations: {
        title: "Debt / Obligations",
        amount: 0,
        subtitle: "Debt tracking is ready for setup.",
        description: "This card is reserved for future obligation data without breaking Dashboard.jsx.",
        ctaLabel: "Coming soon",
        state: "comingSoon",
      },
    };

    return getEnabledCarouselItems().map((item) => ({
      ...item,
      data: dataByType[item.type] || {},
    }));
  }, [
    monthlyBudgetPlan,
    savingsGoals,
    totalSavingsSaved,
    totalSavingsTarget,
    primarySavingsGoal,
    walletMoney,
    survivalExpense,
    user?.id,
    guardChecked,
    loading,
    profileData,
    firstPositiveNumber,
    readStoredSurvivalExpense,
  ]);
}
