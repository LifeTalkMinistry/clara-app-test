export default function CarouselViewport({
  children,
  carouselRef,
  onScroll,
  interactionHandlers = {},
  className = "",
  clipClassName = "",
  allowVerticalOverflow = false,
  locked = false,
}) {
  const viewportClassName = [
    "flex items-stretch snap-x snap-mandatory overscroll-x-contain transition-[overflow] duration-300",
    locked
      ? "overflow-x-hidden overflow-y-visible touch-pan-y cursor-default"
      : allowVerticalOverflow
        ? "overflow-x-auto overflow-y-visible touch-pan-x cursor-grab active:cursor-grabbing"
        : "overflow-x-auto overflow-y-hidden touch-pan-x cursor-grab active:cursor-grabbing",
    "[scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
    className,
  ].join(" ");

  return (
    <div
      className={[
        allowVerticalOverflow || locked ? "overflow-visible" : "overflow-hidden",
        clipClassName,
      ].join(" ")}
    >
      <div
        ref={carouselRef}
        onScroll={locked ? undefined : onScroll}
        {...(locked ? {} : interactionHandlers)}
        className={viewportClassName}
      >
        {children}
      </div>
    </div>
  );
}
