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
      ? "overflow-visible touch-pan-y cursor-default active:cursor-default"
      : "overflow-x-auto overflow-y-hidden touch-pan-x cursor-grab active:cursor-grabbing",
    "[scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
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
        onScroll={allowVerticalOverflow ? undefined : onScroll}
        {...(allowVerticalOverflow ? {} : interactionHandlers)}
        className={viewportClassName}
      >
        {children}
      </div>
    </div>
  );
}
