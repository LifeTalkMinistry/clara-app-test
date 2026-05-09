import { useCallback } from "react";
import {
  firstValidNumber,
  getBudgetListTitle,
  getBudgetTotal,
  getWalletDisplayBalance,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardFinanceModalHandlers({
  activeBudget = null,
  declaredMonthlyBudgetAmount = 0,
  financeModal = { type: null, payload: null },
  monthlyBudgetPlan = null,
  navigate,
  savingsGoals = [],
  setBudgetExitConfirm,
  setBudgetListOpen,
  setFinanceForm,
  setFinanceModal,
  setFinanceNotice,
  wallets = [],
} = {}) {
  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];
  const safeSetBudgetExitConfirm =
    typeof setBudgetExitConfirm === "function" ? setBudgetExitConfirm : () => {};
  const safeSetBudgetListOpen =
    typeof setBudgetListOpen === "function" ? setBudgetListOpen : () => {};
  const safeSetFinanceForm =
    typeof setFinanceForm === "function" ? setFinanceForm : () => {};
  const safeSetFinanceModal =
    typeof setFinanceModal === "function" ? setFinanceModal : () => {};
  const safeSetFinanceNotice =
    typeof setFinanceNotice === "function" ? setFinanceNotice : () => {};
  const safeNavigate = typeof navigate === "function" ? navigate : () => {};

  const showFinanceNotice = useCallback(
    (message, type = "error") => {
      safeSetFinanceNotice({ message, type });
    },
    [safeSetFinanceNotice]
  );

  const closeFinanceNotice = useCallback(() => {
    safeSetFinanceNotice(null);
  }, [safeSetFinanceNotice]);

  const closeFinanceModal = useCallback(() => {
    safeSetBudgetExitConfirm(false);
    safeSetBudgetListOpen(false);
    safeSetFinanceModal({ type: null, payload: null });
  }, [safeSetBudgetExitConfirm, safeSetBudgetListOpen, safeSetFinanceModal]);

  const openCreateWalletModal = useCallback(() => {
    safeSetFinanceForm({
      name: "",
      type: "cash",
      customWalletType: "",
      startingBalance: "0",
      amount: "",
      destinationWalletId: "",
      totalBudget: "",
      needsPct: "50",
      wantsPct: "30",
      otherPct: "20",
      title: "",
      targetAmount: "",
      savingsWalletId: "",
      category: "",
      subcategory: "",
      plannedUseDate: "",
      reasonOne: "",
      reasonTwo: "",
      reasonThree: "",
      emotionalValue: "joy",
      priority: "medium",
      flexibility: "flexible",
      notes: "",
    });
    safeSetFinanceModal({ type: "create_wallet", payload: null });
  }, [safeSetFinanceForm, safeSetFinanceModal]);

  const openDeleteWalletModal = useCallback(
    (walletId) => {
      const wallet =
        safeWallets.find((item) => String(item.id) === String(walletId)) || null;
      safeSetFinanceModal({ type: "delete_wallet", payload: wallet });
    },
    [safeSetFinanceModal, safeWallets]
  );

  const openAddMoneyModal = useCallback(
    (wallet) => {
      safeSetFinanceForm((prev) => ({
        ...prev,
        amount: "",
      }));
      safeSetFinanceModal({ type: "add_money", payload: wallet });
    },
    [safeSetFinanceForm, safeSetFinanceModal]
  );

  const openTransferMoneyModal = useCallback(
    (fromWallet) => {
      const destinationOptions = safeWallets.filter(
        (wallet) => String(wallet.id) !== String(fromWallet?.id)
      );

      if (destinationOptions.length < 1) {
        showFinanceNotice("Create another wallet first before transferring.");
        return;
      }

      safeSetFinanceForm((prev) => ({
        ...prev,
        amount: "",
        destinationWalletId: String(destinationOptions[0]?.id || ""),
      }));
      safeSetFinanceModal({ type: "transfer_money", payload: fromWallet });
    },
    [safeSetFinanceForm, safeSetFinanceModal, safeWallets, showFinanceNotice]
  );

  const openManualExpenseModal = useCallback(() => {
    if (!safeWallets.length) {
      showFinanceNotice("Create or fund a wallet first before logging an expense.");
      return;
    }

    safeSetFinanceForm((prev) => ({
      ...prev,
      amount: "",
      budgetListKey: "",
      expenseWalletId: String(safeWallets[0]?.id || ""),
      unplannedReason: "",
      undocumentedReason: "",
      undocumentedNote: "",
      notes: "",
    }));
    safeSetBudgetListOpen(false);
    safeSetFinanceModal({ type: "manual_expense", payload: null });
  }, [
    safeSetBudgetListOpen,
    safeSetFinanceForm,
    safeSetFinanceModal,
    safeWallets,
    showFinanceNotice,
  ]);

  const openBudgetModal = useCallback(
    (budgetCategory = null) => {
      const item = budgetCategory?.budget || budgetCategory || null;
      const declaredAmount = firstValidNumber(
        monthlyBudgetPlan?.declared_budget,
        monthlyBudgetPlan?.declared_amount,
        declaredMonthlyBudgetAmount
      );

      safeSetBudgetExitConfirm(false);
      safeSetFinanceForm((prev) => ({
        ...prev,
        monthlyBudgetAmount: declaredAmount > 0 ? String(declaredAmount) : "",
        title: item ? getBudgetListTitle(item) : "",
        budgetCategoryName: item ? getBudgetListTitle(item) : "",
        totalBudget: item ? String(getBudgetTotal(item)) : "",
        needsPct: String(item?.needs_pct ?? item?.needs_percent ?? 50),
        wantsPct: String(item?.wants_pct ?? item?.wants_percent ?? 30),
        otherPct: String(item?.other_pct ?? item?.other_percent ?? 20),
      }));
      safeSetFinanceModal({ type: "save_budget", payload: item || null });
    },
    [
      declaredMonthlyBudgetAmount,
      monthlyBudgetPlan?.declared_amount,
      monthlyBudgetPlan?.declared_budget,
      safeSetBudgetExitConfirm,
      safeSetFinanceForm,
      safeSetFinanceModal,
    ]
  );

  const openDeleteBudgetCategoryModal = useCallback(
    (budgetCategory = null) => {
      const item = budgetCategory?.budget || budgetCategory || null;
      if (!item?.id) return;
      safeSetFinanceModal({ type: "delete_budget_category", payload: item });
    },
    [safeSetFinanceModal]
  );

  const openResetBudgetModal = useCallback(() => {
    if (!activeBudget?.id) return;
    safeSetFinanceModal({ type: "reset_budget", payload: activeBudget });
  }, [activeBudget, safeSetFinanceModal]);

  const openSavingsGoalModal = useCallback(
    (goal = null) => {
      if (goal?.id) {
        safeNavigate("/savings-goals", {
          state: {
            editGoalId: String(goal.id),
            focusGoalId: String(goal.id),
          },
        });
        return;
      }

      safeNavigate("/savings-goals", {
        state: {
          openCreateSavingsGoal: true,
        },
      });
    },
    [safeNavigate]
  );

  const openDeleteSavingsGoalModal = useCallback(
    (goalId) => {
      const goal =
        safeSavingsGoals.find((item) => String(item.id) === String(goalId)) || null;
      safeSetFinanceModal({ type: "delete_savings_goal", payload: goal });
    },
    [safeSavingsGoals, safeSetFinanceModal]
  );

  const openAddSavingsModal = useCallback(
    (goal) => {
      const compatibleWallets = safeWallets.filter(
        (wallet) => getWalletDisplayBalance(wallet) > 0
      );

      if (!compatibleWallets.length) {
        showFinanceNotice("Add balance to a wallet first before funding a goal.");
        return;
      }

      safeSetFinanceForm((prev) => ({
        ...prev,
        amount: "",
        savingsWalletId: String(compatibleWallets[0]?.id || ""),
      }));
      safeSetFinanceModal({ type: "add_savings", payload: goal });
    },
    [safeSetFinanceForm, safeSetFinanceModal, safeWallets, showFinanceNotice]
  );

  return {
    showFinanceNotice,
    closeFinanceNotice,
    closeFinanceModal,
    openCreateWalletModal,
    openDeleteWalletModal,
    openAddMoneyModal,
    openTransferMoneyModal,
    openManualExpenseModal,
    openBudgetModal,
    openDeleteBudgetCategoryModal,
    openResetBudgetModal,
    openSavingsGoalModal,
    openDeleteSavingsGoalModal,
    openAddSavingsModal,
  };
}
