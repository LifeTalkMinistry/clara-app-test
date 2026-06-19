import { useCallback, useEffect, useRef } from "react";

const DOUBLE_TAP_WINDOW = 280;
const LONG_PRESS_DELAY = 550;
const MOVE_CANCEL_DISTANCE = 12;

function getPoint(event) {
  return event?.touches?.[0] || event?.changedTouches?.[0] || event || {};
}

export default function useClaraOrbGestureController({
  guideActive = false,
  guideExpectedAction = null,
  onGuideSingleTap,
  onGuideDoubleTap,
  onGuideLongPress,
  onProductionSingleTap,
  onProductionDoubleTap,
  onProductionLongPress,
  stopLegacyOrbEvent,
} = {}) {
  const tapTimerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const holdTriggeredRef = useRef(false);
  const lastTapAtRef = useRef(0);
  const pointerRef = useRef({ active: false, startX: 0, startY: 0, moved: false });

  const clearTap = useCallback(() => {
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    document.documentElement.classList.remove("clara-guide-orb-holding");
  }, []);

  const reset = useCallback(() => {
    clearTap();
    clearHold();
    holdTriggeredRef.current = false;
    lastTapAtRef.current = 0;
    pointerRef.current = { active: false, startX: 0, startY: 0, moved: false };
  }, [clearHold, clearTap]);

  useEffect(() => reset, [reset]);
  useEffect(() => reset(), [guideActive, guideExpectedAction, reset]);

  const stop = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
    stopLegacyOrbEvent?.(event);
  }, [stopLegacyOrbEvent]);

  const emit = useCallback((type, event) => {
    if (guideActive) {
      if (guideExpectedAction !== type) return;
      if (type === "single") onGuideSingleTap?.(event);
      if (type === "double") onGuideDoubleTap?.(event);
      if (type === "hold") onGuideLongPress?.(event);
      return;
    }
    if (type === "single") onProductionSingleTap?.(event);
    if (type === "double") onProductionDoubleTap?.(event);
    if (type === "hold") onProductionLongPress?.(event);
  }, [guideActive, guideExpectedAction, onGuideDoubleTap, onGuideLongPress, onGuideSingleTap, onProductionDoubleTap, onProductionLongPress, onProductionSingleTap]);

  const registerTap = useCallback((event) => {
    const now = Date.now();
    if (lastTapAtRef.current && now - lastTapAtRef.current <= DOUBLE_TAP_WINDOW) {
      lastTapAtRef.current = 0;
      clearTap();
      emit("double", event);
      return;
    }
    lastTapAtRef.current = now;
    clearTap();
    tapTimerRef.current = window.setTimeout(() => {
      tapTimerRef.current = null;
      lastTapAtRef.current = 0;
      emit("single", event);
    }, DOUBLE_TAP_WINDOW);
  }, [clearTap, emit]);

  const onPointerDown = useCallback((event) => {
    stop(event);
    const point = getPoint(event);
    pointerRef.current = {
      active: true,
      startX: Number(point.clientX || 0),
      startY: Number(point.clientY || 0),
      moved: false,
    };
    holdTriggeredRef.current = false;
    clearHold();
    if (guideActive && guideExpectedAction === "hold") {
      document.documentElement.classList.add("clara-guide-orb-holding");
    }
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      holdTriggeredRef.current = true;
      lastTapAtRef.current = 0;
      clearTap();
      emit("hold", event);
    }, LONG_PRESS_DELAY);
  }, [clearHold, clearTap, emit, guideActive, guideExpectedAction, stop]);

  const onPointerMove = useCallback((event) => {
    if (!pointerRef.current.active) return;
    stop(event);
    const point = getPoint(event);
    const dx = Math.abs(Number(point.clientX || 0) - pointerRef.current.startX);
    const dy = Math.abs(Number(point.clientY || 0) - pointerRef.current.startY);
    if (dx <= MOVE_CANCEL_DISTANCE && dy <= MOVE_CANCEL_DISTANCE) return;
    pointerRef.current.moved = true;
    clearHold();
  }, [clearHold, stop]);

  const finish = useCallback((event, cancelled = false) => {
    stop(event);
    const moved = pointerRef.current.moved;
    const held = holdTriggeredRef.current;
    pointerRef.current = { active: false, startX: 0, startY: 0, moved: false };
    holdTriggeredRef.current = false;
    clearHold();
    if (cancelled || moved || held) {
      clearTap();
      lastTapAtRef.current = 0;
      return;
    }
    registerTap(event);
  }, [clearHold, clearTap, registerTap, stop]);

  return {
    handleOrbPointerDown: onPointerDown,
    handleOrbPointerMove: onPointerMove,
    handleOrbPointerUp: (event) => finish(event, false),
    handleOrbCancel: (event) => finish(event, true),
    handleOrbClick: stop,
    handleOrbKeyDown: (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.repeat || pointerRef.current.active) return;
      onPointerDown(event);
    },
    handleOrbKeyUp: (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      finish(event, false);
    },
  };
}
