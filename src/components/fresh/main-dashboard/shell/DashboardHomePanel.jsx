import { useCallback, useEffect, useState } from "react";
import { Clock, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import DashboardMoneySummaryStable from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable";
import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";
import { Button } from "@/components/ui/button";
import {
  CLARA_GUIDE_PROGRESS_KEY,
  isDailyMoneyTipGuideComplete,
  readClaraGuideProgress,
} from "@/components/fresh/main-dashboard/guide/claraGuideProgress";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const GUIDE_FEATURE_DAILY_MONEY_TIP = "daily-money-tip";
const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";
const CLARA_GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";

const runInAnimationFrame = (callback) => {
  if (typeof callback !== "function") return;

  if (typeof window === "undefined") {
    callback();
    return;
  }

  window.requestAnimationFrame(callback);
};

const emitGuideModeChange = (active) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLARA_GUIDE_MODE_CHANGE_EVENT, { detail: { active } }));
};

function ClaraGuideIntroModal({ onStart, onClose }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/78 px-4 py-6 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="clara-guide-intro-title">
      <div className="relative w-full max-w-[390px] overflow-hidden rounded-[30px] border border-cyan-100/14 bg-[linear-gradient(145deg,rgba(5,19,41,0.96),rgba(8,24,55,0.94)_48%,rgba(18,13,52,0.94))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.58),0_0_58px_rgba(34,211,238,0.12)]">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-indigo-400/14 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/58 transition hover:bg-white/[0.10] hover:text-white/78"
          aria-label="Close CLARA Guide intro"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100/15 bg-cyan-300/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-100/52">
            Safe walkthrough
          </p>
          <h2 id="clara-guide-intro-title" className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
            CLARA Guide Mode
          </h2>
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-cyan-50/76">
            Practice using CLARA without touching your real data.
          </p>

          <div className="mt-4 space-y-3 rounded-[24px] border border-white/10 bg-white/[0.055] p-4 text-[12px] font-medium leading-relaxed text-white/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p>
              You’ll enter a safe simulation where CLARA shows you what to tap and what each feature means.
            </p>
            <p>
              Nothing here affects your real wallet, budget, savings, check-ins, streaks, transactions, or records.
            </p>
            <p className="font-black text-cyan-100/86">You can exit anytime.</p>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={onStart}
              className="rounded-2xl bg-cyan-200 px-4 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_16px_34px_rgba(34,211,238,0.24)] transition active:scale-[0.99]"
            >
              Start Guide Mode
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white/68 transition hover:bg-white/[0.09] active:scale-[0.99]"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaraGuideFloatingBubble() {
  return (
    <div className="pointer-events-none fixed left-1/2 top-[clamp(320px,43dvh,390px)] z-[75] w-[min(340px,calc(100vw-46px))] -translate-x-1/2">
      <div className="relative rounded-[26px] border border-cyan-100/24 bg-[rgba(4,16,34,0.90)] px-5 py-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.50),0_0_40px_rgba(34,211,238,0.14)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -top-2 left-10 h-4 w-4 rotate-45 border-l border-t border-cyan-100/24 bg-[rgba(4,16,34,0.90)]" />
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/58">
          Daily Money Tip
        </p>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-cyan-50/84">
          CLARA gives you one quick money reminder before you spend. Tap the Daily Money Tip card above to continue.
        </p>
      </div>
    </div>
  );
}

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
  const [isGuideIntroOpen, setIsGuideIntroOpen] = useState(false);
  const [isGuideMode, setIsGuideMode] = useState(false);
  const [guideFeature, setGuideFeature] = useState(GUIDE_FEATURE_DAILY_MONEY_TIP);
  const [guideStep, setGuideStep] = useState(0);
  const [claraGuideProgress, setClaraGuideProgress] = useState(() => readClaraGuideProgress());
  const currentPlan = user?.plan || user?.subscription?.plan || "free";
  const effectivePlan = isGuideMode ? "pro" : currentPlan;
  const isFreePlan = currentPlan === "free";
  const hasNewDailyMoneyTipGuide = !isDailyMoneyTipGuideComplete(claraGuideProgress);
  const isDailyTipGuideActive = isGuideMode && guideFeature === GUIDE_FEATURE_DAILY_MONEY_TIP && guideStep === 0;

  const effectiveWallets = wallets;
  const effectiveWalletMoney = walletMoney;
  const effectiveWalletPreviewTransactions = walletPreviewTransactions;
  const effectiveMonthlyBudgetPlan = monthlyBudgetPlan;
  const effectiveSavingsGoals = savingsGoals;
  const effectiveTotalSavingsSaved = totalSavingsSaved;
  const effectiveTotalSavingsTarget = totalSavingsTarget;
  const effectivePrimarySavingsGoal = primarySavingsGoal;
  const effectiveSurvivalExpense = survivalExpense;
  const effectiveThisMonthSpent = thisMonthSpent;

  const handleSaveBudget = useCallback(() => {
    runInAnimationFrame(() => openBudgetModal());
  }, [openBudgetModal]);

  const handleEditBudgetCategory = useCallback(
    (item) => {
      runInAnimationFrame(() => openBudgetModal(item));
    },
    [openBudgetModal]
  );

  const handleDeleteBudgetCategory = useCallback(
    (item) => {
      runInAnimationFrame(() => openDeleteBudgetCategoryModal(item));
    },
    [openDeleteBudgetCategoryModal]
  );

  const handleResetBudget = useCallback(() => {
    runInAnimationFrame(() => openResetBudgetModal());
  }, [openResetBudgetModal]);

  const handleCreateWallet = useCallback(() => {
    runInAnimationFrame(() => openCreateWalletModal());
  }, [openCreateWalletModal]);

  const handleDeleteWallet = useCallback(
    (walletId) => {
      runInAnimationFrame(() => openDeleteWalletModal(walletId));
    },
    [openDeleteWalletModal]
  );

  const handleAddMoney = useCallback(
    (wallet) => {
      runInAnimationFrame(() => openAddMoneyModal(wallet));
    },
    [openAddMoneyModal]
  );

  const handleTransferMoney = useCallback(
    (wallet) => {
      runInAnimationFrame(() => openTransferMoneyModal(wallet));
    },
    [openTransferMoneyModal]
  );

  const handleSaveSavingsGoal = useCallback(
    (goal) => {
      runInAnimationFrame(() => openSavingsGoalModal(goal));
    },
    [openSavingsGoalModal]
  );

  const handleDeleteSavingsGoal = useCallback(
    (goalId) => {
      runInAnimationFrame(() => openDeleteSavingsGoalModal(goalId));
    },
    [openDeleteSavingsGoalModal]
  );

  const handleAddSavings = useCallback(
    (goal) => {
      runInAnimationFrame(() => openAddSavingsModal(goal));
    },
    [openAddSavingsModal]
  );

  const exitGuideMode = useCallback(({ focusRealDailyTip = false } = {}) => {
    setIsGuideMode(false);
    setGuideStep(0);
    setGuideFeature(GUIDE_FEATURE_DAILY_MONEY_TIP);
    emitGuideModeChange(false);

    if (focusRealDailyTip && typeof window !== "undefined") {
      window.setTimeout(() => {
        const dailyTipCard = document.querySelector("[data-clara-daily-tip-card='true']");
        dailyTipCard?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }, 80);
    }
  }, []);

  const startGuideMode = useCallback(() => {
    setIsGuideIntroOpen(false);
    setGuideFeature(GUIDE_FEATURE_DAILY_MONEY_TIP);
    setGuideStep(0);
    setIsGuideMode(true);
    emitGuideModeChange(true);

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.querySelector("[data-clara-daily-tip-card='true']")?.scrollIntoView?.({
          block: "center",
          behavior: "smooth",
        });
      }, 80);
    }
  }, []);

  const handleGuideDailyTipTap = useCallback(() => {
    if (!isGuideMode || guideFeature !== GUIDE_FEATURE_DAILY_MONEY_TIP || guideStep !== 0) return;
    setGuideStep(0);
  }, [guideFeature, guideStep, isGuideMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleExternalGuideExit = () => {
      exitGuideMode();
    };

    window.addEventListener(CLARA_GUIDE_EXIT_EVENT, handleExternalGuideExit);

    return () => {
      window.removeEventListener(CLARA_GUIDE_EXIT_EVENT, handleExternalGuideExit);
    };
  }, [exitGuideMode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncGuideProgress = (event) => {
      if (event?.key && event.key !== CLARA_GUIDE_PROGRESS_KEY) return;
      setClaraGuideProgress(readClaraGuideProgress());
    };

    window.addEventListener("storage", syncGuideProgress);

    return () => {
      window.removeEventListener("storage", syncGuideProgress);
    };
  }, []);

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
      {isDailyTipGuideActive ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/68 backdrop-blur-[1.5px]" aria-hidden="true" />
      ) : null}

      {isDailyTipGuideActive ? <ClaraGuideFloatingBubble /> : null}

      {isGuideIntroOpen ? (
        <ClaraGuideIntroModal onStart={startGuideMode} onClose={() => setIsGuideIntroOpen(false)} />
      ) : null}

      {isPending && !isGuideMode && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-secondary/20 p-3">
          <Clock className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">Enrollment Under Review</div>
          <Link to="/enroll">
            <Button size="sm">View</Button>
          </Link>
        </div>
      )}

      <div className="clara-dashboard-hub-rail flex flex-col [--clara-hub-rail-gap:clamp(15px,1.8dvh,18px)] gap-[var(--clara-hub-rail-gap)]">
        {dashboardShellReady && (
          <LearningHub
            isGuideMode={isGuideMode}
            guideFeature={guideFeature}
            guideStep={guideStep}
            hasNewGuide={hasNewDailyMoneyTipGuide}
            onOpenGuideIntro={() => setIsGuideIntroOpen(true)}
            onGuideDailyTipTap={handleGuideDailyTipTap}
          />
        )}

        <div className="clara-dashboard-bottom-finance-rail flex flex-col [--clara-bottom-finance-gap:clamp(16px,2dvh,20px)] gap-[var(--clara-bottom-finance-gap)]">
          {(!!user || isGuideMode) && (
            <div className={dashboardScale.financeWrap}>
              {!isGuideMode ? <FinanceInlineAlert notice={financeNotice} onClose={closeFinanceNotice} /> : null}

              {shouldShowNonBlockingRefresh && !isGuideMode ? (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100/80">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Refreshing finance data...
                </div>
              ) : null}

              <FinancialCarousel
                flushSpacing
                dashboardScale={dashboardScale}
                selectedDashboardTheme={selectedDashboardTheme}
                themeInactiveDotClass={themeInactiveDotClass}
                plan={effectivePlan}
                wallets={effectiveWallets}
                walletMoney={effectiveWalletMoney}
                walletPreviewTransactions={effectiveWalletPreviewTransactions}
                survivalExpense={effectiveSurvivalExpense}
                user={isGuideMode ? null : user}
                guardChecked={isGuideMode ? false : guardChecked}
                loading={isGuideMode ? false : loading}
                profileData={isGuideMode ? { plan: "pro" } : profileData}
                firstPositiveNumber={firstPositiveNumber}
                readStoredSurvivalExpense={isGuideMode ? undefined : readStoredSurvivalExpense}
                monthlyBudgetPlan={effectiveMonthlyBudgetPlan}
                thisMonthSpent={effectiveThisMonthSpent}
                savingsGoals={effectiveSavingsGoals}
                totalSavingsSaved={effectiveTotalSavingsSaved}
                totalSavingsTarget={effectiveTotalSavingsTarget}
                primarySavingsGoal={effectivePrimarySavingsGoal}
                expandedFinanceCard={isGuideMode ? null : expandedFinanceCard}
                toggleFinanceDetails={isGuideMode ? undefined : toggleFinanceDetails}
                financeActionLoading={isGuideMode ? false : financeActionLoading}
                onQuickExpense={isGuideMode ? undefined : openManualExpenseModal}
                onSurvivalSaved={isGuideMode ? undefined : saveSurvivalExpenseInline}
                onSaveBudget={isGuideMode ? undefined : handleSaveBudget}
                onEditBudgetCategory={isGuideMode ? undefined : handleEditBudgetCategory}
                onDeleteBudgetCategory={isGuideMode ? undefined : handleDeleteBudgetCategory}
                onResetBudget={isGuideMode ? undefined : handleResetBudget}
                onCreateWallet={isGuideMode ? undefined : handleCreateWallet}
                onMoveWallet={isGuideMode ? undefined : moveWalletInline}
                onDeleteWallet={isGuideMode ? undefined : handleDeleteWallet}
                onAddMoney={isGuideMode ? undefined : handleAddMoney}
                onTransferMoney={isGuideMode ? undefined : handleTransferMoney}
                onSaveSavingsGoal={isGuideMode ? undefined : handleSaveSavingsGoal}
                onDeleteSavingsGoal={isGuideMode ? undefined : handleDeleteSavingsGoal}
                onAddSavings={isGuideMode ? undefined : handleAddSavings}
                startClaraAiLongPress={isGuideMode || isFreePlan ? undefined : startClaraAiLongPress}
                endClaraAiLongPress={isGuideMode || isFreePlan ? undefined : endClaraAiLongPress}
                handleClaraAiOrbClickCapture={isGuideMode || isFreePlan ? undefined : handleClaraAiOrbClickCapture}
                isGuideMode={isGuideMode}
              />
            </div>
          )}

          <DashboardMoneySummaryStable
            flushSpacing
            key={moneySummaryResetKey}
            dashboardScale={dashboardScale}
            selectedDashboardTheme={selectedDashboardTheme}
            themeIsLight={themeIsLight}
            themeSoftTextClass={themeSoftTextClass}
            themePrimaryTextClass={themePrimaryTextClass}
            moneySummaryVisible={moneySummaryVisible}
            toggleMoneySummaryVisibility={isGuideMode ? undefined : toggleMoneySummaryVisibility}
            moneyLeftSummaryHandlers={isGuideMode ? undefined : moneyLeftSummaryHandlers}
            handleMoneyLeftOrbClick={isGuideMode ? undefined : handleMoneyLeftOrbClick}
            startMoneyLeftOrbLongPress={isGuideMode ? undefined : startMoneyLeftOrbLongPress}
            moveMoneyLeftOrbLongPress={isGuideMode ? undefined : moveMoneyLeftOrbLongPress}
            endMoneyLeftOrbLongPress={isGuideMode ? undefined : endMoneyLeftOrbLongPress}
            stopMoneyLeftOrbEvent={isGuideMode ? undefined : stopMoneyLeftOrbEvent}
            walletMoney={effectiveWalletMoney}
            thisMonthSpent={effectiveThisMonthSpent}
            monthlyBudgetPlan={effectiveMonthlyBudgetPlan}
            savingsGoals={effectiveSavingsGoals}
            totalSavingsSaved={effectiveTotalSavingsSaved}
            totalSavingsTarget={effectiveTotalSavingsTarget}
            primarySavingsGoal={effectivePrimarySavingsGoal}
            survivalExpense={effectiveSurvivalExpense}
            wallets={effectiveWallets}
            walletPreviewTransactions={effectiveWalletPreviewTransactions}
            fmt={fmt}
          />
        </div>
      </div>
    </>
  );
}
