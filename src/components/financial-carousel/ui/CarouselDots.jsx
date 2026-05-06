export default function CarouselDots({
  items = [],
  activeIndex = 0,
  onSelect,
  dashboardScale = {},
  selectedDashboardTheme = {},
  themeInactiveDotClass = "bg-white/20 hover:bg-white/35",
}) {
  return (
    <div
      className={`flex items-center justify-center ${dashboardScale.dots || "gap-1.5 pt-1.5 pb-3"}`}
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Go to ${item.label} card`}
          className={`h-2 rounded-full transition-all duration-200 ${
            activeIndex === index
              ? `w-5 ${selectedDashboardTheme.indicatorActive || "bg-emerald-400"}`
              : `w-2 ${themeInactiveDotClass}`
          }`}
        />
      ))}
    </div>
  );
}
