import {
  EXPANDED_SLIDE_HEIGHT,
  NORMAL_SLIDE_HEIGHT,
  getFinanceSlideShellClass,
} from "../shared/financeSlideShellTheme";

export default function CarouselSlideShell({
  item,
  selectedDashboardTheme,
  isExpanded = false,
  children,
}) {
  const slideHeight = isExpanded ? EXPANDED_SLIDE_HEIGHT : NORMAL_SLIDE_HEIGHT;

  return (
    <div
      className="clara-finance-slide-shell relative flex w-full min-w-full shrink-0 snap-center overflow-visible transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ height: slideHeight, minHeight: slideHeight }}
    >
      <div
        className={getFinanceSlideShellClass(
          item.key,
          selectedDashboardTheme,
          isExpanded
        )}
        style={{ height: slideHeight, minHeight: slideHeight }}
      >
        {children}
      </div>
    </div>
  );
}
