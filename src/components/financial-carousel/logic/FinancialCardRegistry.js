export const DEFAULT_FINANCIAL_CARD_KEY = "wallet";

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
    default: true,
  },
  {
    key: "budget",
    type: "budget",
    label: "Weekly Cross-Check",
    enabled: false,
    order: 2,
    detailKey: "budgets",
    tone: "emerald",
    minimumPlan: "free",
    featureFlag: "budgets",
  },
  {
    key: "emergencyFund",
    type: "emergencyFund",
    label: "Emergency Fund",
    enabled: true,
    order: 3,
    detailKey: "emergency",
    tone: "teal",
    minimumPlan: "free",
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
    minimumPlan: "free",
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
    minimumPlan: "free",
    featureFlag: "debtObligations",
  },
];

// P0-F14: these registry entries are CLARA core product cards, not customer
// entitlements. A card may be removed from the product in code with enabled:
// false, but no user plan, subscription, beta state, support record, profile
// feature flag, or admin membership edit may independently lock it.
export const canUseFinancialCard = (card) => Boolean(card && card.enabled !== false);

export const getRegisteredFinancialCards = (options = {}) =>
  FINANCIAL_CARD_REGISTRY
    .filter((card) => canUseFinancialCard(card, options))
    .map((card) => ({
      ...card,
      locked: false,
    }))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

export const getDefaultFinancialCardKey = () => {
  const defaultCard = FINANCIAL_CARD_REGISTRY.find((card) => card.default === true);
  return defaultCard?.key || DEFAULT_FINANCIAL_CARD_KEY;
};
