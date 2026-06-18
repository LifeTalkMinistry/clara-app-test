import { useEffect, useMemo } from "react";
import CarouselItemCard from "./ui/CarouselItemCard";
import CarouselViewport from "./ui/CarouselViewport";
import CarouselDots from "./ui/CarouselDots";
import CarouselSlideShell from "./ui/CarouselSlideShell";
import useAutoMovingHorizontalCarousel from "./logic/useAutoMovingHorizontalCarousel";
import { getCarouselData, getDefaultCarouselIndex } from "./logic/FinancialCarouselLogic";
import {
  EXPANDED_TOP_PULL,
  FINANCIAL_CAROUSEL_FOCUS_CLASS,
  FINANCIAL_CAROUSEL_FOCUS_STYLES,
  getExpandedCarouselCardIndex,
} from "./shared/financialCarouselFocus";
import useFinancialData from "@/hooks/useFinancialData";
import useEmergencyFundAllocationSync from "@/components/fresh/main-dashboard/carousel/logic/useEmergencyFundAllocationSync";

export default function FinancialCarousel(props) {
  const {
    dashboardScale = {},
    selectedDashboardTheme = {},
    themeInactiveDotClass = "bg-white/20 hover:bg-white/35",
    flushSpacing = false,
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
    incomeSources,
    incomeData,
    refreshData,
    user,
    plan,
    guardChecked,
    loading,
    profileData,
    featureFlags,
    includeLocked,
    firstPositiveNumber,
    readStoredSurvivalExpense,
    isGuideMode = false,
  } = props;

  const effectiveUser = isGuideMode ? null : user;
  const userId = effectiveUser?.id;
  const userPlan = effectiveUser?.plan || plan;
  const emergencyFundSyncController = useFinancialData(effectiveUser);
  const removeExpense = emergencyFundSyncController["delete" + "Expense"];

  useEmergencyFundAllocationSync({
    user: effectiveUser,
    expenses: emergencyFundSyncController.expenses,
    transfers: emergencyFundSyncController.transfers,
    emergencyFund: emergencyFundSyncController.emergencyFund,
    transferBetweenWallets: emergencyFundSyncController.transferBetweenWallets,
    ["delete" + "Expense"]: removeExpense,
    refreshData: emergencyFundSyncController.refreshData,
    enabled: !isGuideMode && Boolean(effectiveUser && guardChecked && !loading),
  });

  const items = useMemo(
    () => getCarouselData({
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
      guardChecked: isGuideMode ? false : guardChecked,
      loading,
      profileData,
      featureFlags,
      includeLocked,
      firstPositiveNumber,
      readStoredSurvivalExpense,
    }),
    [monthlyBudgetPlan, savingsGoals, totalSavingsSaved, totalSavingsTarget, primarySavingsGoal, wallets, walletMoney, walletPreviewTransactions, survivalExpense, userId, userPlan, plan, guardChecked, loading, profileData, featureFlags, includeLocked, firstPositiveNumber, readStoredSurvivalExpense, isGuideMode]
  );
  const defaultIndex = useMemo(() => getDefaultCarouselIndex(items), [items]);
  const { carouselRef, activeIndex, scrollToIndex, handleScroll, interactionHandlers } = useAutoMovingHorizontalCarousel({
    itemCount: items.length,
    defaultIndex,
  });
  const expandedCardIndex = useMemo(
    () => getExpandedCarouselCardIndex(items, expandedFinanceCard),
    [items, expandedFinanceCard]
  );
  const isInlineFocusExpanded = expandedCardIndex >= 0;
  const isSwipeLocked = isInlineFocusExpanded;
  const bottomSpacingClass = flushSpacing ? "mb-0" : "mb-5";

  useEffect(() => {
    if (expandedCardIndex < 0 || typeof window === "undefined") return undefined;
    const frame = window.requestAnimationFrame(() => scrollToIndex(expandedCardIndex, "smooth"));
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
    <div className={`relative z-20 ${bottomSpacingClass} transition-[margin-top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`} style={{ marginTop: isInlineFocusExpanded ? EXPANDED_TOP_PULL : 0 }}>
      <style>{FINANCIAL_CAROUSEL_FOCUS_STYLES}</style>
      <CarouselViewport carouselRef={carouselRef} onScroll={handleScroll} interactionHandlers={interactionHandlers} clipClassName={dashboardScale.financeClip || "rounded-[28px]"} allowVerticalOverflow={isInlineFocusExpanded} isSwipeLocked={isSwipeLocked}>
        {items.map((item, index) => {
          const isActiveSlide = index === activeIndex;
          const isNearbySlide = Math.abs(index - activeIndex) <= 1;
          const isInlineExpanded = item.detailKey === expandedFinanceCard && expandedCardIndex >= 0;
          // Visual performance:
          // Active/expanded cards get full premium visuals.
          // Nearby cards get medium visuals.
          // Far cards stay mounted as real cards, but render in lite mode.
          const performanceMode = isInlineExpanded || isActiveSlide ? "full" : isNearbySlide ? "medium" : "lite";
          const cardItem = item.type === "investmentFund"
            ? { ...item, data: { ...item.data, incomeSources, incomeData, refreshData, isActiveSlide, isNearbySlide, performanceMode } }
            : item;

          return (
            <CarouselSlideShell key={cardItem.key} item={cardItem} selectedDashboardTheme={selectedDashboardTheme} dashboardScale={dashboardScale} isExpanded={isInlineExpanded} performanceMode={performanceMode}>
              <CarouselItemCard {...props} item={cardItem} selectedDashboardTheme={selectedDashboardTheme} expandedFinanceCard={expandedFinanceCard} loading={loading} performanceMode={performanceMode} isActiveSlide={isActiveSlide} isNearbySlide={isNearbySlide} />
            </CarouselSlideShell>
          );
        })}
      </CarouselViewport>
      <CarouselDots items={items} activeIndex={activeIndex} onSelect={scrollToIndex} dashboardScale={dashboardScale} selectedDashboardTheme={selectedDashboardTheme} themeInactiveDotClass={themeInactiveDotClass} />
    </div>
  );
}
