import { useCallback, useEffect, useRef } from "react";
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import {
  firstValidNumber,
  getBudgetListTitle,
  getBudgetNeedType,
  getBudgetTotal,
  getPHMonthKey,
  getPHMonthRange,
  getSavingsSaved,
  getSavingsTarget,
  getTransactionDate,
  getWalletDisplayBalance,
  getWalletSortOrder,
  isInPHRange,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardFinanceActionHandlers({
  activeBudget,
  addBudgetData,
  addExpenseData,
  addIncomeData,
  addSavingsGoalData,
  addWalletData,
  budgetExitConfirm,
  budgetPlanIsComplete,
  budgets,
  declaredMonthlyBudgetAmount,
  deleteBudgetData,
  deleteSavingsGoalData,
  deleteWalletData,
  expenses,
  financeActionLoading,
  financeForm,
  financeModal,
  fmt,
  manualExpenseBudgetOptions,
  monthlyBudgetHeader,
  monthlyBudgetPlan,
  navigate,
  refreshFinancialData,
  savingsGoals,
  setBudgetExitConfirm,
  setBudgetListOpen,
  setBudgets,
  setExpandedFinanceCard,
  setFinanceActionLoading,
  setFinanceForm,
  setFinanceModal,
  setFinanceNotice,
  setShowAiAssistant,
  transferBetweenWalletsData,
  updateBudgetData,
  updateSavingsGoalData,
  updateWalletData,
  user,
  wallets,
  cacheKey,
  pendingExpenses,
  walletMoney,
  walletTransactions,
} = {}) {
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const showFinanceNotice = useCallback((message, type = "error") => {
    setFinanceNotice({ message, type });
  }, []);

  const closeFinanceNotice = useCallback(() => {
    setFinanceNotice(null);
  }, []);

  const closeFinanceModal = useCallback(() => {
    setBudgetExitConfirm(false);
    setBudgetListOpen(false);
    setFinanceModal({ type: null, payload: null });
  }, []);

  const openCreateWalletModal = useCallback(() => {
    setFinanceForm({
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
    setFinanceModal({ type: "create_wallet", payload: null });
  }, []);

  const openDeleteWalletModal = useCallback((walletId) => {
    const wallet = wallets.find((item) => String(item.id) === String(walletId)) || null;
    setFinanceModal({ type: "delete_wallet", payload: wallet });
  }, [wallets]);

  const openAddMoneyModal = useCallback((wallet) => {
    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
    }));
    setFinanceModal({ type: "add_money", payload: wallet });
  }, []);

  const openTransferMoneyModal = useCallback((fromWallet) => {
    const destinationOptions = wallets.filter(
      (wallet) => String(wallet.id) !== String(fromWallet?.id)
    );

    if (destinationOptions.length < 1) {
      showFinanceNotice("Create another wallet first before transferring.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      destinationWalletId: String(destinationOptions[0]?.id || ""),
    }));
    setFinanceModal({ type: "transfer_money", payload: fromWallet });
  }, [wallets, showFinanceNotice]);

  const openManualExpenseModal = useCallback(() => {
    if (!wallets.length) {
      showFinanceNotice("Create or fund a wallet first before logging an expense.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      budgetListKey: "",
      expenseWalletId: String(wallets[0]?.id || ""),
      unplannedReason: "",
      undocumentedReason: "",
      undocumentedNote: "",
      notes: "",
    }));
    setBudgetListOpen(false);
    setFinanceModal({ type: "manual_expense", payload: null });
  }, [showFinanceNotice, wallets]);

  const getClaraAiOrbButtonFromEvent = useCallback((event) => {
    const target = event?.target;
    if (!target?.closest) return null;

    const emergencyCard = target.closest("[data-emergency-card]");
    if (!emergencyCard) return null;

    const button = target.closest("button");
    if (!button || !emergencyCard.contains(button)) return null;

    const buttonSignature = [
      button.getAttribute?.("aria-label"),
      button.getAttribute?.("title"),
      button.textContent,
    ]
      .map((value) => normalizeLower(value))
      .filter(Boolean)
      .join(" ");

    if (
      buttonSignature.includes("clara ai") ||
      buttonSignature.includes("clara") ||
      buttonSignature.includes("assistant") ||
      buttonSignature.includes("ask")
    ) {
      return button;
    }

    return null;
  }, []);

  const isClaraAiOrbEvent = useCallback((event) => {
    return Boolean(getClaraAiOrbButtonFromEvent(event));
  }, [getClaraAiOrbButtonFromEvent]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openClaraAiFromLongPress = useCallback(() => {
    setShowAiAssistant(true);
  }, []);

  const startClaraAiLongPress = useCallback((event) => {
    if (!isClaraAiOrbEvent(event)) return;

    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openClaraAiFromLongPress();
    }, 550);
  }, [clearLongPressTimer, isClaraAiOrbEvent, openClaraAiFromLongPress]);

  const endClaraAiLongPress = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleClaraAiOrbClickCapture = useCallback((event) => {
    if (!isClaraAiOrbEvent(event)) return false;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return true;
    }

    openManualExpenseModal();
    return true;
  }, [isClaraAiOrbEvent, openManualExpenseModal]);


  const stopMoneyLeftOrbEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const startMoneyLeftOrbLongPress = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openClaraAiFromLongPress();
    }, 550);
  }, [clearLongPressTimer, openClaraAiFromLongPress, stopMoneyLeftOrbEvent]);

  const endMoneyLeftOrbLongPress = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);
    clearLongPressTimer();
  }, [clearLongPressTimer, stopMoneyLeftOrbEvent]);

  const handleMoneyLeftOrbClick = useCallback((event) => {
    stopMoneyLeftOrbEvent(event);

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    openManualExpenseModal();
  }, [openManualExpenseModal, stopMoneyLeftOrbEvent]);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  useEffect(() => {
    const handleOpenAssistant = (event) => {
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      setShowAiAssistant(true);
    };

    window.addEventListener("clara:open-assistant", handleOpenAssistant, true);

    return () => {
      window.removeEventListener("clara:open-assistant", handleOpenAssistant, true);
    };
  }, []);

  const openBudgetModal = useCallback((budgetCategory = null) => {
    const item = budgetCategory?.budget || budgetCategory || null;
    const declaredAmount = firstValidNumber(
      monthlyBudgetPlan?.declared_budget,
      monthlyBudgetPlan?.declared_amount,
      declaredMonthlyBudgetAmount
    );

    setBudgetExitConfirm(false);
    setFinanceForm((prev) => ({
      ...prev,
      monthlyBudgetAmount: declaredAmount > 0 ? String(declaredAmount) : "",
      title: item ? getBudgetListTitle(item) : "",
      budgetCategoryName: item ? getBudgetListTitle(item) : "",
      totalBudget: item ? String(getBudgetTotal(item)) : "",
      needsPct: String(item?.needs_pct ?? item?.needs_percent ?? 50),
      wantsPct: String(item?.wants_pct ?? item?.wants_percent ?? 30),
      otherPct: String(item?.other_pct ?? item?.other_percent ?? 20),
    }));
    setFinanceModal({ type: "save_budget", payload: item || null });
  }, [declaredMonthlyBudgetAmount, monthlyBudgetPlan?.declared_amount, monthlyBudgetPlan?.declared_budget]);

  const openDeleteBudgetCategoryModal = useCallback((budgetCategory = null) => {
    const item = budgetCategory?.budget || budgetCategory || null;
    if (!item?.id) return;
    setFinanceModal({ type: "delete_budget_category", payload: item });
  }, []);

  const openResetBudgetModal = useCallback(() => {
    if (!activeBudget?.id) return;
    setFinanceModal({ type: "reset_budget", payload: activeBudget });
  }, [activeBudget]);

  const openSavingsGoalModal = useCallback(
    (goal = null) => {
      if (goal?.id) {
        navigate("/savings-goals", {
          state: {
            editGoalId: String(goal.id),
            focusGoalId: String(goal.id),
          },
        });
        return;
      }

      navigate("/savings-goals", {
        state: {
          openCreateSavingsGoal: true,
        },
      });
    },
    [navigate]
  );

  const openDeleteSavingsGoalModal = useCallback((goalId) => {
    const goal = savingsGoals.find((item) => String(item.id) === String(goalId)) || null;
    setFinanceModal({ type: "delete_savings_goal", payload: goal });
  }, [savingsGoals]);

  const openAddSavingsModal = useCallback((goal) => {
    const compatibleWallets = wallets.filter((wallet) => getWalletDisplayBalance(wallet) > 0);

    if (!compatibleWallets.length) {
      showFinanceNotice("Add balance to a wallet first before funding a goal.");
      return;
    }

    setFinanceForm((prev) => ({
      ...prev,
      amount: "",
      savingsWalletId: String(compatibleWallets[0]?.id || ""),
    }));
    setFinanceModal({ type: "add_savings", payload: goal });
  }, [wallets, showFinanceNotice]);

  useEffect(() => {
    window.addEventListener("clara:open-manual-expense", openManualExpenseModal);
    return () => window.removeEventListener("clara:open-manual-expense", openManualExpenseModal);
  }, [openManualExpenseModal]);


  const refreshFinanceSection = useCallback(async () => {
    await refreshFinancialData?.();
    dispatchClaraEvent("clara-finance-updated");
  }, [refreshFinancialData]);

  const moveWalletInline = useCallback(
    async (walletId, direction) => {
      if (financeActionLoading) return;

      const orderedWallets = [...wallets].sort((a, b) => {
        const aIndex = wallets.findIndex((wallet) => String(wallet.id) === String(a.id));
        const bIndex = wallets.findIndex((wallet) => String(wallet.id) === String(b.id));
        return getWalletSortOrder(a, aIndex) - getWalletSortOrder(b, bIndex);
      });

      const fromIndex = orderedWallets.findIndex(
        (wallet) => String(wallet.id) === String(walletId)
      );

      if (fromIndex === -1) return;

      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= orderedWallets.length) return;

      [orderedWallets[fromIndex], orderedWallets[toIndex]] = [
        orderedWallets[toIndex],
        orderedWallets[fromIndex],
      ];

      try {
        setFinanceActionLoading(true);

        await Promise.all(
          orderedWallets.map((wallet, index) =>
            updateWalletData?.(String(wallet.id), { sort_order: index })
          )
        );

        await refreshFinanceSection();
      } catch (error) {
        showFinanceNotice(error?.message || "Failed to reorder wallets.");
      } finally {
        setFinanceActionLoading(false);
      }
    },
    [financeActionLoading, refreshFinanceSection, showFinanceNotice, wallets]
  );

  const createWalletInline = useCallback(async () => {
    const name = normalizeString(financeForm.name);
    const selectedWalletType = normalizeString(financeForm.type) || "cash";
    const customWalletType = normalizeString(financeForm.customWalletType);
    const type =
      selectedWalletType === "custom" ? customWalletType || "other" : selectedWalletType;
    const startingBalance = Number(financeForm.startingBalance);

    if (!name) {
      showFinanceNotice("Please enter a wallet name.");
      return;
    }

    if (!type) {
      showFinanceNotice("Please enter a wallet type.");
      return;
    }

    if (!Number.isFinite(startingBalance) || startingBalance < 0) {
      showFinanceNotice("Please enter a valid starting balance.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await addWalletData?.({
        name,
        type,
        balance: startingBalance,
        starting_balance: startingBalance,
        sort_order: wallets.length,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await refreshFinanceSection();
      setExpandedFinanceCard("wallets");
      closeFinanceModal();
      showFinanceNotice("Wallet created successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to create wallet.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.customWalletType,
    financeForm.name,
    financeForm.startingBalance,
    financeForm.type,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    wallets.length,
    addWalletData,
  ]);

  const deleteWalletInline = useCallback(async () => {
    const walletId = financeModal?.payload?.id;
    if (!walletId) return;

    try {
      setFinanceActionLoading(true);
      await deleteWalletData?.(walletId);

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Wallet deleted.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to delete wallet.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, financeModal?.payload?.id, refreshFinanceSection, showFinanceNotice, deleteWalletData]);

  const saveManualExpenseInline = useCallback(async () => {
    const amount = Number(financeForm.amount);
    const wallet = wallets.find(
      (item) => String(item.id) === String(financeForm.expenseWalletId)
    );
    const isUnplanned = financeForm.budgetListKey === "__unplanned__";
    const isUndocumented = financeForm.budgetListKey === "__undocumented__";
    const selectedBudget = manualExpenseBudgetOptions.find(
      (item) => String(item.key) === String(financeForm.budgetListKey)
    );
    const reason = normalizeString(financeForm.unplannedReason || financeForm.notes);
    const undocumentedReason = normalizeString(financeForm.undocumentedReason);
    const undocumentedNote = normalizeString(financeForm.undocumentedNote);
    const undocumentedFallbackNote = normalizeString(
      [undocumentedReason, undocumentedNote].filter(Boolean).join(" — ")
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid expense amount.");
      return;
    }

    if (!financeForm.budgetListKey) {
      showFinanceNotice("Please select a budget list item.");
      return;
    }

    if (!wallet) {
      showFinanceNotice("Please select a valid wallet.");
      return;
    }

    if (getWalletDisplayBalance(wallet) < amount) {
      showFinanceNotice("Insufficient balance in the selected wallet.");
      return;
    }

    if (isUnplanned && !reason) {
      showFinanceNotice("Please explain the purpose before logging this unplanned expense.");
      return;
    }

    if (isUndocumented && !undocumentedReason) {
      showFinanceNotice("Please select why this spending is undocumented.");
      return;
    }

    if (!isUnplanned && !isUndocumented && !budgetPlanIsComplete) {
      showFinanceNotice("You haven’t completed your monthly budgeting plan yet. Finish assigning your budget before logging planned expenses.");
      return;
    }

    if (!isUnplanned && !isUndocumented && !selectedBudget) {
      showFinanceNotice("Please select a valid budget list item.");
      return;
    }

    try {
      setFinanceActionLoading(true);

      const nowIso = new Date().toISOString();
      const budgetCategory = isUnplanned
        ? "Unplanned Spending"
        : isUndocumented
          ? "Undocumented Spending"
          : selectedBudget.title;
      const needType = isUnplanned || isUndocumented ? "other" : selectedBudget.needType || "need";
      const planningStatus = isUnplanned ? "unplanned" : isUndocumented ? "undocumented" : "planned";
      const notesValue = isUnplanned ? reason : isUndocumented ? undocumentedFallbackNote : "";

      const expensePayload = {
        amount,
        wallet_id: wallet.id,
        category: budgetCategory,
        need_type: needType,
        planning_status: planningStatus,
        unplanned_reason: isUnplanned
          ? reason
          : isUndocumented
            ? undocumentedFallbackNote || "Undocumented Spending"
            : null,
        notes: notesValue,
        date: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      };

      const walletTransactionPayload = {
        wallet_id: wallet.id,
        type: "expense",
        amount,
        category: budgetCategory,
        need_type: needType,
        planning_status: planningStatus,
        unplanned_reason: expensePayload.unplanned_reason,
        source_type: "Manual Log Expense",
        notes: notesValue,
        details: {
          budget_category: budgetCategory,
          previous_balance: getWalletDisplayBalance(wallet),
          next_balance: getWalletDisplayBalance(wallet) - amount,
        },
        created_at: nowIso,
        updated_at: nowIso,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      };

      await addExpenseData?.(expensePayload);

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Expense logged successfully.", "success");
    } catch (error) {
      console.warn("CLARA manual expense save failed:", error);
      showFinanceNotice("CLARA could not save this expense yet. Please try again.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    budgetPlanIsComplete,
    closeFinanceModal,
    financeForm.amount,
    financeForm.budgetListKey,
    financeForm.expenseWalletId,
    financeForm.notes,
    financeForm.undocumentedNote,
    financeForm.undocumentedReason,
    financeForm.unplannedReason,
    cacheKey,
    manualExpenseBudgetOptions,
    pendingExpenses,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    walletMoney,
    walletTransactions,
    wallets,
    expenses,
    addExpenseData,
  ]);

  const addMoneyInline = useCallback(async () => {
    const wallet = financeModal?.payload;
    const amount = Number(financeForm.amount);

    if (!wallet) return;

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid amount.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await addIncomeData?.({
        wallet_id: wallet.id,
        type: "income",
        amount,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Money added successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to add money.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    addIncomeData,
  ]);

  const transferMoneyInline = useCallback(async () => {
    const fromWallet = financeModal?.payload;
    const destinationWallet = wallets.find(
      (wallet) => String(wallet.id) === String(financeForm.destinationWalletId)
    );
    const amount = Number(financeForm.amount);

    if (!fromWallet) return;

    if (!destinationWallet) {
      showFinanceNotice("Please select a valid destination wallet.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid amount.");
      return;
    }

    if (getWalletDisplayBalance(fromWallet) < amount) {
      showFinanceNotice("Insufficient balance in the source wallet.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await transferBetweenWalletsData?.({
        from_wallet_id: fromWallet.id,
        to_wallet_id: destinationWallet.id,
        amount,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Transfer completed successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to transfer money.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeForm.destinationWalletId,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    wallets,
    transferBetweenWalletsData,
  ]);

  const syncBudgetRowsIntoState = useCallback((rows = []) => {
    const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
    if (!safeRows.length) return;

    setBudgets((previousBudgets) => {
      const safeBudgets = Array.isArray(previousBudgets) ? previousBudgets : [];
      const nextBudgets = [...safeBudgets];

      safeRows.forEach((row) => {
        const rowId = normalizeString(row?.id);
        const rowMonth = normalizeString(row?.month || row?.budget_month || row?.month_key || getPHMonthKey());
        const rowPlanType = normalizeLower(row?.plan_type || row?.type || "");
        const rowCategory = normalizeLower(row?.category || row?.budget_category || row?.title || row?.name || "");

        const existingIndex = nextBudgets.findIndex((budget) => {
          const budgetId = normalizeString(budget?.id);
          if (rowId && budgetId && rowId === budgetId) return true;

          const budgetMonth = normalizeString(budget?.month || budget?.budget_month || budget?.month_key || getPHMonthKey());
          const budgetPlanType = normalizeLower(budget?.plan_type || budget?.type || "");
          const budgetCategory = normalizeLower(budget?.category || budget?.budget_category || budget?.title || budget?.name || "");

          return (
            rowMonth === budgetMonth &&
            rowPlanType === budgetPlanType &&
            rowCategory === budgetCategory
          );
        });

        if (existingIndex >= 0) {
          nextBudgets[existingIndex] = {
            ...nextBudgets[existingIndex],
            ...row,
          };
        } else {
          nextBudgets.unshift(row);
        }
      });

      return nextBudgets;
    });
  }, []);

  const saveBudgetInline = useCallback(async ({ finish = false, exitAfterSave = false, saveCategory = true } = {}) => {
    const categoryName = normalizeString(financeForm.budgetCategoryName || financeForm.title);
    const categoryAmount = Number(financeForm.totalBudget);
    const declaredAmount = Number(financeForm.monthlyBudgetAmount);
    const existingCategory = financeModal?.payload || null;
    const monthKey = getPHMonthKey();
    const shouldSaveCategory = saveCategory && Boolean(categoryName || financeForm.totalBudget || existingCategory?.id);

    if (!Number.isFinite(declaredAmount) || declaredAmount <= 0) {
      showFinanceNotice("Please enter a valid declared monthly budget amount.");
      return false;
    }

    if (shouldSaveCategory && !categoryName) {
      showFinanceNotice("Please enter a budget category name.");
      return false;
    }

    if (shouldSaveCategory && (!Number.isFinite(categoryAmount) || categoryAmount <= 0)) {
      showFinanceNotice("Please enter a valid allocated amount.");
      return false;
    }

    const currentAllocated = firstValidNumber(monthlyBudgetPlan?.allocated_amount, monthlyBudgetPlan?.allocated_total);
    const existingAllocation = existingCategory?.id ? getBudgetTotal(existingCategory) : 0;
    const projectedAllocated = shouldSaveCategory
      ? currentAllocated - existingAllocation + categoryAmount
      : currentAllocated;
    const remainingToAllocate = Math.max(declaredAmount - (currentAllocated - existingAllocation), 0);
    const projectedUnallocated = Math.max(declaredAmount - projectedAllocated, 0);

    if (projectedAllocated > declaredAmount) {
      showFinanceNotice(
        `This exceeds your declared monthly budget. You only have ${fmt(remainingToAllocate)} left to allocate.`
      );
      return false;
    }

    if (finish && projectedUnallocated > 0) {
      showFinanceNotice(`Assign the remaining ${fmt(projectedUnallocated)} before completing your budget.`);
      return false;
    }

    if (finish && projectedAllocated !== declaredAmount) {
      showFinanceNotice("Finish Budget is only available when your unallocated balance is exactly ₱0.");
      return false;
    }

    try {
      setFinanceActionLoading(true);
      const nowIso = new Date().toISOString();
      const complete = finish && projectedAllocated === declaredAmount && projectedUnallocated === 0;
      const nextStatus = complete ? "active" : "draft";

      const headerPayload = {
        is_active: true,
        status: nextStatus,
        is_complete: complete,
        is_plan_header: true,
        plan_type: "monthly_budget",
        month: monthKey,
        category: "__monthly_budget__",
        budget_category: "__monthly_budget__",
        title: "Monthly Spending Plan",
        name: "Monthly Spending Plan",
        declared_amount: declaredAmount,
        declared_budget: declaredAmount,
        monthly_budget_amount: declaredAmount,
        total_budget: declaredAmount,
        updated_at: nowIso,
        user_id: user?.id || monthlyBudgetHeader?.user_id || null,
        user_email: user?.email || monthlyBudgetHeader?.user_email || monthlyBudgetHeader?.email || null,
        email: user?.email || monthlyBudgetHeader?.email || null,
        created_by: user?.email || monthlyBudgetHeader?.created_by || null,
      };

      if (monthlyBudgetHeader?.id) {
        await updateBudgetData?.(String(monthlyBudgetHeader.id), headerPayload);
      } else {
        await addBudgetData?.({
          ...headerPayload,
          tracking_start_date: nowIso,
          range_start: nowIso,
          created_at: nowIso,
        });
      }

      const optimisticBudgetRows = [
        {
          ...(monthlyBudgetHeader || {}),
          ...headerPayload,
          id: monthlyBudgetHeader?.id || `local_monthly_budget_${monthKey}`,
          created_at: monthlyBudgetHeader?.created_at || nowIso,
        },
      ];

      if (shouldSaveCategory) {
        const payload = {
          is_active: true,
          status: nextStatus,
          is_complete: complete,
          is_plan_header: false,
          plan_type: "budget_category",
          month: normalizeString(existingCategory?.month || existingCategory?.budget_month || monthKey) || monthKey,
          category: categoryName,
          budget_category: categoryName,
          title: categoryName,
          name: categoryName,
          allocated_amount: categoryAmount,
          budget_amount: categoryAmount,
          total_budget: categoryAmount,
          declared_amount: declaredAmount,
          declared_budget: declaredAmount,
          monthly_budget_amount: declaredAmount,
          need_type: getBudgetNeedType({ ...existingCategory, category: categoryName }),
          sort_order: firstValidNumber(existingCategory?.sort_order, existingCategory?.display_order, budgets.length + 1),
          updated_at: nowIso,
          user_id: user?.id || existingCategory?.user_id || null,
          user_email: user?.email || existingCategory?.user_email || existingCategory?.email || null,
          email: user?.email || existingCategory?.email || null,
          created_by: user?.email || existingCategory?.created_by || null,
        };

        if (existingCategory?.id) {
          await updateBudgetData?.(String(existingCategory.id), payload);
        } else {
          await addBudgetData?.({
            ...payload,
            tracking_start_date: nowIso,
            range_start: nowIso,
            created_at: nowIso,
          });
        }

        optimisticBudgetRows.push({
          ...(existingCategory || {}),
          ...payload,
          id: existingCategory?.id || `local_budget_category_${Date.now()}`,
          created_at: existingCategory?.created_at || nowIso,
        });
      }

      syncBudgetRowsIntoState(optimisticBudgetRows);

      if (complete && monthlyBudgetPlan.categories.length) {
        const categoryIds = monthlyBudgetPlan.categories.map((item) => item.id).filter(Boolean);
        if (categoryIds.length) {
          await Promise.all(
            categoryIds.map((id) =>
              updateBudgetData?.(String(id), {
                status: "active",
                is_complete: true,
                updated_at: nowIso,
              })
            )
          );
        }
      }

      await refreshFinanceSection();
      setExpandedFinanceCard("budgets");
      setBudgetExitConfirm(false);

      if (exitAfterSave || complete) {
        closeFinanceModal();
      } else {
        setFinanceModal({ type: "save_budget", payload: null });
        setFinanceForm((prev) => ({
          ...prev,
          title: "",
          budgetCategoryName: "",
          totalBudget: "",
          monthlyBudgetAmount: String(declaredAmount),
        }));
      }

      showFinanceNotice(
        complete
          ? "Budget completed. Planned expense logging is now unlocked."
          : shouldSaveCategory
            ? "Category saved as draft. Keep assigning the remaining budget."
            : "Budget draft saved. You can continue later.",
        "success"
      );
      return true;
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to save monthly budget plan.");
      return false;
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    budgets.length,
    closeFinanceModal,
    financeForm.budgetCategoryName,
    financeForm.monthlyBudgetAmount,
    financeForm.title,
    financeForm.totalBudget,
    financeModal?.payload,
    monthlyBudgetHeader,
    monthlyBudgetPlan?.allocated_amount,
    monthlyBudgetPlan?.allocated_total,
    monthlyBudgetPlan.categories,
    refreshFinanceSection,
    showFinanceNotice,
    syncBudgetRowsIntoState,
    addBudgetData,
    updateBudgetData,
    user?.email,
    user?.id,
  ]);

  const handleBudgetModalClose = useCallback(() => {
    const declaredAmount = firstValidNumber(financeForm.monthlyBudgetAmount, monthlyBudgetPlan.declared_budget);
    const isIncomplete =
      financeModal.type === "save_budget" &&
      declaredAmount > 0 &&
      !budgetPlanIsComplete;

    if (isIncomplete && !budgetExitConfirm) {
      setBudgetExitConfirm(true);
      return;
    }

    closeFinanceModal();
  }, [
    budgetExitConfirm,
    budgetPlanIsComplete,
    closeFinanceModal,
    financeForm.monthlyBudgetAmount,
    financeModal.type,
    monthlyBudgetPlan.declared_budget,
  ]);

  const deleteBudgetCategoryInline = useCallback(async () => {
    const item = financeModal?.payload || null;
    if (!item?.id) return;

    try {
      setFinanceActionLoading(true);
      const monthRange = getPHMonthRange();
      const categoryName = getBudgetListTitle(item);
      const linkedExpenseCount = expenses.filter((expense) => {
        const status = normalizeLower(expense?.planning_status);
        if (status && status !== "planned") return false;

        const expenseBudgetId = normalizeString(expense?.budget_category_id || expense?.budget_item_id || "");
        const expenseCategory = normalizeString(expense?.budget_category || expense?.expense_category || expense?.category || "");
        const linkedById = expenseBudgetId && expenseBudgetId === normalizeString(item.id);
        const linkedByCategory = normalizeLower(expenseCategory) === normalizeLower(categoryName);

        return (linkedById || linkedByCategory) && isInPHRange(getTransactionDate(expense), monthRange.start, monthRange.end);
      }).length;

      if (linkedExpenseCount > 0) {
        await updateBudgetData?.(String(item.id), {
          is_active: false,
          status: "inactive",
          updated_at: new Date().toISOString(),
        });
      } else {
        await deleteBudgetData?.(String(item.id));
      }

      await refreshFinanceSection();
      setExpandedFinanceCard("budgets");
      closeFinanceModal();
      showFinanceNotice(
        linkedExpenseCount > 0
          ? "Budget category has linked expenses, so it was deactivated."
          : "Budget category deleted.",
        "success"
      );
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to remove budget category.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    expenses,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
  ]);

  const resetBudgetInline = useCallback(async () => {
    const currentMonthKey = getPHMonthKey();
    const nowIso = new Date().toISOString();

    const declared = firstValidNumber(
      monthlyBudgetPlan?.declared_budget,
      monthlyBudgetPlan?.declared_amount,
      monthlyBudgetPlan?.declaredBudget,
      monthlyBudgetPlan?.declaredAmount,
      declaredMonthlyBudgetAmount,
      activeBudget?.declared_amount,
      activeBudget?.declared_budget,
      activeBudget?.monthly_budget_amount
    );

    const protectedAmount = firstValidNumber(
      monthlyBudgetPlan?.totalProtectedCommitments,
      monthlyBudgetPlan?.protected_commitments_total,
      monthlyBudgetPlan?.protectedBudgetCommitments?.totalProtectedCommitments,
      monthlyBudgetPlan?.protected_budget_commitments?.totalProtectedCommitments,
      monthlyBudgetPlan?.protected_budget_commitments?.total_protected_commitments
    );

    const headerRemaining = Math.max(declared - protectedAmount, 0);

    const headerResetPatch = {
      reset_start_at: nowIso,
      tracking_started_at: nowIso,
      tracking_start_date: nowIso,
      cycle_start: nowIso,
      period_start: nowIso,
      range_start: nowIso,

      spent: 0,
      spent_amount: 0,
      spent_total: 0,
      total_spent: 0,
      totalSpent: 0,

      planned_spent: 0,
      plannedSpent: 0,
      unplanned_spent: 0,
      unplannedSpent: 0,
      undocumented_spent: 0,
      undocumentedSpent: 0,

      remaining: headerRemaining,
      remaining_amount: headerRemaining,
      amount_left: headerRemaining,
      totalRemaining: headerRemaining,

      updated_at: nowIso,
    };

    const activeCategories = manualExpenseBudgetOptions.filter((item) => item?.id);

    if (!activeCategories.length && !monthlyBudgetHeader?.id) return;

    try {
      setFinanceActionLoading(true);

      const categoryPatchFor = (item) => {
        const allocated = firstValidNumber(
          item?.allocated,
          item?.allocated_amount,
          item?.budget_amount,
          item?.total_budget,
          item?.amount,
          item?.budget?.allocated_amount,
          item?.budget?.budget_amount,
          item?.budget?.total_budget,
          item?.budget?.amount
        );

        return {
          reset_start_at: nowIso,
          tracking_started_at: nowIso,
          tracking_start_date: nowIso,
          range_start: nowIso,

          spent: 0,
          spent_amount: 0,
          spent_total: 0,
          total_spent: 0,
          totalSpent: 0,
          used: 0,
          used_amount: 0,

          remaining: allocated,
          remaining_amount: allocated,
          amount_left: allocated,

          updated_at: nowIso,
        };
      };

      const updates = [];

      if (monthlyBudgetHeader?.id) {
        updates.push(updateBudgetData?.(String(monthlyBudgetHeader.id), headerResetPatch));
      }

      activeCategories.forEach((item) => {
        updates.push(updateBudgetData?.(String(item.id), categoryPatchFor(item)));
      });

      await Promise.all(updates.filter(Boolean));

      setBudgets((previousBudgets) => {
        const safeBudgets = Array.isArray(previousBudgets) ? previousBudgets : [];

        return safeBudgets.map((budget) => {
          const id = String(budget?.id || "");

          if (monthlyBudgetHeader?.id && id === String(monthlyBudgetHeader.id)) {
            return {
              ...budget,
              ...headerResetPatch,
            };
          }

          const matchingCategory = activeCategories.find(
            (item) => String(item.id || "") === id
          );

          if (matchingCategory) {
            return {
              ...budget,
              ...categoryPatchFor(matchingCategory),
            };
          }

          return budget;
        });
      });

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice(`Budget tracking has been reset for ${currentMonthKey}.`, "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to reset budget.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    activeBudget,
    closeFinanceModal,
    declaredMonthlyBudgetAmount,
    manualExpenseBudgetOptions,
    monthlyBudgetHeader,
    monthlyBudgetPlan,
    refreshFinanceSection,
    setBudgets,
    setFinanceActionLoading,
    showFinanceNotice,
    updateBudgetData,
  ]);

  const saveSavingsGoalInline = useCallback(async () => {
    const goal = financeModal?.payload || null;
    const title = normalizeString(financeForm.title);
    const targetAmount = Number(financeForm.targetAmount);

    if (!title) {
      showFinanceNotice("Please enter a goal title.");
      return;
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      showFinanceNotice("Please enter a valid target amount.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      const currentSavedAmount = Math.max(
        0,
        Number(financeForm.amount || goal?.saved_amount || goal?.current_amount || goal?.saved || 0)
      );
      const payload = {
        title,
        target_amount: targetAmount,
        saved_amount: currentSavedAmount,
        current_amount: currentSavedAmount,
        category: financeForm.category || "",
        subcategory: financeForm.subcategory || "",
        notes: financeForm.notes || "",
        wallet_id: financeForm.savingsWalletId || null,
        planned_use_date: financeForm.plannedUseDate || null,
        deadline: financeForm.plannedUseDate || null,
        reason_one: financeForm.reasonOne || "",
        reason_two: financeForm.reasonTwo || "",
        reason_three: financeForm.reasonThree || "",
        emotional_value: financeForm.emotionalValue || "joy",
        priority: financeForm.priority || "medium",
        flexibility: financeForm.flexibility || "flexible",
        created_by: user?.email || null,
        user_email: user?.email || null,
        user_id: user?.id || null,
        updated_date: new Date().toISOString(),
      };

      if (goal?.id) {
        await updateSavingsGoalData?.(String(goal.id), payload);
      } else {
        await addSavingsGoalData?.({
          id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          ...payload,
          created_date: new Date().toISOString(),
        });
      }

      await refreshFinanceSection();
      setExpandedFinanceCard("savings");
      closeFinanceModal();
      showFinanceNotice("Savings goal saved successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to save savings goal.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeForm.category,
    financeForm.emotionalValue,
    financeForm.flexibility,
    financeForm.notes,
    financeForm.plannedUseDate,
    financeForm.priority,
    financeForm.reasonOne,
    financeForm.reasonThree,
    financeForm.reasonTwo,
    financeForm.savingsWalletId,
    financeForm.subcategory,
    financeForm.targetAmount,
    financeForm.title,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    addSavingsGoalData,
    updateSavingsGoalData,
  ]);

  const deleteSavingsGoalInline = useCallback(async () => {
    const goalId = financeModal?.payload?.id;
    if (!goalId) return;

    try {
      setFinanceActionLoading(true);
      await deleteSavingsGoalData?.(String(goalId));

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Savings goal deleted.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to delete savings goal.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [closeFinanceModal, financeModal?.payload?.id, refreshFinanceSection, showFinanceNotice, deleteSavingsGoalData]);

  const addSavingsInline = useCallback(async () => {
    const goal = financeModal?.payload;
    const sourceWallet = wallets.find(
      (wallet) => String(wallet.id) === String(financeForm.savingsWalletId)
    );
    const amount = Number(financeForm.amount);

    if (!goal) return;

    if (!sourceWallet) {
      showFinanceNotice("Please select a valid source wallet.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice("Please enter a valid amount.");
      return;
    }

    const currentSaved = getSavingsSaved(goal);
    const target = getSavingsTarget(goal);
    const remaining = Math.max(target - currentSaved, 0);

    if (remaining <= 0) {
      showFinanceNotice("This goal is already fully funded.");
      return;
    }

    const finalAmount = Math.min(amount, remaining);

    if (getWalletDisplayBalance(sourceWallet) < finalAmount) {
      showFinanceNotice("Not enough balance in the selected wallet.");
      return;
    }

    try {
      setFinanceActionLoading(true);
      await addExpenseData?.({
        wallet_id: String(sourceWallet.id),
        type: "savings_goal",
        amount: finalAmount,
        category: "Savings Goal",
        need_type: "other",
        planning_status: "planned",
        notes: `Moved to savings goal: ${goal.title}`,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });

      await updateSavingsGoalData?.(String(goal.id), {
        saved_amount: Math.min(currentSaved + finalAmount, target),
        current_amount: Math.min(currentSaved + finalAmount, target),
        wallet_id: sourceWallet.id,
        updated_date: new Date().toISOString(),
      });

      await refreshFinanceSection();
      closeFinanceModal();
      showFinanceNotice("Savings added successfully.", "success");
    } catch (error) {
      showFinanceNotice(error?.message || "Failed to add savings.");
    } finally {
      setFinanceActionLoading(false);
    }
  }, [
    closeFinanceModal,
    financeForm.amount,
    financeForm.savingsWalletId,
    financeModal?.payload,
    refreshFinanceSection,
    showFinanceNotice,
    user?.email,
    user?.id,
    wallets,
    addExpenseData,
    updateSavingsGoalData,
  ]);

  return {
    showFinanceNotice,
    closeFinanceNotice,
    closeFinanceModal,
    openCreateWalletModal,
    openDeleteWalletModal,
    openAddMoneyModal,
    openTransferMoneyModal,
    openManualExpenseModal,
    getClaraAiOrbButtonFromEvent,
    isClaraAiOrbEvent,
    clearLongPressTimer,
    openClaraAiFromLongPress,
    startClaraAiLongPress,
    endClaraAiLongPress,
    handleClaraAiOrbClickCapture,
    stopMoneyLeftOrbEvent,
    startMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    handleMoneyLeftOrbClick,
    openBudgetModal,
    openDeleteBudgetCategoryModal,
    openResetBudgetModal,
    openSavingsGoalModal,
    openDeleteSavingsGoalModal,
    openAddSavingsModal,
    refreshFinanceSection,
    moveWalletInline,
    createWalletInline,
    deleteWalletInline,
    saveManualExpenseInline,
    addMoneyInline,
    transferMoneyInline,
    syncBudgetRowsIntoState,
    saveBudgetInline,
    handleBudgetModalClose,
    deleteBudgetCategoryInline,
    resetBudgetInline,
    saveSavingsGoalInline,
    deleteSavingsGoalInline,
    addSavingsInline,
  };
}
