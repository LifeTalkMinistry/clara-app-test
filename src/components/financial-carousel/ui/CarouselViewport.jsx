export default function CarouselViewport({
  children,
  carouselRef,
  onScroll,
  interactionHandlers = {},
  className = "",
  clipClassName = "",
}) {
  const viewportClassName = [
    "flex touch-pan-x cursor-grab items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain active:cursor-grabbing",
    "[scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden",
    className,
  ].join(" ");

  return (
    <div className={["overflow-hidden", clipClassName].join(" ")}>
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
