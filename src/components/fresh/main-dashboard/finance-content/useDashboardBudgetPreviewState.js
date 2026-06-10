import { useMemo } from "react";
import { firstValidNumber, getBudgetSpent, getBudgetTotal } from "@/utils/dashboard/dashboardHelpers";
import {
  getBudgetCycleRange,
  isExpenseInBudgetCycle,
  selectDashboardBudgetHeaders,
} from "@/lib/clara-budget-cycle-authority";

export default function useDashboardBudgetPreviewState({
  budgets = [],
  expenses = [],
} = {}) {
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const { budgetCycleHeader, monthlyBudgetHeader } = useMemo(
    () => selectDashboardBudgetHeaders({ budgets: safeBudgets }),
    [safeBudgets]
  );

  const derivedActiveBudget = useMemo(() => {
    if (!monthlyBudgetHeader) return null;

    const cycleRange = getBudgetCycleRange(
      budgetCycleHeader || monthlyBudgetHeader
    );
    const spentFromExpenses = safeExpenses.reduce((sum, expense) => {
      if (!isExpenseInBudgetCycle(expense, cycleRange)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);
    const explicitSpent = getBudgetSpent(monthlyBudgetHeader);
    const spent = spentFromExpenses > 0 ? spentFromExpenses : explicitSpent;
    const total = getBudgetTotal(monthlyBudgetHeader);
    const remaining = Math.max(total - spent, 0);

    return {
      ...monthlyBudgetHeader,
      spent,
      spent_amount: spent,
      total_spent: spent,
      remaining,
      remaining_amount: remaining,
      amount_left: remaining,
      cycle_start: cycleRange.start,
      cycle_end: cycleRange.end,
      reset_start_at: budgetCycleHeader?.reset_start_at || null,
    };
  }, [budgetCycleHeader, monthlyBudgetHeader, safeExpenses]);

  return {
    budgetCycleHeader,
    activeBudget: monthlyBudgetHeader,
    derivedActiveBudget,
  };
}
