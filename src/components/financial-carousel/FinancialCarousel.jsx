import { useEffect, useMemo } from "react";
import CarouselItemCard from "./ui/CarouselItemCard";
import CarouselViewport from "./ui/CarouselViewport";
import CarouselDots from "./ui/CarouselDots";
import CarouselSlideShell from "./ui/CarouselSlideShell";
import useAutoMovingHorizontalCarousel from "./logic/useAutoMovingHorizontalCarousel";
import useGuideMobileSwipeAdapter from "./logic/useGuideMobileSwipeAdapter";
import { getCarouselData, getDefaultCarouselIndex } from "./logic/FinancialCarouselLogic";
import {
  EXPANDED_TOP_PULL,
  FINANCIAL_CAROUSEL_FOCUS_CLASS,
  FINANCIAL_CAROUSEL_FOCUS_STYLES,
  getExpandedCarouselCardIndex,
} from "./shared/financialCarouselFocus";
import "./shared/financialCarouselGuideMatchedVisual.css";
import useEmergencyFundAllocationSync from "@/components/fresh/main-dashboard/carousel/logic/useEmergencyFundAllocationSync";
import {
  CLARA_OPEN_ADD_MONEY_EVENT,
  CLARA_OPEN_CREATE_WALLET_EVENT,
} from "@/lib/clara-wallet-action-events";
import { COMMITTED_PLAN_KEY, FREE_PLAN_KEY } from "@/lib/membership";

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
    financeCardController = null,
    isGuideMode = false,
    onGuideCarouselIndexChange,
    guideAllowedSwipeDirection = null,
    guideMaxStepPerInteraction = null,
    guideCarouselLocked = false,
    onCreateWallet,
    onAddMoney,
  } = props;

  const effectiveUser = isGuideMode ? null : user;
  const userId = effectiveUser?.id;
  const role = String(effectiveUser?.role || "").trim().toLowerCase();
  const hasActiveCommittedAccess = Boolean(
    effectiveUser?.subscription?.isPaid === true ||
      effectiveUser?.subscription?.isActiveCommitted === true ||
      (effectiveUser?.access_level === "committed" &&
        effectiveUser?.subscription_status === "active")
  );
  const accessPlan = isGuideMode
    ? COMMITTED_PLAN_KEY
    : role === "admin" || role === "advertiser"
      ? role
      : hasActiveCommittedAccess
        ? COMMITTED_PLAN_KEY
        : FREE_PLAN_KEY;
  const {
    expenses: financeExpenses = [],
    transfers: financeTransfers = [],
    emergencyFund: financeEmergencyFund = null,
    totalIncome: financeTotalIncome = 0,
    totalExpenses: financeTotalExpenses = 0,
    totalWalletBalance: financeTotalWalletBalance = 0,
    refreshData: refreshFinanceData,
    deleteExpense: deleteFinanceExpense,
    transferBetweenWallets: transferFinanceWallets,
  } = financeCardController || {};

  useEmergencyFundAllocationSync({
    user: effectiveUser,
    expenses: financeExpenses,
    transfers: financeTransfers,
    emergencyFund: financeEmergencyFund,
    transferBetweenWallets: transferFinanceWallets,
    deleteExpense: deleteFinanceExpense,
    refreshData: refreshFinanceData,
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
      financeEmergencyFund,
      financeTotalIncome,
      financeTotalExpenses,
      financeTotalWalletBalance,
      user: { id: userId, plan: accessPlan },
      plan: accessPlan,
      guardChecked: isGuideMode ? false : guardChecked,
      loading,
      profileData,
      featureFlags,
      includeLocked,
    }),
    [monthlyBudgetPlan, savingsGoals, totalSavingsSaved, totalSavingsTarget, primarySavingsGoal, wallets, walletMoney, walletPreviewTransactions, survivalExpense, financeEmergencyFund, financeTotalIncome, financeTotalExpenses, financeTotalWalletBalance, userId, accessPlan, guardChecked, loading, profileData, featureFlags, includeLocked, isGuideMode]
  );
  const defaultIndex = useMemo(() => getDefaultCarouselIndex(items), [items]);
  const isActiveGuideCarousel = isGuideMode && typeof onGuideCarouselIndexChange === "function";
  const effectiveGuideMaxStepPerInteraction = isActiveGuideCarousel && !guideCarouselLocked
    ? Math.max(1, Number(guideMaxStepPerInteraction) || 1)
    : null;
  const { carouselRef, activeIndex, scrollToIndex, handleScroll, interactionHandlers } = useAutoMovingHorizontalCarousel({
    itemCount: items.length,
    defaultIndex,
    guideAllowedSwipeDirection: isActiveGuideCarousel ? guideAllowedSwipeDirection : null,
    guideMaxStepPerInteraction: effectiveGuideMaxStepPerInteraction,
  });
  const guideInteractionHandlers = useGuideMobileSwipeAdapter({
    enabled: isActiveGuideCarousel && Number(effectiveGuideMaxStepPerInteraction) > 0 && !guideCarouselLocked,
    interactionHandlers,
  });
  const expandedCardIndex = useMemo(
    () => getExpandedCarouselCardIndex(items, expandedFinanceCard),
    [items, expandedFinanceCard]
  );
  const isInlineFocusExpanded = expandedCardIndex >= 0;
  const isTerminalGuideLocked = isGuideMode && guideCarouselLocked;
  const isSwipeLocked = isInlineFocusExpanded || isTerminalGuideLocked;
  const isControlledGuideSwipe =
    isActiveGuideCarousel && Number(effectiveGuideMaxStepPerInteraction) > 0 && !isTerminalGuideLocked;
  const bottomSpacingClass = flushSpacing ? "mb-0" : "mb-5";
  const productionGuideMatchedClass = isGuideMode ? "" : "clara-production-guide-matched-carousel";

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

  useEffect(() => {
    if (isGuideMode || typeof window === "undefined") return undefined;

    const handleCreateWalletRequest = () => {
      onCreateWallet?.();
    };

    const handleAddMoneyRequest = (event) => {
      const requestedWalletId = String(
        event?.detail?.walletId || event?.detail?.wallet_id || ""
      ).trim();
      if (!requestedWalletId) return;

      const wallet = (Array.isArray(wallets) ? wallets : []).find((entry) =>
        String(
          entry?.id || entry?.wallet_id || entry?.walletId || entry?.local_id || ""
        ) === requestedWalletId
      );

      if (wallet) onAddMoney?.(wallet);
    };

    window.addEventListener(CLARA_OPEN_CREATE_WALLET_EVENT, handleCreateWalletRequest);
    window.addEventListener(CLARA_OPEN_ADD_MONEY_EVENT, handleAddMoneyRequest);

    return () => {
      window.removeEventListener(CLARA_OPEN_CREATE_WALLET_EVENT, handleCreateWalletRequest);
      window.removeEventListener(CLARA_OPEN_ADD_MONEY_EVENT, handleAddMoneyRequest);
    };
  }, [isGuideMode, onAddMoney, onCreateWallet, wallets]);

  useEffect(() => {
    if (!isGuideMode || typeof onGuideCarouselIndexChange !== "function") return undefined;

    const activeItem = items[activeIndex] || null;

    // In this LTR scroll-snap carousel, swiping left moves the viewport toward
    // a larger scrollLeft value, which means the active slide index increases.
    onGuideCarouselIndexChange({
      index: activeIndex,
      cardKey: activeItem?.key || activeItem?.type || "fallback",
      cardType: activeItem?.type || activeItem?.key || "fallback",
      total: items.length,
      swipeLeftIncreasesIndex: true,
    });

    return undefined;
  }, [activeIndex, isGuideMode, items, onGuideCarouselIndexChange]);

  if (!items.length) return null;

  return (
    <div className={`relative z-20 ${productionGuideMatchedClass} ${bottomSpacingClass} transition-[margin-top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`} style={{ marginTop: isInlineFocusExpanded ? EXPANDED_TOP_PULL : 0 }}>
      <style>{`${FINANCIAL_CAROUSEL_FOCUS_STYLES}
html:not(.clara-guide-finance-carousel-active) #root .clara-production-guide-matched-carousel {
  /* A zero-value transform still traps position:fixed descendants inside the carousel.
     Keep the production carousel visually identical without turning it into a fixed-position containing block. */
  transform: none !important;
}
`}</style>
      <CarouselViewport
        carouselRef={carouselRef}
        onScroll={handleScroll}
        interactionHandlers={isTerminalGuideLocked ? {} : guideInteractionHandlers}
        clipClassName={dashboardScale.financeClip || "rounded-[28px]"}
        allowVerticalOverflow={isInlineFocusExpanded}
        isSwipeLocked={isSwipeLocked}
        isControlledGuideSwipe={isControlledGuideSwipe}
      >
        {items.map((item, index) => {
          const isActiveSlide = index === activeIndex;
          const isNearbySlide = Math.abs(index - activeIndex) <= 1;
          const isInlineExpanded = item.detailKey === expandedFinanceCard && expandedCardIndex >= 0;
          // Visual performance:
          // Active/expanded cards get full premium visuals.
          // Nearby cards get medium visuals.
          // Far cards stay mounted as real cards, but render in lite mode.
          // Guide Mode temporarily keeps every slide in full visual mode so the walkthrough never looks disabled while swiping.
          const performanceMode = isGuideMode
            ? "full"
            : isInlineExpanded || isActiveSlide
              ? "full"
              : isNearbySlide
                ? "medium"
                : "lite";
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
      <CarouselDots items={items} activeIndex={activeIndex} onSelect={isTerminalGuideLocked ? undefined : scrollToIndex} dashboardScale={dashboardScale} selectedDashboardTheme={selectedDashboardTheme} themeInactiveDotClass={themeInactiveDotClass} />
    </div>
  );
}
