import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SCROLL_SETTLE_DEBOUNCE_MS = 110;
const PROGRAMMATIC_SCROLL_GUARD_MS = 520;
const INSTANT_SCROLL_GUARD_MS = 90;
const GUIDE_DRAG_LOCK_THRESHOLD_PX = 7;
const GUIDE_SWIPE_AXIS_RATIO = 1.05;
const GUIDE_SWIPE_DISTANCE_MAX_PX = 52;
const GUIDE_SWIPE_DISTANCE_RATIO = 0.16;
const GUIDE_SWIPE_VELOCITY_THRESHOLD = 0.35;
const GUIDE_WHEEL_LOCK_MS = 360;

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

const createGuidePointerGestureState = (startIndex = 0) => ({
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startIndex,
  startScrollLeft: 0,
  lastX: 0,
  lastTime: 0,
  velocityX: 0,
  isHorizontalDrag: false,
});

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
  const guideWheelLockTimerRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const guideAllowedSwipeDirectionRef = useRef(normalizeGuideSwipeDirection(guideAllowedSwipeDirection));
  const guideSwipeBoundaryIndexRef = useRef(clampIndex(defaultIndex, itemCount));
  const guideMaxStepPerInteractionRef = useRef(normalizeGuideMaxStep(guideMaxStepPerInteraction));
  const guideInteractionStartIndexRef = useRef(clampIndex(defaultIndex, itemCount));
  const guideInteractionActiveRef = useRef(false);
  const guidePointerGestureRef = useRef(
    createGuidePointerGestureState(clampIndex(defaultIndex, itemCount))
  );
  const guideWheelLockedRef = useRef(false);
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

  const clearGuideWheelLockTimer = useCallback(() => {
    if (guideWheelLockTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(guideWheelLockTimerRef.current);
    }
    guideWheelLockTimerRef.current = null;
    guideWheelLockedRef.current = false;
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

  const handleControlledGuidePointerDown = useCallback((event) => {
    if (!guideMaxStepPerInteractionRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const container = carouselRef.current;
    if (!container) return;

    beginGuideInteraction(true);
    clearScrollSettleTimer();

    const startIndex = activeIndexRef.current;
    const eventTime = Number(event.timeStamp);

    guideInteractionStartIndexRef.current = startIndex;
    guideInteractionActiveRef.current = true;
    guidePointerGestureRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startIndex,
      startScrollLeft: container.scrollLeft,
      lastX: event.clientX,
      lastTime: Number.isFinite(eventTime) ? eventTime : 0,
      velocityX: 0,
      isHorizontalDrag: false,
    };

    try {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is optional; the one-card guard still works without it.
    }
  }, [beginGuideInteraction, clearScrollSettleTimer]);

  const handleControlledGuidePointerMove = useCallback((event) => {
    if (!guideMaxStepPerInteractionRef.current) return;

    const gesture = guidePointerGestureRef.current;
    const container = carouselRef.current;

    if (
      !gesture.active ||
      gesture.pointerId !== event.pointerId ||
      !container
    ) {
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    const eventTime = Number(event.timeStamp);
    const currentTime = Number.isFinite(eventTime) ? eventTime : gesture.lastTime;
    const elapsedTime = Math.max(1, currentTime - gesture.lastTime);
    const stepDeltaX = event.clientX - gesture.lastX;

    gesture.lastX = event.clientX;
    gesture.lastTime = currentTime;

    if (!gesture.isHorizontalDrag) {
      const passedLockThreshold =
        Math.abs(deltaX) >= GUIDE_DRAG_LOCK_THRESHOLD_PX;
      const hasHorizontalIntent =
        Math.abs(deltaX) > Math.abs(deltaY) * GUIDE_SWIPE_AXIS_RATIO;

      if (!passedLockThreshold || !hasHorizontalIntent) {
        return;
      }

      gesture.isHorizontalDrag = true;
    }

    clearScrollSettleTimer();

    const instantVelocityX = stepDeltaX / elapsedTime;
    gesture.velocityX =
      gesture.velocityX * 0.65 +
      instantVelocityX * 0.35;

    const { minimumIndex, maximumIndex } = getGuideAllowedIndexRange();
    const slideWidth = getSlideWidth();
    const minimumLeft = slideWidth * minimumIndex;
    const maximumLeft = slideWidth * maximumIndex;
    const intendedLeft = gesture.startScrollLeft - deltaX;
    const restrictedLeft = Math.max(
      minimumLeft,
      Math.min(maximumLeft, intendedLeft)
    );

    if (Math.abs(container.scrollLeft - restrictedLeft) > 0.1) {
      container.scrollLeft = restrictedLeft;
    }
  }, [clearScrollSettleTimer, getGuideAllowedIndexRange, getSlideWidth]);

  const finishControlledGuidePointer = useCallback((event, cancelled = false) => {
    const gesture = guidePointerGestureRef.current;

    if (!gesture.active || gesture.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget?.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore browsers that already released pointer capture.
    }

    guidePointerGestureRef.current =
      createGuidePointerGestureState(activeIndexRef.current);
    clearScrollSettleTimer();

    if (!guideMaxStepPerInteractionRef.current) {
      guideInteractionActiveRef.current = false;
      guideInteractionStartIndexRef.current = activeIndexRef.current;
      return;
    }

    guideInteractionStartIndexRef.current = gesture.startIndex;
    guideInteractionActiveRef.current = true;

    if (cancelled || !gesture.isHorizontalDrag) {
      scrollToIndex(gesture.startIndex, "smooth");
      return;
    }

    const deltaX = event.clientX - gesture.startX;
    const eventTime = Number(event.timeStamp);
    const releaseTime = Number.isFinite(eventTime) ? eventTime : gesture.lastTime;
    const releaseElapsedTime = Math.max(1, releaseTime - gesture.lastTime);
    const releaseStepDeltaX = event.clientX - gesture.lastX;
    const releaseVelocityX =
      Math.abs(releaseStepDeltaX) > 0.01
        ? gesture.velocityX * 0.65 +
          (releaseStepDeltaX / releaseElapsedTime) * 0.35
        : gesture.velocityX;
    const distanceThreshold = Math.min(
      GUIDE_SWIPE_DISTANCE_MAX_PX,
      getSlideWidth() * GUIDE_SWIPE_DISTANCE_RATIO
    );
    const passedDistance = Math.abs(deltaX) >= distanceThreshold;
    const velocityMatchesDirection =
      deltaX !== 0 &&
      Math.sign(releaseVelocityX) === Math.sign(deltaX);
    const passedVelocity =
      Math.abs(releaseVelocityX) >= GUIDE_SWIPE_VELOCITY_THRESHOLD &&
      velocityMatchesDirection;
    const directionStep =
      passedDistance || passedVelocity
        ? deltaX < 0
          ? 1
          : -1
        : 0;

    scrollToIndex(gesture.startIndex + directionStep, "smooth");
  }, [clearScrollSettleTimer, getSlideWidth, scrollToIndex]);

  const handleControlledGuideWheel = useCallback((event) => {
    beginGuideInteraction(false);

    if (!guideMaxStepPerInteractionRef.current) return;

    const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      ? event.deltaX
      : 0;

    if (!horizontalDelta) return;

    event.preventDefault?.();

    if (guideWheelLockedRef.current) return;

    guideWheelLockedRef.current = true;
    guideInteractionStartIndexRef.current = activeIndexRef.current;
    guideInteractionActiveRef.current = true;
    scrollToIndex(activeIndexRef.current + (horizontalDelta > 0 ? 1 : -1), "smooth");

    if (typeof window !== "undefined") {
      clearGuideWheelLockTimer();
      guideWheelLockedRef.current = true;
      guideWheelLockTimerRef.current = window.setTimeout(() => {
        guideWheelLockedRef.current = false;
        guideWheelLockTimerRef.current = null;
      }, GUIDE_WHEEL_LOCK_MS);
    }
  }, [beginGuideInteraction, clearGuideWheelLockTimer, scrollToIndex]);

  const handleControlledGuideKeyDown = useCallback((event) => {
    beginGuideInteraction(false);

    if (!guideMaxStepPerInteractionRef.current) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault?.();
    guideInteractionStartIndexRef.current = activeIndexRef.current;
    guideInteractionActiveRef.current = true;
    scrollToIndex(activeIndexRef.current + (event.key === "ArrowRight" ? 1 : -1), "smooth");
  }, [beginGuideInteraction, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;

    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      clearScrollSettleTimer();

      enforceGuideScrollRestrictions();

      if (guidePointerGestureRef.current.active) {
        return;
      }

      scrollSettleTimerRef.current = window.setTimeout(() => {
        scrollSettleTimerRef.current = null;
        commitSettledScrollIndex();
      }, SCROLL_SETTLE_DEBOUNCE_MS);
    });
  }, [clearScrollSettleTimer, commitSettledScrollIndex, enforceGuideScrollRestrictions]);

  const interactionHandlers = useMemo(
    () => ({
      onPointerDown: handleControlledGuidePointerDown,
      onPointerMove: handleControlledGuidePointerMove,
      onPointerUp: (event) => finishControlledGuidePointer(event, false),
      onPointerCancel: (event) => finishControlledGuidePointer(event, true),
      onWheel: handleControlledGuideWheel,
      onKeyDown: handleControlledGuideKeyDown,
    }),
    [
      finishControlledGuidePointer,
      handleControlledGuideKeyDown,
      handleControlledGuidePointerDown,
      handleControlledGuidePointerMove,
      handleControlledGuideWheel,
    ]
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
    guidePointerGestureRef.current =
      createGuidePointerGestureState(activeIndexRef.current);
    clearGuideWheelLockTimer();
  }, [clearGuideWheelLockTimer, guideMaxStepPerInteraction]);

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

      if (guidePointerGestureRef.current.active) {
        return;
      }

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
      clearGuideWheelLockTimer();
    };
  }, [clearGuideWheelLockTimer, clearProgrammaticScrollTimer, clearScrollSettleTimer]);

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
