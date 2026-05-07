export default function CarouselViewport({
  children,
  carouselRef,
  onScroll,
  interactionHandlers = {},
  className = "",
  clipClassName = "",
  allowVerticalOverflow = false,
}) {
  const viewportClassName = [
    "flex touch-pan-x cursor-grab items-stretch snap-x snap-mandatory overscroll-x-contain active:cursor-grabbing",
    allowVerticalOverflow ? "overflow-x-auto overflow-y-visible" : "overflow-x-auto overflow-y-hidden",
    "[scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
    className,
  ].join(" ");

  return (
    <div className={[allowVerticalOverflow ? "overflow-visible" : "overflow-hidden", clipClassName].join(" ")}>
      <div
        ref={carouselRef}
        onScroll={onScroll}
        {...interactionHandlers}
        className={viewportClassName}
      >
        {children}
      </div>
    </div>
  );
}
