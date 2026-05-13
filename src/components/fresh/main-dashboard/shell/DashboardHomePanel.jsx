import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import DashboardMoneySummary from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummary";
import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";
import { Button } from "@/components/ui/button";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

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

      {dashboardShellReady && <LearningHub />}

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

      <DashboardMoneySummary
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
