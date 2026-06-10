import { useMemo } from "react";
import { buildDashboardMonthlyBudgetPlan } from "@/lib/clara-budget-plan-calculator";

export { buildDashboardMonthlyBudgetPlan } from "@/lib/clara-budget-plan-calculator";

export default function useDashboardMonthlyBudgetPlan({
  manualExpenseBudgetOptions = [],
  expenses = [],
  declaredMonthlyBudgetAmount = 0,
  budgetCycleHeader = null,
  monthlyBudgetHeader = null,
} = {}) {
  const resolvedBudgetCycleHeader =
    budgetCycleHeader || manualExpenseBudgetOptions?.budgetCycleHeader || null;
  const resolvedMonthlyBudgetHeader =
    monthlyBudgetHeader || manualExpenseBudgetOptions?.monthlyBudgetHeader || null;

  return useMemo(
    () =>
      buildDashboardMonthlyBudgetPlan({
        manualExpenseBudgetOptions,
        expenses,
        declaredMonthlyBudgetAmount,
        budgetCycleHeader: resolvedBudgetCycleHeader,
        monthlyBudgetHeader: resolvedMonthlyBudgetHeader,
      }),
    [
      declaredMonthlyBudgetAmount,
      expenses,
      manualExpenseBudgetOptions,
      resolvedBudgetCycleHeader,
      resolvedMonthlyBudgetHeader,
    ]
  );
}
