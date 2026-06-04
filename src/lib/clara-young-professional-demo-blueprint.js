export const YOUNG_PROFESSIONAL_DEMO_BLUEPRINT = {
  incomeSources: [
    { key: "work_salary", name: "Work Salary", category: "Salary", stability: "Stable", monthlyAmounts: [32000, 32000, 32000, 32000, 32000] },
    { key: "small_side_hustle", name: "Small Side Hustle", category: "Side Hustle", stability: "Irregular", monthlyAmounts: [4000, 3500, 4200, 3800, 4500] },
    { key: "family_support", name: "Family Support", category: "Support / Remittance", stability: "Seasonal", monthlyAmounts: [2000, 0, 1500, 0, 2000] },
  ],
  wallets: [
    { key: "bdo", name: "BDO", type: "bank", balance: 22000 },
    { key: "gcash", name: "GCash", type: "e_wallet", balance: 10000 },
    { key: "cash", name: "Cash", type: "cash", balance: 6000 },
  ],
  budgets: [
    ["food", "Food", 8000],
    ["transportation", "Transportation", 3000],
    ["bills", "Bills", 4000],
    ["entertainment", "Entertainment", 2000],
    ["shopping", "Shopping", 2000],
    ["debt_payments", "Debt Payments", 2875],
    ["emergency_fund_contribution", "Emergency Fund Contribution", 2000],
    ["savings_contribution", "Savings Contribution", 3000],
    ["miscellaneous", "Miscellaneous", 2000],
  ],
  savingsGoals: [
    { key: "laptop_upgrade", title: "Laptop Upgrade Fund", targetAmount: 30000, savedAmount: 5000, monthlyContribution: 1000 },
    { key: "travel_fund", title: "Travel Fund", targetAmount: 15000, savedAmount: 3000, monthlyContribution: 600 },
    { key: "move_out_fund", title: "Move-Out Fund", targetAmount: 50000, savedAmount: 7000, monthlyContribution: 1400 },
  ],
  emergencyFund: { targetAmount: 50000, savedAmount: 4000, monthlyTarget: 2000, walletKey: "bdo" },
  obligations: [
    { key: "credit_card", name: "Credit Card", outstandingBalance: 8000, monthlyDue: 2000, status: "Current" },
    { key: "spaylater", name: "SPayLater", outstandingBalance: 3500, monthlyDue: 875, status: "Current" },
  ],
};
