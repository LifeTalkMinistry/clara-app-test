import { useCallback, useMemo } from "react";
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

  // The Community shell is now CLARA's primary app. Detailed finance editors
  // remain on this hidden bridge until their mutation flows are migrated too.
  const openLegacyFinanceTools = useCallback(() => {
    navigate("/legacy-dashboard");
  }, [navigate]);

  const moneyLeftSummaryHandlers = useMemo(
    () => ({
      onDoubleClick: openLegacyFinanceTools,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLegacyFinanceTools();
        }
      },
      openTransactionHubFromMoneyLeft: openLegacyFinanceTools,
    }),
    [openLegacyFinanceTools]
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
        expandedFinanceCard={null}
        toggleFinanceDetails={openLegacyFinanceTools}
        financeActionLoading={loading || refreshing}
        onQuickExpense={openLegacyFinanceTools}
        onSurvivalSaved={openLegacyFinanceTools}
        onSaveBudget={openLegacyFinanceTools}
        onEditBudgetCategory={openLegacyFinanceTools}
        onDeleteBudgetCategory={openLegacyFinanceTools}
        onResetBudget={openLegacyFinanceTools}
        onCreateWallet={openLegacyFinanceTools}
        onMoveWallet={openLegacyFinanceTools}
        onDeleteWallet={openLegacyFinanceTools}
        onAddMoney={openLegacyFinanceTools}
        onTransferMoney={openLegacyFinanceTools}
        onEditWallet={openLegacyFinanceTools}
        onSaveSavingsGoal={openLegacyFinanceTools}
        onDeleteSavingsGoal={openLegacyFinanceTools}
        onAddSavings={openLegacyFinanceTools}
        incomeSources={[]}
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
          handleMoneyLeftOrbClick={openLegacyFinanceTools}
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
