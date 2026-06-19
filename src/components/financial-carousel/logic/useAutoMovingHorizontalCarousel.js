import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SCROLL_SETTLE_DEBOUNCE_MS = 110;
const PROGRAMMATIC_SCROLL_GUARD_MS = 520;
const INSTANT_SCROLL_GUARD_MS = 90;

const clampIndex = (index, length) => {
  if (!length) return 0;
  return Math.max(0, Math.min(length - 1, Number(index) || 0));
};

const normalizeGuideSwipeDirection = (direction) =>
  direction === "left" || direction === "right" ? direction : null;

export default function useAutoMovingHorizontalCarousel({
  itemCount = 0,
  defaultIndex = 0,
  guideAllowedSwipeDirection = null,
} = {}) {
  const carouselRef = useRef(null);
  const activeIndexRef = useRef(clampIndex(defaultIndex, itemCount));
  const scrollFrameRef = useRef(null);
  const scrollSettleTimerRef = useRef(null);
  const programmaticScrollTimerRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const guideAllowedSwipeDirectionRef = useRef(normalizeGuideSwipeDirection(guideAllowedSwipeDirection));
  const guideSwipeBoundaryIndexRef = useRef(clampIndex(defaultIndex, itemCount));
  const [activeIndex, setActiveIndex] = useState(() =>
    clampIndex(defaultIndex, itemCount)
  );

  const clearScrollSettleTimer = useCallback(() => {
    if (scrollSettleTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(scrollSettleTimerRef.current);
    }
    scrollSettleTimerRef.current = null;
  }, []);

  const clearProgrammaticScrollTimer = useCallback(() => {
    if (programmaticScrollTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = null;
  }, []);

  const commitActiveIndex = useCallback(
    (index) => {
      const safeIndex = clampIndex(index, itemCount);
      const guideDirection = guideAllowedSwipeDirectionRef.current;

      if (guideDirection === "left") {
        guideSwipeBoundaryIndexRef.current = Math.max(
          guideSwipeBoundaryIndexRef.current,
          safeIndex
        );
      } else if (guideDirection === "right") {
        guideSwipeBoundaryIndexRef.current = Math.min(
          guideSwipeBoundaryIndexRef.current,
          safeIndex
        );
      }

      activeIndexRef.current = safeIndex;
      setActiveIndex((currentIndex) =>
        currentIndex === safeIndex ? currentIndex : safeIndex
      );
    },
    [itemCount]
  );

  const getSlideWidth = useCallback(() => {
    const container = carouselRef.current;
    if (!container || itemCount <= 0) return 1;
    return container.clientWidth || container.scrollWidth / itemCount || 1;
  }, [itemCount]);

  const getCurrentScrollIndex = useCallback(() => {
    const container = carouselRef.current;
    if (!container || itemCount <= 0) return activeIndexRef.current;

    return clampIndex(Math.round(container.scrollLeft / getSlideWidth()), itemCount);
  }, [getSlideWidth, itemCount]);

  const markProgrammaticScroll = useCallback(
    (behavior = "smooth") => {
      if (typeof window === "undefined") return;

      clearProgrammaticScrollTimer();
      isProgrammaticScrollRef.current = true;
      programmaticScrollTimerRef.current = window.setTimeout(
        () => {
          isProgrammaticScrollRef.current = false;
          programmaticScrollTimerRef.current = null;
        },
        behavior === "smooth"
          ? PROGRAMMATIC_SCROLL_GUARD_MS
          : INSTANT_SCROLL_GUARD_MS
      );
    },
    [clearProgrammaticScrollTimer]
  );

  const clampIndexForGuideDirection = useCallback(
    (index) => {
      const safeIndex = clampIndex(index, itemCount);
      const guideDirection = guideAllowedSwipeDirectionRef.current;
      const boundaryIndex = clampIndex(guideSwipeBoundaryIndexRef.current, itemCount);

      if (guideDirection === "left") {
        return Math.max(safeIndex, boundaryIndex);
      }

      if (guideDirection === "right") {
        return Math.min(safeIndex, boundaryIndex);
      }

      return safeIndex;
    },
    [itemCount]
  );

  const scrollToIndex = useCallback(
    (index, behavior = "smooth") => {
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      const safeIndex = clampIndexForGuideDirection(index);
      markProgrammaticScroll(behavior);
      container.scrollTo({ left: getSlideWidth() * safeIndex, behavior });
      commitActiveIndex(safeIndex);
    },
    [clampIndexForGuideDirection, commitActiveIndex, getSlideWidth, itemCount, markProgrammaticScroll]
  );

  const commitSettledScrollIndex = useCallback(() => {
    commitActiveIndex(clampIndexForGuideDirection(getCurrentScrollIndex()));
  }, [clampIndexForGuideDirection, commitActiveIndex, getCurrentScrollIndex]);

  const enforceGuideSwipeDirection = useCallback(() => {
    const guideDirection = guideAllowedSwipeDirectionRef.current;
    const container = carouselRef.current;

    if (!guideDirection || !container || itemCount <= 0) return false;

    const boundaryIndex = clampIndex(guideSwipeBoundaryIndexRef.current, itemCount);
    const boundaryLeft = getSlideWidth() * boundaryIndex;
    const isTryingToMoveRightDuringLeftMission =
      guideDirection === "left" && container.scrollLeft < boundaryLeft - 1;
    const isTryingToMoveLeftDuringRightMission =
      guideDirection === "right" && container.scrollLeft > boundaryLeft + 1;

    if (!isTryingToMoveRightDuringLeftMission && !isTryingToMoveLeftDuringRightMission) {
      return false;
    }

    markProgrammaticScroll("auto");
    container.scrollTo({ left: boundaryLeft, behavior: "auto" });
    return true;
  }, [getSlideWidth, itemCount, markProgrammaticScroll]);

  const markUserInteraction = useCallback(() => {
    if (!isProgrammaticScrollRef.current) {
      hasUserInteractedRef.current = true;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      clearScrollSettleTimer();

      enforceGuideSwipeDirection();

      scrollSettleTimerRef.current = window.setTimeout(() => {
        scrollSettleTimerRef.current = null;
        commitSettledScrollIndex();
      }, SCROLL_SETTLE_DEBOUNCE_MS);
    });
  }, [clearScrollSettleTimer, commitSettledScrollIndex, enforceGuideSwipeDirection]);

  const interactionHandlers = useMemo(
    () => ({
      onPointerDown: markUserInteraction,
      onTouchStart: markUserInteraction,
      onWheel: markUserInteraction,
      onKeyDown: markUserInteraction,
    }),
    [markUserInteraction]
  );

  useEffect(() => {
    const nextDirection = normalizeGuideSwipeDirection(guideAllowedSwipeDirection);
    guideAllowedSwipeDirectionRef.current = nextDirection;
    guideSwipeBoundaryIndexRef.current = activeIndexRef.current;
  }, [guideAllowedSwipeDirection]);

  useEffect(() => {
    if (itemCount <= 0 || typeof window === "undefined") return undefined;

    const safeDefaultIndex = clampIndex(defaultIndex, itemCount);

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      activeIndexRef.current = safeDefaultIndex;
      guideSwipeBoundaryIndexRef.current = safeDefaultIndex;
      setActiveIndex(safeDefaultIndex);

      const frame = window.requestAnimationFrame(() => {
        scrollToIndex(safeDefaultIndex, "auto");
      });

      return () => window.cancelAnimationFrame(frame);
    }

    const currentIndex = activeIndexRef.current;
    const safeCurrentIndex = clampIndex(currentIndex, itemCount);

    if (safeCurrentIndex !== currentIndex) {
      scrollToIndex(safeCurrentIndex, "auto");
    } else if (
      !hasUserInteractedRef.current &&
      currentIndex !== safeDefaultIndex
    ) {
      scrollToIndex(safeDefaultIndex, "auto");
    }

    return undefined;
  }, [defaultIndex, itemCount, scrollToIndex]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || itemCount <= 0 || typeof window === "undefined") {
      return undefined;
    }

    let resizeFrame = null;

    const realignCurrentSlide = () => {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;

        const safeIndex = clampIndex(activeIndexRef.current, itemCount);
        const targetLeft = getSlideWidth() * safeIndex;

        if (Math.abs(container.scrollLeft - targetLeft) <= 1) return;

        markProgrammaticScroll("auto");
        container.scrollTo({ left: targetLeft, behavior: "auto" });
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(realignCurrentSlide)
        : null;

    resizeObserver?.observe(container);
    window.addEventListener("resize", realignCurrentSlide);

    return () => {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }
      resizeObserver?.disconnect();
      window.removeEventListener("resize", realignCurrentSlide);
    };
  }, [getSlideWidth, itemCount, markProgrammaticScroll]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || typeof container.addEventListener !== "function") {
      return undefined;
    }

    const handleScrollEnd = () => {
      clearScrollSettleTimer();
      enforceGuideSwipeDirection();
      commitSettledScrollIndex();
    };

    container.addEventListener("scrollend", handleScrollEnd);

    return () => {
      container.removeEventListener("scrollend", handleScrollEnd);
    };
  }, [clearScrollSettleTimer, commitSettledScrollIndex, enforceGuideSwipeDirection]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      clearScrollSettleTimer();
      clearProgrammaticScrollTimer();
    };
  }, [clearProgrammaticScrollTimer, clearScrollSettleTimer]);

  return {
    carouselRef,
    activeIndex,
    scrollToIndex,
    handleScroll,
    interactionHandlers,
    pauseAutoMove: () => {},
    resumeAutoMoveSoon: () => {},
  };
}
