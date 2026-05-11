import { useCallback, useEffect, useRef } from "react";
import { normalizeLower } from "@/utils/dashboard/dashboardHelpers";

const ORB_SINGLE_TAP_DELAY = 240;
const ORB_DOUBLE_TAP_WINDOW = 240;
const ORB_LONG_PRESS_DELAY = 600;
const ORB_MOVE_CANCEL_DISTANCE = 12;

export default function useDashboardOrbInteractionHandlers({
  openManualExpenseModal,
  setShowAiAssistant,
  openTransactionHub,
} = {}) {
  const longPressTimerRef = useRef(null);
  const singleTapTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const orbPointerStateRef = useRef({
    lastTapAt: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const safeOpenManualExpenseModal =
    typeof openManualExpenseModal === "function" ? openManualExpenseModal : () => {};

  const safeSetShowAiAssistant =
    typeof setShowAiAssistant === "function" ? setShowAiAssistant : () => {};

  const safeOpenTransactionHub =
    typeof openTransactionHub === "function" ? openTransactionHub : () => {};

  const getClaraAiOrbButtonFromEvent = useCallback((event) => {
    const target = event?.target;
    if (!target?.closest) return null;

    if (target.closest?.('[data-clara-manual-expense-orb="true"]')) {
      return target.closest('[data-clara-manual-expense-orb="true"]');
    }

    const emergencyCard = target.closest("[data-emergency-card]");
    if (!emergencyCard) return null;

    const button = target.closest("button");
    if (!button || !emergencyCard.contains(button)) return null;

    const buttonSignature = [
      button.getAttribute?.("aria-label"),
      button.getAttribute?.("title"),
      button.textContent,
    ]
      .map((value) => normalizeLower(value))
      .filter(Boolean)
      .join(" ");

    if (
      buttonSignature.includes("clara ai") ||
      buttonSignature.includes("clara") ||
      buttonSignature.includes("assistant") ||
      buttonSignature.includes("ask")
    ) {
      return button;
    }

    return null;
  }, []);

  const isClaraAiOrbEvent = useCallback(
    (event) => Boolean(getClaraAiOrbButtonFromEvent(event)),
    [getClaraAiOrbButtonFromEvent]
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearSingleTapTimer = useCallback(() => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }, []);

  const openClaraAiFromLongPress = useCallback(() => {
    safeSetShowAiAssistant(true);
  }, [safeSetShowAiAssistant]);

  const startClaraAiLongPress = useCallback(
    (event) => {
      if (!isClaraAiOrbEvent(event)) return;

      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();

      const point = event?.touches?.[0] || event;

      orbPointerStateRef.current = {
        ...orbPointerStateRef.current,
        startX: Number(point?.clientX || 0),
        startY: Number(point?.clientY || 0),
        moved: false,
      };

      longPressTriggeredRef.current = false;
      clearLongPressTimer();

      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        clearSingleTapTimer();
        openClaraAiFromLongPress();
      }, ORB_LONG_PRESS_DELAY);
    },
    [
      clearLongPressTimer,
      clearSingleTapTimer,
      isClaraAiOrbEvent,
      openClaraAiFromLongPress,
    ]
  );

  const moveClaraAiLongPress = useCallback((event) => {
    const point = event?.touches?.[0] || event;
    const startX = orbPointerStateRef.current.startX || 0;
    const startY = orbPointerStateRef.current.startY || 0;

    const dx = Math.abs(Number(point?.clientX || 0) - startX);
    const dy = Math.abs(Number(point?.clientY || 0) - startY);

    if (dx > ORB_MOVE_CANCEL_DISTANCE || dy > ORB_MOVE_CANCEL_DISTANCE) {
      orbPointerStateRef.current.moved = true;
      clearLongPressTimer();
    }
  }, [clearLongPressTimer]);

  const endClaraAiLongPress = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleClaraAiOrbClickCapture = useCallback(
    (event) => {
      if (!isClaraAiOrbEvent(event)) return false;

      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();

      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return true;
      }

      if (orbPointerStateRef.current.moved) {
        orbPointerStateRef.current.moved = false;
        return true;
      }

      const now = Date.now();
      const previousTapAt = orbPointerStateRef.current.lastTapAt || 0;

      if (previousTapAt && now - previousTapAt <= ORB_DOUBLE_TAP_WINDOW) {
        orbPointerStateRef.current.lastTapAt = 0;
        clearSingleTapTimer();
        safeOpenTransactionHub();
        return true;
      }

      orbPointerStateRef.current.lastTapAt = now;

      clearSingleTapTimer();

      singleTapTimerRef.current = setTimeout(() => {
        if (!longPressTriggeredRef.current) {
          safeOpenManualExpenseModal();
        }
      }, ORB_SINGLE_TAP_DELAY);

      return true;
    },
    [
      clearSingleTapTimer,
      isClaraAiOrbEvent,
      safeOpenManualExpenseModal,
      safeOpenTransactionHub,
    ]
  );

  const stopMoneyLeftOrbEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const startMoneyLeftOrbLongPress = useCallback(
    (event) => {
      stopMoneyLeftOrbEvent(event);
      startClaraAiLongPress(event);
    },
    [startClaraAiLongPress, stopMoneyLeftOrbEvent]
  );

  const moveMoneyLeftOrbLongPress = useCallback(
    (event) => {
      stopMoneyLeftOrbEvent(event);
      moveClaraAiLongPress(event);
    },
    [moveClaraAiLongPress, stopMoneyLeftOrbEvent]
  );

  const endMoneyLeftOrbLongPress = useCallback(
    (event) => {
      stopMoneyLeftOrbEvent(event);
      endClaraAiLongPress();
    },
    [endClaraAiLongPress, stopMoneyLeftOrbEvent]
  );

  const handleMoneyLeftOrbClick = useCallback(
    (event) => {
      stopMoneyLeftOrbEvent(event);
      handleClaraAiOrbClickCapture(event);
    },
    [handleClaraAiOrbClickCapture, stopMoneyLeftOrbEvent]
  );

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearSingleTapTimer();
    };
  }, [clearLongPressTimer, clearSingleTapTimer]);

  useEffect(() => {
    const handleOpenAssistant = (event) => {
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      safeSetShowAiAssistant(true);
    };

    window.addEventListener("clara:open-assistant", handleOpenAssistant, true);

    return () => {
      window.removeEventListener("clara:open-assistant", handleOpenAssistant, true);
    };
  }, [safeSetShowAiAssistant]);

  return {
    getClaraAiOrbButtonFromEvent,
    isClaraAiOrbEvent,
    clearLongPressTimer,
    openClaraAiFromLongPress,
    startClaraAiLongPress,
    moveClaraAiLongPress,
    endClaraAiLongPress,
    handleClaraAiOrbClickCapture,
    stopMoneyLeftOrbEvent,
    startMoneyLeftOrbLongPress,
    moveMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    handleMoneyLeftOrbClick,
  };
}
