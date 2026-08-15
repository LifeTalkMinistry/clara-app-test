const toMoney = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function buildHomeSpendableMoneyProjection({
  spendableWalletBalance = 0,
  remainingBudget = 0,
  monthlyObligationPressure = 0,
  debtBudgetRemaining = 0,
} = {}) {
  const walletSpendable = Math.max(toMoney(spendableWalletBalance), 0);
  const budgetReserve = Math.max(toMoney(remainingBudget), 0);
  const unpaidObligationReserve = Math.max(toMoney(monthlyObligationPressure), 0);
  const debtAlreadyReservedByBudget = Math.max(toMoney(debtBudgetRemaining), 0);
  const debtReserveOutsideBudget = Math.max(
    unpaidObligationReserve - debtAlreadyReservedByBudget,
    0,
  );

  return {
    spendableWalletBalance: walletSpendable,
    remainingBudget: budgetReserve,
    monthlyObligationPressure: unpaidObligationReserve,
    debtBudgetRemaining: debtAlreadyReservedByBudget,
    debtReserveOutsideBudget,
    projectedSpendableMoney:
      walletSpendable - budgetReserve - debtReserveOutsideBudget,
  };
}

export default buildHomeSpendableMoneyProjection;
