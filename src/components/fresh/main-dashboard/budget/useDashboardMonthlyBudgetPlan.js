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
  return useMemo(
    () =>
      buildDashboardMonthlyBudgetPlan({
        manualExpenseBudgetOptions,
        expenses,
        declaredMonthlyBudgetAmount,
        budgetCycleHeader,
        monthlyBudgetHeader,
      }),
    [
      budgetCycleHeader,
      declaredMonthlyBudgetAmount,
      expenses,
      manualExpenseBudgetOptions,
      monthlyBudgetHeader,
    ]
  );
}
