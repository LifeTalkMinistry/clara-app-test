import { useMemo } from "react";
import { normalizeString } from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardManualExpenseValidation({ financeForm = {} } = {}) {
  return useMemo(() => {
    const manualExpenseIsUnplanned = financeForm.budgetListKey === "__unplanned__";
    const manualExpenseIsUndocumented =
      financeForm.budgetListKey === "__undocumented__";
    const manualExpenseReason = normalizeString(
      financeForm.unplannedReason || financeForm.notes
    );
    const manualExpenseUndocumentedReason = normalizeString(
      financeForm.undocumentedReason
    );
    const manualExpenseCanSubmit =
      Number(financeForm.amount) > 0 &&
      Boolean(financeForm.budgetListKey) &&
      Boolean(financeForm.expenseWalletId) &&
      (!manualExpenseIsUnplanned || Boolean(manualExpenseReason)) &&
      (!manualExpenseIsUndocumented || Boolean(manualExpenseUndocumentedReason));

    return {
      manualExpenseIsUnplanned,
      manualExpenseIsUndocumented,
      manualExpenseReason,
      manualExpenseUndocumentedReason,
      manualExpenseCanSubmit,
    };
  }, [
    financeForm.amount,
    financeForm.budgetListKey,
    financeForm.expenseWalletId,
    financeForm.notes,
    financeForm.undocumentedReason,
    financeForm.unplannedReason,
  ]);
}
