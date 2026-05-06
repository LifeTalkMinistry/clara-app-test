import {
  DEFAULT_FINANCIAL_CARD_KEY,
  getRegisteredFinancialCards,
} from "./FinancialCardRegistry";

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

export const getEnabledCarouselItems = (options = {}) =>
  getRegisteredFinancialCards(options);

export const getDefaultCarouselIndex = (items = []) => {
  const index = items.findIndex(
    (item) => item?.key === DEFAULT_FINANCIAL_CARD_KEY
  );

  return index >= 0 ? index : 0;
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
      (sum, item) =>
        sum +
        readNumber(item?.spent, item?.spent_amount, item?.total_spent),
      0
    )
  );

  const remainingAmount = Math.max(
    readNumber(
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

export const getCarouselData = ({
  monthlyBudgetPlan,
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  survivalExpense = 0,
  user = null,
  guardChecked = false,
  loading = false,
  profileData = null,
  featureFlags = null,
  includeLocked = true,
  firstPositiveNumber,
  readStoredSurvivalExpense,
} = {}) => {
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

  const safeSavingsGoals = Array.isArray(savingsGoals)
    ? savingsGoals
    : [];

  const safeWallets = Array.isArray(wallets) ? wallets : [];

  const safeWalletPreviewTransactions = Array.isArray(
    walletPreviewTransactions
  )
    ? walletPreviewTransactions
    : [];

  const dataByType = {
    wallet: {
      wallets: safeWallets,
      walletMoney,
      walletPreviewTransactions: safeWalletPreviewTransactions,
    },

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
      subtitle: "Decide before you invest.",
      description:
        "Build your emergency fund first before investing.",
      ctaLabel: "Coming soon",
      state: "comingSoon",
    },

    debtObligations: {
      title: "Debt / Obligations",
      amount: 0,
      subtitle: "Track and manage what you owe.",
      description:
        "No active debt recorded. Keep your cash flow protected.",
      ctaLabel: "No debt",
      state: "ready",
    },
  };

  const registeredCards = getEnabledCarouselItems({
    profileData,
    featureFlags,
    includeLocked,
  });

  return registeredCards.map((item) => ({
    ...item,
    data: dataByType[item.type] || {},
  }));
};
