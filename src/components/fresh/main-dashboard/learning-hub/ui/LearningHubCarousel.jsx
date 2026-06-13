import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, ChevronLeft, Lock } from "lucide-react";
import DailyTipCard from "../../daily-tip";
import LearningMaterialCard from "./LearningMaterialCard";

const AUTO_SCROLL_DELAY = 4200;
const RESUME_AFTER_TOUCH = 7000;
const OPEN_SETTLE_DELAY = 750;
const SWIPE_THRESHOLD = 34;
const LEARNING_HUB_STAGE_HEIGHT = 244;

const learningHubToggleSurface = {
  background:
    "radial-gradient(circle at -18% -42%, rgba(20,184,166,0.22), transparent 48%), radial-gradient(circle at 112% 132%, rgba(99,102,241,0.16), transparent 54%), linear-gradient(135deg, rgba(6,48,66,0.72), rgba(7,20,48,0.74) 48%, rgba(37,13,74,0.70))",
  borderColor: "rgba(103,232,249,0.18)",
  boxShadow:
    "0 10px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
};

export default function LearningHubCarousel({
  items = null,
  materials = [],
  activeCategory = null,
  activeCategoryLabel = "",
  hasCommittedAccess = true,
  onBackToCategories,
  onOpenCommitmentBooklet,
  onOpenItem,
  onOpenMaterial,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScrollReady, setAutoScrollReady] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [headerTouchStartY, setHeaderTouchStartY] = useState(null);

  const resumeTimerRef = useRef(null);
  const openSettleTimerRef = useRef(null);
  const headerSwipeHandledRef = useRef(false);

  const sourceItems = Array.isArray(items) ? items : materials;
  const safeItems = useMemo(() => sourceItems.filter(Boolean), [sourceItems]);
  const itemsSignature = useMemo(
    () => safeItems.map((item) => item?.id || item?.title || "item").join("|"),
    [safeItems],
  );
  const total = safeItems.length;
  const isLocked = !hasCommittedAccess;
  const isInsideCategory = Boolean(activeCategory);
  const headerLabel = isInsideCategory
    ? activeCategoryLabel || "Learning Category"
    : "Learning Hub";
  const openItemHandler = onOpenItem || onOpenMaterial;

  const toggleExpanded = () => {
    if (isLocked) {
      onOpenCommitmentBooklet?.();
      return;
    }

    setIsExpanded((current) => {
      const next = !current;

      if (next) {
        setIsPaused(false);
      }

      return next;
    });
  };

  const pauseCarousel = () => {
    if (isLocked) return;

    setIsPaused(true);

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
  };

  const resumeCarouselSoon = () => {
    if (isLocked) return;

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, RESUME_AFTER_TOUCH);
  };

  const moveToNext = useCallback(() => {
    if (isLocked || !total) return;

    setActiveIndex((current) => (current + 1) % total);
  }, [isLocked, total]);

  const moveToPrev = useCallback(() => {
    if (isLocked || !total) return;

    setActiveIndex((current) => (current - 1 + total) % total);
  }, [isLocked, total]);

  const moveToIndex = (index) => {
    if (isLocked || !total) return;

    pauseCarousel();
    setActiveIndex(index);
    resumeCarouselSoon();
  };

  const handleHeaderClick = () => {
    if (isLocked) {
      onOpenCommitmentBooklet?.();
      return;
    }

    if (headerSwipeHandledRef.current) {
      headerSwipeHandledRef.current = false;
      return;
    }

    if (isInsideCategory) {
      onBackToCategories?.();
      setIsExpanded(true);
      setIsPaused(false);
      return;
    }

    toggleExpanded();
  };

  const handleHeaderTouchStart = (event) => {
    if (isLocked) return;

    headerSwipeHandledRef.current = false;
    setHeaderTouchStartY(event.touches[0].clientY);
  };

  const handleHeaderTouchEnd = (event) => {
    if (isLocked || headerTouchStartY === null) return;

    const diff = event.changedTouches[0].clientY - headerTouchStartY;
    const didSwipe = Math.abs(diff) > SWIPE_THRESHOLD;

    if (didSwipe) {
      headerSwipeHandledRef.current = true;
      event.preventDefault();
      event.stopPropagation();

      setIsExpanded(diff > 0);

      if (diff > 0) {
        setIsPaused(false);
      }
    }

    setHeaderTouchStartY(null);
  };

  const handleTouchStart = (event) => {
    if (isLocked) return;

    pauseCarousel();
    setTouchStartX(event.touches[0].clientX);
  };

  const handleTouchEnd = (event) => {
    if (isLocked || touchStartX === null) return;

    const diff = touchStartX - event.changedTouches[0].clientX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        moveToNext();
      } else {
        moveToPrev();
      }
    }

    setTouchStartX(null);
    resumeCarouselSoon();
  };

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncMobileViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncMobileViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMobileViewport);
      return () => mediaQuery.removeEventListener("change", syncMobileViewport);
    }

    mediaQuery.addListener(syncMobileViewport);
    return () => mediaQuery.removeListener(syncMobileViewport);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setTouchStartX(null);
    setHeaderTouchStartY(null);
    setIsPaused(false);

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
  }, [activeCategory, itemsSignature]);

  useEffect(() => {
    if (openSettleTimerRef.current) {
      clearTimeout(openSettleTimerRef.current);
      openSettleTimerRef.current = null;
    }

    setAutoScrollReady(false);

    if (!isExpanded || isLocked) {
      return undefined;
    }

    openSettleTimerRef.current = setTimeout(() => {
      setAutoScrollReady(true);
    }, OPEN_SETTLE_DELAY);

    return () => {
      if (openSettleTimerRef.current) {
        clearTimeout(openSettleTimerRef.current);
        openSettleTimerRef.current = null;
      }
    };
  }, [isExpanded, isLocked]);

  useEffect(() => {
    if (
      isLocked ||
      !isExpanded ||
      !autoScrollReady ||
      isMobileViewport ||
      isPaused ||
      total <= 1
    ) {
      return undefined;
    }

    const interval = setInterval(moveToNext, AUTO_SCROLL_DELAY);

    return () => clearInterval(interval);
  }, [autoScrollReady, isExpanded, isLocked, isMobileViewport, isPaused, moveToNext, total]);

  useEffect(() => {
    if (!isLocked) return;

    setIsExpanded(false);
    setIsPaused(false);
    setAutoScrollReady(false);
    setTouchStartX(null);
    setHeaderTouchStartY(null);
  }, [isLocked]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }

      if (openSettleTimerRef.current) {
        clearTimeout(openSettleTimerRef.current);
      }
    };
  }, []);

  if (!total) return null;

  return (
    <section className="relative -mb-1 w-full overflow-hidden px-1 py-0">
      <DailyTipCard
        hasCommittedAccess={hasCommittedAccess}
        onOpenCommitmentBooklet={onOpenCommitmentBooklet}
      />

      <button
        type="button"
        aria-expanded={isLocked ? false : isExpanded}
        aria-label={
          isLocked
            ? "Open the Committed Version to unlock Learning Hub."
            : isInsideCategory
              ? "Back to Learning Hub categories."
              : isExpanded
                ? "Collapse Learning Hub."
                : "Open Learning Hub."
        }
        onClick={handleHeaderClick}
        onTouchStart={isLocked ? undefined : handleHeaderTouchStart}
        onTouchEnd={isLocked ? undefined : handleHeaderTouchEnd}
        className="clara-learning-motion relative isolate mx-auto mt-3 mb-0 flex w-fit items-center justify-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/64 transition-[transform,background-color,border-color] duration-300 active:scale-[0.98]"
        style={learningHubToggleSurface}
      >
        <span className="pointer-events-none absolute -left-12 -top-14 z-0 h-24 w-24 rounded-full bg-cyan-300/[0.08]" />
        <span className="pointer-events-none absolute -bottom-14 right-0 z-0 h-24 w-24 rounded-full bg-blue-400/[0.08]" />
        <span className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-gradient-to-b from-white/[0.05] via-transparent to-black/8 backdrop-blur-[1px]" />

        {isInsideCategory ? (
          <ChevronLeft size={16} className="relative z-10 text-cyan-100/62" />
        ) : (
          <BookOpen size={16} className="relative z-10 text-cyan-100/62" />
        )}

        <span className="relative z-10 max-w-[185px] truncate whitespace-nowrap text-white/76">
          {headerLabel}
        </span>

        {isLocked ? (
          <span className="relative z-10 inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.08] px-1.5 py-0.5 text-[7px] font-black tracking-[0.12em] text-cyan-50/72">
            <Lock className="h-2.5 w-2.5" />
            PRO
          </span>
        ) : isInsideCategory ? null : (
          <ChevronDown
            size={15}
            className={`relative z-10 text-cyan-100/42 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isExpanded ? (
        <div
          data-learning-hub-expanded="true"
          aria-hidden={false}
          className="clara-learning-hub-expanded clara-learning-motion overflow-hidden transition-[opacity,transform] duration-300 ease-out"
          style={{
            height: `${LEARNING_HUB_STAGE_HEIGHT}px`,
            opacity: 1,
            marginTop: "0.75rem",
            transform: "translateY(0) scaleY(1)",
            transformOrigin: "top center",
            pointerEvents: "auto",
          }}
        >
          <div className="clara-learning-hub-clip min-h-0 overflow-visible">
            <div
              className="clara-learning-hub-stage relative flex w-full items-center justify-center overflow-hidden rounded-[30px] border border-cyan-100/10 bg-[radial-gradient(circle_at_-18%_-28%,rgba(20,184,166,0.22),transparent_48%),radial-gradient(circle_at_78%_118%,rgba(99,102,241,0.18),transparent_58%),linear-gradient(135deg,rgba(6,48,66,0.76),rgba(7,20,48,0.82)_48%,rgba(37,13,74,0.76))]"
              style={{
                height: `${LEARNING_HUB_STAGE_HEIGHT}px`,
                minHeight: `${LEARNING_HUB_STAGE_HEIGHT}px`,
                perspective: "1300px",
                transformStyle: "preserve-3d",
              }}
              onMouseEnter={pauseCarousel}
              onMouseLeave={resumeCarouselSoon}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="pointer-events-none absolute -left-[112px] -top-[122px] h-[220px] w-[220px] rounded-full bg-cyan-300/[0.08]" />
              <div className="pointer-events-none absolute bottom-[-150px] left-[39%] h-[250px] w-[250px] rounded-full bg-blue-400/[0.10]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.055] via-transparent to-black/24" />
              <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10" />

              <div className="pointer-events-none absolute left-0 top-0 z-[88] h-full w-11 bg-gradient-to-r from-[#020617] via-[#020617]/56 to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 z-[88] h-full w-11 bg-gradient-to-l from-[#020617] via-[#020617]/56 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-[89] h-7 bg-gradient-to-b from-[#020617]/82 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[89] h-7 bg-gradient-to-t from-[#020617]/82 to-transparent" />

              {safeItems.map((item, index) => {
                const rawOffset = index - activeIndex;

                const wrappedOffset =
                  rawOffset > total / 2
                    ? rawOffset - total
                    : rawOffset < -total / 2
                      ? rawOffset + total
                      : rawOffset;

                const shouldRender = Math.abs(wrappedOffset) <= 2;

                if (!shouldRender) return null;

                const isActive = wrappedOffset === 0;

                return (
                  <LearningMaterialCard
                    key={item.id || index}
                    item={item}
                    isActive={isActive}
                    offset={wrappedOffset}
                    visible={shouldRender}
                    position={index + 1}
                    total={total}
                    onClick={() => {
                      if (isActive) {
                        openItemHandler?.(item);
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
      ) : null}
    </section>
  );
}
