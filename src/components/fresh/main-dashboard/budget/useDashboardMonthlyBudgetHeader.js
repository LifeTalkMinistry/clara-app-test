import { useMemo } from "react";
import {
  firstValidNumber,
  getPHMonthKey,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";
import {
  getBudgetCycleEnd,
  getBudgetCycleStart,
  selectDashboardBudgetHeaders,
} from "@/lib/clara-budget-cycle-authority";

function getBudgetCycleType(budget) {
  return normalizeLower(
    budget?.budget_cycle ||
      budget?.cycle_type ||
      budget?.budget_rhythm ||
      budget?.period_type ||
      "monthly"
  );
}

function getBudgetCycleLabel(budget) {
  const type = getBudgetCycleType(budget);
  if (type === "weekly") return "Weekly";
  if (type === "biweekly" || type === "bi-weekly" || type === "2 weeks") {
    return "Bi-weekly";
  }
  if (type === "custom") return "Custom";
  return "Monthly";
}

export default function useDashboardMonthlyBudgetHeader({
  budgets = [],
  user = null,
} = {}) {
  const { budgetCycleHeader, monthlyBudgetHeader } = useMemo(
    () =>
      selectDashboardBudgetHeaders({
        budgets,
        currentMonthKey: getPHMonthKey(),
        user,
      }),
    [budgets, user]
  );

  const declaredMonthlyBudgetAmount = useMemo(() => {
    if (!monthlyBudgetHeader) return 0;

    return firstValidNumber(
      monthlyBudgetHeader?.declared_amount,
      monthlyBudgetHeader?.declared_budget,
      monthlyBudgetHeader?.monthly_budget_amount,
      monthlyBudgetHeader?.total_declared_budget,
      monthlyBudgetHeader?.total_budget,
      monthlyBudgetHeader?.budget_amount,
      monthlyBudgetHeader?.amount
    );
  }, [monthlyBudgetHeader]);

  const budgetCycle = useMemo(() => {
    const source = budgetCycleHeader || monthlyBudgetHeader;
    const start = getBudgetCycleStart(source);
    const end = getBudgetCycleEnd(source);

    return {
      type: getBudgetCycleType(source),
      label: getBudgetCycleLabel(source),
      start,
      end,
      hasCustomRange: Boolean(start || end),
    };
  }, [budgetCycleHeader, monthlyBudgetHeader]);

  return {
    budgetCycleHeader,
    monthlyBudgetHeader,
    declaredMonthlyBudgetAmount,
    budgetCycle,
  };
}
