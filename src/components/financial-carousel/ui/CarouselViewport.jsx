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
    "flex items-stretch snap-x snap-mandatory overscroll-x-contain select-none transition-[overflow] duration-300",
    allowVerticalOverflow
      ? "overflow-x-auto overflow-y-visible touch-auto cursor-grab active:cursor-grabbing"
      : "overflow-x-auto overflow-y-hidden touch-auto cursor-grab active:cursor-grabbing",
    "[-webkit-overflow-scrolling:touch] [scroll-behavior:auto] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
