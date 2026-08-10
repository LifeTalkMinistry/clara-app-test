import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
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
import { useTheme } from "@/theme/ThemeProvider";
import { firstPositiveNumber } from "@/utils/dashboard/dashboardHelpers";

export default function CommunityHomeFinancialCarousel() {
  const navigate = useNavigate();
  const { selectedTheme: selectedDashboardTheme } = useTheme();
  const dashboardViewportMode = useDashboardViewportMode();
  const dashboardScale =
    DASHBOARD_SCALE[dashboardViewportMode] || DASHBOARD_SCALE.normal;
  const { user, plan } = useUserRole();
  const [expandedFinanceCard, setExpandedFinanceCard] = useState(null);

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
  } = financeCardController;

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

  const { thisMonthSpent = 0 } = useDashboardMoneyLeftMetrics({
    expenses,
    walletTransactions,
    user,
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

  // Home owns finance-card expansion now. No finance expand/collapse interaction
  // is allowed to leave the Community shell or hand control back to Dashboard.
  const toggleHomeFinanceDetails = useCallback((cardKey, options = {}) => {
    if (!cardKey) return;
    const { forceOpen = false } = options || {};

    setExpandedFinanceCard((current) =>
      forceOpen ? cardKey : current === cardKey ? null : cardKey
    );
  }, []);

  // Secondary management actions use the current dedicated CLARA surfaces.
  // This keeps every Home finance interaction disconnected from /legacy-dashboard
  // while the remaining editors are progressively moved inline too.
  const openTransactions = useCallback(() => {
    navigate("/transactions");
  }, [navigate]);

  const openBudgetPlan = useCallback(() => {
    navigate("/budget-plan");
  }, [navigate]);

  const openWalletManager = useCallback(() => {
    navigate("/wallets");
  }, [navigate]);

  const openAddFunds = useCallback(() => {
    navigate("/add-funds");
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

  if (!user) return null;

  return (
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
        financeActionLoading={loading || refreshing}
        onQuickExpense={openTransactions}
        onSurvivalSaved={handleSurvivalSaved}
        onSaveBudget={openBudgetPlan}
        onEditBudgetCategory={openBudgetPlan}
        onDeleteBudgetCategory={openBudgetPlan}
        onResetBudget={openBudgetPlan}
        onCreateWallet={openWalletManager}
        onMoveWallet={openWalletManager}
        onDeleteWallet={openWalletManager}
        onAddMoney={openAddFunds}
        onTransferMoney={openWalletManager}
        onEditWallet={openWalletManager}
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
          walletMoney={totalWalletBalance}
          thisMonthSpent={thisMonthSpent}
          fmt={formatPhpCurrency}
        />
      </div>

      <span className="sr-only">
        Financial totals loaded: {totalIncome}, {totalExpenses}, {totalWalletBalance}
      </span>
    </div>
  );
}
