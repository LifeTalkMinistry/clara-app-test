import { useCallback, useMemo, useRef } from "react";

const DOUBLE_TAP_WINDOW = 320;
const MOVE_CANCEL_DISTANCE = 12;

export default function useMoneyLeftSummaryHandlers({ navigate } = {}) {
  const pointerStateRef = useRef({
    lastTapAt: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const navigateLockRef = useRef(0);

  const stopEvent = useCallback((event) => {
    event?.stopPropagation?.();
    event?.nativeEvent?.stopImmediatePropagation?.();
  }, []);

  const openTransactionHubFromMoneyLeft = useCallback(
    (event) => {
      stopEvent(event);
      const now = Date.now();
      if (now - navigateLockRef.current < 450) return;

      navigateLockRef.current = now;
      if (typeof navigate === "function") navigate("/transactions");
    },
    [navigate, stopEvent],
  );

  const handlePointerDown = useCallback(
    (event) => {
      stopEvent(event);
      pointerStateRef.current.startX = Number(event?.clientX || 0);
      pointerStateRef.current.startY = Number(event?.clientY || 0);
      pointerStateRef.current.moved = false;
    },
    [stopEvent],
  );

  const handlePointerMove = useCallback((event) => {
    const dx = Math.abs(Number(event?.clientX || 0) - pointerStateRef.current.startX);
    const dy = Math.abs(Number(event?.clientY || 0) - pointerStateRef.current.startY);
    if (dx > MOVE_CANCEL_DISTANCE || dy > MOVE_CANCEL_DISTANCE) {
      pointerStateRef.current.moved = true;
      pointerStateRef.current.lastTapAt = 0;
    }
  }, []);

  const handlePointerUp = useCallback(
    (event) => {
      stopEvent(event);
      if (pointerStateRef.current.moved) return;

      const now = Date.now();
      const previousTapAt = pointerStateRef.current.lastTapAt;

      if (previousTapAt && now - previousTapAt <= DOUBLE_TAP_WINDOW) {
        pointerStateRef.current.lastTapAt = 0;
        openTransactionHubFromMoneyLeft(event);
        return;
      }

      pointerStateRef.current.lastTapAt = now;
    },
    [openTransactionHubFromMoneyLeft, stopEvent],
  );

  const handlePointerCancel = useCallback(() => {
    pointerStateRef.current.moved = false;
    pointerStateRef.current.lastTapAt = 0;
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openTransactionHubFromMoneyLeft(event);
    },
    [openTransactionHubFromMoneyLeft],
  );

  return useMemo(
    () => ({
      openTransactionHubFromMoneyLeft,
      onClick: stopEvent,
      onDoubleClick: openTransactionHubFromMoneyLeft,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onKeyDown: handleKeyDown,
    }),
    [
      handleKeyDown,
      handlePointerCancel,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      openTransactionHubFromMoneyLeft,
      stopEvent,
    ],
  );
}
