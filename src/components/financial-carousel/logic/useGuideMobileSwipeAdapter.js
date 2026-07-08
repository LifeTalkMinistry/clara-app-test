import { useCallback, useMemo, useRef } from "react";

const MOBILE_DRAG_LOCK_THRESHOLD_PX = 4;
const MOBILE_SWIPE_AXIS_RATIO = 0.8;
const MOBILE_SWIPE_DISTANCE_MAX_PX = 28;
const MOBILE_SWIPE_DISTANCE_RATIO = 0.08;
const MOBILE_SWIPE_VELOCITY_THRESHOLD = 0.18;

// These mirror the guarded thresholds inside the existing controlled carousel.
// The adapter only changes Guide Mode input before forwarding it.
const INTERNAL_DRAG_LOCK_THRESHOLD_PX = 7;
const INTERNAL_SWIPE_DISTANCE_MAX_PX = 52;
const INTERNAL_SWIPE_DISTANCE_RATIO = 0.16;
const INTERNAL_SWIPE_VELOCITY_THRESHOLD = 0.35;
const LIVE_LOCK_PADDING_PX = 0.25;
const VELOCITY_TIME_SCALE =
  MOBILE_SWIPE_VELOCITY_THRESHOLD / INTERNAL_SWIPE_VELOCITY_THRESHOLD;

const INTERACTIVE_TARGET_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "[role='button']",
  "[contenteditable='true']",
  "[data-clara-finance-expand-toggle='true']",
  "[data-clara-carousel-swipe-ignore='true']",
].join(",");

const createGestureState = () => ({
  active: false,
  ignored: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startTime: 0,
  lastX: 0,
  lastY: 0,
  horizontalIntent: false,
  liveOffsetX: 0,
});

const isFiniteCoordinate = (value) => Number.isFinite(Number(value));

const getEventTime = (event) => {
  const value = Number(event?.timeStamp);
  return Number.isFinite(value) ? value : 0;
};

const getAdaptedTime = (gesture, event) => {
  const eventTime = getEventTime(event);
  const elapsed = Math.max(0, eventTime - gesture.startTime);
  return gesture.startTime + elapsed * VELOCITY_TIME_SCALE;
};

const isInteractiveTarget = (target) =>
  Boolean(target?.closest?.(INTERACTIVE_TARGET_SELECTOR));

const createAdaptedPointerEvent = (
  event,
  { clientX, clientY, timeStamp = getEventTime(event) }
) => {
  const adaptedEvent = Object.create(event);

  Object.defineProperties(adaptedEvent, {
    clientX: { configurable: true, enumerable: true, value: clientX },
    clientY: { configurable: true, enumerable: true, value: clientY },
    timeStamp: { configurable: true, enumerable: true, value: timeStamp },
    currentTarget: {
      configurable: true,
      enumerable: true,
      value: event.currentTarget,
    },
    target: {
      configurable: true,
      enumerable: true,
      value: event.target,
    },
    nativeEvent: {
      configurable: true,
      enumerable: true,
      value: event.nativeEvent,
    },
  });

  return adaptedEvent;
};

const getMobileDistanceThreshold = (viewportWidth) =>
  Math.min(
    MOBILE_SWIPE_DISTANCE_MAX_PX,
    Math.max(1, viewportWidth) * MOBILE_SWIPE_DISTANCE_RATIO
  );

const getInternalDistanceThreshold = (viewportWidth) =>
  Math.min(
    INTERNAL_SWIPE_DISTANCE_MAX_PX,
    Math.max(1, viewportWidth) * INTERNAL_SWIPE_DISTANCE_RATIO
  );

export const GUIDE_MOBILE_SWIPE_SETTINGS = Object.freeze({
  dragLockThresholdPx: MOBILE_DRAG_LOCK_THRESHOLD_PX,
  swipeAxisRatio: MOBILE_SWIPE_AXIS_RATIO,
  distanceMaxPx: MOBILE_SWIPE_DISTANCE_MAX_PX,
  distanceRatio: MOBILE_SWIPE_DISTANCE_RATIO,
  velocityThreshold: MOBILE_SWIPE_VELOCITY_THRESHOLD,
});

export default function useGuideMobileSwipeAdapter({
  enabled = false,
  interactionHandlers = {},
} = {}) {
  const gestureRef = useRef(createGestureState());

  const resetGesture = useCallback(() => {
    gestureRef.current = createGestureState();
  }, []);

  const handlePointerDown = useCallback(
    (event) => {
      if (!enabled) {
        interactionHandlers.onPointerDown?.(event);
        return;
      }

      const ignored = isInteractiveTarget(event.target);
      const startX = Number(event.clientX) || 0;
      const startY = Number(event.clientY) || 0;

      gestureRef.current = {
        active: !ignored,
        ignored,
        pointerId: event.pointerId,
        startX,
        startY,
        startTime: getEventTime(event),
        lastX: startX,
        lastY: startY,
        horizontalIntent: false,
        liveOffsetX: 0,
      };

      if (!ignored) {
        interactionHandlers.onPointerDown?.(event);
      }
    },
    [enabled, interactionHandlers]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!enabled) {
        interactionHandlers.onPointerMove?.(event);
        return;
      }

      const gesture = gestureRef.current;

      if (
        !gesture.active ||
        gesture.ignored ||
        gesture.pointerId !== event.pointerId
      ) {
        return;
      }

      const currentX = isFiniteCoordinate(event.clientX)
        ? Number(event.clientX)
        : gesture.lastX;
      const currentY = isFiniteCoordinate(event.clientY)
        ? Number(event.clientY)
        : gesture.lastY;
      const deltaX = currentX - gesture.startX;
      const deltaY = currentY - gesture.startY;

      gesture.lastX = currentX;
      gesture.lastY = currentY;

      if (!gesture.horizontalIntent) {
        const passedLockThreshold =
          Math.abs(deltaX) >= MOBILE_DRAG_LOCK_THRESHOLD_PX;
        const hasHorizontalIntent =
          Math.abs(deltaX) > Math.abs(deltaY) * MOBILE_SWIPE_AXIS_RATIO;

        if (!passedLockThreshold || !hasHorizontalIntent) {
          return;
        }

        gesture.horizontalIntent = true;
        gesture.liveOffsetX =
          Math.sign(deltaX || 1) *
          Math.max(
            0,
            INTERNAL_DRAG_LOCK_THRESHOLD_PX +
              LIVE_LOCK_PADDING_PX -
              Math.abs(deltaX)
          );
      }

      try {
        event.preventDefault?.();
        event.nativeEvent?.preventDefault?.();
      } catch {
        // touch-action: pan-y remains the browser-level vertical scroll guard.
      }

      const liveDeltaX = deltaX + gesture.liveOffsetX;
      const maximumIntentY = Math.abs(liveDeltaX) / 1.1;
      const liveDeltaY = Math.max(
        -maximumIntentY,
        Math.min(maximumIntentY, deltaY)
      );

      interactionHandlers.onPointerMove?.(
        createAdaptedPointerEvent(event, {
          clientX: gesture.startX + liveDeltaX,
          clientY: gesture.startY + liveDeltaY,
          timeStamp: getAdaptedTime(gesture, event),
        })
      );
    },
    [enabled, interactionHandlers]
  );

  const finishPointer = useCallback(
    (event, cancelled) => {
      if (!enabled) {
        const handler = cancelled
          ? interactionHandlers.onPointerCancel
          : interactionHandlers.onPointerUp;
        handler?.(event);
        return;
      }

      const gesture = gestureRef.current;

      if (gesture.pointerId !== event.pointerId) {
        return;
      }

      if (gesture.ignored || !gesture.active) {
        resetGesture();
        return;
      }

      const eventX = isFiniteCoordinate(event.clientX)
        ? Number(event.clientX)
        : gesture.lastX;
      const eventY = isFiniteCoordinate(event.clientY)
        ? Number(event.clientY)
        : gesture.lastY;
      const finalX = cancelled ? gesture.lastX : eventX;
      const finalY = cancelled ? gesture.lastY : eventY;
      const actualDeltaX = finalX - gesture.startX;
      const actualDeltaY = finalY - gesture.startY;
      const stillHorizontal =
        Math.abs(actualDeltaX) >
        Math.abs(actualDeltaY) * MOBILE_SWIPE_AXIS_RATIO;

      if (!gesture.horizontalIntent || (cancelled && !stillHorizontal)) {
        const handler = cancelled
          ? interactionHandlers.onPointerCancel
          : interactionHandlers.onPointerUp;

        handler?.(
          createAdaptedPointerEvent(event, {
            clientX: finalX,
            clientY: finalY,
          })
        );
        resetGesture();
        return;
      }

      const viewportWidth = Number(event.currentTarget?.clientWidth) || 1;
      const passedDistance =
        Math.abs(actualDeltaX) >= getMobileDistanceThreshold(viewportWidth);
      const releaseDeltaX = passedDistance
        ? Math.sign(actualDeltaX || 1) *
          (getInternalDistanceThreshold(viewportWidth) + LIVE_LOCK_PADDING_PX)
        : actualDeltaX + gesture.liveOffsetX;

      // A cancelled horizontal gesture is evaluated like a release using its
      // latest real coordinates. Vertical cancellations still use the original
      // cancellation path and snap safely to the starting card.
      interactionHandlers.onPointerUp?.(
        createAdaptedPointerEvent(event, {
          clientX: gesture.startX + releaseDeltaX,
          clientY: gesture.startY,
          timeStamp: getAdaptedTime(gesture, event),
        })
      );

      resetGesture();
    },
    [enabled, interactionHandlers, resetGesture]
  );

  return useMemo(() => {
    if (!enabled) return interactionHandlers;

    return {
      ...interactionHandlers,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: (event) => finishPointer(event, false),
      onPointerCancel: (event) => finishPointer(event, true),
    };
  }, [
    enabled,
    finishPointer,
    handlePointerDown,
    handlePointerMove,
    interactionHandlers,
  ]);
}
