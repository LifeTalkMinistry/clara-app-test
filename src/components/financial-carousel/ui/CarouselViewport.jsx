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
    "flex items-stretch snap-x snap-mandatory overscroll-x-contain transition-[overflow] duration-300",
    allowVerticalOverflow
      ? "overflow-x-auto overflow-y-visible touch-pan-x cursor-grab active:cursor-grabbing"
      : "overflow-x-auto overflow-y-hidden touch-pan-x cursor-grab active:cursor-grabbing",
    "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    className,
  ].join(" ");

  return (
    <div
      className={[
        allowVerticalOverflow ? "overflow-visible" : "overflow-hidden",
        clipClassName,
      ].join(" ")}
    >
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
