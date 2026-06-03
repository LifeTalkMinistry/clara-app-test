import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import DashboardMoneySummaryStable from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable";
import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";
import { Button } from "@/components/ui/button";
import {
  activateClaraSampleUserData,
  restoreClaraRealUserData,
} from "@/lib/clara-demo-sample-data";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const CLARA_SAMPLE_DATA_EVENT = "clara:activate-sample-user-data";

export default function DashboardHomePanel({
  isPending,
  dashboardShellReady,
  dashboardScale,
  financeNotice,
  closeFinanceNotice,
  shouldShowNonBlockingRefresh,
  selectedDashboardTheme,
  themeInactiveDotClass,
  wallets,
  walletMoney,
  walletPreviewTransactions,
  survivalExpense,
  user,
  guardChecked,
  loading,
  profileData,
  firstPositiveNumber,
  readStoredSurvivalExpense,
  monthlyBudgetPlan,
  savingsGoals,
  totalSavingsSaved,
  totalSavingsTarget,
  primarySavingsGoal,
  expandedFinanceCard,
  toggleFinanceDetails,
  financeActionLoading,
  openManualExpenseModal,
  saveSurvivalExpenseInline,
  openBudgetModal,
  openDeleteBudgetCategoryModal,
  openResetBudgetModal,
  openCreateWalletModal,
  moveWalletInline,
  openDeleteWalletModal,
  openAddMoneyModal,
  openTransferMoneyModal,
  openSavingsGoalModal,
  openDeleteSavingsGoalModal,
  openAddSavingsModal,
  startClaraAiLongPress,
  endClaraAiLongPress,
  handleClaraAiOrbClickCapture,
  themeIsLight,
  themeSoftTextClass,
  themePrimaryTextClass,
  moneySummaryVisible,
  toggleMoneySummaryVisibility,
  moneyLeftSummaryHandlers,
  handleMoneyLeftOrbClick,
  startMoneyLeftOrbLongPress,
  moveMoneyLeftOrbLongPress,
  endMoneyLeftOrbLongPress,
  stopMoneyLeftOrbEvent,
  thisMonthSpent,
  fmt,
}) {
  const [moneySummaryResetKey, setMoneySummaryResetKey] = useState(0);
  const [sampleStatus, setSampleStatus] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleMoneySummaryReset = (event) => {
      const detail = event?.detail || {};
      const isBudgetLensClose =
        detail.active === false &&
        Array.isArray(detail.messages) &&
        detail.messages.length === 0;

      if (!isBudgetLensClose) return;

      setMoneySummaryResetKey((current) => current + 1);
    };

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, handleMoneySummaryReset);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, handleMoneySummaryReset);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleSampleActivation = async (event) => {
      if (sampleLoading) return;

      const action = event?.detail?.action === "restore" ? "restore" : "activate";

      try {
        setSampleLoading(true);

        if (action === "restore") {
          setSampleStatus("Restoring your real data...");
          await restoreClaraRealUserData({ user });
          setSampleStatus("Real data restored.");
        } else {
          setSampleStatus("Loading Max sample data...");
          const result = await activateClaraSampleUserData({ user });
          setSampleStatus(
            `Max sample loaded: ${result.wallets} wallets, ${result.expenses} transactions, ${result.budgets} budget records, ${result.savingsGoals} goals.`
          );
        }

        window.setTimeout(() => window.location.reload(), 900);
      } catch (error) {
        console.error("CLARA sample user seed failed:", error);
        setSampleStatus(action === "restore" ? "Real data restore failed. Please try again." : "Sample loading failed. Please try again.");
        setSampleLoading(false);
      }
    };

    window.addEventListener(CLARA_SAMPLE_DATA_EVENT, handleSampleActivation);
    return () => window.removeEventListener(CLARA_SAMPLE_DATA_EVENT, handleSampleActivation);
  }, [sampleLoading, user]);

  return (
    <>
      {isPending && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-secondary/20 p-3">
          <Clock className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">Enrollment Under Review</div>
          <Link to="/enroll">
            <Button size="sm">View</Button>
          </Link>
        </div>
      )}

      {dashboardShellReady && <LearningHub user={user} />}

      {sampleStatus ? (
        <div className="mx-auto mt-2 max-w-[340px] rounded-2xl border border-cyan-100/20 bg-cyan-300/10 px-3 py-2 text-center text-[11px] font-semibold text-cyan-50/86 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
          {sampleStatus}
        </div>
      ) : null}

      {!!user && (
        <div
          className={`${dashboardScale.financeWrap} ${
            dashboardShellReady ? "mt-[clamp(16px,2.6dvh,24px)]" : ""
          }`}
        >
          <FinanceInlineAlert notice={financeNotice} onClose={closeFinanceNotice} />

          {shouldShowNonBlockingRefresh ? (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Refreshing finance data...
            </div>
          ) : null}

          <FinancialCarousel
            dashboardScale={dashboardScale}
            selectedDashboardTheme={selectedDashboardTheme}
            themeInactiveDotClass={themeInactiveDotClass}
            wallets={wallets}
            walletMoney={walletMoney}
            walletPreviewTransactions={walletPreviewTransactions}
            survivalExpense={survivalExpense}
            user={user}
            guardChecked={guardChecked}
            loading={loading}
            profileData={profileData}
            firstPositiveNumber={firstPositiveNumber}
            readStoredSurvivalExpense={readStoredSurvivalExpense}
            monthlyBudgetPlan={monthlyBudgetPlan}
            savingsGoals={savingsGoals}
            totalSavingsSaved={totalSavingsSaved}
            totalSavingsTarget={totalSavingsTarget}
            primarySavingsGoal={primarySavingsGoal}
            expandedFinanceCard={expandedFinanceCard}
            toggleFinanceDetails={toggleFinanceDetails}
            financeActionLoading={financeActionLoading}
            onQuickExpense={openManualExpenseModal}
            onSurvivalSaved={saveSurvivalExpenseInline}
            onSaveBudget={() => window.requestAnimationFrame(() => openBudgetModal())}
            onEditBudgetCategory={(item) =>
              window.requestAnimationFrame(() => openBudgetModal(item))
            }
            onDeleteBudgetCategory={(item) =>
              window.requestAnimationFrame(() => openDeleteBudgetCategoryModal(item))
            }
            onResetBudget={() => window.requestAnimationFrame(() => openResetBudgetModal())}
            onCreateWallet={() => window.requestAnimationFrame(() => openCreateWalletModal())}
            onMoveWallet={moveWalletInline}
            onDeleteWallet={(walletId) =>
              window.requestAnimationFrame(() => openDeleteWalletModal(walletId))
            }
            onAddMoney={(wallet) =>
              window.requestAnimationFrame(() => openAddMoneyModal(wallet))
            }
            onTransferMoney={(wallet) =>
              window.requestAnimationFrame(() => openTransferMoneyModal(wallet))
            }
            onSaveSavingsGoal={(goal) =>
              window.requestAnimationFrame(() => openSavingsGoalModal(goal))
            }
            onDeleteSavingsGoal={(goalId) =>
              window.requestAnimationFrame(() => openDeleteSavingsGoalModal(goalId))
            }
            onAddSavings={(goal) =>
              window.requestAnimationFrame(() => openAddSavingsModal(goal))
            }
            startClaraAiLongPress={startClaraAiLongPress}
            endClaraAiLongPress={endClaraAiLongPress}
            handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}
          />
        </div>
      )}

      <DashboardMoneySummaryStable
        key={moneySummaryResetKey}
        dashboardScale={dashboardScale}
        selectedDashboardTheme={selectedDashboardTheme}
        themeIsLight={themeIsLight}
        themeSoftTextClass={themeSoftTextClass}
        themePrimaryTextClass={themePrimaryTextClass}
        moneySummaryVisible={moneySummaryVisible}
        toggleMoneySummaryVisibility={toggleMoneySummaryVisibility}
        moneyLeftSummaryHandlers={moneyLeftSummaryHandlers}
        handleMoneyLeftOrbClick={handleMoneyLeftOrbClick}
        startMoneyLeftOrbLongPress={startMoneyLeftOrbLongPress}
        moveMoneyLeftOrbLongPress={moveMoneyLeftOrbLongPress}
        endMoneyLeftOrbLongPress={endMoneyLeftOrbLongPress}
        stopMoneyLeftOrbEvent={stopMoneyLeftOrbEvent}
        walletMoney={walletMoney}
        thisMonthSpent={thisMonthSpent}
        monthlyBudgetPlan={monthlyBudgetPlan}
        savingsGoals={savingsGoals}
        totalSavingsSaved={totalSavingsSaved}
        totalSavingsTarget={totalSavingsTarget}
        primarySavingsGoal={primarySavingsGoal}
        survivalExpense={survivalExpense}
        wallets={wallets}
        walletPreviewTransactions={walletPreviewTransactions}
        fmt={fmt}
      />
    </>
  );
}
