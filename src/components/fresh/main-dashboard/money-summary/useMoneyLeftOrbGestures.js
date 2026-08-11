import { useCallback, useEffect, useRef, useState } from "react";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";
import { playMoneyLeftOrbInteractionSound } from "@/runtime/installMoneyLeftOrbInteractionSound";

const DOUBLE_TAP_WINDOW = 280;
const LONG_PRESS_DELAY = 550;
const GUIDE_LONG_PRESS_DELAY = 520;
const MOVE_CANCEL_DISTANCE = 12;
const GUIDE_EXIT_EVENT = "clara:guide-exit";
const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_ORB_FEATURE = "money-left-orb";
const MANUAL_EXPENSE_OPEN_EVENT = "clara:open-manual-expense";

export default function useMoneyLeftOrbGestures({
  isGuideMode,
  isGuideOrbStepActive,
  isGuideOrbButtonDisabled,
  guideOrbPhase,
  handleMoneyLeftOrbClick,
  openTransactionHub,
  onGuideOrbSingleTap,
  onGuideOrbDoubleTap,
  onGuideOrbLongPress,
}) {
  const tapTimerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const lastTapAtRef = useRef(0);
  const pointerDownRef = useRef(false);
  const keyboardHoldRef = useRef(false);
  const pointerRef = useRef({ startX: 0, startY: 0, moved: false, held: false });
  const guideStateRef = useRef({ isGuideMode, isGuideOrbStepActive, guideOrbPhase });
  const [isHolding, setIsHolding] = useState(false);

  guideStateRef.current = { isGuideMode, isGuideOrbStepActive, guideOrbPhase };

  const awaitSingle = isGuideMode && isGuideOrbStepActive && guideOrbPhase === "await-single";
  const awaitDouble = isGuideMode && isGuideOrbStepActive && guideOrbPhase === "await-double";
  const awaitHold = isGuideMode && isGuideOrbStepActive && guideOrbPhase === "await-hold";
  const guideInputPhase = awaitSingle || awaitDouble || awaitHold;

  const clearTap = useCallback(() => {
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = null;
  }, []);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    clearTap();
    clearHold();
    lastTapAtRef.current = 0;
    pointerDownRef.current = false;
    keyboardHoldRef.current = false;
    pointerRef.current = { startX: 0, startY: 0, moved: false, held: false };
    setIsHolding(false);
  }, [clearHold, clearTap]);

  useEffect(() => reset, [reset]);
  useEffect(() => reset(), [guideOrbPhase, isGuideMode, isGuideOrbStepActive, reset]);

  useEffect(() => {
    const handleReset = () => reset();
    const handleTarget = (event) => {
      if (event?.detail?.feature !== GUIDE_ORB_FEATURE) reset();
    };
    window.addEventListener(GUIDE_EXIT_EVENT, handleReset);
    window.addEventListener(GUIDE_MODE_CHANGE_EVENT, handleReset);
    window.addEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTarget);
    return () => {
      window.removeEventListener(GUIDE_EXIT_EVENT, handleReset);
      window.removeEventListener(GUIDE_MODE_CHANGE_EVENT, handleReset);
      window.removeEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTarget);
    };
  }, [reset]);

  const stop = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const openManualExpense = useCallback(
    (event, initialAmount) => {
      if (isGuideMode) return;

      const isCommunityHome =
        typeof document !== "undefined" &&
        Boolean(document.querySelector('.clara-community-root[data-community-view="home"]'));

      if (isCommunityHome && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MANUAL_EXPENSE_OPEN_EVENT, {
            detail: { initialAmount },
          }),
        );
        return;
      }

      handleMoneyLeftOrbClick?.(event, { resolvedGesture: true, initialAmount });
    },
    [handleMoneyLeftOrbClick, isGuideMode],
  );

  const triggerHold = useCallback(
    (button) => {
      const current = guideStateRef.current;
      pointerRef.current.held = true;
      clearTap();
      lastTapAtRef.current = 0;
      setIsHolding(false);
      playMoneyLeftOrbInteractionSound(button, "heavy");

      if (current.isGuideMode && current.isGuideOrbStepActive) {
        onGuideOrbLongPress?.();
        return;
      }

      window.dispatchEvent(
        new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
          detail: {
            requestId: `money-left-orb-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            source: "money-left-orb",
          },
        }),
      );
    },
    [clearTap, onGuideOrbLongPress],
  );

  const onPointerDown = useCallback(
    (event) => {
      stop(event);
      if (isGuideOrbButtonDisabled) return;
      pointerDownRef.current = true;
      pointerRef.current = {
        startX: Number(event.clientX || 0),
        startY: Number(event.clientY || 0),
        moved: false,
        held: false,
      };
      clearHold();
      if (awaitHold) setIsHolding(true);
      const button = event.currentTarget;
      holdTimerRef.current = window.setTimeout(
        () => triggerHold(button),
        guideInputPhase ? GUIDE_LONG_PRESS_DELAY : LONG_PRESS_DELAY,
      );
    },
    [awaitHold, clearHold, guideInputPhase, isGuideOrbButtonDisabled, stop, triggerHold],
  );

  const onPointerMove = useCallback(
    (event) => {
      stop(event);
      if (!pointerDownRef.current) return;
      const dx = Math.abs(Number(event.clientX || 0) - pointerRef.current.startX);
      const dy = Math.abs(Number(event.clientY || 0) - pointerRef.current.startY);
      if (dx <= MOVE_CANCEL_DISTANCE && dy <= MOVE_CANCEL_DISTANCE) return;
      pointerRef.current.moved = true;
      clearHold();
      clearTap();
      lastTapAtRef.current = 0;
      setIsHolding(false);
    },
    [clearHold, clearTap, stop],
  );

  const onPointerUp = useCallback(
    (event) => {
      stop(event);
      pointerDownRef.current = false;
      clearHold();
      setIsHolding(false);
      const button = event.currentTarget;
      if (pointerRef.current.moved || pointerRef.current.held || awaitHold) return;

      if (awaitSingle) {
        playMoneyLeftOrbInteractionSound(button, "light");
        onGuideOrbSingleTap?.();
        reset();
        return;
      }

      const now = Date.now();
      if (lastTapAtRef.current && now - lastTapAtRef.current <= DOUBLE_TAP_WINDOW) {
        clearTap();
        lastTapAtRef.current = 0;
        playMoneyLeftOrbInteractionSound(button, "double");
        if (awaitDouble) onGuideOrbDoubleTap?.();
        else openTransactionHub?.(event);
        return;
      }

      lastTapAtRef.current = now;
      clearTap();
      tapTimerRef.current = window.setTimeout(() => {
        tapTimerRef.current = null;
        lastTapAtRef.current = 0;
        if (awaitDouble) return;
        playMoneyLeftOrbInteractionSound(button, "light");
        openManualExpense();
      }, DOUBLE_TAP_WINDOW);
    },
    [
      awaitDouble,
      awaitHold,
      awaitSingle,
      clearHold,
      clearTap,
      onGuideOrbDoubleTap,
      onGuideOrbSingleTap,
      openManualExpense,
      openTransactionHub,
      reset,
      stop,
    ],
  );

  const cancel = useCallback(
    (event) => {
      stop(event);
      reset();
    },
    [reset, stop],
  );

  const onKeyDown = useCallback(
    (event) => {
      if (!["Enter", " ", "Spacebar"].includes(event.key)) return;
      stop(event);
      if (event.repeat || isGuideOrbButtonDisabled) return;

      if (awaitHold) {
        keyboardHoldRef.current = true;
        setIsHolding(true);
        clearHold();
        const button = event.currentTarget;
        holdTimerRef.current = window.setTimeout(() => {
          if (keyboardHoldRef.current) triggerHold(button);
        }, GUIDE_LONG_PRESS_DELAY);
        return;
      }

      if (awaitDouble) {
        const now = Date.now();
        if (lastTapAtRef.current && now - lastTapAtRef.current <= DOUBLE_TAP_WINDOW) {
          lastTapAtRef.current = 0;
          clearTap();
          playMoneyLeftOrbInteractionSound(event.currentTarget, "double");
          onGuideOrbDoubleTap?.();
        } else {
          lastTapAtRef.current = now;
          clearTap();
          tapTimerRef.current = window.setTimeout(() => {
            lastTapAtRef.current = 0;
          }, DOUBLE_TAP_WINDOW);
        }
        return;
      }

      playMoneyLeftOrbInteractionSound(event.currentTarget, "light");
      if (awaitSingle) onGuideOrbSingleTap?.();
      else openManualExpense(event);
    },
    [
      awaitDouble,
      awaitHold,
      awaitSingle,
      clearHold,
      clearTap,
      isGuideOrbButtonDisabled,
      onGuideOrbDoubleTap,
      onGuideOrbSingleTap,
      openManualExpense,
      stop,
      triggerHold,
    ],
  );

  const onKeyUp = useCallback(
    (event) => {
      if (!["Enter", " ", "Spacebar"].includes(event.key)) return;
      stop(event);
      keyboardHoldRef.current = false;
      clearHold();
      setIsHolding(false);
    },
    [clearHold, stop],
  );

  return {
    awaitSingle,
    awaitDouble,
    awaitHold,
    isHolding,
    openManualExpense,
    stop,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: cancel,
    onPointerLeave: (event) => pointerDownRef.current && cancel(event),
    onKeyDown,
    onKeyUp,
    onBlur: cancel,
  };
}
