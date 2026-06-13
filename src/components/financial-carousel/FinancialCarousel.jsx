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
import {
  EXPANDED_TOP_PULL,
  FINANCIAL_CAROUSEL_FOCUS_CLASS,
  FINANCIAL_CAROUSEL_FOCUS_STYLES,
  getExpandedCarouselCardIndex,
} from "./shared/financialCarouselFocus";
import useFinancialData from "@/hooks/useFinancialData";
import useEmergencyFundAllocationSync from "@/components/fresh/main-dashboard/carousel/logic/useEmergencyFundAllocationSync";

function CarouselCardPlaceholder({ item }) {
  return (
    <div
      className="pointer-events-none flex h-full min-h-[inherit] items-center justify-center rounded-[inherit] border border-white/[0.04] bg-black/[0.08]"
      aria-hidden="true"
    >
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
        {item?.label || "CLARA"}
      </span>
    </div>
  );
}

export default function FinancialCarousel(props) {
  const {
    dashboardScale = {},
    selectedDashboardTheme = {},
    themeInactiveDotClass = "bg-white/20 hover:bg-white/35",
    expandedFinanceCard,
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
    plan,
    guardChecked,
    loading,
    profileData,
    featureFlags,
    includeLocked,
    firstPositiveNumber,
    readStoredSurvivalExpense,
    toggleFinanceDetails,
    financeActionLoading,
    onQuickExpense,
    onSurvivalSaved,
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
  } = props;

  const userId = user?.id;
  const userPlan = user?.plan;
  const emergencyFundSyncController = useFinancialData(user);

  useEmergencyFundAllocationSync({
    user,
    expenses: emergencyFundSyncController.expenses,
    transfers: emergencyFundSyncController.transfers,
    emergencyFund: emergencyFundSyncController.emergencyFund,
    transferBetweenWallets: emergencyFundSyncController.transferBetweenWallets,
    deleteExpense: emergencyFundSyncController.deleteExpense,
    refreshData: emergencyFundSyncController.refreshData,
    enabled: Boolean(user && guardChecked && !loading),
  });

  // Performance:
  // Do not depend on the full props object here.
  // DashboardHomePanel can recreate callback props during UI changes.
  // Keep carousel item generation tied only to values that affect registry output.
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
        user: userId || userPlan ? { id: userId, plan: userPlan } : null,
        plan,
        guardChecked,
        loading,
        profileData,
        featureFlags,
        includeLocked,
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
      userId,
      userPlan,
      plan,
      guardChecked,
      loading,
      profileData,
      featureFlags,
      includeLocked,
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

  const expandedCardIndex = useMemo(
    () => getExpandedCarouselCardIndex(items, expandedFinanceCard),
    [items, expandedFinanceCard]
  );

  const isInlineFocusExpanded = expandedCardIndex >= 0;

  useEffect(() => {
    if (expandedCardIndex < 0 || typeof window === "undefined") return undefined;

    const frame = window.requestAnimationFrame(() => {
      scrollToIndex(expandedCardIndex, "smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [expandedCardIndex, scrollToIndex]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    root.classList.toggle(FINANCIAL_CAROUSEL_FOCUS_CLASS, isInlineFocusExpanded);

    return () => root.classList.remove(FINANCIAL_CAROUSEL_FOCUS_CLASS);
  }, [isInlineFocusExpanded]);

  if (!items.length) return null;

  return (
    <div
      className="relative z-20 mb-5 transition-[margin-top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ marginTop: isInlineFocusExpanded ? EXPANDED_TOP_PULL : 0 }}
    >
      <style>{FINANCIAL_CAROUSEL_FOCUS_STYLES}</style>

      <CarouselViewport
        carouselRef={carouselRef}
        onScroll={handleScroll}
        interactionHandlers={interactionHandlers}
        clipClassName={dashboardScale.financeClip || "rounded-[28px]"}
        allowVerticalOverflow={isInlineFocusExpanded}
      >
        {items.map((item, index) => {
          const isNearbySlide = Math.abs(index - activeIndex) <= 1;
          const isDefaultSlide = index === defaultIndex;
          const isInlineExpanded =
            item.detailKey === expandedFinanceCard && expandedCardIndex >= 0;
          const shouldRenderFullCard =
            isNearbySlide || isDefaultSlide || isInlineExpanded;

          return (
            <CarouselSlideShell
              key={item.key}
              item={item}
              selectedDashboardTheme={selectedDashboardTheme}
              dashboardScale={dashboardScale}
              isExpanded={isInlineExpanded}
            >
              {shouldRenderFullCard ? (
                <CarouselItemCard
                  item={item}
                  selectedDashboardTheme={selectedDashboardTheme}
                  expandedFinanceCard={expandedFinanceCard}
                  toggleFinanceDetails={toggleFinanceDetails}
                  financeActionLoading={financeActionLoading}
                  loading={loading}
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
              ) : (
                <CarouselCardPlaceholder item={item} />
              )}
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
