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

const EXPANDED_TOP_PULL = -22;

const getExpandedCardIndex = (items = [], expandedFinanceCard = null) => {
  if (!expandedFinanceCard) return -1;

  return items.findIndex(
    (item) =>
      item?.detailKey === expandedFinanceCard ||
      item?.key === expandedFinanceCard ||
      item?.type === expandedFinanceCard
  );
};

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
    () => getExpandedCardIndex(items, expandedFinanceCard),
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
    root.classList.toggle("clara-budget-focus-mode", isInlineFocusExpanded);

    return () => root.classList.remove("clara-budget-focus-mode");
  }, [isInlineFocusExpanded]);

  if (!items.length) return null;

  return (
    <div
      className="relative z-20 mb-5 transition-[margin-top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ marginTop: isInlineFocusExpanded ? EXPANDED_TOP_PULL : 0 }}
    >
      <style>{`
        .clara-budget-focus-shift {
          transform: translate3d(0, 0, 0);
          transition:
            max-height 520ms cubic-bezier(0.22, 1, 0.36, 1),
            margin 520ms cubic-bezier(0.22, 1, 0.36, 1),
            padding 520ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 320ms ease,
            visibility 320ms ease;
          will-change: max-height, margin, padding, opacity;
        }

        .clara-budget-focus-mode .clara-budget-focus-tip,
        .clara-budget-focus-mode .clara-budget-focus-hub {
          max-height: 0 !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          opacity: 0;
          visibility: hidden;
          overflow: hidden;
          pointer-events: none;
        }
      `}</style>

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
