import {
  cleanManualExpenseAmount,
  normalizeManualExpenseValue,
} from "../utils/manualExpenseHelpers";

export const validateManualExpenseForm = ({
  financeForm,
  isUnplanned = false,
  isUndocumented = false,
}) => {
  const amount = cleanManualExpenseAmount(financeForm?.amount);

  const hasBudget = Boolean(financeForm?.budgetListKey);
  const hasWallet = Boolean(financeForm?.expenseWalletId);

  const unplannedReason = normalizeManualExpenseValue(
    financeForm?.unplannedReason || financeForm?.notes
  );

  const undocumentedReason = normalizeManualExpenseValue(
    financeForm?.undocumentedReason
  );

  return {
    valid:
      amount > 0 &&
      hasBudget &&
      hasWallet &&
      (!isUnplanned || Boolean(unplannedReason)) &&
      (!isUndocumented || Boolean(undocumentedReason)),
    amount,
  };
};

export const buildManualExpensePayload = ({
  financeForm,
  planningStatus = "planned",
}) => ({
  ...financeForm,
  amount: cleanManualExpenseAmount(financeForm?.amount),
  planning_status: planningStatus,
});
