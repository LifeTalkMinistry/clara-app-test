import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SCROLL_SETTLE_DEBOUNCE_MS = 110;
const PROGRAMMATIC_SCROLL_GUARD_MS = 520;
const INSTANT_SCROLL_GUARD_MS = 90;

const clampIndex = (index, length) => {
  if (!length) return 0;
  return Math.max(0, Math.min(length - 1, Number(index) || 0));
};

export default function useAutoMovingHorizontalCarousel({
  itemCount = 0,
  defaultIndex = 0,
} = {}) {
  const carouselRef = useRef(null);
  const activeIndexRef = useRef(clampIndex(defaultIndex, itemCount));
  const scrollFrameRef = useRef(null);
  const scrollSettleTimerRef = useRef(null);
  const programmaticScrollTimerRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
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

  const scrollToIndex = useCallback(
    (index, behavior = "smooth") => {
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      const safeIndex = clampIndex(index, itemCount);
      markProgrammaticScroll(behavior);
      container.scrollTo({ left: getSlideWidth() * safeIndex, behavior });
      commitActiveIndex(safeIndex);
    },
    [commitActiveIndex, getSlideWidth, itemCount, markProgrammaticScroll]
  );

  const commitSettledScrollIndex = useCallback(() => {
    commitActiveIndex(getCurrentScrollIndex());
  }, [commitActiveIndex, getCurrentScrollIndex]);

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

      scrollSettleTimerRef.current = window.setTimeout(() => {
        scrollSettleTimerRef.current = null;
        commitSettledScrollIndex();
      }, SCROLL_SETTLE_DEBOUNCE_MS);
    });
  }, [clearScrollSettleTimer, commitSettledScrollIndex]);

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
    if (itemCount <= 0 || typeof window === "undefined") return undefined;

    const safeDefaultIndex = clampIndex(defaultIndex, itemCount);

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      activeIndexRef.current = safeDefaultIndex;
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
      commitSettledScrollIndex();
    };

    container.addEventListener("scrollend", handleScrollEnd);

    return () => {
      container.removeEventListener("scrollend", handleScrollEnd);
    };
  }, [clearScrollSettleTimer, commitSettledScrollIndex]);

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
