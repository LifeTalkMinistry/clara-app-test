import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LearningHubToggleButton, { LEARNING_HUB_EXPAND_DURATION_MS, LEARNING_HUB_STAGE_CLASS, LEARNING_HUB_STAGE_HEIGHT, LearningHubExpansionShell } from "./LearningHubToggleButton";
import LearningMaterialCard from "./LearningMaterialCard";

const AUTO_SCROLL_DELAY = 4200;
const RESUME_AFTER_TOUCH = 7000;
const OPEN_SETTLE_DELAY = 750;
const SWIPE_THRESHOLD = 34;
const CARD_SWIPE_THRESHOLD = 50;
const DRAG_AXIS_LOCK_THRESHOLD = 8;
const MIN_CARD_DRAG_RANGE_PX = 148;
const MAX_CARD_DRAG_RANGE_PX = 244;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function LearningHubCarousel({
  items = null, materials = [], activeCategory = null, activeCategoryLabel = "",
  hasCommittedAccess = true, initialExpanded = false, flushSpacing = false,
  stageHeight = LEARNING_HUB_STAGE_HEIGHT,
  expandDurationMs = LEARNING_HUB_EXPAND_DURATION_MS,
  onBackToCategories, onOpenCommitmentBooklet, onOpenItem, onOpenMaterial,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(Boolean(initialExpanded));
  const [autoScrollReady, setAutoScrollReady] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [headerTouchStartY, setHeaderTouchStartY] = useState(null);
  const stageRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const openSettleTimerRef = useRef(null);
  const dragFrameRef = useRef(null);
  const clickSuppressTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const dragAxisRef = useRef(null);
  const dragOffsetRef = useRef(0);
  const suppressCardClickRef = useRef(false);
  const headerSwipeHandledRef = useRef(false);
  const hasAppliedInitialExpandedRef = useRef(false);

  const sourceItems = Array.isArray(items) ? items : materials;
  const safeItems = useMemo(() => sourceItems.filter(Boolean), [sourceItems]);
  const itemsSignature = useMemo(() => safeItems.map((item) => item?.id || item?.title || "item").join("|"), [safeItems]);
  const total = safeItems.length;
  const isLocked = !hasCommittedAccess;
  const isInsideCategory = Boolean(activeCategory);
  const headerLabel = isInsideCategory ? activeCategoryLabel || "Learning Category" : "Learning Hub";
  const openItemHandler = onOpenItem || onOpenMaterial;

  const getCardDragRange = () => clamp((stageRef.current?.clientWidth || 0) * 0.48 || MIN_CARD_DRAG_RANGE_PX, MIN_CARD_DRAG_RANGE_PX, MAX_CARD_DRAG_RANGE_PX);
  const applyDragOffset = (nextOffset) => {
    const safeOffset = clamp(nextOffset, -1, 1);
    dragOffsetRef.current = safeOffset;
    if (typeof window === "undefined") return setDragOffset(safeOffset);
    if (dragFrameRef.current) return;
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      setDragOffset(dragOffsetRef.current);
    });
  };
  const resetDragMotion = () => {
    dragOffsetRef.current = 0;
    if (dragFrameRef.current && typeof window !== "undefined") window.cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };
  const temporarilySuppressCardClick = () => {
    suppressCardClickRef.current = true;
    if (clickSuppressTimerRef.current && typeof window !== "undefined") window.clearTimeout(clickSuppressTimerRef.current);
    if (typeof window === "undefined") return void (suppressCardClickRef.current = false);
    clickSuppressTimerRef.current = window.setTimeout(() => {
      suppressCardClickRef.current = false;
      clickSuppressTimerRef.current = null;
    }, 160);
  };
  const toggleExpanded = () => {
    if (isLocked) return onOpenCommitmentBooklet?.();
    setIsExpanded((current) => {
      const next = !current;
      if (next) setIsPaused(false);
      return next;
    });
  };
  const pauseCarousel = () => {
    if (isLocked) return;
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };
  const resumeCarouselSoon = () => {
    if (isLocked) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), RESUME_AFTER_TOUCH);
  };
  const moveToNext = useCallback(() => {
    if (!isLocked && total) setActiveIndex((current) => (current + 1) % total);
  }, [isLocked, total]);
  const moveToPrev = useCallback(() => {
    if (!isLocked && total) setActiveIndex((current) => (current - 1 + total) % total);
  }, [isLocked, total]);
  const moveToIndex = (index) => {
    if (isLocked || !total) return;
    resetDragMotion(); pauseCarousel(); setActiveIndex(index); resumeCarouselSoon();
  };
  const handleHeaderClick = () => {
    if (isLocked) return onOpenCommitmentBooklet?.();
    if (headerSwipeHandledRef.current) return void (headerSwipeHandledRef.current = false);
    if (isInsideCategory) {
      onBackToCategories?.(); setIsExpanded(true); setIsPaused(false); return;
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
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      headerSwipeHandledRef.current = true;
      event.preventDefault(); event.stopPropagation(); setIsExpanded(diff > 0);
      if (diff > 0) setIsPaused(false);
    }
    setHeaderTouchStartY(null);
  };
  const handleTouchStart = (event) => {
    if (isLocked) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    pauseCarousel(); resetDragMotion();
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    dragAxisRef.current = null;
  };
  const handleTouchMove = (event) => {
    if (isLocked || !touchStartRef.current) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    if (!dragAxisRef.current) {
      if (Math.abs(deltaX) < DRAG_AXIS_LOCK_THRESHOLD && Math.abs(deltaY) < DRAG_AXIS_LOCK_THRESHOLD) return;
      dragAxisRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }
    if (dragAxisRef.current !== "x") return;
    event.preventDefault(); setIsDragging(true); applyDragOffset(deltaX / getCardDragRange());
  };
  const handleTouchEnd = (event) => {
    if (isLocked || !touchStartRef.current) return;
    const touch = event.changedTouches?.[0];
    const diff = touch ? touchStartRef.current.x - touch.clientX : 0;
    const horizontal = dragAxisRef.current === "x";
    if (horizontal) {
      event.preventDefault(); event.stopPropagation(); temporarilySuppressCardClick();
      if (Math.abs(diff) > CARD_SWIPE_THRESHOLD) diff > 0 ? moveToNext() : moveToPrev();
    }
    touchStartRef.current = null; dragAxisRef.current = null; resetDragMotion(); resumeCarouselSoon();
  };
  const handleTouchCancel = () => {
    if (isLocked) return;
    touchStartRef.current = null; dragAxisRef.current = null; resetDragMotion(); resumeCarouselSoon();
  };

  useEffect(() => {
    if (!initialExpanded || hasAppliedInitialExpandedRef.current || isLocked) return;
    hasAppliedInitialExpandedRef.current = true; setIsExpanded(true); setIsPaused(false);
  }, [initialExpanded, isLocked]);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);
    sync();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      return () => mediaQuery.removeEventListener("change", sync);
    }
    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);
  useEffect(() => {
    setActiveIndex(0); setHeaderTouchStartY(null); setIsPaused(false);
    touchStartRef.current = null; dragAxisRef.current = null; resetDragMotion();
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, [activeCategory, itemsSignature]);
  useEffect(() => {
    if (openSettleTimerRef.current) clearTimeout(openSettleTimerRef.current);
    openSettleTimerRef.current = null; setAutoScrollReady(false);
    if (!isExpanded || isLocked) return undefined;
    openSettleTimerRef.current = setTimeout(() => setAutoScrollReady(true), OPEN_SETTLE_DELAY);
    return () => {
      if (openSettleTimerRef.current) clearTimeout(openSettleTimerRef.current);
      openSettleTimerRef.current = null;
    };
  }, [isExpanded, isLocked]);
  useEffect(() => {
    if (isLocked || !isExpanded || !autoScrollReady || isMobileViewport || isPaused || total <= 1) return undefined;
    const interval = setInterval(moveToNext, AUTO_SCROLL_DELAY);
    return () => clearInterval(interval);
  }, [autoScrollReady, isExpanded, isLocked, isMobileViewport, isPaused, moveToNext, total]);
  useEffect(() => {
    if (!isLocked) return;
    setIsExpanded(false); setIsPaused(false); setAutoScrollReady(false); setHeaderTouchStartY(null);
    touchStartRef.current = null; dragAxisRef.current = null; resetDragMotion();
  }, [isLocked]);
  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (openSettleTimerRef.current) clearTimeout(openSettleTimerRef.current);
    if (clickSuppressTimerRef.current) clearTimeout(clickSuppressTimerRef.current);
    if (dragFrameRef.current && typeof window !== "undefined") window.cancelAnimationFrame(dragFrameRef.current);
  }, []);

  if (!total) return null;
  return (
    <section
      className="relative w-full overflow-visible px-1 py-0"
      style={{
        paddingBottom: isExpanded ? "clamp(14px, 2dvh, 20px)" : "0px",
        overflowAnchor: "none",
        transition: `padding-bottom ${expandDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <div data-clara-learning-hub-loaded-bridge={isExpanded ? undefined : "true"} className="flex justify-center">
        <LearningHubToggleButton
          isExpanded={isExpanded} isLocked={isLocked} isInsideCategory={isInsideCategory}
          headerLabel={headerLabel} onClick={handleHeaderClick}
          onTouchStart={handleHeaderTouchStart} onTouchEnd={handleHeaderTouchEnd}
          flushSpacing={flushSpacing}
        />
      </div>
      <LearningHubExpansionShell isExpanded={isExpanded} stageHeight={stageHeight} expandDurationMs={expandDurationMs}>
        <div
          ref={stageRef} className={LEARNING_HUB_STAGE_CLASS}
          style={{ height: `${stageHeight}px`, minHeight: `${stageHeight}px`, perspective: "1300px", transformStyle: "preserve-3d", touchAction: "pan-y" }}
          onMouseEnter={pauseCarousel} onMouseLeave={resumeCarouselSoon}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel}
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
            const wrappedOffset = rawOffset > total / 2 ? rawOffset - total : rawOffset < -total / 2 ? rawOffset + total : rawOffset;
            const displayOffset = wrappedOffset + dragOffset;
            const shouldRender = Math.abs(wrappedOffset) <= 2 || Math.abs(displayOffset) <= 2.25;
            if (!shouldRender) return null;
            const isActive = wrappedOffset === 0;
            return (
              <LearningMaterialCard
                key={item.id || index} item={item} isActive={isActive} isDragging={isDragging}
                offset={displayOffset} visible={shouldRender} position={index + 1} total={total}
                onClick={() => {
                  if (suppressCardClickRef.current) return;
                  if (isActive) return openItemHandler?.(item);
                  moveToIndex(index);
                }}
              />
            );
          })}
        </div>
      </LearningHubExpansionShell>
    </section>
  );
}
