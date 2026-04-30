export const carouselConfig = [
  {
    key: "budget",
    type: "budget",
    label: "Budget",
    enabled: true,
    order: 1,
    detailKey: "budgets",
    tone: "emerald",
  },
  {
    key: "emergencyFund",
    type: "emergencyFund",
    label: "Emergency Fund",
    enabled: true,
    order: 2,
    detailKey: "emergency",
    tone: "teal",
  },
  {
    key: "savingsGoals",
    type: "savingsGoals",
    label: "Savings Goals",
    enabled: true,
    order: 3,
    detailKey: "savings",
    tone: "blue",
  },
  {
    key: "investmentFund",
    type: "investmentFund",
    label: "Investment Fund",
    enabled: true,
    order: 4,
    detailKey: "investmentFund",
    tone: "gold",
  },
  {
    key: "debtObligations",
    type: "debtObligations",
    label: "Debt / Obligations",
    enabled: true,
    order: 5,
    detailKey: "debtObligations",
    tone: "rose",
  },
];

export const getEnabledCarouselItems = () =>
  carouselConfig
    .filter((item) => item.enabled !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
