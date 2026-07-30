import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LearningHubToggleButton from "./LearningHubToggleButton";
import LearningMaterialCard from "./LearningMaterialCard";

const AUTO_SCROLL_DELAY = 4200;
const RESUME_AFTER_TOUCH = 7000;
const OPEN_SETTLE_DELAY = 750;
const SWIPE_THRESHOLD = 34;
const CARD_SWIPE_THRESHOLD = 50;
const DRAG_AXIS_LOCK_THRESHOLD = 8;
const MIN_CARD_DRAG_RANGE_PX = 148;
const MAX_CARD_DRAG_RANGE_PX = 244;
const LEARNING_HUB_STAGE_HEIGHT = 244;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function LearningHubCarousel({
  items = null,
  materials = [],
  activeCategory = null,
  activeCategoryLabel = "",
  hasCommittedAccess = true,
  initialExpanded = false,
  flushSpacing = false,
  disableAutoScroll = false,
  disableInteractions = false,
  onBackToCategories,
  onOpenCommitmentBooklet,
  onOpenItem,
  onOpenMaterial,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(Boolean(initialExpanded));
  const [autoScrollReady, setAutoScrollReady] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isStageVisible, setIsStageVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState !== "hidden",
  );

  const stageRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const openSettleTimerRef = useRef(null);
  const dragFrameRef = useRef(null);
  const clickSuppressTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const dragAxisRef = useRef(null);
  const dragOffsetRef = useRef(0);
  const cardDragRangeRef = useRef(MIN_CARD_DRAG_RANGE_PX);
  const isDraggingRef = useRef(false);
  const suppressCardClickRef = useRef(false);
  const headerSwipeHandledRef = useRef(false);
  const headerTouchStartYRef = useRef(null);
  const hasAppliedInitialExpandedRef = useRef(false);

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

  const measureCardDragRange = () => {
    const stageWidth = stageRef.current?.clientWidth || 0;
    return clamp(
      stageWidth * 0.48 || MIN_CARD_DRAG_RANGE_PX,
      MIN_CARD_DRAG_RANGE_PX,
      MAX_CARD_DRAG_RANGE_PX,
    );
  };

  const applyDragOffset = (nextOffset) => {
    const safeOffset = clamp(nextOffset, -1, 1);
    dragOffsetRef.current = safeOffset;

    if (typeof window === "undefined") {
      setDragOffset(safeOffset);
      return;
    }

    if (dragFrameRef.current) return;

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      setDragOffset(dragOffsetRef.current);
    });
  };

  const setDragging = (nextDragging) => {
    if (isDraggingRef.current === nextDragging) return;
    isDraggingRef.current = nextDragging;
    setIsDragging(nextDragging);
  };

  const resetDragMotion = () => {
    dragOffsetRef.current = 0;

    if (dragFrameRef.current && typeof window !== "undefined") {
      window.cancelAnimationFrame(dragFrameRef.current);
    }

    dragFrameRef.current = null;
    setDragOffset(0);
    setDragging(false);
  };

  const temporarilySuppressCardClick = () => {
    suppressCardClickRef.current = true;

    if (clickSuppressTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(clickSuppressTimerRef.current);
    }

    if (typeof window === "undefined") {
      suppressCardClickRef.current = false;
      return;
    }

    clickSuppressTimerRef.current = window.setTimeout(() => {
      suppressCardClickRef.current = false;
      clickSuppressTimerRef.current = null;
    }, 160);
  };

  const toggleExpanded = () => {
    if (disableInteractions) return;

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
    if (isLocked || disableInteractions) return;

    setIsPaused(true);

    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
  };

  const resumeCarouselSoon = () => {
    if (isLocked || disableInteractions) return;

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
    if (isLocked || !total || disableInteractions) return;

    resetDragMotion();
    pauseCarousel();
    setActiveIndex(index);
    resumeCarouselSoon();
  };

  const handleHeaderClick = () => {
    if (disableInteractions) return;

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
    if (isLocked || disableInteractions) return;

    headerSwipeHandledRef.current = false;
    headerTouchStartYRef.current = event.touches?.[0]?.clientY ?? null;
  };

  const handleHeaderTouchEnd = (event) => {
    const startY = headerTouchStartYRef.current;
    headerTouchStartYRef.current = null;

    if (isLocked || disableInteractions || startY === null) return;

    const endY = event.changedTouches?.[0]?.clientY;
    if (!Number.isFinite(endY)) return;

    const diff = endY - startY;
    const didSwipe = Math.abs(diff) > SWIPE_THRESHOLD;

    if (didSwipe) {
      headerSwipeHandledRef.current = true;
      event.stopPropagation();

      setIsExpanded(diff > 0);

      if (diff > 0) {
        setIsPaused(false);
      }
    }
  };

  const handleTouchStart = (event) => {
    if (isLocked || disableInteractions) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    pauseCarousel();
    resetDragMotion();
    cardDragRangeRef.current = measureCardDragRange();
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    dragAxisRef.current = null;
  };

  const handleTouchMove = (event) => {
    if (isLocked || disableInteractions || !touchStartRef.current) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (!dragAxisRef.current) {
      if (absDeltaX < DRAG_AXIS_LOCK_THRESHOLD && absDeltaY < DRAG_AXIS_LOCK_THRESHOLD) return;
      dragAxisRef.current = absDeltaX > absDeltaY ? "x" : "y";

      if (dragAxisRef.current === "x") {
        setDragging(true);
      }
    }

    if (dragAxisRef.current !== "x") return;

    // touch-action: pan-y reserves horizontal swipes for the carousel.
    // The width is measured once at touchstart to avoid layout reads every frame.
    applyDragOffset(deltaX / cardDragRangeRef.current);
  };

  const handleTouchEnd = (event) => {
    if (isLocked || disableInteractions || !touchStartRef.current) return;

    const touch = event.changedTouches?.[0];
    const diff = touch ? touchStartRef.current.x - touch.clientX : 0;
    const didHorizontalDrag = dragAxisRef.current === "x";
    const didSwipe = didHorizontalDrag && Math.abs(diff) > CARD_SWIPE_THRESHOLD;

    if (didHorizontalDrag) {
      event.stopPropagation();
      temporarilySuppressCardClick();
    }

    if (didSwipe) {
      if (diff > 0) {
        moveToNext();
      } else {
        moveToPrev();
      }
    }

    touchStartRef.current = null;
    dragAxisRef.current = null;
    resetDragMotion();
    resumeCarouselSoon();
  };

  const handleTouchCancel = () => {
    if (isLocked || disableInteractions) return;

    touchStartRef.current = null;
    dragAxisRef.current = null;
    resetDragMotion();
    resumeCarouselSoon();
  };

  useEffect(() => {
    if (!initialExpanded || hasAppliedInitialExpandedRef.current || isLocked) return;

    hasAppliedInitialExpandedRef.current = true;
    setIsExpanded(true);
    setIsPaused(false);
  }, [initialExpanded, isLocked]);

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
    if (typeof document === "undefined") return undefined;

    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState !== "hidden");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isExpanded || typeof IntersectionObserver === "undefined" || !stageRef.current) {
      setIsStageVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStageVisible(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.01 },
    );

    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [isExpanded]);

  useEffect(() => {
    setActiveIndex(0);
    headerTouchStartYRef.current = null;
    setIsPaused(false);
    touchStartRef.current = null;
    dragAxisRef.current = null;
    resetDragMotion();

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

    if (!isExpanded || isLocked || disableAutoScroll) {
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
  }, [disableAutoScroll, isExpanded, isLocked]);

  useEffect(() => {
    if (
      disableAutoScroll ||
      isLocked ||
      !isExpanded ||
      !autoScrollReady ||
      isMobileViewport ||
      isPaused ||
      !isStageVisible ||
      !isDocumentVisible ||
      total <= 1
    ) {
      return undefined;
    }

    const interval = setInterval(moveToNext, AUTO_SCROLL_DELAY);

    return () => clearInterval(interval);
  }, [
    autoScrollReady,
    disableAutoScroll,
    isDocumentVisible,
    isExpanded,
    isLocked,
    isMobileViewport,
    isPaused,
    isStageVisible,
    moveToNext,
    total,
  ]);

  useEffect(() => {
    if (!isLocked) return;

    setIsExpanded(false);
    setIsPaused(false);
    setAutoScrollReady(false);
    headerTouchStartYRef.current = null;
    touchStartRef.current = null;
    dragAxisRef.current = null;
    resetDragMotion();
  }, [isLocked]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }

      if (openSettleTimerRef.current) {
        clearTimeout(openSettleTimerRef.current);
      }

      if (clickSuppressTimerRef.current) {
        clearTimeout(clickSuppressTimerRef.current);
      }

      if (dragFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
    };
  }, []);

  if (!total) return null;

  const headerTouchProps = disableInteractions
    ? {}
    : {
        onTouchStart: handleHeaderTouchStart,
        onTouchEnd: handleHeaderTouchEnd,
      };

  return (
    <section
      className={`relative w-full overflow-visible px-1 py-0 ${
        isExpanded ? "pb-[clamp(14px,2dvh,20px)]" : ""
      }`}
    >
      {!isExpanded ? (
        <div
          data-clara-learning-hub-loaded-bridge="true"
          className="flex justify-center"
        >
          <LearningHubToggleButton
            isExpanded={isExpanded}
            isLocked={isLocked}
            isInsideCategory={isInsideCategory}
            headerLabel={headerLabel}
            onClick={disableInteractions ? undefined : handleHeaderClick}
            {...headerTouchProps}
            flushSpacing={flushSpacing}
          />
        </div>
      ) : (
        <LearningHubToggleButton
          isExpanded={isExpanded}
          isLocked={isLocked}
          isInsideCategory={isInsideCategory}
          headerLabel={headerLabel}
          onClick={disableInteractions ? undefined : handleHeaderClick}
          {...headerTouchProps}
          flushSpacing={flushSpacing}
        />
      )}

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
              ref={stageRef}
              className="clara-learning-hub-stage relative flex w-full items-center justify-center overflow-hidden rounded-[30px] border border-cyan-100/10 bg-[radial-gradient(circle_at_-18%_-28%,rgba(20,184,166,0.22),transparent_48%),radial-gradient(circle_at_78%_118%,rgba(99,102,241,0.18),transparent_58%),linear-gradient(135deg,rgba(6,48,66,0.76),rgba(7,20,48,0.82)_48%,rgba(37,13,74,0.76))]"
              style={{
                height: `${LEARNING_HUB_STAGE_HEIGHT}px`,
                minHeight: `${LEARNING_HUB_STAGE_HEIGHT}px`,
                perspective: "1300px",
                transformStyle: "preserve-3d",
                touchAction: "pan-y",
              }}
              onMouseEnter={disableInteractions ? undefined : pauseCarousel}
              onMouseLeave={disableInteractions ? undefined : resumeCarouselSoon}
              onTouchStart={disableInteractions ? undefined : handleTouchStart}
              onTouchMove={disableInteractions ? undefined : handleTouchMove}
              onTouchEnd={disableInteractions ? undefined : handleTouchEnd}
              onTouchCancel={disableInteractions ? undefined : handleTouchCancel}
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

                const displayOffset = wrappedOffset + dragOffset;
                const shouldRender = Math.abs(wrappedOffset) <= 2 || Math.abs(displayOffset) <= 2.25;

                if (!shouldRender) return null;

                const isActive = wrappedOffset === 0;

                return (
                  <LearningMaterialCard
                    key={item.id || index}
                    item={item}
                    isActive={isActive}
                    isDragging={isDragging}
                    interactive={!disableInteractions}
                    offset={displayOffset}
                    visible={shouldRender}
                    position={index + 1}
                    total={total}
                    onClick={() => {
                      if (disableInteractions || suppressCardClickRef.current) return;

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
