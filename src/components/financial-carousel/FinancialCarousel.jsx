import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CarouselItemCard from "./ui/CarouselItemCard";
import {
  getCarouselData,
  getDefaultCarouselIndex,
} from "./logic/FinancialCarouselLogic";

const getFinanceSlideShellClass = (cardKey, theme = null, scale = null) => {
  const toneClassMap = {
    wallet:
      theme?.tokens?.financeWalletShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(135deg,rgba(4,23,30,0.96),rgba(3,14,24,0.98))] shadow-[0_28px_85px_rgba(20,184,166,0.15)]",
    budget:
      theme?.tokens?.financeBudgetShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),linear-gradient(135deg,rgba(4,25,24,0.96),rgba(3,19,18,0.98))] shadow-[0_28px_85px_rgba(16,185,129,0.16)]",
    emergencyFund:
      theme?.tokens?.financeEmergencyShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),linear-gradient(135deg,rgba(4,23,30,0.96),rgba(4,17,24,0.98))] shadow-[0_28px_85px_rgba(20,184,166,0.16)]",
    savingsGoals:
      theme?.tokens?.financeSavingsShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_34%),linear-gradient(135deg,rgba(8,18,52,0.96),rgba(7,15,38,0.98))] shadow-[0_28px_85px_rgba(59,130,246,0.16)]",
    investmentFund:
      theme?.tokens?.financeInvestmentShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_34%),linear-gradient(135deg,rgba(29,18,8,0.96),rgba(18,11,8,0.98))] shadow-[0_28px_85px_rgba(245,158,11,0.16)]",
    debtObligations:
      theme?.tokens?.financeDebtShell ||
      "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.16),transparent_34%),linear-gradient(135deg,rgba(40,12,18,0.96),rgba(18,8,14,0.98))] shadow-[0_28px_85px_rgba(244,63,94,0.13)]",
  };

  return [
    "relative w-full overflow-hidden border backdrop-blur-2xl",
    scale?.financeSlide ||
      "min-h-[286px] rounded-[28px] [&>*]:min-h-[284px] [&>*]:rounded-[27px]",
    toneClassMap[cardKey] || toneClassMap.budget,
  ].join(" ");
};

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
  const carouselRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const didSetDefaultSlideRef = useRef(false);

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
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const scrollToIndex = useCallback(
    (nextIndex, behavior = "smooth") => {
      const container = carouselRef.current;
      if (!container || items.length <= 0) return;

      const safeIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
      const slideWidth =
        container.clientWidth || container.scrollWidth / items.length || 1;

      container.scrollTo({
        left: slideWidth * safeIndex,
        behavior,
      });

      setActiveIndex(safeIndex);
    },
    [items.length]
  );

  const handleScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container || items.length <= 0) return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const slideWidth =
        container.scrollWidth / items.length || container.clientWidth || 1;
      const index = Math.round(container.scrollLeft / slideWidth);
      setActiveIndex(Math.max(0, Math.min(items.length - 1, index)));
    });
  }, [items.length]);

  useEffect(() => {
    if (!items.length || didSetDefaultSlideRef.current) return;
    didSetDefaultSlideRef.current = true;
    window.requestAnimationFrame(() => scrollToIndex(defaultIndex, "auto"));
  }, [defaultIndex, items.length, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  if (!items.length) return null;

  return (
    <>
      <div className={`overflow-hidden ${dashboardScale.financeClip || "rounded-[28px]"}`}>
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex touch-pan-x items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item.key} className="flex w-full min-w-full shrink-0 snap-center">
              <div className={getFinanceSlideShellClass(item.key, selectedDashboardTheme, dashboardScale)}>
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
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex items-center justify-center ${dashboardScale.dots || "gap-1.5 pt-1.5 pb-3"}`}>
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to ${item.label} card`}
            className={`h-2 rounded-full transition-all duration-200 ${
              activeIndex === index
                ? `w-5 ${selectedDashboardTheme.indicatorActive || "bg-emerald-400"}`
                : `w-2 ${themeInactiveDotClass}`
            }`}
          />
        ))}
      </div>
    </>
  );
}
