import { meetsFinancialPlanRequirement } from "./financialPlanAccess";

export const DEFAULT_FINANCIAL_CARD_KEY = "budget";

export const FINANCIAL_CARD_REGISTRY = [
  {
    key: "investmentFund",
    type: "investmentFund",
    label: "Income Hub",
    enabled: true,
    order: 0,
    detailKey: "investmentFund",
    tone: "cyan",
    minimumPlan: "free",
    featureFlag: "investmentFund",
  },
  {
    key: "wallet",
    type: "wallet",
    label: "Wallet Hub",
    enabled: true,
    order: 1,
    detailKey: "wallets",
    tone: "teal",
    minimumPlan: "free",
    featureFlag: "wallets",
  },
  {
    key: "budget",
    type: "budget",
    label: "Budget Hub",
    enabled: true,
    order: 2,
    detailKey: "budgets",
    tone: "emerald",
    minimumPlan: "free",
    featureFlag: "budgets",
    default: true,
  },
  {
    key: "emergencyFund",
    type: "emergencyFund",
    label: "Emergency Fund",
    enabled: true,
    order: 3,
    detailKey: "emergency",
    tone: "teal",
    minimumPlan: "pro",
    lockedTier: "PRO",
    featureFlag: "emergencyFund",
  },
  {
    key: "savingsGoals",
    type: "savingsGoals",
    label: "Savings Goals",
    enabled: true,
    order: 4,
    detailKey: "savings",
    tone: "blue",
    minimumPlan: "pro",
    lockedTier: "PRO",
    featureFlag: "savingsGoals",
  },
  {
    key: "debtObligations",
    type: "debtObligations",
    label: "Debt / Obligations",
    enabled: true,
    order: 5,
    detailKey: "debtObligations",
    tone: "rose",
    minimumPlan: "pro",
    lockedTier: "PRO",
    featureFlag: "debtObligations",
  },
];

export const canUseFinancialCard = (card, options = {}) => {
  if (!card || card.enabled === false) return false;

  const currentPlan = options.plan || options.profileData?.plan || options.profileData?.subscription_label || "free";
  const minimumPlan = card.minimumPlan || "free";

  if (!meetsFinancialPlanRequirement(currentPlan, minimumPlan)) {
    return options.includeLocked === true;
  }

  const featureFlags = options.featureFlags || options.profileData?.feature_flags || null;
  if (!featureFlags || !card.featureFlag) return true;

  if (featureFlags[card.featureFlag] === false) {
    return options.includeLocked === true;
  }

  return true;
};

export const getRegisteredFinancialCards = (options = {}) =>
  FINANCIAL_CARD_REGISTRY
    .filter((card) => canUseFinancialCard(card, options))
    .map((card) => ({
      ...card,
      locked: !canUseFinancialCard(card, { ...options, includeLocked: false }),
    }))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

export const getDefaultFinancialCardKey = () => {
  const defaultCard = FINANCIAL_CARD_REGISTRY.find((card) => card.default === true);
  return defaultCard?.key || DEFAULT_FINANCIAL_CARD_KEY;
};
