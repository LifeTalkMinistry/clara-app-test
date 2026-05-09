import { useMemo } from "react";

export default function useDashboardSelectedBudgetState({
  financeForm = {},
  manualExpenseBudgetOptions = [],
} = {}) {
  const selectedManualExpenseBudget = useMemo(
    () =>
      (Array.isArray(manualExpenseBudgetOptions)
        ? manualExpenseBudgetOptions
        : []
      ).find((item) => String(item.key) === String(financeForm.budgetListKey)) ||
      null,
    [financeForm.budgetListKey, manualExpenseBudgetOptions]
  );

  const selectedBudgetListLabel = useMemo(() => {
    if (financeForm.budgetListKey === "__unplanned__") return "Unplanned Spending";
    if (financeForm.budgetListKey === "__undocumented__") {
      return "Undocumented Spending";
    }
    return selectedManualExpenseBudget?.title || "Select budget list";
  }, [financeForm.budgetListKey, selectedManualExpenseBudget?.title]);

  return {
    selectedManualExpenseBudget,
    selectedBudgetListLabel,
  };
}
