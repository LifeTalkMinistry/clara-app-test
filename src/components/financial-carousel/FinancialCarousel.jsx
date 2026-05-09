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

export default function FinancialCarousel(props) {
  const {
    dashboardScale = {},
    selectedDashboardTheme = {},
    themeInactiveDotClass = "bg-white/20 hover:bg-white/35",
    expandedFinanceCard,
  } = props;

  const items = useMemo(() => getCarouselData(props), [props]);
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
        {items.map((item) => {
          const isInlineExpanded =
            item.detailKey === expandedFinanceCard && expandedCardIndex >= 0;

          return (
            <CarouselSlideShell
              key={item.key}
              item={item}
              selectedDashboardTheme={selectedDashboardTheme}
              dashboardScale={dashboardScale}
              isExpanded={isInlineExpanded}
            >
              <CarouselItemCard
                {...props}
                item={item}
                selectedDashboardTheme={selectedDashboardTheme}
                expandedFinanceCard={expandedFinanceCard}
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
