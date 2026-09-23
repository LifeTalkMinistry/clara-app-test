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
  financeEmergencyFund = null,
  financeTotalIncome = 0,
  financeTotalExpenses = 0,
  financeTotalWalletBalance = 0,
  user = null,
  plan = null,
  guardChecked = false,
  loading = false,
  profileData = null,
  featureFlags = null,
  includeLocked = true,
} = {}) => {
  const budgetData = normalizeCarouselBudgetPlan(monthlyBudgetPlan || {});

  const safeSavingsGoals = Array.isArray(savingsGoals)
    ? savingsGoals.filter(
        (goal) => goal && !goal.deleted_at && !goal.deletedAt
      )
    : [];

  // Savings totals are aggregate data and must never outlive the goals they
  // describe. A deleted final goal can briefly leave stale parent totals in
  // memory; normalize the carousel boundary so an empty active-goal set is
  // always represented as zero savings/target and no primary goal.
  const hasActiveSavingsGoals = safeSavingsGoals.length > 0;
  const resolvedTotalSavingsSaved = hasActiveSavingsGoals
    ? totalSavingsSaved
    : 0;
  const resolvedTotalSavingsTarget = hasActiveSavingsGoals
    ? totalSavingsTarget
    : 0;
  const resolvedPrimarySavingsGoal = hasActiveSavingsGoals
    ? primarySavingsGoal
    : null;

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
      survivalExpense,
      emergencyFund: financeEmergencyFund,
    },

    savingsGoals: {
      savingsGoals: safeSavingsGoals,
      totalSavingsSaved: resolvedTotalSavingsSaved,
      totalSavingsTarget: resolvedTotalSavingsTarget,
      primarySavingsGoal: resolvedPrimarySavingsGoal,
    },

    investmentFund: {
      title: "Income Hub",
      amount: 0,
      subtitle: "Where your money comes",
      state: "ready",
    },

    debtObligations: {
      totalIncome: financeTotalIncome,
      totalExpenses: financeTotalExpenses,
      totalWalletBalance: financeTotalWalletBalance,
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
    plan: plan || user?.plan,
    profileData,
    featureFlags,
    includeLocked,
  });

  return registeredCards.map((item) => ({
    ...item,
    data: dataByType[item.type] || {},
  }));
};
