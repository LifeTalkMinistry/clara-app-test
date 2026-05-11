import { useCallback, useMemo, useRef } from "react";

export default function useMoneyLeftSummaryHandlers({ navigate } = {}) {
  const moneyLeftTapRef = useRef({
    lastTapAt: 0,
    lastHandledEventAt: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const moneyLeftNavigateLockRef = useRef(0);

  const isManualExpenseOrbEvent = useCallback((event) => {
    return Boolean(
      event?.target?.closest?.('[data-clara-manual-expense-orb="true"]')
    );
  }, []);

  const stopMoneyLeftSummaryEvent = useCallback(
    (event) => {
      if (isManualExpenseOrbEvent(event)) {
        return false;
      }

      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();
      return false;
    },
    [isManualExpenseOrbEvent]
  );

  const stopMoneyLeftOrbEvent = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
    return false;
  }, []);

  const openTransactionHubFromMoneyLeft = useCallback(
    (event) => {
      if (isManualExpenseOrbEvent(event)) {
        stopMoneyLeftOrbEvent(event);
      } else {
        stopMoneyLeftSummaryEvent(event);
      }

      const now = Date.now();
      if (now - moneyLeftNavigateLockRef.current < 450) return;

      moneyLeftNavigateLockRef.current = now;
      if (typeof navigate === "function") {
        navigate("/transactions-hub");
      }
    },
    [isManualExpenseOrbEvent, navigate, stopMoneyLeftOrbEvent, stopMoneyLeftSummaryEvent]
  );

  const handleMoneyLeftPointerDown = useCallback(
    (event) => {
      if (isManualExpenseOrbEvent(event)) return;

      event?.stopPropagation?.();
      const point = event?.touches?.[0] || event;

      moneyLeftTapRef.current = {
        ...moneyLeftTapRef.current,
        startX: Number(point?.clientX || 0),
        startY: Number(point?.clientY || 0),
        moved: false,
      };
    },
    [isManualExpenseOrbEvent]
  );

  const handleMoneyLeftPointerMove = useCallback((event) => {
    const point = event?.touches?.[0] || event;
    const startX = moneyLeftTapRef.current.startX || 0;
    const startY = moneyLeftTapRef.current.startY || 0;
    const dx = Math.abs(Number(point?.clientX || 0) - startX);
    const dy = Math.abs(Number(point?.clientY || 0) - startY);

    if (dx > 12 || dy > 12) {
      moneyLeftTapRef.current.moved = true;
    }
  }, []);

  const handleMoneyLeftTapEnd = useCallback(
    (event) => {
      if (isManualExpenseOrbEvent(event)) return;

      stopMoneyLeftSummaryEvent(event);

      if (moneyLeftTapRef.current.moved) {
        moneyLeftTapRef.current.lastTapAt = 0;
        return;
      }

      const now = Date.now();
      const eventStamp = Number(event?.timeStamp || now);
      const lastHandledEventAt = moneyLeftTapRef.current.lastHandledEventAt || 0;

      if (lastHandledEventAt && Math.abs(eventStamp - lastHandledEventAt) < 120) {
        return;
      }

      moneyLeftTapRef.current.lastHandledEventAt = eventStamp;

      const previousTapAt = moneyLeftTapRef.current.lastTapAt || 0;

      if (previousTapAt && now - previousTapAt <= 320) {
        moneyLeftTapRef.current.lastTapAt = 0;
        openTransactionHubFromMoneyLeft(event);
        return;
      }

      moneyLeftTapRef.current.lastTapAt = now;
    },
    [isManualExpenseOrbEvent, openTransactionHubFromMoneyLeft, stopMoneyLeftSummaryEvent]
  );

  return useMemo(
    () => ({
      openTransactionHubFromMoneyLeft,
      onClickCapture: stopMoneyLeftSummaryEvent,
      onClick: stopMoneyLeftSummaryEvent,
      onDoubleClickCapture: openTransactionHubFromMoneyLeft,
      onDoubleClick: openTransactionHubFromMoneyLeft,
      onPointerDownCapture: handleMoneyLeftPointerDown,
      onPointerMoveCapture: handleMoneyLeftPointerMove,
      onPointerUpCapture: handleMoneyLeftTapEnd,
      onTouchStartCapture: handleMoneyLeftPointerDown,
      onTouchMoveCapture: handleMoneyLeftPointerMove,
      onTouchEndCapture: handleMoneyLeftTapEnd,
      onMouseUpCapture: handleMoneyLeftTapEnd,
      onKeyDownCapture: stopMoneyLeftSummaryEvent,
      onKeyDown: stopMoneyLeftSummaryEvent,
    }),
    [
      handleMoneyLeftPointerDown,
      handleMoneyLeftPointerMove,
      handleMoneyLeftTapEnd,
      openTransactionHubFromMoneyLeft,
      stopMoneyLeftSummaryEvent,
    ]
  );
}
