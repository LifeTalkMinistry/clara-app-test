export default function CarouselViewport({
  children,
  carouselRef,
  onScroll,
  interactionHandlers = {},
  className = "",
  clipClassName = "",
  allowVerticalOverflow = false,
  isSwipeLocked = false,
  isControlledGuideSwipe = false,
}) {
  const shouldHideNativeHorizontalScroll = isSwipeLocked || isControlledGuideSwipe;
  const overflowClassName = shouldHideNativeHorizontalScroll
    ? allowVerticalOverflow
      ? "overflow-x-hidden overflow-y-visible touch-pan-y cursor-default"
      : "overflow-x-hidden overflow-y-hidden touch-pan-y cursor-default"
    : allowVerticalOverflow
      ? "overflow-x-auto overflow-y-visible touch-auto cursor-grab active:cursor-grabbing"
      : "overflow-x-auto overflow-y-hidden touch-auto cursor-grab active:cursor-grabbing";

  const viewportClassName = [
    "flex items-stretch overscroll-x-contain select-none transition-[overflow] duration-300",
    shouldHideNativeHorizontalScroll ? "snap-none" : "snap-x snap-mandatory",
    overflowClassName,
    "[-webkit-overflow-scrolling:touch] [scroll-behavior:auto] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    className,
  ].join(" ");

  return (
    <div
      className={[
        "clara-finance-carousel-clip",
        allowVerticalOverflow ? "overflow-visible" : "overflow-hidden",
        clipClassName,
      ].join(" ")}
    >
      <div
        ref={carouselRef}
        onScroll={onScroll}
        data-swipe-locked={isSwipeLocked ? "true" : "false"}
        data-controlled-guide-swipe={isControlledGuideSwipe ? "true" : "false"}
        {...interactionHandlers}
        className={`clara-finance-carousel-track ${viewportClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
