import { useCallback, useEffect, useRef, useState } from "react";

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

  const setSafeActiveIndex = useCallback(
    (nextIndex) => {
      const safeIndex = clampIndex(nextIndex, itemCount);
      activeIndexRef.current = safeIndex;
      setActiveIndex(safeIndex);
    },
    [itemCount]
  );

  const scrollToIndex = useCallback(
    (nextIndex, behavior = "smooth") => {
      const container = carouselRef.current;
      if (!container || itemCount <= 0) return;

      const safeIndex = clampIndex(nextIndex, itemCount);
      const slideWidth =
        container.clientWidth || container.scrollWidth / itemCount || 1;

      container.scrollTo({
        left: slideWidth * safeIndex,
        behavior,
      });

      setSafeActiveIndex(safeIndex);
    },
    [itemCount, setSafeActiveIndex]
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

  const handleScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container || itemCount <= 0 || typeof window === "undefined") return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const slideWidth =
        container.scrollWidth / itemCount || container.clientWidth || 1;
      const index = Math.round(container.scrollLeft / slideWidth);
      setSafeActiveIndex(index);
    });
  }, [itemCount, setSafeActiveIndex]);

  const interactionHandlers = {
    onPointerDown: pauseAutoMove,
    onPointerUp: resumeAutoMoveSoon,
    onPointerCancel: resumeAutoMoveSoon,
    onPointerLeave: resumeAutoMoveSoon,
    onTouchStart: pauseAutoMove,
    onTouchEnd: resumeAutoMoveSoon,
    onMouseEnter: pauseAutoMove,
    onMouseLeave: resumeAutoMoveSoon,
    onFocus: pauseAutoMove,
    onBlur: resumeAutoMoveSoon,
  };

  useEffect(() => {
    const safeDefaultIndex = clampIndex(defaultIndex, itemCount);
    setSafeActiveIndex(safeDefaultIndex);
  }, [defaultIndex, itemCount, setSafeActiveIndex]);

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
