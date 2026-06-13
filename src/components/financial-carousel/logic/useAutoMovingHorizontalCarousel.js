import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 42;
const SLIDE_SETTLE_DELAY_MS = 560;

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
  const slideTimerRef = useRef(null);
  const startXRef = useRef(null);
  const startIndexRef = useRef(0);
  const trackingRef = useRef(false);
  const didSetDefaultSlideRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(() => clampIndex(defaultIndex, itemCount));

  const commitActiveIndex = useCallback(
    (index) => {
      const safeIndex = clampIndex(index, itemCount);
      activeIndexRef.current = safeIndex;
      setActiveIndex((currentIndex) => (currentIndex === safeIndex ? currentIndex : safeIndex));
    },
    [itemCount]
  );

  const getSlideWidth = useCallback(() => {
    const container = carouselRef.current;
    if (!container || itemCount <= 0) return 1;
    return container.clientWidth || container.scrollWidth / itemCount || 1;
  }, [itemCount]);

  const clearSlideTimer = useCallback(() => {
    if (slideTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(slideTimerRef.current);
    }
    slideTimerRef.current = null;
  }, []);

  const rawScrollToIndex = useCallback(
    (index, behavior = "smooth") => {
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      const safeIndex = clampIndex(index, itemCount);
      container.scrollTo({ left: getSlideWidth() * safeIndex, behavior });
      commitActiveIndex(safeIndex);
    },
    [commitActiveIndex, getSlideWidth, itemCount]
  );

  const scrollToIndex = useCallback(
    (index, behavior = "smooth") => {
      clearSlideTimer();
      rawScrollToIndex(index, behavior);
    },
    [clearSlideTimer, rawScrollToIndex]
  );

  const moveOneSlide = useCallback(
    (targetIndex) => {
      if (itemCount <= 1 || slideTimerRef.current) return;

      const safeTargetIndex = clampIndex(targetIndex, itemCount);
      rawScrollToIndex(safeTargetIndex, "smooth");

      if (typeof window !== "undefined") {
        slideTimerRef.current = window.setTimeout(() => {
          rawScrollToIndex(safeTargetIndex, "auto");
          slideTimerRef.current = null;
        }, SLIDE_SETTLE_DELAY_MS);
      }
    },
    [itemCount, rawScrollToIndex]
  );

  const pauseAutoMove = useCallback(() => {}, []);
  const resumeAutoMoveSoon = useCallback(() => {}, []);

  const startGesture = useCallback(
    (clientX) => {
      if (slideTimerRef.current || itemCount <= 0) return;

      startXRef.current = clientX;
      startIndexRef.current = activeIndexRef.current;
      trackingRef.current = true;
    },
    [itemCount]
  );

  const endGesture = useCallback(
    (clientX) => {
      if (slideTimerRef.current || !trackingRef.current || itemCount <= 0) return;

      const startX = startXRef.current;
      const startIndex = startIndexRef.current;

      startXRef.current = null;
      trackingRef.current = false;

      if (typeof startX !== "number") {
        rawScrollToIndex(startIndex, "smooth");
        return;
      }

      const dragDistance = clientX - startX;
      const direction = Math.abs(dragDistance) >= SWIPE_THRESHOLD_PX ? (dragDistance < 0 ? 1 : -1) : 0;
      const targetIndex = clampIndex(startIndex + direction, itemCount);

      if (targetIndex === startIndex) {
        rawScrollToIndex(startIndex, "smooth");
        return;
      }

      moveOneSlide(targetIndex);
    },
    [itemCount, moveOneSlide, rawScrollToIndex]
  );

  const handlePointerCancel = useCallback(() => {
    if (slideTimerRef.current) return;

    if (trackingRef.current) {
      trackingRef.current = false;
      startXRef.current = null;
      rawScrollToIndex(startIndexRef.current, "smooth");
    }
  }, [rawScrollToIndex]);

  const handleScroll = useCallback(() => {
    if (slideTimerRef.current || scrollFrameRef.current || typeof window === "undefined") return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      commitActiveIndex(Math.round(container.scrollLeft / getSlideWidth()));
    });
  }, [commitActiveIndex, getSlideWidth, itemCount]);

  const interactionHandlers = {
    onPointerDown: (event) => startGesture(event.clientX),
    onPointerUp: (event) => endGesture(event.clientX),
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerCancel,
    onTouchStart: (event) => {
      const touch = event.touches?.[0];
      if (touch) startGesture(touch.clientX);
    },
    onTouchEnd: (event) => {
      const touch = event.changedTouches?.[0] || event.touches?.[0];
      if (touch) endGesture(touch.clientX);
      else handlePointerCancel();
    },
    onTouchCancel: handlePointerCancel,
    onMouseEnter: pauseAutoMove,
    onMouseLeave: resumeAutoMoveSoon,
    onFocus: pauseAutoMove,
    onBlur: resumeAutoMoveSoon,
  };

  useEffect(() => {
    clearSlideTimer();
    commitActiveIndex(clampIndex(defaultIndex, itemCount));
  }, [clearSlideTimer, commitActiveIndex, defaultIndex, itemCount]);

  useEffect(() => {
    if (!itemCount || didSetDefaultSlideRef.current || typeof window === "undefined") return;
    didSetDefaultSlideRef.current = true;
    window.requestAnimationFrame(() => scrollToIndex(defaultIndex, "auto"));
  }, [defaultIndex, itemCount, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      clearSlideTimer();
    };
  }, [clearSlideTimer]);

  return {
    carouselRef,
    activeIndex,
    scrollToIndex,
    handleScroll,
    interactionHandlers,
    pauseAutoMove,
    resumeAutoMoveSoon,
  };
}
