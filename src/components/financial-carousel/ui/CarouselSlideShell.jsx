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
  const reservedHeight = EXPANDED_SLIDE_HEIGHT;
  const cardHeight = isExpanded ? EXPANDED_SLIDE_HEIGHT : NORMAL_SLIDE_HEIGHT;

  return (
    <div
      className="clara-finance-slide-shell relative flex w-full min-w-full shrink-0 snap-center overflow-visible"
      style={{ height: reservedHeight, minHeight: reservedHeight }}
    >
      <div
        className={getFinanceSlideShellClass(
          item.key,
          selectedDashboardTheme,
          isExpanded
        )}
        style={{ height: cardHeight, minHeight: cardHeight }}
      >
        {children}
      </div>
    </div>
  );
}
