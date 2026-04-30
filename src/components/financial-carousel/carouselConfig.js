export const carouselItems = [
  {
    key: "budget",
    type: "budget",
    label: "Budget",
    order: 1,
    enabled: true,
    dashboardKey: "budgets",
  },
  {
    key: "emergencyFund",
    type: "emergencyFund",
    label: "Emergency Fund",
    order: 2,
    enabled: true,
    dashboardKey: "emergency",
  },
  {
    key: "savingsGoals",
    type: "savingsGoals",
    label: "Savings Goals",
    order: 3,
    enabled: true,
    dashboardKey: "savings",
  },
  {
    key: "investmentFund",
    type: "investmentFund",
    label: "Investment Fund",
    order: 4,
    enabled: true,
    dashboardKey: "investmentFund",
  },
  {
    key: "debtObligations",
    type: "debtObligations",
    label: "Debt / Obligations",
    order: 5,
    enabled: true,
    dashboardKey: "debtObligations",
  },
];

export const getEnabledCarouselItems = () =>
  carouselItems
    .filter((item) => item.enabled !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
