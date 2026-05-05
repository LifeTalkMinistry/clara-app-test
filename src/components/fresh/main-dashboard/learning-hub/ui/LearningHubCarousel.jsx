import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import LearningMaterialCard from "./LearningMaterialCard";

const AUTO_SCROLL_DELAY = 3800;
const RESUME_AFTER_TOUCH = 6500;

export default function LearningHubCarousel({ materials = [], onOpenMaterial }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
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

  const moveToIndex = (index) => {
    if (!total) return;
    pauseCarousel();
    setActiveIndex(index);
    resumeCarouselSoon();
  };

  useEffect(() => {
    if (isPaused || total <= 1) return undefined;

    const interval = setInterval(moveToNext, AUTO_SCROLL_DELAY);
    return () => clearInterval(interval);
  }, [isPaused, total]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  if (!total) return null;

  return (
    <section className="relative w-full overflow-hidden px-1 py-2">
      <div className="mb-2 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">
          <BookOpen size={16} className="text-cyan-200/70" />
          Learning Hub
        </div>

        <button className="flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur-xl">
          See all
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        className="relative flex h-[148px] items-center justify-center overflow-hidden"
        onMouseEnter={pauseCarousel}
        onMouseLeave={resumeCarouselSoon}
        onTouchStart={pauseCarousel}
        onTouchEnd={resumeCarouselSoon}
      >
        {safeMaterials.map((item, index) => {
          const rawOffset = index - activeIndex;
          const wrappedOffset =
            rawOffset > total / 2
              ? rawOffset - total
              : rawOffset < -total / 2
                ? rawOffset + total
                : rawOffset;

          const visible = Math.abs(wrappedOffset) <= 2;

          return (
            <LearningMaterialCard
              key={item.id || index}
              item={item}
              isActive={wrappedOffset === 0}
              offset={wrappedOffset}
              visible={visible}
              onClick={() => {
                if (wrappedOffset === 0) {
                  onOpenMaterial?.(item);
                  return;
                }
                moveToIndex(index);
              }}
            />
          );
        })}
      </div>

      <div className="mt-1 flex justify-center gap-2">
        {safeMaterials.map((item, index) => (
          <button
            key={item.id || index}
            onClick={() => moveToIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeIndex === index ? "w-6 bg-emerald-300" : "w-2 bg-white/20"
            }`}
            aria-label={`Go to ${item.title}`}
          />
        ))}
      </div>
    </section>
  );
}
