import { useCallback, useEffect, useRef } from "react";
import { normalizeLower } from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardOrbInteractionHandlers({
  openManualExpenseModal,
  setShowAiAssistant,
} = {}) {
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const safeOpenManualExpenseModal =
    typeof openManualExpenseModal === "function" ? openManualExpenseModal : () => {};
  const safeSetShowAiAssistant =
    typeof setShowAiAssistant === "function" ? setShowAiAssistant : () => {};

  const getClaraAiOrbButtonFromEvent = useCallback((event) => {
    const target = event?.target;
    if (!target?.closest) return null;

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

  const openClaraAiFromLongPress = useCallback(() => {
    safeSetShowAiAssistant(true);
  }, [safeSetShowAiAssistant]);

  const startClaraAiLongPress = useCallback(
    (event) => {
      if (!isClaraAiOrbEvent(event)) return;

      longPressTriggeredRef.current = false;
      clearLongPressTimer();

      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        openClaraAiFromLongPress();
      }, 550);
    },
    [clearLongPressTimer, isClaraAiOrbEvent, openClaraAiFromLongPress]
  );

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

      safeOpenManualExpenseModal();
      return true;
    },
    [isClaraAiOrbEvent, safeOpenManualExpenseModal]
  );

  const stopMoneyLeftOrbEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const startMoneyLeftOrbLongPress = useCallback(
    (event) => {
      stopMoneyLeftOrbEvent(event);
      longPressTriggeredRef.current = false;
      clearLongPressTimer();

      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        openClaraAiFromLongPress();
      }, 550);
    },
    [clearLongPressTimer, openClaraAiFromLongPress, stopMoneyLeftOrbEvent]
  );

  const endMoneyLeftOrbLongPress = useCallback(
    (event) => {
      stopMoneyLeftOrbEvent(event);
      clearLongPressTimer();
    },
    [clearLongPressTimer, stopMoneyLeftOrbEvent]
  );

  const handleMoneyLeftOrbClick = useCallback(
    (event) => {
      stopMoneyLeftOrbEvent(event);

      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      safeOpenManualExpenseModal();
    },
    [safeOpenManualExpenseModal, stopMoneyLeftOrbEvent]
  );

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

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
    endClaraAiLongPress,
    handleClaraAiOrbClickCapture,
    stopMoneyLeftOrbEvent,
    startMoneyLeftOrbLongPress,
    endMoneyLeftOrbLongPress,
    handleMoneyLeftOrbClick,
  };
}
