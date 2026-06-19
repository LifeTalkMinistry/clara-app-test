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

const normalizeGuideMaxStep = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return Math.max(1, Math.floor(numericValue));
};

export default function useAutoMovingHorizontalCarousel({
  itemCount = 0,
  defaultIndex = 0,
  guideAllowedSwipeDirection = null,
  guideMaxStepPerInteraction = null,
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
  const guideMaxStepPerInteractionRef = useRef(normalizeGuideMaxStep(guideMaxStepPerInteraction));
  const guideInteractionStartIndexRef = useRef(clampIndex(defaultIndex, itemCount));
  const guideInteractionActiveRef = useRef(false);
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

  const getGuideAllowedIndexRange = useCallback(() => {
    let minimumIndex = 0;
    let maximumIndex = Math.max(0, itemCount - 1);
    const guideDirection = guideAllowedSwipeDirectionRef.current;
    const directionBoundaryIndex = clampIndex(guideSwipeBoundaryIndexRef.current, itemCount);
    const maxStep = guideMaxStepPerInteractionRef.current;

    if (guideDirection === "left") {
      minimumIndex = Math.max(minimumIndex, directionBoundaryIndex);
    } else if (guideDirection === "right") {
      maximumIndex = Math.min(maximumIndex, directionBoundaryIndex);
    }

    if (maxStep) {
      const interactionStartIndex = clampIndex(guideInteractionStartIndexRef.current, itemCount);
      minimumIndex = Math.max(minimumIndex, interactionStartIndex - maxStep);
      maximumIndex = Math.min(maximumIndex, interactionStartIndex + maxStep);
    }

    if (minimumIndex > maximumIndex) {
      const fallbackIndex = clampIndex(activeIndexRef.current, itemCount);
      minimumIndex = fallbackIndex;
      maximumIndex = fallbackIndex;
    }

    return { minimumIndex, maximumIndex };
  }, [itemCount]);

  const clampIndexForGuideRestrictions = useCallback(
    (index) => {
      const safeIndex = clampIndex(index, itemCount);
      const { minimumIndex, maximumIndex } = getGuideAllowedIndexRange();
      return Math.max(minimumIndex, Math.min(maximumIndex, safeIndex));
    },
    [getGuideAllowedIndexRange, itemCount]
  );

  const scrollToIndex = useCallback(
    (index, behavior = "smooth") => {
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      if (guideMaxStepPerInteractionRef.current && !guideInteractionActiveRef.current) {
        guideInteractionStartIndexRef.current = activeIndexRef.current;
      }

      const safeIndex = clampIndexForGuideRestrictions(index);
      markProgrammaticScroll(behavior);
      container.scrollTo({ left: getSlideWidth() * safeIndex, behavior });
      commitActiveIndex(safeIndex);

      if (guideMaxStepPerInteractionRef.current) {
        guideInteractionStartIndexRef.current = safeIndex;
        guideInteractionActiveRef.current = false;
      }
    },
    [clampIndexForGuideRestrictions, commitActiveIndex, getSlideWidth, itemCount, markProgrammaticScroll]
  );

  const commitSettledScrollIndex = useCallback(() => {
    const container = carouselRef.current;
    const safeIndex = clampIndexForGuideRestrictions(getCurrentScrollIndex());

    if (container) {
      const targetLeft = getSlideWidth() * safeIndex;
      if (Math.abs(container.scrollLeft - targetLeft) > 1) {
        markProgrammaticScroll("auto");
        container.scrollTo({ left: targetLeft, behavior: "auto" });
      }
    }

    commitActiveIndex(safeIndex);
    guideInteractionStartIndexRef.current = safeIndex;
    guideInteractionActiveRef.current = false;
  }, [clampIndexForGuideRestrictions, commitActiveIndex, getCurrentScrollIndex, getSlideWidth, markProgrammaticScroll]);

  const enforceGuideScrollRestrictions = useCallback(() => {
    const container = carouselRef.current;
    const hasDirectionRestriction = Boolean(guideAllowedSwipeDirectionRef.current);
    const hasStepRestriction = Boolean(guideMaxStepPerInteractionRef.current);

    if ((!hasDirectionRestriction && !hasStepRestriction) || !container || itemCount <= 0) {
      return false;
    }

    const { minimumIndex, maximumIndex } = getGuideAllowedIndexRange();
    const slideWidth = getSlideWidth();
    const minimumLeft = slideWidth * minimumIndex;
    const maximumLeft = slideWidth * maximumIndex;
    const restrictedLeft = Math.max(minimumLeft, Math.min(maximumLeft, container.scrollLeft));

    if (Math.abs(container.scrollLeft - restrictedLeft) <= 1) {
      return false;
    }

    markProgrammaticScroll("auto");
    container.scrollTo({ left: restrictedLeft, behavior: "auto" });
    return true;
  }, [getGuideAllowedIndexRange, getSlideWidth, itemCount, markProgrammaticScroll]);

  const beginGuideInteraction = useCallback((forceRestart = false) => {
    if (!isProgrammaticScrollRef.current) {
      hasUserInteractedRef.current = true;
    }

    if (!guideMaxStepPerInteractionRef.current) return;

    if (forceRestart || !guideInteractionActiveRef.current) {
      guideInteractionStartIndexRef.current = activeIndexRef.current;
      guideInteractionActiveRef.current = true;
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

      enforceGuideScrollRestrictions();

      scrollSettleTimerRef.current = window.setTimeout(() => {
        scrollSettleTimerRef.current = null;
        commitSettledScrollIndex();
      }, SCROLL_SETTLE_DEBOUNCE_MS);
    });
  }, [clearScrollSettleTimer, commitSettledScrollIndex, enforceGuideScrollRestrictions]);

  const interactionHandlers = useMemo(
    () => ({
      onPointerDown: () => beginGuideInteraction(true),
      onTouchStart: () => beginGuideInteraction(true),
      onWheel: () => beginGuideInteraction(false),
      onKeyDown: () => beginGuideInteraction(false),
    }),
    [beginGuideInteraction]
  );

  useEffect(() => {
    const nextDirection = normalizeGuideSwipeDirection(guideAllowedSwipeDirection);
    guideAllowedSwipeDirectionRef.current = nextDirection;
    guideSwipeBoundaryIndexRef.current = activeIndexRef.current;
  }, [guideAllowedSwipeDirection]);

  useEffect(() => {
    guideMaxStepPerInteractionRef.current = normalizeGuideMaxStep(guideMaxStepPerInteraction);
    guideInteractionStartIndexRef.current = activeIndexRef.current;
    guideInteractionActiveRef.current = false;
  }, [guideMaxStepPerInteraction]);

  useEffect(() => {
    if (itemCount <= 0 || typeof window === "undefined") return undefined;

    const safeDefaultIndex = clampIndex(defaultIndex, itemCount);

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      activeIndexRef.current = safeDefaultIndex;
      guideSwipeBoundaryIndexRef.current = safeDefaultIndex;
      guideInteractionStartIndexRef.current = safeDefaultIndex;
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
      enforceGuideScrollRestrictions();
      commitSettledScrollIndex();
    };

    container.addEventListener("scrollend", handleScrollEnd);

    return () => {
      container.removeEventListener("scrollend", handleScrollEnd);
    };
  }, [clearScrollSettleTimer, commitSettledScrollIndex, enforceGuideScrollRestrictions]);

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
