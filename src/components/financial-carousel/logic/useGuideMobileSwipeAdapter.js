import { useCallback, useMemo, useRef } from "react";

const MOBILE_DRAG_LOCK_THRESHOLD_PX = 4;
const MOBILE_SWIPE_AXIS_RATIO = 0.8;

// The existing controlled carousel settles at 52px / 0.35px-ms. Only the
// release coordinate is amplified so the live card still follows the finger
// at nearly 1:1 while mobile acceptance becomes about 28px / 0.19px-ms.
const RELEASE_DISTANCE_SCALE = 52 / 28;
const INTERNAL_DRAG_LOCK_THRESHOLD_PX = 7;
const LIVE_LOCK_PADDING_PX = 0.25;

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
  lastX: 0,
  lastY: 0,
  horizontalIntent: false,
  liveOffsetX: 0,
});

const isFiniteCoordinate = (value) => Number.isFinite(Number(value));

const isInteractiveTarget = (target) =>
  Boolean(target?.closest?.(INTERACTIVE_TARGET_SELECTOR));

const createAdaptedPointerEvent = (event, { clientX, clientY }) => {
  const adaptedEvent = Object.create(event);

  Object.defineProperties(adaptedEvent, {
    clientX: { configurable: true, enumerable: true, value: clientX },
    clientY: { configurable: true, enumerable: true, value: clientY },
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

export const GUIDE_MOBILE_SWIPE_SETTINGS = Object.freeze({
  dragLockThresholdPx: MOBILE_DRAG_LOCK_THRESHOLD_PX,
  swipeAxisRatio: MOBILE_SWIPE_AXIS_RATIO,
  distanceMaxPx: 28,
  distanceRatioApprox: 0.086,
  velocityThresholdApprox: 0.19,
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

      event.preventDefault?.();
      event.nativeEvent?.preventDefault?.();

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

      if (!gesture.horizontalIntent) {
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

      const releaseDeltaX =
        (finalX - gesture.startX) * RELEASE_DISTANCE_SCALE;

      // Treat a cancelled horizontal drag like a release, using the last real
      // coordinates. This avoids throwing away a valid swipe when mobile
      // Safari/Chrome cancels pointer capture during a completed gesture.
      interactionHandlers.onPointerUp?.(
        createAdaptedPointerEvent(event, {
          clientX: gesture.startX + releaseDeltaX,
          clientY: gesture.startY,
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
