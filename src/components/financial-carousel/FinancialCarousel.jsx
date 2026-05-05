import useFinancialCarouselLogic from "./hooks/useFinancialCarouselLogic";
import CarouselItemCard from "./CarouselItemCard";
import { getFinanceSlideShellClass } from "./financeCarouselStyles";

export default function FinancialCarousel(props) {
  const {
    items,
    activeIndex,
    carouselRef,
    handleScroll,
    scrollToIndex,
  } = useFinancialCarouselLogic(props);

  if (!items.length) return null;

  return (
    <>
      <div className={`overflow-hidden ${props.dashboardScale?.financeClip || "rounded-[28px]"}`}>
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex touch-pan-x items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item.key} className="flex w-full min-w-full shrink-0 snap-center">
              <div className={getFinanceSlideShellClass(item.key, props.selectedDashboardTheme, props.dashboardScale)}>
                <CarouselItemCard {...props} item={item} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex items-center justify-center ${props.dashboardScale?.dots || "gap-1.5 pt-1.5 pb-3"}`}>
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to ${item.label} card`}
            className={`h-2 rounded-full transition-all duration-200 ${
              activeIndex === index
                ? `w-5 ${props.selectedDashboardTheme?.indicatorActive || "bg-emerald-400"}`
                : `w-2 ${props.themeInactiveDotClass || "bg-white/20"}`
            }`}
          />
        ))}
      </div>
    </>
  );
}
