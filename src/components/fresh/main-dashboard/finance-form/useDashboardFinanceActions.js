import { useCallback } from "react";
import createInitialFinanceForm from "@/components/fresh/main-dashboard/finance-form/financeFormInitialState";
import {
  firstValidNumber,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

const noop = () => {};
const maybeAsyncNoop = async () => null;

const getModalPayload = (financeModal) => financeModal?.payload || null;
const getPayloadId = (financeModal) => getModalPayload(financeModal)?.id || null;

export default function useDashboardFinanceActions({
  financeForm = {},
  financeModal = { type: null, payload: null },
  selectedManualExpenseBudget = null,
  manualExpenseIsUnplanned = false,
  manualExpenseIsUndocumented = false,
  manualExpenseReason = "",
  manualExpenseUndocumentedReason = "",
  monthlyBudgetPlan = null,
  addExpenseData = maybeAsyncNoop,
  updateExpenseData = maybeAsyncNoop,
  deleteExpenseData = maybeAsyncNoop,
  addWalletData = maybeAsyncNoop,
  updateWalletData = maybeAsyncNoop,
  deleteWalletData = maybeAsyncNoop,
  addIncomeData = maybeAsyncNoop,
  transferBetweenWalletsData = maybeAsyncNoop,
  addBudgetData = maybeAsyncNoop,
  updateBudgetData = maybeAsyncNoop,
  deleteBudgetData = maybeAsyncNoop,
  addSavingsGoalData = maybeAsyncNoop,
  updateSavingsGoalData = maybeAsyncNoop,
  deleteSavingsGoalData = maybeAsyncNoop,
  refreshFinancialData = maybeAsyncNoop,
  scheduleRefresh,
  closeFinanceModal = noop,
  showFinanceNotice = noop,
  setFinanceActionLoading = noop,
  setFinanceForm = noop,
  setBudgetExitConfirm = noop,
} = {}) {
  const refreshAfterFinanceAction = useCallback(async () => {
    if (typeof scheduleRefresh === "function") {
      await scheduleRefresh({ background: true });
      return;
    }

    if (typeof refreshFinancialData === "function") {
      await refreshFinancialData();
    }
  }, [refreshFinancialData, scheduleRefresh]);

  const runFinanceAction = useCallback(
    async ({
      action,
      successMessage,
      errorMessage = "CLARA could not save this change yet. Please try again.",
      closeAfterSuccess = true,
      resetFormAfterSuccess = false,
      refreshAfterSuccess = true,
    }) => {
      if (typeof action !== "function") return null;

      setFinanceActionLoading(true);

      try {
        const result = await action();

        if (successMessage) {
          showFinanceNotice(successMessage, "success");
        }

        if (resetFormAfterSuccess) {
          setFinanceForm(createInitialFinanceForm());
        }

        if (closeAfterSuccess) {
          closeFinanceModal();
        }

        if (refreshAfterSuccess) {
          await refreshAfterFinanceAction();
        }

        return result;
      } catch (error) {
        console.error(errorMessage, error);
        showFinanceNotice(errorMessage, "error");
        return null;
      } finally {
        setFinanceActionLoading(false);
      }
    },
    [
      closeFinanceModal,
      refreshAfterFinanceAction,
      setFinanceActionLoading,
      setFinanceForm,
      showFinanceNotice,
    ]
  );

  const saveManualExpenseInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Expense saved.",
        errorMessage: "CLARA could not save this expense yet.",
        resetFormAfterSuccess: true,
        action: async () => {
          const amount = firstValidNumber(financeForm.amount);
          const title = normalizeString(
            financeForm.title || financeForm.name || selectedManualExpenseBudget?.title
          );
          const note = normalizeString(
            manualExpenseIsUnplanned
              ? manualExpenseReason
              : manualExpenseIsUndocumented
                ? `${manualExpenseUndocumentedReason}${
                    financeForm.undocumentedNote
                      ? ` — ${financeForm.undocumentedNote}`
                      : ""
                  }`
                : financeForm.notes
          );

          const payload = {
            ...financeForm,
            amount,
            title: title || "Expense",
            wallet_id: financeForm.expenseWalletId || financeForm.wallet_id,
            walletId: financeForm.expenseWalletId || financeForm.walletId,
            budget_category_id: selectedManualExpenseBudget?.id || null,
            budget_category:
              selectedManualExpenseBudget?.title ||
              (manualExpenseIsUnplanned
                ? "Unplanned Spending"
                : manualExpenseIsUndocumented
                  ? "Undocumented Spending"
                  : financeForm.category),
            planning_status: manualExpenseIsUnplanned
              ? "unplanned"
              : manualExpenseIsUndocumented
                ? "undocumented"
                : "planned",
            notes: note,
          };

          if (getPayloadId(financeModal)) {
            return updateExpenseData(getPayloadId(financeModal), payload);
          }

          return addExpenseData(payload);
        },
      }),
    [
      addExpenseData,
      financeForm,
      financeModal,
      manualExpenseIsUndocumented,
      manualExpenseIsUnplanned,
      manualExpenseReason,
      manualExpenseUndocumentedReason,
      runFinanceAction,
      selectedManualExpenseBudget,
      updateExpenseData,
    ]
  );

  const addMoneyInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Money added.",
        errorMessage: "CLARA could not add this money yet.",
        resetFormAfterSuccess: true,
        action: async () =>
          addIncomeData({
            ...financeForm,
            amount: firstValidNumber(financeForm.amount),
            wallet_id: financeForm.walletId || financeForm.wallet_id,
            walletId: financeForm.walletId || financeForm.wallet_id,
            source: normalizeString(financeForm.source || financeForm.title || "Income"),
            notes: financeForm.notes || "",
          }),
      }),
    [addIncomeData, financeForm, runFinanceAction]
  );

  const transferMoneyInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Transfer saved.",
        errorMessage: "CLARA could not save this transfer yet.",
        resetFormAfterSuccess: true,
        action: async () =>
          transferBetweenWalletsData({
            ...financeForm,
            amount: firstValidNumber(financeForm.amount),
            from_wallet_id:
              financeForm.fromWalletId ||
              financeForm.sourceWalletId ||
              financeForm.transferSourceWalletId,
            to_wallet_id:
              financeForm.toWalletId ||
              financeForm.destinationWalletId ||
              financeForm.transferDestinationWalletId,
            notes: financeForm.notes || "",
          }),
      }),
    [financeForm, runFinanceAction, transferBetweenWalletsData]
  );

  const saveWalletInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: getPayloadId(financeModal) ? "Wallet updated." : "Wallet saved.",
        errorMessage: "CLARA could not save this wallet yet.",
        resetFormAfterSuccess: true,
        action: async () => {
          const payload = {
            ...financeForm,
            name: normalizeString(financeForm.name || financeForm.title || "Wallet"),
            balance: firstValidNumber(
              financeForm.balance,
              financeForm.amount,
              financeForm.currentBalance
            ),
          };

          if (getPayloadId(financeModal)) {
            return updateWalletData(getPayloadId(financeModal), payload);
          }

          return addWalletData(payload);
        },
      }),
    [addWalletData, financeForm, financeModal, runFinanceAction, updateWalletData]
  );

  const deleteWalletInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Wallet removed.",
        errorMessage: "CLARA could not remove this wallet yet.",
        action: async () => deleteWalletData(getPayloadId(financeModal)),
      }),
    [deleteWalletData, financeModal, runFinanceAction]
  );

  const saveBudgetInline = useCallback(
    async (options = {}) =>
      runFinanceAction({
        successMessage: options.finish ? "Budget finished." : "Budget saved.",
        errorMessage: "CLARA could not save this budget yet.",
        closeAfterSuccess: options.exitAfterSave !== false,
        resetFormAfterSuccess: options.exitAfterSave !== false,
        action: async () => {
          setBudgetExitConfirm(false);

          const payload = {
            ...financeForm,
            month:
              financeForm.month ||
              financeForm.month_key ||
              monthlyBudgetPlan?.monthKey ||
              monthlyBudgetPlan?.month_key,
            title: normalizeString(
              financeForm.budgetCategoryName || financeForm.title || financeForm.category
            ),
            category: normalizeString(
              financeForm.budgetCategoryName || financeForm.category || financeForm.title
            ),
            amount: firstValidNumber(
              financeForm.totalBudget,
              financeForm.budgetAmount,
              financeForm.amount
            ),
            monthly_budget_amount: firstValidNumber(
              financeForm.monthlyBudgetAmount,
              monthlyBudgetPlan?.declared_budget,
              monthlyBudgetPlan?.declaredBudget
            ),
            is_complete: Boolean(options.finish),
          };

          if (getPayloadId(financeModal)) {
            return updateBudgetData(getPayloadId(financeModal), payload);
          }

          return addBudgetData(payload);
        },
      }),
    [
      addBudgetData,
      financeForm,
      financeModal,
      monthlyBudgetPlan,
      runFinanceAction,
      setBudgetExitConfirm,
      updateBudgetData,
    ]
  );

  const deleteBudgetCategoryInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Budget category removed.",
        errorMessage: "CLARA could not remove this budget category yet.",
        action: async () => deleteBudgetData(getPayloadId(financeModal)),
      }),
    [deleteBudgetData, financeModal, runFinanceAction]
  );

  const resetBudgetInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Budget tracking reset.",
        errorMessage: "CLARA could not reset this budget yet.",
        action: async () => {
          const payload = getModalPayload(financeModal) || {};
          return updateBudgetData(payload.id, {
            ...payload,
            tracking_started_at: new Date().toISOString(),
          });
        },
      }),
    [financeModal, runFinanceAction, updateBudgetData]
  );

  const saveSavingsGoalInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: getPayloadId(financeModal)
          ? "Savings goal updated."
          : "Savings goal created.",
        errorMessage: "CLARA could not save this savings goal yet.",
        resetFormAfterSuccess: true,
        action: async () => {
          const payload = {
            ...financeForm,
            title: normalizeString(financeForm.title || "Savings Goal"),
            target_amount: firstValidNumber(
              financeForm.targetAmount,
              financeForm.target_amount
            ),
            saved_amount: firstValidNumber(
              financeForm.amount,
              financeForm.savedAmount,
              financeForm.saved_amount
            ),
          };

          if (getPayloadId(financeModal)) {
            return updateSavingsGoalData(getPayloadId(financeModal), payload);
          }

          return addSavingsGoalData(payload);
        },
      }),
    [
      addSavingsGoalData,
      financeForm,
      financeModal,
      runFinanceAction,
      updateSavingsGoalData,
    ]
  );

  const deleteSavingsGoalInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Savings goal deleted.",
        errorMessage: "CLARA could not delete this savings goal yet.",
        action: async () => deleteSavingsGoalData(getPayloadId(financeModal)),
      }),
    [deleteSavingsGoalData, financeModal, runFinanceAction]
  );

  const addSavingsInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Savings added.",
        errorMessage: "CLARA could not add this savings yet.",
        resetFormAfterSuccess: true,
        action: async () => {
          const payload = getModalPayload(financeModal) || {};
          const addedAmount = firstValidNumber(financeForm.amount);
          const currentSaved = firstValidNumber(
            payload.saved_amount,
            payload.savedAmount,
            payload.amount_saved,
            payload.current_amount
          );

          return updateSavingsGoalData(payload.id, {
            ...payload,
            saved_amount: currentSaved + addedAmount,
            last_added_amount: addedAmount,
            last_source_wallet_id:
              financeForm.savingsWalletId || financeForm.walletId || financeForm.wallet_id,
          });
        },
      }),
    [financeForm, financeModal, runFinanceAction, updateSavingsGoalData]
  );

  const deleteExpenseInline = useCallback(
    async () =>
      runFinanceAction({
        successMessage: "Expense deleted.",
        errorMessage: "CLARA could not delete this expense yet.",
        action: async () => deleteExpenseData(getPayloadId(financeModal)),
      }),
    [deleteExpenseData, financeModal, runFinanceAction]
  );

  return {
    refreshAfterFinanceAction,
    runFinanceAction,
    saveManualExpenseInline,
    addMoneyInline,
    transferMoneyInline,
    saveWalletInline,
    deleteWalletInline,
    saveBudgetInline,
    deleteBudgetCategoryInline,
    resetBudgetInline,
    saveSavingsGoalInline,
    deleteSavingsGoalInline,
    addSavingsInline,
    deleteExpenseInline,
  };
}
