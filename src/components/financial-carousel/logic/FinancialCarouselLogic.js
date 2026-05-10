import {
  DEFAULT_FINANCIAL_CARD_KEY,
  getRegisteredFinancialCards,
} from "./FinancialCardRegistry";
import {
  normalizeCarouselBudgetPlan,
  readCarouselNumber,
} from "./financeCarouselDataHelpers";

export const getEnabledCarouselItems = (options = {}) =>
  getRegisteredFinancialCards(options);

export const getDefaultCarouselIndex = (items = []) => {
  const index = items.findIndex(
    (item) => item?.key === DEFAULT_FINANCIAL_CARD_KEY
  );

  return index >= 0 ? index : 0;
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
      : readCarouselNumber(
          profileData?.monthly_survival_expense,
          profileData?.survival_expense,
          profileData?.clara_survival_expense,
          survivalExpense
        ) > 0);

  const budgetData = normalizeCarouselBudgetPlan(monthlyBudgetPlan || {});

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
      state: "ready",
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
