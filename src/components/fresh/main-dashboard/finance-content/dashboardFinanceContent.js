export const hasDashboardFinanceContent = (snapshot = {}) =>
  Boolean(
    (Array.isArray(snapshot.wallets) && snapshot.wallets.length > 0) ||
      (Array.isArray(snapshot.expenses) && snapshot.expenses.length > 0) ||
      (Array.isArray(snapshot.budgets) && snapshot.budgets.length > 0) ||
      (Array.isArray(snapshot.savingsGoals) && snapshot.savingsGoals.length > 0) ||
      (Array.isArray(snapshot.walletTransactions) && snapshot.walletTransactions.length > 0) ||
      snapshot.emergencyFund ||
      Number(snapshot.walletMoney || 0) > 0
  );
