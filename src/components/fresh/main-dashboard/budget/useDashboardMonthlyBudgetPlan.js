import { useMemo } from "react";
import {
  budgetExpenseIsolationKey,
  readBudgetExpenseBaselineKeys,
} from "@/lib/budgetExpenseIsolation";
import useDashboardMonthlyBudgetPlanCore from "./useDashboardMonthlyBudgetPlanCore";

export default function useDashboardMonthlyBudgetPlan(options = {}) {
  const expenses = Array.isArray(options?.expenses) ? options.expenses : [];
  const baselineSignature = readBudgetExpenseBaselineKeys(options?.monthlyBudgetHeader).join("\u001f");

  const freshSessionExpenses = useMemo(() => {
    if (!baselineSignature) return expenses;

    const baseline = new Set(baselineSignature.split("\u001f").filter(Boolean));
    return expenses.filter((expense) => !baseline.has(budgetExpenseIsolationKey(expense)));
  }, [baselineSignature, expenses]);

  return useDashboardMonthlyBudgetPlanCore({
    ...options,
    expenses: freshSessionExpenses,
  });
}
