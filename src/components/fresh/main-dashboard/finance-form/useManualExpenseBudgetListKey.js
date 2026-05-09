import { useCallback } from "react";

export default function useManualExpenseBudgetListKey({
  setFinanceForm,
  setBudgetListOpen,
}) {
  return useCallback(
    (nextValue) => {
      setFinanceForm((prev) => ({
        ...prev,
        budgetListKey: nextValue,
        unplannedReason:
          nextValue === "__unplanned__" ? prev.unplannedReason : "",
        undocumentedReason:
          nextValue === "__undocumented__" ? prev.undocumentedReason : "",
        undocumentedNote:
          nextValue === "__undocumented__" ? prev.undocumentedNote : "",
        notes:
          nextValue === "__unplanned__" || nextValue === "__undocumented__"
            ? prev.notes
            : "",
      }));
      setBudgetListOpen(false);
    },
    [setBudgetListOpen, setFinanceForm]
  );
}
