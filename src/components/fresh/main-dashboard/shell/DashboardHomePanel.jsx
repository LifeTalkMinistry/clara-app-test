import { useCallback, useEffect, useState } from "react";
import { Clock, ShieldCheck, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import DashboardMoneySummaryStable from "@/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable";
import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";
import { Button } from "@/components/ui/button";
import {
  CLARA_GUIDE_PROGRESS_KEY,
  isDailyMoneyTipGuideComplete,
  markDailyMoneyTipGuideComplete,
  readClaraGuideProgress,
} from "@/components/fresh/main-dashboard/guide/claraGuideProgress";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const GUIDE_FEATURE_DAILY_MONEY_TIP = "daily-money-tip";

const GUIDE_DEMO_WALLET_MONEY = 3200;
const GUIDE_DEMO_WALLETS = [
  {
    id: "clara-guide-demo-wallet",
    name: "Guide Wallet",
    wallet_name: "Guide Wallet",
    type: "cash",
    balance: GUIDE_DEMO_WALLET_MONEY,
    amount: GUIDE_DEMO_WALLET_MONEY,
    current_balance: GUIDE_DEMO_WALLET_MONEY,
    sort_order: 0,
  },
];
const GUIDE_DEMO_WALLET_PREVIEW_TRANSACTIONS = [
  {
    id: "clara-guide-demo-transaction-1",
    type: "expense",
    category: "Food",
    description: "Sample lunch",
    amount: 120,
    created_at: new Date().toISOString(),
  },
];
const GUIDE_DEMO_MONTHLY_BUDGET_PLAN = {
  declared_budget: 5000,
  total_budget: 5000,
  spent_amount: 3550,
  spent_total: 3550,
  remaining: 1450,
  remaining_amount: 1450,
  status: "guide-demo",
  is_complete: true,
  categories: [
    { id: "guide-essentials", name: "Essentials", allocated_amount: 2500, spent_amount: 1800 },
    { id: "guide-food", name: "Food", allocated_amount: 1600, spent_amount: 1250 },
    { id: "guide-flex", name: "Flexible", allocated_amount: 900, spent_amount: 500 },
  ],
};
const GUIDE_DEMO_SAVINGS_GOALS = [
  {
    id: "clara-guide-demo-savings",
    name: "Sample Savings",
    goal_name: "Sample Savings",
    saved_amount: 650,
    current_amount: 650,
    target_amount: 3000,
  },
];
const GUIDE_DEMO_TOTAL_SAVINGS_SAVED = 650;
const GUIDE_DEMO_TOTAL_SAVINGS_TARGET = 3000;
const GUIDE_DEMO_SURVIVAL_EXPENSE = 0;

const runInAnimationFrame = (callback) => {
  if (typeof callback !== "function") return;

  if (typeof window === "undefined") {
    callback();
    return;
  }

  window.requestAnimationFrame(callback);
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

function ClaraGuideModeBanner({ onExit }) {
  return (
    <div className="sticky top-2 z-[95] px-2 pb-2">
      <div className="mx-auto flex max-w-[430px] items-center justify-between gap-3 rounded-full border border-cyan-100/16 bg-[rgba(4,16,34,0.82)] px-3 py-2 text-white shadow-[0_16px_42px_rgba(0,0,0,0.34),0_0_32px_rgba(34,211,238,0.10)] backdrop-blur-2xl">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-100/12 bg-cyan-300/10 text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase leading-tight tracking-[0.2em] text-cyan-100/78">
              Guide Mode
            </p>
            <p className="truncate text-[10.5px] font-semibold leading-tight text-white/58">
              Simulation only. Your real data is safe.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/[0.11]"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

function DailyMoneyTipGuideResult({ onUnderstand, onTryRealClara }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/58 px-4 pb-5 pt-20 backdrop-blur-[2px] sm:items-center sm:pb-8" role="dialog" aria-modal="true" aria-labelledby="daily-tip-guide-result-title">
      <div className="w-full max-w-[390px] overflow-hidden rounded-[30px] border border-cyan-100/14 bg-[linear-gradient(145deg,rgba(4,17,38,0.96),rgba(9,26,55,0.95)_52%,rgba(21,17,57,0.95))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.58),0_0_48px_rgba(34,211,238,0.12)]">
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100/54">
          Simulated result
        </p>
        <h2 id="daily-tip-guide-result-title" className="mt-2 text-[22px] font-black tracking-[-0.04em] text-white">
          What happens when you open it?
        </h2>
        <p className="mt-3 text-[13px] font-semibold leading-relaxed text-cyan-50/76">
          CLARA gives you one quick money insight for today. It is designed to be short, practical, and easy to apply.
        </p>
        <div className="mt-4 rounded-[24px] border border-cyan-100/14 bg-cyan-300/[0.08] p-4 text-[12px] font-semibold leading-relaxed text-cyan-50/88">
          Before spending today, ask: “Is this planned, needed, or just a reaction?”
        </div>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onUnderstand}
            className="rounded-2xl bg-cyan-200 px-4 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_16px_34px_rgba(34,211,238,0.24)] transition active:scale-[0.99]"
          >
            I understand this
          </button>
          <button
            type="button"
            onClick={onTryRealClara}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white/72 transition hover:bg-white/[0.09] active:scale-[0.99]"
          >
            Try it in real CLARA
          </button>
        </div>
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

  const effectiveWallets = isGuideMode ? GUIDE_DEMO_WALLETS : wallets;
  const effectiveWalletMoney = isGuideMode ? GUIDE_DEMO_WALLET_MONEY : walletMoney;
  const effectiveWalletPreviewTransactions = isGuideMode
    ? GUIDE_DEMO_WALLET_PREVIEW_TRANSACTIONS
    : walletPreviewTransactions;
  const effectiveMonthlyBudgetPlan = isGuideMode ? GUIDE_DEMO_MONTHLY_BUDGET_PLAN : monthlyBudgetPlan;
  const effectiveSavingsGoals = isGuideMode ? GUIDE_DEMO_SAVINGS_GOALS : savingsGoals;
  const effectiveTotalSavingsSaved = isGuideMode ? GUIDE_DEMO_TOTAL_SAVINGS_SAVED : totalSavingsSaved;
  const effectiveTotalSavingsTarget = isGuideMode ? GUIDE_DEMO_TOTAL_SAVINGS_TARGET : totalSavingsTarget;
  const effectivePrimarySavingsGoal = isGuideMode ? GUIDE_DEMO_SAVINGS_GOALS[0] : primarySavingsGoal;
  const effectiveSurvivalExpense = isGuideMode ? GUIDE_DEMO_SURVIVAL_EXPENSE : survivalExpense;
  const effectiveThisMonthSpent = isGuideMode ? 3550 : thisMonthSpent;

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
    setGuideStep(1);
  }, [guideFeature, guideStep, isGuideMode]);

  const completeDailyMoneyTipGuide = useCallback(() => {
    const nextProgress = markDailyMoneyTipGuideComplete();
    setClaraGuideProgress(nextProgress);
    exitGuideMode();
  }, [exitGuideMode]);

  const tryDailyMoneyTipInRealClara = useCallback(() => {
    exitGuideMode({ focusRealDailyTip: true });
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
      {isGuideMode && guideStep === 0 ? (
        <div className="fixed inset-0 z-40 bg-slate-950/64 backdrop-blur-[1.5px]" aria-hidden="true" />
      ) : null}

      {isGuideIntroOpen ? (
        <ClaraGuideIntroModal onStart={startGuideMode} onClose={() => setIsGuideIntroOpen(false)} />
      ) : null}

      {isGuideMode ? <ClaraGuideModeBanner onExit={exitGuideMode} /> : null}

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

      {isGuideMode && guideStep === 1 ? (
        <DailyMoneyTipGuideResult
          onUnderstand={completeDailyMoneyTipGuide}
          onTryRealClara={tryDailyMoneyTipInRealClara}
        />
      ) : null}
    </>
  );
}
