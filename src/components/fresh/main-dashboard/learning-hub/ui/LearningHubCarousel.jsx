import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import LearningMaterialCard from "./LearningMaterialCard";

const AUTO_SCROLL_DELAY = 3800;
const RESUME_AFTER_TOUCH = 6500;
const SWIPE_THRESHOLD = 34;

export default function LearningHubCarousel({ materials = [], onOpenMaterial }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [headerTouchStartY, setHeaderTouchStartY] = useState(null);
  const resumeTimerRef = useRef(null);

  const safeMaterials = useMemo(() => materials.filter(Boolean), [materials]);
  const total = safeMaterials.length;

  const pauseCarousel = () => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const resumeCarouselSoon = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, RESUME_AFTER_TOUCH);
  };

  const moveToNext = () => {
    if (!total) return;
    setActiveIndex((current) => (current + 1) % total);
  };

  const moveToPrev = () => {
    if (!total) return;
    setActiveIndex((current) => (current - 1 + total) % total);
  };

  const moveToIndex = (index) => {
    if (!total) return;
    pauseCarousel();
    setActiveIndex(index);
    resumeCarouselSoon();
  };

  const handleHeaderTouchStart = (e) => {
    setHeaderTouchStartY(e.touches[0].clientY);
  };

  const handleHeaderTouchEnd = (e) => {
    if (headerTouchStartY === null) return;
    const diff = e.changedTouches[0].clientY - headerTouchStartY;

    if (diff > SWIPE_THRESHOLD) setIsExpanded(true);
    if (diff < -SWIPE_THRESHOLD) setIsExpanded(false);

    setHeaderTouchStartY(null);
  };

  const handleTouchStart = (e) => {
    pauseCarousel();
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) moveToNext();
      else moveToPrev();
    }

    setTouchStartX(null);
    resumeCarouselSoon();
  };

  useEffect(() => {
    if (!isExpanded || isPaused || total <= 1) return undefined;

    const interval = setInterval(moveToNext, AUTO_SCROLL_DELAY);
    return () => clearInterval(interval);
  }, [isExpanded, isPaused, total]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  if (!total) return null;

  return (
    <section className="relative w-full overflow-hidden px-1 py-2">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
        onTouchStart={handleHeaderTouchStart}
        onTouchEnd={handleHeaderTouchEnd}
        className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/60 transition-all duration-300 active:scale-[0.98]"
      >
        <BookOpen size={16} className="text-cyan-200/75" />
        Learning Hub
        <ChevronDown
          size={15}
          className={`text-cyan-100/50 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-500 ease-out ${
          isExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="relative flex h-[232px] w-full items-center justify-center overflow-hidden rounded-[30px]"
            style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
            onMouseEnter={pauseCarousel}
            onMouseLeave={resumeCarouselSoon}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="pointer-events-none absolute inset-x-8 top-8 bottom-5 rounded-[34px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.20),transparent_62%)] blur-2xl" />

            <div className="pointer-events-none absolute left-0 top-0 z-[90] h-full w-16 bg-gradient-to-r from-[#020617] via-[#020617]/75 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-[90] h-full w-16 bg-gradient-to-l from-[#020617] via-[#020617]/75 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[91] h-8 bg-gradient-to-b from-[#020617] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[91] h-8 bg-gradient-to-t from-[#020617] to-transparent" />

            <div className="pointer-events-none absolute left-2 top-8 z-[92] h-[170px] w-10 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="pointer-events-none absolute right-2 top-8 z-[92] h-[170px] w-10 rounded-full bg-cyan-300/10 blur-2xl" />

            {safeMaterials.map((item, index) => {
              const rawOffset = index - activeIndex;
              const wrappedOffset =
                rawOffset > total / 2
                  ? rawOffset - total
                  : rawOffset < -total / 2
                    ? rawOffset + total
                    : rawOffset;

              const isActive = wrappedOffset === 0;
              const visible = Math.abs(wrappedOffset) <= 2;

              return (
                <LearningMaterialCard
                  key={item.id || index}
                  item={item}
                  isActive={isActive}
                  offset={wrappedOffset}
                  visible={visible}
                  onClick={() => {
                    if (isActive) {
                      onOpenMaterial?.(item);
                      return;
                    }
                    moveToIndex(index);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
