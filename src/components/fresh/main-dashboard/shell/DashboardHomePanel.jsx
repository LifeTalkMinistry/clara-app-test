import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import FinancialCarousel from "@/components/financial-carousel/FinancialCarousel";
import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";
import ClaraGuideOrbPreview from "@/components/fresh/main-dashboard/guide/ClaraGuideOrbPreview";
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
const GUIDE_FEATURE_FINANCE_CAROUSEL = "finance-carousel";
const GUIDE_FEATURE_MONEY_LEFT = "money-left";
const GUIDE_FEATURE_MONEY_LEFT_PRIVACY = "money-left-privacy";
const GUIDE_FEATURE_MONEY_LEFT_ORB = "money-left-orb";
const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";
const CLARA_GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const CLARA_GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const CLARA_GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const GUIDE_FINANCE_ROOT_CLASS = "clara-guide-finance-carousel-active";
const GUIDE_MONEY_LEFT_ROOT_CLASS = "clara-guide-money-left-active";
const GUIDE_MONEY_LEFT_PRIVACY_ROOT_CLASS = "clara-guide-money-left-privacy-active";
const GUIDE_MONEY_LEFT_ORB_ROOT_CLASS = "clara-guide-money-left-orb-active";
const FINANCE_CAROUSEL_SWIPE_LEFT_INCREASES_INDEX = true;

const createFinanceGuideTrainingState = () => ({
  hasReachedFirstEnd: false,
  hasReachedOtherEnd: false,
  financeGuideTrainingComplete: false,
  financeGuideFirstDirection: "left",
});

const createFinanceGuideSlideState = () => ({
  index: 0,
  cardKey: "budget",
  total: 0,
  swipeLeftIncreasesIndex: FINANCE_CAROUSEL_SWIPE_LEFT_INCREASES_INDEX,
});

const FINANCE_GUIDE_CARD_COPY = {
  wallet: {
    title: "WALLET OVERVIEW",
    body: "This card shows where your available money is sitting right now.",
    footer: "Use this to understand what money is actually ready to use.",
  },
  budget: {
    title: "BUDGET CHECK",
    body: "This card helps you see how much of your planned money is already assigned.",
    footer: "Use this before spending so you know if the purchase fits your plan.",
  },
  emergencyFund: {
    title: "EMERGENCY FUND",
    body: "This card shows your protection money for real unexpected problems.",
    footer: "This helps you avoid borrowing when life suddenly hits.",
  },
  savingsGoals: {
    title: "SAVINGS GOALS",
    body: "This card shows the money you are building for specific goals.",
    footer: "Savings work better when every peso has a purpose.",
  },
  investmentFund: {
    title: "INCOME HUB",
    body: "This card shows where your money comes from before it enters your wallet.",
    footer: "Use this to understand income sources before planning spending.",
  },
  debtObligations: {
    title: "DEBT / OBLIGATIONS",
    body: "This card helps you track what you owe and what still needs attention.",
    footer: "Use this to stay aware of pressure before it becomes bigger.",
  },
  fallback: {
    title: "MONEY CARD",
    body: "This card shows one part of your financial picture inside CLARA.",
    footer: "Swipe through the carousel to understand each money area.",
  },
};

const MONEY_LEFT_GUIDE_COPY = {
  title: "MONEY LEFT",
  body: "This shows what remains after your recorded spending is taken from your available money.",
  footer: "Use this as a quick reality check before your next expense.",
};

const MONEY_LEFT_PRIVACY_GUIDE_COPY = {
  "await-hide": {
    title: "PRIVACY CONTROL",
    body: "Tap the eye icon to hide your Money Left and Total Expense amounts.",
    footer: "TAP THE EYE ICON NOW.",
  },
  "await-show": {
    title: "PRIVACY MODE ON",
    body: "Your financial amounts are now hidden from anyone looking at your screen.",
    footer: "TAP THE CROSSED-EYE ICON TO SHOW THEM AGAIN.",
  },
  complete: {
    title: "AMOUNTS RESTORED",
    body: "Use this control whenever you need privacy without leaving your dashboard.",
    footer: "YOUR MONEY IS VISIBLE AGAIN.",
  },
};

const MONEY_LEFT_ORB_GUIDE_COPY = {
  intro: {
    title: "MEET THE CLARA ORB",
    body: "One control gives you three quick actions.",
    footer: "LEARN EACH ACTION ONE AT A TIME.",
  },
  "await-single": {
    title: "1 TAP — LOG EXPENSE",
    body: "Tap the CLARA orb once to open the quick expense logger.",
    footer: "TAP THE ORB ONCE.",
  },
  "await-double": {
    title: "2 TAPS — TRANSACTION HUB",
    body: "Tap the orb twice quickly to open your complete transaction history.",
    footer: "DOUBLE-TAP THE ORB NOW.",
  },
  "await-hold": {
    title: "HOLD — CHAT WITH CLARA",
    body: "Press and hold the orb until CLARA opens.",
    footer: "PRESS AND HOLD THE ORB NOW.",
  },
  complete: {
    title: "ORB READY",
    body: "Tap once to log an expense, tap twice for Transaction Hub, or hold to chat with CLARA.",
    footer: "YOU NOW KNOW ALL THREE ORB ACTIONS.",
  },
};

const MONEY_LEFT_ORB_GUIDE_ITEMS = [
  { label: "1 TAP", value: "Log Expense" },
  { label: "2 TAPS", value: "Transaction Hub" },
  { label: "HOLD", value: "Chat with CLARA" },
];

const getFinanceGuideCardCopy = (cardKey) =>
  FINANCE_GUIDE_CARD_COPY[cardKey] || FINANCE_GUIDE_CARD_COPY.fallback;

const getCarouselGuideBubbleCopy = ({ training, slide }) => {
  const firstDirection = training?.financeGuideFirstDirection || "left";

  if (!training?.hasReachedFirstEnd) {
    return {
      title: "SWIPE CAROUSEL",
      body: `Now swipe ${firstDirection} until you reach the end of the carousel.`,
      footer: `Keep swiping ${firstDirection} to continue.`,
    };
  }

  if (!training?.financeGuideTrainingComplete) {
    return {
      title: "GREAT — SWIPE BACK",
      body: "Now swipe right until you reach the other end of the carousel.",
      footer: "Keep swiping right to continue.",
    };
  }

  return getFinanceGuideCardCopy(slide?.cardKey);
};

const setGuideRootFeatureClass = (feature) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle(GUIDE_FINANCE_ROOT_CLASS, feature === GUIDE_FEATURE_FINANCE_CAROUSEL);
  root.classList.toggle(GUIDE_MONEY_LEFT_ROOT_CLASS, feature === GUIDE_FEATURE_MONEY_LEFT);
  root.classList.toggle(
    GUIDE_MONEY_LEFT_PRIVACY_ROOT_CLASS,
    feature === GUIDE_FEATURE_MONEY_LEFT_PRIVACY
  );
  root.classList.toggle(
    GUIDE_MONEY_LEFT_ORB_ROOT_CLASS,
    feature === GUIDE_FEATURE_MONEY_LEFT_ORB
  );
};

const preserveDashboardScrollPosition = (callback) => {
  if (typeof callback !== "function") return;

  if (typeof window === "undefined" || typeof document === "undefined") {
    callback();
    return;
  }

  const carouselAnchor = document.querySelector(".clara-guide-carousel-anchor");
  const dashboardScroller = carouselAnchor?.closest?.("main") || document.scrollingElement;
  const lockedScrollTop = Number(dashboardScroller?.scrollTop) || 0;

  const restorePosition = () => {
    if (!dashboardScroller) return;
    const currentScrollTop = Number(dashboardScroller.scrollTop) || 0;
    if (Math.abs(currentScrollTop - lockedScrollTop) > 0.5) {
      dashboardScroller.scrollTop = lockedScrollTop;
    }
  };

  callback();
  window.requestAnimationFrame(() => {
    restorePosition();
    window.requestAnimationFrame(restorePosition);
  });
};

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

function CarouselGuideBubbleOverlay({
  copy,
  items = [],
  actionLabel = "",
  actionAriaLabel = "",
  actionButtonRef,
  onAction,
}) {
  const safeCopy = copy || FINANCE_GUIDE_CARD_COPY.fallback;
  const safeItems = Array.isArray(items)
    ? items.filter((item) => item?.label && item?.value)
    : [];
  const hasAction = Boolean(actionLabel && typeof onAction === "function");
  const actionLockRef = useRef(false);
  const actionUnlockTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && actionUnlockTimerRef.current !== null) {
        window.clearTimeout(actionUnlockTimerRef.current);
      }
    },
    []
  );

  const stopPointerPropagation = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const activateAction = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      if (!hasAction || actionLockRef.current) return;

      actionLockRef.current = true;

      if (typeof window !== "undefined") {
        if (actionUnlockTimerRef.current !== null) {
          window.clearTimeout(actionUnlockTimerRef.current);
        }

        actionUnlockTimerRef.current = window.setTimeout(() => {
          actionLockRef.current = false;
          actionUnlockTimerRef.current = null;
        }, 300);
      }

      onAction();
    },
    [hasAction, onAction]
  );

  return (
    <div
      className="clara-guide-carousel-bubble-shell pointer-events-none fixed left-1/2 z-[240] w-[min(calc(100vw-48px),360px)] -translate-x-1/2 isolate"
      style={{ top: "clamp(96px, 12dvh, 128px)" }}
    >
      <div
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-carousel-bubble-title"
        className="relative min-h-[150px] rounded-[30px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.98),rgba(10,22,54,0.98)_52%,rgba(27,18,65,0.98))] px-6 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div className="clara-guide-carousel-bubble-arrow pointer-events-none absolute -bottom-2 left-11 h-4 w-4 rotate-45 border-b border-r border-cyan-100/24 bg-[rgba(10,22,54,0.98)]" />

        <p
          id="clara-guide-carousel-bubble-title"
          className="relative z-10 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          {safeCopy.title}
        </p>

        <p className="relative z-10 mt-3 text-[14px] font-bold leading-relaxed text-white">
          {safeCopy.body}
        </p>

        {safeItems.length > 0 ? (
          <div className="clara-guide-carousel-bubble-items relative z-10 mt-4 grid gap-2">
            {safeItems.map((item) => (
              <div
                key={`${item.label}-${item.value}`}
                className="clara-guide-carousel-bubble-item flex items-center justify-between gap-3 rounded-2xl border border-cyan-100/10 bg-white/[0.045] px-3 py-2.5"
              >
                <span className="clara-guide-carousel-bubble-item-label text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/64">
                  {item.label}
                </span>
                <span className="clara-guide-carousel-bubble-item-value text-right text-[12px] font-black text-white">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <p className="relative z-10 mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          {safeCopy.footer}
        </p>

        {hasAction ? (
          <button
            ref={actionButtonRef}
            type="button"
            data-clara-guide-action="next"
            aria-label={actionAriaLabel || undefined}
            onPointerDownCapture={stopPointerPropagation}
            onPointerUpCapture={stopPointerPropagation}
            onClick={activateAction}
            className="clara-guide-carousel-next-button pointer-events-auto relative z-20 mt-4 min-h-[44px] w-full touch-manipulation select-none cursor-pointer rounded-full border border-cyan-100/30 bg-cyan-100/15 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99]"
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {actionLabel}
          </button>
        ) : null}
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
  const [financeGuideSlide, setFinanceGuideSlide] = useState(() => createFinanceGuideSlideState());
  const [financeGuideTraining, setFinanceGuideTraining] = useState(() => createFinanceGuideTrainingState());
  const [guideMoneySummaryVisible, setGuideMoneySummaryVisible] = useState(true);
  const [moneyLeftPrivacyPhase, setMoneyLeftPrivacyPhase] = useState("await-hide");
  const [moneyLeftOrbPhase, setMoneyLeftOrbPhase] = useState("intro");
  const [guideOrbPreview, setGuideOrbPreview] = useState(null);
  const guideOrbButtonRef = useRef(null);
  const guideBubbleActionRef = useRef(null);
  const guideOrbCompletionDispatchRef = useRef(false);
  const guideTransitionLockRef = useRef(false);
  const currentPlan = user?.plan || user?.subscription?.plan || "free";
  const effectivePlan = isGuideMode ? "pro" : currentPlan;
  const isFreePlan = currentPlan === "free";
  const hasNewDailyMoneyTipGuide = !isDailyMoneyTipGuideComplete(claraGuideProgress);
  const isDailyTipGuideActive = isGuideMode && guideFeature === GUIDE_FEATURE_DAILY_MONEY_TIP && guideStep === 0;
  const isCarouselGuideActive = isGuideMode && guideFeature === GUIDE_FEATURE_FINANCE_CAROUSEL;
  const isMoneyLeftGuideActive = isGuideMode && guideFeature === GUIDE_FEATURE_MONEY_LEFT;
  const isMoneyLeftPrivacyGuideActive =
    isGuideMode && guideFeature === GUIDE_FEATURE_MONEY_LEFT_PRIVACY;
  const isMoneyLeftOrbGuideActive =
    isGuideMode && guideFeature === GUIDE_FEATURE_MONEY_LEFT_ORB;
  const isMoneyLeftOrbIntroActive =
    isMoneyLeftOrbGuideActive && moneyLeftOrbPhase === "intro";
  const isMoneyLeftOrbComplete =
    isMoneyLeftOrbGuideActive &&
    moneyLeftOrbPhase === "complete" &&
    guideOrbPreview === null;
  const shouldShowMoneyLeftOrbGuideBubble =
    isMoneyLeftOrbGuideActive &&
    (moneyLeftOrbPhase === "intro" ||
      moneyLeftOrbPhase === "await-single" ||
      moneyLeftOrbPhase === "await-double" ||
      moneyLeftOrbPhase === "await-hold" ||
      moneyLeftOrbPhase === "complete");
  const isFinanceGuideTerminalDebt =
    isCarouselGuideActive &&
    financeGuideTraining.financeGuideTrainingComplete &&
    financeGuideSlide.cardKey === "debtObligations";
  const financeGuideAllowedSwipeDirection = isCarouselGuideActive
    ? !financeGuideTraining.hasReachedFirstEnd
      ? "left"
      : !financeGuideTraining.financeGuideTrainingComplete
        ? "right"
        : null
    : null;
  const financeGuideMaxStepPerInteraction =
    isCarouselGuideActive &&
    financeGuideTraining.financeGuideTrainingComplete &&
    !isFinanceGuideTerminalDebt
      ? 1
      : null;
  const financeGuideBubbleCopy = getCarouselGuideBubbleCopy({
    training: financeGuideTraining,
    slide: financeGuideSlide,
  });
  const activeGuideBubbleCopy = isMoneyLeftPrivacyGuideActive
    ? MONEY_LEFT_PRIVACY_GUIDE_COPY[moneyLeftPrivacyPhase] ||
      MONEY_LEFT_PRIVACY_GUIDE_COPY["await-hide"]
    : isMoneyLeftOrbGuideActive
      ? MONEY_LEFT_ORB_GUIDE_COPY[moneyLeftOrbPhase] || MONEY_LEFT_ORB_GUIDE_COPY.intro
      : isMoneyLeftGuideActive
        ? MONEY_LEFT_GUIDE_COPY
        : financeGuideBubbleCopy;
  const activeGuideBubbleItems =
    isMoneyLeftOrbGuideActive && moneyLeftOrbPhase === "intro"
      ? MONEY_LEFT_ORB_GUIDE_ITEMS
      : [];

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
    guideOrbCompletionDispatchRef.current = false;
    setIsGuideMode(false);
    setGuideStep(0);
    setGuideFeature(GUIDE_FEATURE_DAILY_MONEY_TIP);
    setFinanceGuideSlide(createFinanceGuideSlideState());
    setFinanceGuideTraining(createFinanceGuideTrainingState());
    setGuideMoneySummaryVisible(true);
    setMoneyLeftPrivacyPhase("await-hide");
    setMoneyLeftOrbPhase("intro");
    setGuideOrbPreview(null);
    setGuideRootFeatureClass(null);
    emitGuideModeChange(false);

    if (focusRealDailyTip && typeof window !== "undefined") {
      window.setTimeout(() => {
        const dailyTipCard = document.querySelector("[data-clara-daily-tip-card='true']");
        dailyTipCard?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }, 80);
    }
  }, []);

  const startGuideMode = useCallback(() => {
    guideOrbCompletionDispatchRef.current = false;
    setIsGuideIntroOpen(false);
    setGuideFeature(GUIDE_FEATURE_DAILY_MONEY_TIP);
    setGuideStep(0);
    setFinanceGuideSlide(createFinanceGuideSlideState());
    setFinanceGuideTraining(createFinanceGuideTrainingState());
    setGuideMoneySummaryVisible(true);
    setMoneyLeftPrivacyPhase("await-hide");
    setMoneyLeftOrbPhase("intro");
    setGuideOrbPreview(null);
    setGuideRootFeatureClass(null);
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

  const handleGuideNextToMoneyLeft = useCallback(() => {
    if (!isFinanceGuideTerminalDebt || guideTransitionLockRef.current) return;

    guideTransitionLockRef.current = true;

    preserveDashboardScrollPosition(() => {
      setGuideFeature(GUIDE_FEATURE_MONEY_LEFT);
      setGuideStep(0);
      setGuideMoneySummaryVisible(true);
      setMoneyLeftPrivacyPhase("await-hide");
      setGuideRootFeatureClass(GUIDE_FEATURE_MONEY_LEFT);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(CLARA_GUIDE_TARGET_CHANGE_EVENT, {
            detail: { feature: GUIDE_FEATURE_MONEY_LEFT },
          })
        );
      }
    });
  }, [isFinanceGuideTerminalDebt]);

  const handleGuideNextToMoneyLeftPrivacy = useCallback(() => {
    if (!isMoneyLeftGuideActive) return;

    preserveDashboardScrollPosition(() => {
      setGuideFeature(GUIDE_FEATURE_MONEY_LEFT_PRIVACY);
      setGuideStep(0);
      setGuideMoneySummaryVisible(true);
      setMoneyLeftPrivacyPhase("await-hide");
      setGuideRootFeatureClass(GUIDE_FEATURE_MONEY_LEFT_PRIVACY);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(CLARA_GUIDE_TARGET_CHANGE_EVENT, {
            detail: { feature: GUIDE_FEATURE_MONEY_LEFT_PRIVACY },
          })
        );
      }
    });
  }, [isMoneyLeftGuideActive]);

  const handleGuidePrivacyToggle = useCallback(() => {
    if (!isMoneyLeftPrivacyGuideActive) return;

    if (moneyLeftPrivacyPhase === "await-hide") {
      setGuideMoneySummaryVisible(false);
      setMoneyLeftPrivacyPhase("await-show");
      return;
    }

    if (moneyLeftPrivacyPhase === "await-show") {
      setGuideMoneySummaryVisible(true);
      setMoneyLeftPrivacyPhase("complete");
    }
  }, [isMoneyLeftPrivacyGuideActive, moneyLeftPrivacyPhase]);

  const handleGuideNextToMoneyLeftOrb = useCallback(() => {
    if (
      !isMoneyLeftPrivacyGuideActive ||
      moneyLeftPrivacyPhase !== "complete" ||
      guideTransitionLockRef.current
    ) {
      return;
    }

    guideTransitionLockRef.current = true;

    preserveDashboardScrollPosition(() => {
      guideOrbCompletionDispatchRef.current = false;
      setGuideFeature(GUIDE_FEATURE_MONEY_LEFT_ORB);
      setGuideStep(0);
      setGuideMoneySummaryVisible(true);
      setMoneyLeftOrbPhase("intro");
      setGuideOrbPreview(null);
      setGuideRootFeatureClass(GUIDE_FEATURE_MONEY_LEFT_ORB);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(CLARA_GUIDE_TARGET_CHANGE_EVENT, {
            detail: { feature: GUIDE_FEATURE_MONEY_LEFT_ORB },
          })
        );
      }
    });
  }, [isMoneyLeftPrivacyGuideActive, moneyLeftPrivacyPhase]);

  const handleGuideOrbIntroNext = useCallback(() => {
    if (!isMoneyLeftOrbGuideActive || moneyLeftOrbPhase !== "intro") return;

    preserveDashboardScrollPosition(() => {
      setMoneyLeftOrbPhase("await-single");
      setGuideOrbPreview(null);
    });
  }, [isMoneyLeftOrbGuideActive, moneyLeftOrbPhase]);

  const handleGuideOrbSingleTap = useCallback(() => {
    if (!isMoneyLeftOrbGuideActive || moneyLeftOrbPhase !== "await-single") return;

    setGuideOrbPreview("log-expense");
    setMoneyLeftOrbPhase("single-preview");
  }, [isMoneyLeftOrbGuideActive, moneyLeftOrbPhase]);

  const handleGuideOrbDoubleTap = useCallback(() => {
    if (!isMoneyLeftOrbGuideActive || moneyLeftOrbPhase !== "await-double") return;

    setGuideOrbPreview("transaction-hub");
    setMoneyLeftOrbPhase("double-preview");
  }, [isMoneyLeftOrbGuideActive, moneyLeftOrbPhase]);

  const handleGuideOrbLongPress = useCallback(() => {
    if (!isMoneyLeftOrbGuideActive || moneyLeftOrbPhase !== "await-hold") return;

    setGuideOrbPreview("clara-chat");
    setMoneyLeftOrbPhase("hold-preview");
  }, [isMoneyLeftOrbGuideActive, moneyLeftOrbPhase]);

  const handleGuideOrbPreviewNext = useCallback(() => {
    if (!isMoneyLeftOrbGuideActive) return;

    const nextPhase =
      moneyLeftOrbPhase === "single-preview" && guideOrbPreview === "log-expense"
        ? "await-double"
        : moneyLeftOrbPhase === "double-preview" && guideOrbPreview === "transaction-hub"
          ? "await-hold"
          : moneyLeftOrbPhase === "hold-preview" && guideOrbPreview === "clara-chat"
            ? "complete"
            : null;

    if (!nextPhase) return;

    preserveDashboardScrollPosition(() => {
      if (nextPhase === "complete") {
        guideOrbCompletionDispatchRef.current = false;
      }

      setGuideOrbPreview(null);
      setMoneyLeftOrbPhase(nextPhase);

      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const focusTarget =
            nextPhase === "complete"
              ? guideBubbleActionRef.current
              : guideOrbButtonRef.current;
          focusTarget?.focus?.({ preventScroll: true });
        });
      }
    });
  }, [guideOrbPreview, isMoneyLeftOrbGuideActive, moneyLeftOrbPhase]);

  const handleGuideOrbCompleteNext = useCallback(() => {
    if (
      !isMoneyLeftOrbComplete ||
      guideOrbCompletionDispatchRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    guideOrbCompletionDispatchRef.current = true;

    preserveDashboardScrollPosition(() => {
      window.dispatchEvent(
        new CustomEvent(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, {
          detail: { feature: GUIDE_FEATURE_MONEY_LEFT_ORB },
        })
      );
    });
  }, [isMoneyLeftOrbComplete]);

  const handleFinanceCarouselIndexChange = useCallback(
    (detail = {}) => {
      const total = Math.max(0, Number(detail.total) || 0);
      const rawIndex = Number(detail.index) || 0;
      const index = total > 0 ? Math.max(0, Math.min(total - 1, rawIndex)) : 0;
      const cardKey = detail.cardKey || detail.cardType || "fallback";
      const swipeLeftIncreasesIndex = detail.swipeLeftIncreasesIndex !== false;

      setFinanceGuideSlide({
        index,
        cardKey,
        total,
        swipeLeftIncreasesIndex,
      });

      if (!isCarouselGuideActive || total <= 0) return;

      setFinanceGuideTraining((current) => {
        const firstTerminalIndex = swipeLeftIncreasesIndex ? total - 1 : 0;
        const otherTerminalIndex = swipeLeftIncreasesIndex ? 0 : total - 1;
        const hasReachedFirstEnd = current.hasReachedFirstEnd || index === firstTerminalIndex;
        const hasReachedOtherEnd =
          hasReachedFirstEnd && (current.hasReachedOtherEnd || index === otherTerminalIndex);
        const financeGuideTrainingComplete = hasReachedFirstEnd && hasReachedOtherEnd;

        if (
          current.hasReachedFirstEnd === hasReachedFirstEnd &&
          current.hasReachedOtherEnd === hasReachedOtherEnd &&
          current.financeGuideTrainingComplete === financeGuideTrainingComplete
        ) {
          return current;
        }

        return {
          ...current,
          hasReachedFirstEnd,
          hasReachedOtherEnd,
          financeGuideTrainingComplete,
        };
      });
    },
    [isCarouselGuideActive]
  );

  useEffect(() => {
    guideTransitionLockRef.current = false;
  }, [guideFeature]);

  useEffect(() => {
    if (!isMoneyLeftOrbComplete) {
      guideOrbCompletionDispatchRef.current = false;
    }
  }, [isMoneyLeftOrbComplete]);

  useEffect(() => {
    if (
      isCarouselGuideActive ||
      isMoneyLeftGuideActive ||
      isMoneyLeftPrivacyGuideActive ||
      isMoneyLeftOrbGuideActive
    ) {
      return undefined;
    }

    setFinanceGuideSlide(createFinanceGuideSlideState());
    setFinanceGuideTraining(createFinanceGuideTrainingState());

    return undefined;
  }, [
    isCarouselGuideActive,
    isMoneyLeftGuideActive,
    isMoneyLeftPrivacyGuideActive,
    isMoneyLeftOrbGuideActive,
  ]);

  useEffect(() => {
    if (isMoneyLeftPrivacyGuideActive) return;
    setGuideMoneySummaryVisible(true);
    setMoneyLeftPrivacyPhase("await-hide");
  }, [isMoneyLeftPrivacyGuideActive]);

  useEffect(() => {
    if (isMoneyLeftOrbGuideActive) return;
    setMoneyLeftOrbPhase("intro");
    setGuideOrbPreview(null);
  }, [isMoneyLeftOrbGuideActive]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleGuideTargetChange = (event) => {
      const feature = event?.detail?.feature;

      if (feature !== GUIDE_FEATURE_MONEY_LEFT_ORB) {
        guideOrbCompletionDispatchRef.current = false;
        setMoneyLeftOrbPhase("intro");
        setGuideOrbPreview(null);
        setGuideRootFeatureClass(feature);
      }

      if (feature === GUIDE_FEATURE_FINANCE_CAROUSEL) {
        setGuideFeature(GUIDE_FEATURE_FINANCE_CAROUSEL);
        setGuideStep(0);
        setFinanceGuideSlide(createFinanceGuideSlideState());
        setFinanceGuideTraining(createFinanceGuideTrainingState());
        setGuideMoneySummaryVisible(true);
        setMoneyLeftPrivacyPhase("await-hide");
        setGuideRootFeatureClass(GUIDE_FEATURE_FINANCE_CAROUSEL);
        return;
      }

      if (feature === GUIDE_FEATURE_MONEY_LEFT) {
        setGuideFeature(GUIDE_FEATURE_MONEY_LEFT);
        setGuideStep(0);
        setGuideMoneySummaryVisible(true);
        setMoneyLeftPrivacyPhase("await-hide");
        setGuideRootFeatureClass(GUIDE_FEATURE_MONEY_LEFT);
        return;
      }

      if (feature === GUIDE_FEATURE_MONEY_LEFT_PRIVACY) {
        setGuideFeature(GUIDE_FEATURE_MONEY_LEFT_PRIVACY);
        setGuideStep(0);
        setGuideMoneySummaryVisible(true);
        setMoneyLeftPrivacyPhase("await-hide");
        setGuideRootFeatureClass(GUIDE_FEATURE_MONEY_LEFT_PRIVACY);
        return;
      }

      if (feature === GUIDE_FEATURE_MONEY_LEFT_ORB) {
        guideOrbCompletionDispatchRef.current = false;
        setGuideFeature(GUIDE_FEATURE_MONEY_LEFT_ORB);
        setGuideStep(0);
        setGuideMoneySummaryVisible(true);
        setMoneyLeftPrivacyPhase("await-hide");
        setMoneyLeftOrbPhase("intro");
        setGuideOrbPreview(null);
        setGuideRootFeatureClass(GUIDE_FEATURE_MONEY_LEFT_ORB);
      }
    };

    window.addEventListener(CLARA_GUIDE_TARGET_CHANGE_EVENT, handleGuideTargetChange);

    return () => {
      window.removeEventListener(CLARA_GUIDE_TARGET_CHANGE_EVENT, handleGuideTargetChange);
    };
  }, []);

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

  const activeGuideActionLabel =
    isFinanceGuideTerminalDebt ||
    isMoneyLeftGuideActive ||
    (isMoneyLeftPrivacyGuideActive && moneyLeftPrivacyPhase === "complete") ||
    isMoneyLeftOrbIntroActive ||
    isMoneyLeftOrbComplete
      ? "NEXT"
      : "";
  const activeGuideActionHandler = isFinanceGuideTerminalDebt
    ? handleGuideNextToMoneyLeft
    : isMoneyLeftGuideActive
      ? handleGuideNextToMoneyLeftPrivacy
      : isMoneyLeftPrivacyGuideActive && moneyLeftPrivacyPhase === "complete"
        ? handleGuideNextToMoneyLeftOrb
        : isMoneyLeftOrbIntroActive
          ? handleGuideOrbIntroNext
          : isMoneyLeftOrbComplete
            ? handleGuideOrbCompleteNext
            : undefined;
  const activeGuideActionAriaLabel = isMoneyLeftOrbComplete
    ? "Complete CLARA orb guide"
    : "";

  return (
    <>
      {isGuideMode ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/82 backdrop-blur-[2px]" aria-hidden="true" />
      ) : null}

      {(isCarouselGuideActive ||
        isMoneyLeftGuideActive ||
        isMoneyLeftPrivacyGuideActive ||
        shouldShowMoneyLeftOrbGuideBubble) && guideOrbPreview === null ? (
        <CarouselGuideBubbleOverlay
          copy={activeGuideBubbleCopy}
          items={activeGuideBubbleItems}
          actionLabel={activeGuideActionLabel}
          actionAriaLabel={activeGuideActionAriaLabel}
          actionButtonRef={guideBubbleActionRef}
          onAction={activeGuideActionHandler}
        />
      ) : null}

      {isMoneyLeftOrbGuideActive && guideOrbPreview ? (
        <ClaraGuideOrbPreview
          preview={guideOrbPreview}
          onNext={handleGuideOrbPreviewNext}
        />
      ) : null}

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
            isDailyTipGuideActive={isDailyTipGuideActive}
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

              <div
                className={`clara-guide-carousel-anchor relative overflow-visible ${
                  isCarouselGuideActive ? "clara-guide-carousel-target" : ""
                } ${
                  isFinanceGuideTerminalDebt
                    ? "clara-guide-carousel-terminal-locked"
                    : ""
                }`}
              >
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
                  onGuideCarouselIndexChange={isCarouselGuideActive ? handleFinanceCarouselIndexChange : undefined}
                  guideAllowedSwipeDirection={financeGuideAllowedSwipeDirection}
                  guideMaxStepPerInteraction={financeGuideMaxStepPerInteraction}
                  guideCarouselLocked={isFinanceGuideTerminalDebt}
                />
              </div>
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
            isGuideMode={isGuideMode}
            isGuidePrivacyStepActive={isMoneyLeftPrivacyGuideActive}
            isGuideOrbStepActive={isMoneyLeftOrbGuideActive}
            isGuideOrbIntroActive={isMoneyLeftOrbIntroActive}
            guideOrbPhase={moneyLeftOrbPhase}
            guideOrbButtonRef={guideOrbButtonRef}
            onGuideOrbSingleTap={handleGuideOrbSingleTap}
            onGuideOrbDoubleTap={handleGuideOrbDoubleTap}
            onGuideOrbLongPress={handleGuideOrbLongPress}
            guideMoneySummaryVisible={guideMoneySummaryVisible}
            onGuidePrivacyToggle={handleGuidePrivacyToggle}
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
