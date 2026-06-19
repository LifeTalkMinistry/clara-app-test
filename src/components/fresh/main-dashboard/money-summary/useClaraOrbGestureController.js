import { useCallback, useEffect, useRef } from "react";

const SINGLE_TAP_DELAY = 280;
const DOUBLE_TAP_WINDOW = 280;
const LONG_PRESS_DELAY = 550;
const MOVE_CANCEL_DISTANCE = 12;

function getPoint(event) {
  return event?.touches?.[0] || event?.changedTouches?.[0] || event || {};
}

export default function useClaraOrbGestureController({
  isGuideMode = false,
  isGuideOrbLessonActive = false,
  guideOrbExpectedAction = null,
  onGuideOrbSingleTap,
  onGuideOrbDoubleTap,
  onGuideOrbLongPress,
  onProductionSingleTap,
  onProductionDoubleTap,
  onProductionLongPress,
  stopLegacyOrbEvent,
} = {}) {
  const singleTapTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapAtRef = useRef(0);
  const pointerStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const keyboardStateRef = useRef({ active: false, key: "" });

  const clearSingleTapTimer = useCallback(() => {
    if (singleTapTimerRef.current !== null) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const stopOrbEvent = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();
      stopLegacyOrbEvent?.(event);
    },
    [stopLegacyOrbEvent]
  );

  const resetInteraction = useCallback(() => {
    clearSingleTapTimer();
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    lastTapAtRef.current = 0;
    pointerStateRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      moved: false,
    };
    keyboardStateRef.current = { active: false, key: "" };
  }, [clearLongPressTimer, clearSingleTapTimer]);

  const runSingleTap = useCallback(() => {
    if (isGuideOrbLessonActive) {
      if (guideOrbExpectedAction === "single") onGuideOrbSingleTap?.();
      return;
    }

    if (isGuideMode) return;
    onProductionSingleTap?.();
  }, [
    guideOrbExpectedAction,
    isGuideMode,
    isGuideOrbLessonActive,
    onGuideOrbSingleTap,
    onProductionSingleTap,
  ]);

  const runDoubleTap = useCallback(
    (event) => {
      if (isGuideOrbLessonActive) {
        if (guideOrbExpectedAction === "double") onGuideOrbDoubleTap?.(event);
        return;
      }

      if (isGuideMode) return;
      onProductionDoubleTap?.(event);
    },
    [
      guideOrbExpectedAction,
      isGuideMode,
      isGuideOrbLessonActive,
      onGuideOrbDoubleTap,
      onProductionDoubleTap,
    ]
  );

  const runLongPress = useCallback(() => {
    if (isGuideOrbLessonActive) {
      if (guideOrbExpectedAction === "hold") onGuideOrbLongPress?.();
      return;
    }

    if (isGuideMode) return;
    onProductionLongPress?.();
  }, [
    guideOrbExpectedAction,
    isGuideMode,
    isGuideOrbLessonActive,
    onGuideOrbLongPress,
    onProductionLongPress,
  ]);

  const beginLongPress = useCallback(() => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressTriggeredRef.current = true;
      clearSingleTapTimer();
      lastTapAtRef.current = 0;
      runLongPress();
    }, LONG_PRESS_DELAY);
  }, [clearLongPressTimer, clearSingleTapTimer, runLongPress]);

  const registerTap = useCallback(
    (event) => {
      const now = Date.now();
      const previousTapAt = lastTapAtRef.current || 0;

      if (previousTapAt && now - previousTapAt <= DOUBLE_TAP_WINDOW) {
        lastTapAtRef.current = 0;
        clearSingleTapTimer();
        runDoubleTap(event);
        return;
      }

      lastTapAtRef.current = now;
      clearSingleTapTimer();
      singleTapTimerRef.current = window.setTimeout(() => {
        singleTapTimerRef.current = null;
        lastTapAtRef.current = 0;
        runSingleTap();
      }, Math.max(SINGLE_TAP_DELAY, DOUBLE_TAP_WINDOW));
    },
    [clearSingleTapTimer, runDoubleTap, runSingleTap]
  );

  const handleOrbPointerDown = useCallback(
    (event) => {
      if (event?.button !== undefined && event.button !== 0) return;
      stopOrbEvent(event);

      const point = getPoint(event);
      pointerStateRef.current = {
        active: true,
        pointerId: event?.pointerId ?? null,
        startX: Number(point?.clientX || 0),
        startY: Number(point?.clientY || 0),
        moved: false,
      };

      event?.currentTarget?.setPointerCapture?.(event.pointerId);
      beginLongPress();
    },
    [beginLongPress, stopOrbEvent]
  );

  const handleOrbPointerMove = useCallback(
    (event) => {
      const state = pointerStateRef.current;
      if (!state.active) return;
      if (state.pointerId !== null && event?.pointerId !== state.pointerId) return;

      stopOrbEvent(event);
      const point = getPoint(event);
      const dx = Math.abs(Number(point?.clientX || 0) - state.startX);
      const dy = Math.abs(Number(point?.clientY || 0) - state.startY);

      if (dx <= MOVE_CANCEL_DISTANCE && dy <= MOVE_CANCEL_DISTANCE) return;
      state.moved = true;
      clearLongPressTimer();
    },
    [clearLongPressTimer, stopOrbEvent]
  );

  const handleOrbPointerUp = useCallback(
    (event) => {
      const state = pointerStateRef.current;
      if (!state.active) return;
      if (state.pointerId !== null && event?.pointerId !== state.pointerId) return;

      stopOrbEvent(event);
      event?.currentTarget?.releasePointerCapture?.(event.pointerId);
      clearLongPressTimer();
      pointerStateRef.current.active = false;

      if (state.moved || longPressTriggeredRef.current) {
        state.moved = false;
        longPressTriggeredRef.current = false;
        lastTapAtRef.current = 0;
        clearSingleTapTimer();
        return;
      }

      registerTap(event);
    },
    [clearLongPressTimer, clearSingleTapTimer, registerTap, stopOrbEvent]
  );

  const handleOrbCancel = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearLongPressTimer();
      pointerStateRef.current.active = false;
      pointerStateRef.current.moved = false;
      longPressTriggeredRef.current = false;
    },
    [clearLongPressTimer, stopOrbEvent]
  );

  const handleOrbClick = useCallback(
    (event) => {
      stopOrbEvent(event);
    },
    [stopOrbEvent]
  );

  const handleOrbKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      stopOrbEvent(event);
      if (event.repeat || keyboardStateRef.current.active) return;

      keyboardStateRef.current = { active: true, key: event.key };
      beginLongPress();
    },
    [beginLongPress, stopOrbEvent]
  );

  const handleOrbKeyUp = useCallback(
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      stopOrbEvent(event);
      if (!keyboardStateRef.current.active) return;

      keyboardStateRef.current = { active: false, key: "" };
      clearLongPressTimer();

      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        lastTapAtRef.current = 0;
        clearSingleTapTimer();
        return;
      }

      registerTap(event);
    },
    [clearLongPressTimer, clearSingleTapTimer, registerTap, stopOrbEvent]
  );

  useEffect(() => () => resetInteraction(), [resetInteraction]);

  useEffect(() => {
    resetInteraction();
  }, [
    guideOrbExpectedAction,
    isGuideMode,
    isGuideOrbLessonActive,
    resetInteraction,
  ]);

  return {
    handleOrbPointerDown,
    handleOrbPointerMove,
    handleOrbPointerUp,
    handleOrbCancel,
    handleOrbClick,
    handleOrbKeyDown,
    handleOrbKeyUp,
  };
}
