import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import WalletProviderPicker from "@/components/financial-carousel/cards/wallet/ui/WalletProviderPicker";
import {
  buildWalletProviderPayload,
  getWalletProvider,
  getWalletProviderFromWallet,
} from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import DashboardFinanceModalRendererWithIncomeFunding from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRendererWithIncomeFunding";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import useDashboardMonthlyBudgetPlan from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan";
import useDashboardFinanceOverviewState from "@/components/fresh/main-dashboard/finance-content/useDashboardFinanceOverviewState";
import {
  DASHBOARD_SCALE,
  useDashboardViewportMode,
} from "@/components/fresh/main-dashboard/dashboard-scale/dashboardScale";
import { readStoredSurvivalExpense } from "@/components/fresh/main-dashboard/dashboard-theme/dashboardThemeRuntime";
import DashboardMoneySummaryStable from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable";
import useDashboardMoneyLeftMetrics from "@/components/fresh/main-dashboard/money-summary/useDashboardMoneyLeftMetrics";
import useMoneySummaryVisibility from "@/components/fresh/main-dashboard/money-summary/useMoneySummaryVisibility";
import { formatPhpCurrency } from "@/components/fresh/main-dashboard/hooks/usePhpCurrencyFormatter";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import { completeMonthlyBudgetCycle } from "@/lib/clara-budget-cycle-reset";
import { buildBudgetCompletionSnapshot } from "@/lib/clara-budget-history";
import { isDebtCommitment } from "@/lib/clara-derived-budget";
import { buildHomeSpendableMoneyProjection } from "@/lib/clara-home-spendable-money";
import { getTotalWalletSpendableBalance } from "@/lib/clara-wallet-money-semantics";
import { useTheme } from "@/theme/ThemeProvider";
import {
  firstPositiveNumber,
  getWalletDisplayBalance,
  getWalletSortOrder,
  getWalletSpendableBalance,
} from "@/utils/dashboard/dashboardHelpers";

const EMPTY_WALLET_MODAL = { type: null, payload: null };

function createWalletForm() {
  return {
    name: "",
    type: "cash",
    customWalletType: "",
    startingBalance: "0",
    amount: "",
    destinationWalletId: "",
  };
}

function getWalletId(wallet) {
  return wallet?.id ?? wallet?.wallet_id ?? wallet?.local_id ?? null;
}

function getWalletName(wallet) {
  return String(
    wallet?.name || wallet?.wallet_name || wallet?.label || "Wallet"
  ).trim() || "Wallet";
}

function isManageableWallet(wallet) {
  return Boolean(
    wallet &&
      !wallet?.is_archived &&
      !wallet?.isArchived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  );
}

function walletLinkedFunds(wallet) {
  return Boolean(
    wallet?.isEmergencyFundStorageWallet ||
      wallet?.is_emergency_fund_storage_wallet ||
      wallet?.hasSavingsGoalAllocation ||
      wallet?.has_savings_goal_allocation ||
      Number(wallet?.savingsGoalCount || wallet?.savings_goal_count || 0) > 0
  );
}

function walletProtectedAmount(wallet) {
  const value = Number(
    wallet?.totalProtectedAmount ?? wallet?.total_protected_amount ?? 0
  );
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function getDebtBudgetRemaining(monthlyBudgetPlan = {}) {
  const rows = Array.isArray(monthlyBudgetPlan?.categories)
    ? monthlyBudgetPlan.categories
    : Array.isArray(monthlyBudgetPlan?.categoryRows)
      ? monthlyBudgetPlan.categoryRows
      : [];

  return rows.filter(isDebtCommitment).reduce((sum, row) => {
    const remaining = Number(
      row?.remaining ?? row?.remaining_amount ?? row?.amount_left ?? 0
    );
    return sum + (Number.isFinite(remaining) ? Math.max(remaining, 0) : 0);
  }, 0);
}

export default function CommunityHomeFinancialCarousel() {
  const navigate = useNavigate();
  const { selectedTheme: selectedDashboardTheme } = useTheme();
  const dashboardViewportMode = useDashboardViewportMode();
  const dashboardScale =
    DASHBOARD_SCALE[dashboardViewportMode] || DASHBOARD_SCALE.normal;
  const { user, plan } = useUserRole();
  const [expandedFinanceCard, setExpandedFinanceCard] = useState(null);
  const [walletModal, setWalletModal] = useState(EMPTY_WALLET_MODAL);
  const [walletForm, setWalletForm] = useState(createWalletForm);
  const [walletActionLoading, setWalletActionLoading] = useState(false);
  const [moneyLeftMode, setMoneyLeftMode] = useState("current");

  const financeCardController = useFinancialData(user);
  const {
    expenses = [],
    wallets = [],
    walletTransactions = [],
    budgets = [],
    savingsGoals = [],
    emergencyFund = null,
    totalIncome = 0,
    totalExpenses = 0,
    totalWalletBalance = 0,
    loading = false,
    refreshing = false,
    refreshData,
    updateBudget: updateBudgetData,
    updateWallet: updateWalletData,
    deleteWallet: deleteWalletData,
    addIncome: addIncomeData,
    transferBetweenWallets: transferBetweenWalletsData,
  } = financeCardController;

  const manageableWallets = useMemo(
    () => wallets.filter(isManageableWallet),
    [wallets]
  );

  const { monthlyBudgetHeader, declaredMonthlyBudgetAmount } =
    useDashboardMonthlyBudgetHeader({ budgets });

  const manualExpenseBudgetOptions =
    useDashboardManualExpenseBudgetOptions({ budgets });

  const monthlyBudgetPlan = useDashboardMonthlyBudgetPlan({
    manualExpenseBudgetOptions,
    expenses,
    declaredMonthlyBudgetAmount,
    monthlyBudgetHeader,
    savingsGoals,
    emergencyFund,
  });

  const {
    thisMonthSpent = 0,
    monthlyObligationPressure = 0,
  } = useDashboardMoneyLeftMetrics({
    expenses,
    walletTransactions,
    user,
  });

  const spendableWalletBalance = useMemo(
    () =>
      getTotalWalletSpendableBalance({
        wallets,
        emergencyFund,
        savingsGoals,
      }),
    [emergencyFund, savingsGoals, wallets]
  );

  const debtBudgetRemaining = useMemo(
    () => getDebtBudgetRemaining(monthlyBudgetPlan),
    [monthlyBudgetPlan]
  );

  const spendableMoneyProjection = useMemo(() => {
    const rawRemaining = Number(
      monthlyBudgetPlan?.remaining ?? monthlyBudgetPlan?.remaining_amount ?? 0
    );
    const remainingBudget = Number.isFinite(rawRemaining)
      ? Math.max(rawRemaining, 0)
      : 0;

    return buildHomeSpendableMoneyProjection({
      spendableWalletBalance,
      remainingBudget,
      monthlyObligationPressure,
      debtBudgetRemaining,
    });
  }, [
    debtBudgetRemaining,
    monthlyBudgetPlan?.remaining,
    monthlyBudgetPlan?.remaining_amount,
    monthlyObligationPressure,
    spendableWalletBalance,
  ]);

  const afterMonthlyBudgetMoney =
    spendableMoneyProjection.projectedSpendableMoney;
  const displayedMoneyLeft =
    moneyLeftMode === "projected" ? afterMonthlyBudgetMoney : totalWalletBalance;

  const {
    walletPreviewTransactions = [],
    totalSavingsTarget = 0,
    totalSavingsSaved = 0,
    primarySavingsGoal = null,
  } = useDashboardFinanceOverviewState({
    wallets,
    walletTransactions,
    budgets,
    expenses,
    savingsGoals,
  });

  const [moneySummaryVisible, toggleMoneySummaryVisibility] =
    useMoneySummaryVisibility();

  const survivalExpense = useMemo(
    () =>
      firstPositiveNumber(
        emergencyFund?.monthly_survival_cost,
        emergencyFund?.monthlySurvivalCost,
        emergencyFund?.survival_expense,
        emergencyFund?.survivalExpense,
        emergencyFund?.monthly_expense,
        emergencyFund?.monthlyExpense,
        readStoredSurvivalExpense(user?.id)
      ),
    [emergencyFund, user?.id]
  );

  // Home owns finance-card expansion. No expand/collapse interaction leaves the
  // Community shell or hands control back to retired Dashboard routes.
  const toggleHomeFinanceDetails = useCallback((cardKey, options = {}) => {
    if (!cardKey) return;
    const { forceOpen = false } = options || {};

    setExpandedFinanceCard((current) =>
      forceOpen ? cardKey : current === cardKey ? null : cardKey
    );
  }, []);

  const refreshFinanceSection = useCallback(async () => {
    await refreshData?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clara-finance-updated"));
      window.dispatchEvent(new CustomEvent("clara-wallets-updated"));
    }
  }, [refreshData]);

  const completeBudgetFromHome = useCallback(
    async (calculatedBudgetSnapshot = {}) => {
      if (!monthlyBudgetHeader?.id) {
        throw new Error("CLARA is still resolving the active budget. Please try again.");
      }
      if (typeof updateBudgetData !== "function") {
        throw new Error("CLARA is still loading this budget. Please try again.");
      }

      const completionSnapshot = buildBudgetCompletionSnapshot({
        header: monthlyBudgetHeader,
        categories: calculatedBudgetSnapshot?.categories,
        declared: calculatedBudgetSnapshot?.declared,
        allocated: calculatedBudgetSnapshot?.allocated,
        spent: calculatedBudgetSnapshot?.spent,
        remaining: calculatedBudgetSnapshot?.remaining,
        unallocated: calculatedBudgetSnapshot?.unallocated,
        unplannedSpent: calculatedBudgetSnapshot?.unplannedSpent,
        undocumentedSpent: calculatedBudgetSnapshot?.undocumentedSpent,
        outsidePlanItems: calculatedBudgetSnapshot?.outsidePlanItems,
      });

      const result = await completeMonthlyBudgetCycle({
        budgets,
        headerHint: monthlyBudgetHeader,
        completionSnapshot,
        updateBudget: updateBudgetData,
      });

      await refreshFinanceSection();
      return result;
    },
    [budgets, monthlyBudgetHeader, refreshFinanceSection, updateBudgetData]
  );

  const closeWalletModal = useCallback(() => {
    setWalletModal(EMPTY_WALLET_MODAL);
    setWalletForm(createWalletForm());
  }, []);

  const openCreateWallet = useCallback(() => {
    setWalletForm(createWalletForm());
    setWalletModal({ type: "create_wallet", payload: null });
  }, []);

  const openEditWallet = useCallback((wallet) => {
    if (!wallet) return;
    const provider = getWalletProviderFromWallet(wallet);
    setWalletForm({
      ...createWalletForm(),
      name: getWalletName(wallet),
      type: provider?.key || wallet?.type || "cash",
    });
    setWalletModal({ type: "edit_wallet", payload: wallet });
  }, []);

  const openAddMoney = useCallback((wallet) => {
    if (!wallet) return;
    setWalletForm({ ...createWalletForm(), amount: "" });
    setWalletModal({ type: "add_money", payload: wallet });
  }, []);

  const openTransferMoney = useCallback(
    (wallet) => {
      const walletId = getWalletId(wallet);
      const destination = manageableWallets.find(
        (item) => String(getWalletId(item)) !== String(walletId)
      );

      if (!destination) {
        toast.error("Create another wallet first before transferring.");
        return;
      }

      setWalletForm({
        ...createWalletForm(),
        amount: "",
        destinationWalletId: String(getWalletId(destination)),
      });
      setWalletModal({ type: "transfer_money", payload: wallet });
    },
    [manageableWallets]
  );

  const openDeleteWallet = useCallback((wallet) => {
    if (!wallet) return;
    setWalletModal({ type: "delete_wallet", payload: wallet });
  }, []);

  const editWalletInline = useCallback(async () => {
    if (walletActionLoading) return;
    const walletId = getWalletId(walletModal.payload);
    if (!walletId) return;

    const provider = getWalletProvider(
      walletForm.type,
      walletModal.payload?.type || "cash"
    );
    const name = String(walletForm.name || "").trim();

    if (!name) {
      toast.error("Please enter a wallet name.");
      return;
    }

    try {
      setWalletActionLoading(true);
      await updateWalletData?.(String(walletId), {
        name,
        type: provider.walletType || walletModal.payload?.type || "custom",
        ...buildWalletProviderPayload(provider.key),
        icon: provider.iconText || walletModal.payload?.icon || null,
        updated_at: new Date().toISOString(),
      });
      await refreshFinanceSection();
      closeWalletModal();
      toast.success("Wallet updated.");
    } catch (error) {
      toast.error(error?.message || "CLARA could not update this wallet yet.");
    } finally {
      setWalletActionLoading(false);
    }
  }, [
    closeWalletModal,
    refreshFinanceSection,
    updateWalletData,
    walletActionLoading,
    walletForm.name,
    walletForm.type,
    walletModal.payload,
  ]);

  const addMoneyInline = useCallback(async () => {
    if (walletActionLoading) return;
    const wallet = walletModal.payload;
    const walletId = getWalletId(wallet);
    const amount = Number(walletForm.amount);

    if (!walletId) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      setWalletActionLoading(true);
      await addIncomeData?.({
        wallet_id: walletId,
        walletId,
        type: "income",
        amount,
        source: "Wallet funding",
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      await refreshFinanceSection();
      closeWalletModal();
      toast.success("Money added.");
    } catch (error) {
      toast.error(error?.message || "CLARA could not add this money yet.");
    } finally {
      setWalletActionLoading(false);
    }
  }, [
    addIncomeData,
    closeWalletModal,
    refreshFinanceSection,
    user?.email,
    user?.id,
    walletActionLoading,
    walletForm.amount,
    walletModal.payload,
  ]);

  const transferMoneyInline = useCallback(async () => {
    if (walletActionLoading) return;
    const fromWallet = walletModal.payload;
    const fromWalletId = getWalletId(fromWallet);
    const destinationWallet = manageableWallets.find(
      (wallet) =>
        String(getWalletId(wallet)) === String(walletForm.destinationWalletId)
    );
    const amount = Number(walletForm.amount);

    if (!fromWalletId || !destinationWallet) {
      toast.error("Please choose a valid destination wallet.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (getWalletSpendableBalance(fromWallet) < amount) {
      toast.error(
        "That amount is higher than this wallet’s spendable balance after protected funds."
      );
      return;
    }

    try {
      setWalletActionLoading(true);
      await transferBetweenWalletsData?.({
        from_wallet_id: fromWalletId,
        to_wallet_id: getWalletId(destinationWallet),
        amount,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      });
      await refreshFinanceSection();
      closeWalletModal();
      toast.success("Transfer completed.");
    } catch (error) {
      toast.error(error?.message || "CLARA could not complete this transfer yet.");
    } finally {
      setWalletActionLoading(false);
    }
  }, [
    closeWalletModal,
    manageableWallets,
    refreshFinanceSection,
    transferBetweenWalletsData,
    user?.email,
    user?.id,
    walletActionLoading,
    walletForm.amount,
    walletForm.destinationWalletId,
    walletModal.payload,
  ]);

  const moveWalletInline = useCallback(
    async (walletId, direction) => {
      if (walletActionLoading) return;

      const ordered = [...manageableWallets].sort((a, b) => {
        const aIndex = manageableWallets.findIndex(
          (wallet) => String(getWalletId(wallet)) === String(getWalletId(a))
        );
        const bIndex = manageableWallets.findIndex(
          (wallet) => String(getWalletId(wallet)) === String(getWalletId(b))
        );
        return getWalletSortOrder(a, aIndex) - getWalletSortOrder(b, bIndex);
      });

      const fromIndex = ordered.findIndex(
        (wallet) => String(getWalletId(wallet)) === String(walletId)
      );
      const toIndex = fromIndex + Number(direction || 0);
      if (fromIndex < 0 || toIndex < 0 || toIndex >= ordered.length) return;

      const fromWallet = ordered[fromIndex];
      const toWallet = ordered[toIndex];
      const fromOrder = getWalletSortOrder(fromWallet, fromIndex);
      const toOrder = getWalletSortOrder(toWallet, toIndex);
      const updatedAt = new Date().toISOString();

      try {
        setWalletActionLoading(true);
        await Promise.all([
          updateWalletData?.(String(getWalletId(fromWallet)), {
            sort_order: toOrder,
            updated_at: updatedAt,
          }),
          updateWalletData?.(String(getWalletId(toWallet)), {
            sort_order: fromOrder,
            updated_at: updatedAt,
          }),
        ]);
        await refreshFinanceSection();
      } catch (error) {
        toast.error(error?.message || "CLARA could not reorder these wallets yet.");
      } finally {
        setWalletActionLoading(false);
      }
    },
    [
      manageableWallets,
      refreshFinanceSection,
      updateWalletData,
      walletActionLoading,
    ]
  );

  const deleteWalletInline = useCallback(async ({ clearBalance = false } = {}) => {
    if (walletActionLoading) return;
    const wallet = walletModal.payload;
    const walletId = getWalletId(wallet);
    if (!walletId) return;

    const protectedAmount = walletProtectedAmount(wallet);
    const balance = getWalletDisplayBalance(wallet);
    const linkedFunds = walletLinkedFunds(wallet);

    if (protectedAmount > 0 || linkedFunds) {
      toast.error(
        "Reassign the linked Emergency Fund or Savings Goal before removing this wallet."
      );
      return;
    }
    if (Math.abs(balance) > 0.000001 && !clearBalance) {
      toast.error("Choose Transfer Balance or Clear & Remove.");
      return;
    }

    const hasHistory = walletTransactions.some(
      (transaction) =>
        String(transaction?.wallet_id || transaction?.walletId || "") ===
        String(walletId)
    );

    try {
      setWalletActionLoading(true);
      if (hasHistory) {
        await updateWalletData?.(String(walletId), {
          is_archived: true,
          isArchived: true,
          archived_at: new Date().toISOString(),
        });
      } else {
        await deleteWalletData?.(String(walletId));
      }
      await refreshFinanceSection();
      closeWalletModal();
      toast.success(
        Math.abs(balance) > 0.000001 && clearBalance
          ? `${formatPhpCurrency(Math.abs(balance))} cleared and wallet removed from your active wallet total.`
          : hasHistory
            ? "Wallet archived. Its transaction history was preserved."
            : "Wallet deleted."
      );
    } catch (error) {
      toast.error(error?.message || "CLARA could not remove this wallet yet.");
    } finally {
      setWalletActionLoading(false);
    }
  }, [
    closeWalletModal,
    deleteWalletData,
    refreshFinanceSection,
    updateWalletData,
    walletActionLoading,
    walletModal.payload,
    walletTransactions,
  ]);

  // Secondary non-wallet management actions keep using their current dedicated
  // CLARA surfaces. Wallet ownership is now fully inline on Home.
  const openTransactions = useCallback(() => {
    navigate("/transactions");
  }, [navigate]);

  const openBudgetPlan = useCallback(() => {
    navigate("/budget-plan");
  }, [navigate]);

  const openSavingsGoals = useCallback(() => {
    navigate("/savings-goals");
  }, [navigate]);

  const handleSurvivalSaved = useCallback(() => {
    void refreshData?.();
  }, [refreshData]);

  const moneyLeftSummaryHandlers = useMemo(
    () => ({
      onDoubleClick: openTransactions,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTransactions();
        }
      },
      openTransactionHubFromMoneyLeft: openTransactions,
    }),
    [openTransactions]
  );

  const profileData = useMemo(
    () => ({
      plan: plan || user?.plan || "free",
      feature_flags: user?.feature_flags || user?.featureFlags || null,
    }),
    [plan, user]
  );

  const deleteWalletBalance = getWalletDisplayBalance(walletModal.payload);
  const deleteWalletProtected = walletProtectedAmount(walletModal.payload);
  const deleteWalletHasLinks = walletLinkedFunds(walletModal.payload);
  const deleteWalletBlocked =
    deleteWalletProtected > 0 || deleteWalletHasLinks;
  const deleteWalletHasBalance = Math.abs(deleteWalletBalance) > 0.000001;
  const deleteWalletCanTransfer =
    deleteWalletBalance > 0.000001 && !deleteWalletBlocked;

  const transferSpendable = getWalletSpendableBalance(walletModal.payload);
  const transferAmount = Number(walletForm.amount);
  const transferAmountValid =
    Number.isFinite(transferAmount) &&
    transferAmount > 0 &&
    transferAmount <= transferSpendable;

  if (!user) return null;

  return (
    <>
      <div className="clara-community-home-financial-carousel relative z-30 mt-4 overflow-visible px-3 pb-5 sm:mt-5">
        <FinancialCarousel
          flushSpacing
          dashboardScale={dashboardScale}
          selectedDashboardTheme={selectedDashboardTheme || {}}
          plan={plan}
          wallets={wallets}
          walletMoney={totalWalletBalance}
          walletPreviewTransactions={walletPreviewTransactions}
          survivalExpense={survivalExpense}
          user={user}
          guardChecked={false}
          loading={loading || refreshing}
          profileData={profileData}
          financeCardController={financeCardController}
          monthlyBudgetPlan={monthlyBudgetPlan}
          savingsGoals={savingsGoals}
          totalSavingsSaved={totalSavingsSaved}
          totalSavingsTarget={totalSavingsTarget}
          primarySavingsGoal={primarySavingsGoal}
          expandedFinanceCard={expandedFinanceCard}
          toggleFinanceDetails={toggleHomeFinanceDetails}
          financeActionLoading={walletActionLoading || loading || refreshing}
          onQuickExpense={openTransactions}
          onSurvivalSaved={handleSurvivalSaved}
          onSaveBudget={openBudgetPlan}
          onEditBudgetCategory={openBudgetPlan}
          onDeleteBudgetCategory={openBudgetPlan}
          onResetBudget={openBudgetPlan}
          onCompleteBudget={completeBudgetFromHome}
          onCreateWallet={openCreateWallet}
          onMoveWallet={moveWalletInline}
          onDeleteWallet={openDeleteWallet}
          onAddMoney={openAddMoney}
          onTransferMoney={openTransferMoney}
          onEditWallet={openEditWallet}
          onSaveSavingsGoal={openSavingsGoals}
          onDeleteSavingsGoal={openSavingsGoals}
          onAddSavings={openSavingsGoals}
          incomeData={{ totalIncome }}
          refreshData={refreshData}
          featureFlags={profileData.feature_flags}
        />

        <div className="clara-community-home-money-left relative z-20 mt-4 px-0">
          <DashboardMoneySummaryStable
            flushSpacing
            dashboardScale={dashboardScale}
            selectedDashboardTheme={selectedDashboardTheme || {}}
            moneySummaryVisible={moneySummaryVisible}
            toggleMoneySummaryVisibility={toggleMoneySummaryVisibility}
            moneyLeftSummaryHandlers={moneyLeftSummaryHandlers}
            handleMoneyLeftOrbClick={openTransactions}
            walletMoney={displayedMoneyLeft}
            thisMonthSpent={thisMonthSpent}
            fmt={formatPhpCurrency}
          />
          <button
            type="button"
            data-clara-after-budget-total="true"
            data-clara-after-budget-active={moneyLeftMode === "projected" ? "true" : "false"}
            aria-pressed={moneyLeftMode === "projected"}
            aria-label={
              moneyLeftMode === "projected"
                ? "Show current Money Left"
                : `Show spendable Money Left after protected funds, budget, and unpaid obligations. Projected amount: ${formatPhpCurrency(
                    afterMonthlyBudgetMoney
                  )}`
            }
            title={moneyLeftMode === "projected" ? "Current Money Left" : "Spendable after commitments"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMoneyLeftMode((current) =>
                current === "projected" ? "current" : "projected"
              );
            }}
          >
            <span data-clara-after-budget-icon="true" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
                <path d="M16 13h4" />
                <path d="M6 7V5a2 2 0 0 1 2-2h8" />
                <path d="M8 13h4" />
              </svg>
            </span>
          </button>
        </div>

        <span className="sr-only">
          Financial totals loaded: {totalIncome}, {totalExpenses}, {totalWalletBalance}
        </span>
      </div>

      {walletModal.type === "create_wallet" ? (
        <DashboardFinanceModalRendererWithIncomeFunding
          financeModal={walletModal}
          closeFinanceModal={closeWalletModal}
          financeActionLoading={walletActionLoading || loading || refreshing}
          financeForm={walletForm}
          setFinanceForm={setWalletForm}
          fmt={formatPhpCurrency}
          showFinanceNotice={(message, tone) => {
            if (!message) return;
            if (tone === "success") toast.success(message);
            else toast.error(message);
          }}
          user={user}
          wallets={wallets}
        />
      ) : null}

      <FinanceActionModal
        open={walletModal.type === "edit_wallet"}
        title="Edit wallet"
        description={`Update ${getWalletName(walletModal.payload)} without leaving Home.`}
        onClose={closeWalletModal}
        onSubmit={(event) => {
          event.preventDefault();
          void editWalletInline();
        }}
        submitLabel="Save wallet"
        loading={walletActionLoading}
      >
        <FinanceField label="Wallet name">
          <input
            type="text"
            value={walletForm.name}
            onChange={(event) =>
              setWalletForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Wallet name"
            className={financeInputClassName}
          />
        </FinanceField>

        <FinanceField label="Wallet identity">
          <WalletProviderPicker
            selectedProviderKey={walletForm.type}
            disabled={walletActionLoading}
            compact
            onSelect={(provider) =>
              setWalletForm((current) => ({ ...current, type: provider.key }))
            }
          />
        </FinanceField>
      </FinanceActionModal>

      <FinanceActionModal
        open={walletModal.type === "add_money"}
        title="Add money"
        description={`Add funds to ${getWalletName(walletModal.payload)}.`}
        onClose={closeWalletModal}
        onSubmit={(event) => {
          event.preventDefault();
          void addMoneyInline();
        }}
        submitLabel="Add money"
        submitDisabled={!(Number(walletForm.amount) > 0)}
        submitDisabledLabel="Enter Amount"
        loading={walletActionLoading}
      >
        <FinanceField
          label="Amount"
          helper={`Available balance: ${formatPhpCurrency(
            getWalletDisplayBalance(walletModal.payload)
          )}`}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={walletForm.amount}
            onChange={(event) =>
              setWalletForm((current) => ({ ...current, amount: event.target.value }))
            }
            placeholder="0"
            className={financeInputClassName}
          />
        </FinanceField>
      </FinanceActionModal>

      <FinanceActionModal
        open={walletModal.type === "transfer_money"}
        title="Transfer money"
        description={`Move funds from ${getWalletName(
          walletModal.payload
        )} to another wallet.`}
        onClose={closeWalletModal}
        onSubmit={(event) => {
          event.preventDefault();
          void transferMoneyInline();
        }}
        submitLabel="Transfer"
        submitDisabled={!walletForm.destinationWalletId || !transferAmountValid}
        submitDisabledLabel={
          walletForm.destinationWalletId &&
          Number.isFinite(transferAmount) &&
          transferAmount > transferSpendable
            ? "Protected Funds"
            : walletForm.destinationWalletId
              ? "Enter Amount"
              : "Choose Wallet"
        }
        loading={walletActionLoading}
      >
        <FinanceField label="Destination wallet">
          <select
            value={walletForm.destinationWalletId}
            onChange={(event) =>
              setWalletForm((current) => ({
                ...current,
                destinationWalletId: event.target.value,
              }))
            }
            className={financeInputClassName}
          >
            {manageableWallets
              .filter(
                (wallet) =>
                  String(getWalletId(wallet)) !==
                  String(getWalletId(walletModal.payload))
              )
              .map((wallet) => (
                <option key={getWalletId(wallet)} value={String(getWalletId(wallet))}>
                  {getWalletName(wallet)} • {formatPhpCurrency(getWalletDisplayBalance(wallet))}
                </option>
              ))}
          </select>
        </FinanceField>

        <FinanceField
          label="Amount"
          helper={`Spendable after protected funds: ${formatPhpCurrency(
            transferSpendable
          )}`}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={walletForm.amount}
            onChange={(event) =>
              setWalletForm((current) => ({ ...current, amount: event.target.value }))
            }
            placeholder="0"
            className={financeInputClassName}
          />
        </FinanceField>
      </FinanceActionModal>

      <FinanceActionModal
        open={walletModal.type === "delete_wallet"}
        title="Delete wallet"
        description={`Remove ${getWalletName(walletModal.payload)} from your wallet list?`}
        onClose={closeWalletModal}
        onSubmit={(event) => {
          event.preventDefault();
          void deleteWalletInline({ clearBalance: deleteWalletHasBalance });
        }}
        submitLabel={
          deleteWalletHasBalance
            ? `Clear ${formatPhpCurrency(Math.abs(deleteWalletBalance))} & Remove`
            : "Remove wallet"
        }
        submitDisabled={deleteWalletBlocked}
        submitDisabledLabel="Linked Funds"
        loading={walletActionLoading}
        danger
      >
        <div
          className={`rounded-2xl border p-4 text-sm leading-6 ${
            deleteWalletBlocked || deleteWalletHasBalance
              ? "border-amber-300/15 bg-amber-500/10 text-amber-100"
              : "border-rose-400/15 bg-rose-500/10 text-rose-100"
          }`}
        >
          {deleteWalletProtected > 0 || deleteWalletHasLinks
            ? "This wallet is linked to an Emergency Fund or Savings Goal. Reassign that link before removing it."
            : deleteWalletHasBalance
              ? `This wallet still has ${formatPhpCurrency(
                  deleteWalletBalance
                )}. Transfer it to another wallet, or clear this balance and remove the wallet from CLARA.`
              : "A wallet with transaction history will be archived so your past records stay accurate."}
        </div>

        {deleteWalletCanTransfer ? (
          <button
            type="button"
            onClick={() => openTransferMoney(walletModal.payload)}
            className="flex w-full items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-100 transition hover:border-blue-300/30 hover:bg-blue-500/16 active:scale-[0.99]"
          >
            Transfer {formatPhpCurrency(deleteWalletBalance)} instead
          </button>
        ) : null}

        {deleteWalletHasBalance && !deleteWalletBlocked ? (
          <p className="px-1 text-[11px] font-semibold leading-5 text-white/46">
            Or use the red button below to clear the remaining balance from your active wallet total and remove this wallet.
          </p>
        ) : null}
      </FinanceActionModal>
    </>
  );
}
