import { useEffect, useMemo } from "react";
import CarouselItemCard from "./ui/CarouselItemCard";
import CarouselViewport from "./ui/CarouselViewport";
import CarouselDots from "./ui/CarouselDots";
import CarouselSlideShell from "./ui/CarouselSlideShell";
import useAutoMovingHorizontalCarousel from "./logic/useAutoMovingHorizontalCarousel";
import {
  getCarouselData,
  getDefaultCarouselIndex,
} from "./logic/FinancialCarouselLogic";

const INLINE_FOCUS_DETAIL_KEYS = [
  "budgets",
  "wallets",
  "emergency",
  "investmentFund",
  "savings",
];

const INLINE_EXPAND_UP_OFFSET = 210;

export default function FinancialCarousel({
  dashboardScale = {},
  selectedDashboardTheme = {},
  themeInactiveDotClass = "bg-white/20 hover:bg-white/35",
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  survivalExpense = 0,
  user = null,
  guardChecked = false,
  loading = false,
  profileData = null,
  firstPositiveNumber,
  readStoredSurvivalExpense,
  onQuickExpense,
  onSurvivalSaved,
  monthlyBudgetPlan,
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  expandedFinanceCard,
  toggleFinanceDetails,
  financeActionLoading,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  onResetBudget,
  onCreateWallet,
  onMoveWallet,
  onDeleteWallet,
  onAddMoney,
  onTransferMoney,
  onEditWallet,
  onSaveSavingsGoal,
  onDeleteSavingsGoal,
  onAddSavings,
  startClaraAiLongPress,
  endClaraAiLongPress,
  handleClaraAiOrbClickCapture,
}) {
  const items = useMemo(
    () =>
      getCarouselData({
        monthlyBudgetPlan,
        savingsGoals,
        totalSavingsSaved,
        totalSavingsTarget,
        primarySavingsGoal,
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
      }),
    [
      monthlyBudgetPlan,
      savingsGoals,
      totalSavingsSaved,
      totalSavingsTarget,
      primarySavingsGoal,
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
    ]
  );

  const defaultIndex = useMemo(() => getDefaultCarouselIndex(items), [items]);

  const {
    carouselRef,
    activeIndex,
    scrollToIndex,
    handleScroll,
    interactionHandlers,
  } = useAutoMovingHorizontalCarousel({
    itemCount: items.length,
    defaultIndex,
    autoMove: false,
  });

  const isInlineFocusExpanded = INLINE_FOCUS_DETAIL_KEYS.includes(expandedFinanceCard);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    root.classList.toggle("clara-budget-focus-mode", isInlineFocusExpanded);

    return () => {
      root.classList.remove("clara-budget-focus-mode");
    };
  }, [isInlineFocusExpanded]);

  if (!items.length) return null;

  return (
    <div
      className="relative z-20 mb-0"
      style={{
        marginTop: isInlineFocusExpanded ? `-${INLINE_EXPAND_UP_OFFSET}px` : "0px",
        transition: "margin-top 520ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <style>{`
        .clara-budget-focus-shift {
          transform: translate3d(0, 0, 0);
          transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity;
        }

        .clara-budget-focus-mode .clara-budget-focus-tip {
          transform: translate3d(0, -196px, 0);
          opacity: 0.5;
          pointer-events: none;
        }

        .clara-budget-focus-mode .clara-budget-focus-hub {
          transform: translate3d(0, -196px, 0);
          opacity: 0.56;
          pointer-events: none;
        }
      `}</style>

      <CarouselViewport
        carouselRef={carouselRef}
        onScroll={handleScroll}
        interactionHandlers={interactionHandlers}
        clipClassName={dashboardScale.financeClip || "rounded-[28px]"}
      >
        {items.map((item) => {
          const isInlineExpanded =
            item.detailKey === expandedFinanceCard &&
            INLINE_FOCUS_DETAIL_KEYS.includes(expandedFinanceCard);

          return (
            <CarouselSlideShell
              key={item.key}
              item={item}
              selectedDashboardTheme={selectedDashboardTheme}
              dashboardScale={dashboardScale}
              isExpanded={isInlineExpanded}
            >
              <CarouselItemCard
                item={item}
                selectedDashboardTheme={selectedDashboardTheme}
                expandedFinanceCard={expandedFinanceCard}
                toggleFinanceDetails={toggleFinanceDetails}
                financeActionLoading={financeActionLoading}
                onQuickExpense={onQuickExpense}
                onSurvivalSaved={onSurvivalSaved}
                onSaveBudget={onSaveBudget}
                onEditBudgetCategory={onEditBudgetCategory}
                onDeleteBudgetCategory={onDeleteBudgetCategory}
                onResetBudget={onResetBudget}
                onCreateWallet={onCreateWallet}
                onMoveWallet={onMoveWallet}
                onDeleteWallet={onDeleteWallet}
                onAddMoney={onAddMoney}
                onTransferMoney={onTransferMoney}
                onEditWallet={onEditWallet}
                onSaveSavingsGoal={onSaveSavingsGoal}
                onDeleteSavingsGoal={onDeleteSavingsGoal}
                onAddSavings={onAddSavings}
                startClaraAiLongPress={startClaraAiLongPress}
                endClaraAiLongPress={endClaraAiLongPress}
                handleClaraAiOrbClickCapture={handleClaraAiOrbClickCapture}
              />
            </CarouselSlideShell>
          );
        })}
      </CarouselViewport>

      <CarouselDots
        items={items}
        activeIndex={activeIndex}
        onSelect={scrollToIndex}
        dashboardScale={dashboardScale}
        selectedDashboardTheme={selectedDashboardTheme}
        themeInactiveDotClass={themeInactiveDotClass}
      />
    </div>
  );
}
