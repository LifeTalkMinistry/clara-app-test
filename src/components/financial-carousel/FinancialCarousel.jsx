import { useMemo } from "react";
import CarouselItemCard from "./ui/CarouselItemCard";
import CarouselViewport from "./ui/CarouselViewport";
import CarouselDots from "./ui/CarouselDots";
import CarouselSlideShell from "./ui/CarouselSlideShell";
import useAutoMovingHorizontalCarousel from "./logic/useAutoMovingHorizontalCarousel";
import {
  getCarouselData,
  getDefaultCarouselIndex,
} from "./logic/FinancialCarouselLogic";

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

  if (!items.length) return null;

  return (
    <div className="relative z-20 mt-0 mb-0">
      <CarouselViewport
        carouselRef={carouselRef}
        onScroll={handleScroll}
        interactionHandlers={interactionHandlers}
        clipClassName={dashboardScale.financeClip || "rounded-[28px]"}
      >
        {items.map((item) => {
          const isInlineExpanded =
            item.detailKey === expandedFinanceCard && expandedFinanceCard === "budgets";

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
