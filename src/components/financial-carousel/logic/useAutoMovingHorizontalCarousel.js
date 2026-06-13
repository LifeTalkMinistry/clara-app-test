import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 42;

const clampIndex = (index, length) => {
  if (!length) return 0;
  return Math.max(0, Math.min(length - 1, Number(index) || 0));
};

export default function useAutoMovingHorizontalCarousel({
  itemCount = 0,
  defaultIndex = 0,
  autoMove = true,
  autoMoveMs = 5200,
  resumeDelayMs = 4200,
} = {}) {
  const carouselRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const autoMoveTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const didSetDefaultSlideRef = useRef(false);
  const isUserInteractingRef = useRef(false);
  const gestureStartXRef = useRef(null);
  const gestureStartScrollLeftRef = useRef(0);
  const gestureStartIndexRef = useRef(0);
  const isGestureTrackingRef = useRef(false);
  const settleFrameRef = useRef(null);
  const activeIndexRef = useRef(clampIndex(defaultIndex, itemCount));
  const [activeIndex, setActiveIndex] = useState(() =>
    clampIndex(defaultIndex, itemCount)
  );

  const clearAutoMoveTimer = useCallback(() => {
    if (autoMoveTimerRef.current) {
      window.clearInterval(autoMoveTimerRef.current);
      autoMoveTimerRef.current = null;
    }
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  // Performance:
  // Scroll events can fire many times during a swipe.
  // Only commit activeIndex when the nearest slide actually changes.
  // This keeps virtualization working without forcing React renders per pixel.
  const commitActiveIndex = useCallback(
    (nextIndex) => {
      const numericIndex = Number(nextIndex);
      if (!Number.isFinite(numericIndex)) return;

      const safeIndex = clampIndex(numericIndex, itemCount);

      if (activeIndexRef.current === safeIndex) return;

      activeIndexRef.current = safeIndex;
      setActiveIndex((currentIndex) => {
        if (currentIndex === safeIndex) return currentIndex;
        return safeIndex;
      });
    },
    [itemCount]
  );

  const getSlideWidth = useCallback(() => {
    const container = carouselRef.current;
    if (!container || itemCount <= 0) return 1;

    return container.clientWidth || container.scrollWidth / itemCount || 1;
  }, [itemCount]);

  const scrollToIndex = useCallback(
    (nextIndex, behavior = "smooth") => {
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      const safeIndex = clampIndex(nextIndex, itemCount);
      const slideWidth = getSlideWidth();

      container.scrollTo({
        left: slideWidth * safeIndex,
        behavior,
      });

      commitActiveIndex(safeIndex);
    },
    [commitActiveIndex, getSlideWidth, itemCount]
  );

  const startAutoMove = useCallback(() => {
    if (!autoMove || itemCount <= 1 || typeof window === "undefined") return;
    if (isUserInteractingRef.current) return;

    clearAutoMoveTimer();
    autoMoveTimerRef.current = window.setInterval(() => {
      if (isUserInteractingRef.current) return;

      const nextIndex = (activeIndexRef.current + 1) % itemCount;
      scrollToIndex(nextIndex, "smooth");
    }, autoMoveMs);
  }, [autoMove, autoMoveMs, clearAutoMoveTimer, itemCount, scrollToIndex]);

  const pauseAutoMove = useCallback(() => {
    isUserInteractingRef.current = true;
    clearAutoMoveTimer();
    clearResumeTimer();
  }, [clearAutoMoveTimer, clearResumeTimer]);

  const resumeAutoMoveSoon = useCallback(() => {
    clearResumeTimer();

    if (!autoMove || itemCount <= 1 || typeof window === "undefined") {
      isUserInteractingRef.current = false;
      return;
    }

    resumeTimerRef.current = window.setTimeout(() => {
      isUserInteractingRef.current = false;
      startAutoMove();
    }, resumeDelayMs);
  }, [autoMove, clearResumeTimer, itemCount, resumeDelayMs, startAutoMove]);

  const startGesture = useCallback(
    (clientX) => {
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      pauseAutoMove();

      gestureStartXRef.current = clientX;
      gestureStartScrollLeftRef.current = container.scrollLeft;
      gestureStartIndexRef.current = activeIndexRef.current;
      isGestureTrackingRef.current = true;
    },
    [itemCount, pauseAutoMove]
  );

  const endGesture = useCallback(
    (clientX) => {
      const container = carouselRef.current;

      if (!container || itemCount <= 0 || !isGestureTrackingRef.current) {
        resumeAutoMoveSoon();
        return;
      }

      const startX = gestureStartXRef.current;
      const startIndex = gestureStartIndexRef.current;

      gestureStartXRef.current = null;
      isGestureTrackingRef.current = false;

      if (typeof startX !== "number") {
        scrollToIndex(startIndex, "smooth");
        resumeAutoMoveSoon();
        return;
      }

      const dragDelta = clientX - startX;
      let direction = 0;

      if (Math.abs(dragDelta) >= SWIPE_THRESHOLD_PX) {
        direction = dragDelta < 0 ? 1 : -1;
      }

      const targetIndex = clampIndex(startIndex + direction, itemCount);

      if (typeof window === "undefined") {
        scrollToIndex(targetIndex, "smooth");
        resumeAutoMoveSoon();
        return;
      }

      if (settleFrameRef.current) {
        window.cancelAnimationFrame(settleFrameRef.current);
      }

      settleFrameRef.current = window.requestAnimationFrame(() => {
        scrollToIndex(targetIndex, "smooth");
      });

      resumeAutoMoveSoon();
    },
    [itemCount, resumeAutoMoveSoon, scrollToIndex]
  );

  const handlePointerDown = useCallback(
    (event) => {
      startGesture(event.clientX);
    },
    [startGesture]
  );

  const handlePointerUp = useCallback(
    (event) => {
      endGesture(event.clientX);
    },
    [endGesture]
  );

  const handlePointerCancel = useCallback(() => {
    if (!isGestureTrackingRef.current) {
      resumeAutoMoveSoon();
      return;
    }

    const startIndex = gestureStartIndexRef.current;
    isGestureTrackingRef.current = false;
    gestureStartXRef.current = null;
    scrollToIndex(startIndex, "smooth");
    resumeAutoMoveSoon();
  }, [resumeAutoMoveSoon, scrollToIndex]);

  const handleTouchStart = useCallback(
    (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;

      startGesture(touch.clientX);
    },
    [startGesture]
  );

  const handleTouchEnd = useCallback(
    (event) => {
      const touch = event.changedTouches?.[0] || event.touches?.[0];

      if (!touch) {
        handlePointerCancel();
        return;
      }

      endGesture(touch.clientX);
    },
    [endGesture, handlePointerCancel]
  );

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current || typeof window === "undefined") return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;

      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      const slideWidth = getSlideWidth();
      if (!slideWidth) return;

      const index = Math.round(container.scrollLeft / slideWidth);
      commitActiveIndex(index);
    });
  }, [commitActiveIndex, getSlideWidth, itemCount]);

  const interactionHandlers = {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerCancel,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handlePointerCancel,
    onMouseEnter: pauseAutoMove,
    onMouseLeave: resumeAutoMoveSoon,
    onFocus: pauseAutoMove,
    onBlur: resumeAutoMoveSoon,
  };

  useEffect(() => {
    const safeDefaultIndex = clampIndex(defaultIndex, itemCount);
    commitActiveIndex(safeDefaultIndex);
  }, [commitActiveIndex, defaultIndex, itemCount]);

  useEffect(() => {
    if (!itemCount || didSetDefaultSlideRef.current) return;
    didSetDefaultSlideRef.current = true;
    window.requestAnimationFrame(() => scrollToIndex(defaultIndex, "auto"));
  }, [defaultIndex, itemCount, scrollToIndex]);

  useEffect(() => {
    startAutoMove();

    return () => {
      clearAutoMoveTimer();
    };
  }, [clearAutoMoveTimer, startAutoMove]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
      if (settleFrameRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(settleFrameRef.current);
        settleFrameRef.current = null;
      }
      clearAutoMoveTimer();
      clearResumeTimer();
    };
  }, [clearAutoMoveTimer, clearResumeTimer]);

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
