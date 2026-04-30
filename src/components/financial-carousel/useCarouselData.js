import { useMemo } from "react";

const toNumber = (value) => {
  const number = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const sumByKeys = (items = [], keys = []) =>
  (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const value = keys.map((key) => toNumber(item?.[key])).find((num) => num > 0) || 0;
    return sum + value;
  }, 0);

const getFirstPositive = (...values) => values.map(toNumber).find((num) => num > 0) || 0;

export default function useCarouselData({
  monthlyBudgetPlan,
  savingsGoals = [],
  investmentFunds = [],
  debtObligations = [],
} = {}) {
  return useMemo(() => {
    const budgetTotal = getFirstPositive(
      monthlyBudgetPlan?.declared_budget,
      monthlyBudgetPlan?.declared_amount,
      monthlyBudgetPlan?.monthly_budget_amount,
      monthlyBudgetPlan?.allocated_amount,
      monthlyBudgetPlan?.allocated_total
    );
    const budgetSpent = getFirstPositive(
      monthlyBudgetPlan?.spent_amount,
      monthlyBudgetPlan?.spent,
      monthlyBudgetPlan?.total_spent
    );
    const budgetRemaining = Math.max(
      getFirstPositive(monthlyBudgetPlan?.remaining_amount, monthlyBudgetPlan?.remaining, budgetTotal - budgetSpent),
      0
    );

    const totalSavingsSaved = sumByKeys(savingsGoals, [
      "saved_amount",
      "current_amount",
      "saved",
      "progress_amount",
      "amount_saved",
    ]);
    const totalSavingsTarget = sumByKeys(savingsGoals, [
      "target_amount",
      "goal_amount",
      "target",
      "amount",
      "desired_amount",
    ]);

    const totalInvested = sumByKeys(investmentFunds, [
      "current_amount",
      "invested_amount",
      "saved_amount",
      "amount",
      "balance",
    ]);
    const investmentTarget = sumByKeys(investmentFunds, [
      "target_amount",
      "goal_amount",
      "target",
    ]);

    const debtTotal = sumByKeys(debtObligations, [
      "total_amount",
      "principal_amount",
      "amount",
      "balance",
    ]);
    const debtPaid = sumByKeys(debtObligations, [
      "paid_amount",
      "settled_amount",
      "amount_paid",
    ]);
    const debtRemaining = Math.max(debtTotal - debtPaid, 0);

    return {
      budget: {
        total: budgetTotal,
        spent: budgetSpent,
        remaining: budgetRemaining,
        status: monthlyBudgetPlan?.status || "",
        isComplete: monthlyBudgetPlan?.is_complete === true,
      },
      savingsGoals: {
        totalSaved: totalSavingsSaved,
        totalTarget: totalSavingsTarget,
        count: Array.isArray(savingsGoals) ? savingsGoals.length : 0,
      },
      investmentFund: {
        totalInvested,
        target: investmentTarget,
        count: Array.isArray(investmentFunds) ? investmentFunds.length : 0,
        isEmpty: !Array.isArray(investmentFunds) || investmentFunds.length === 0,
      },
      debtObligations: {
        total: debtTotal,
        paid: debtPaid,
        remaining: debtRemaining,
        count: Array.isArray(debtObligations) ? debtObligations.length : 0,
        isEmpty: !Array.isArray(debtObligations) || debtObligations.length === 0,
      },
    };
  }, [monthlyBudgetPlan, savingsGoals, investmentFunds, debtObligations]);
}
