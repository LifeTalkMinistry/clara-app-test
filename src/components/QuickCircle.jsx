import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 520;

export default function QuickCircle({ onQuickAdd, onOpenAssistant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const tapTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapRef = useRef(0);

  const clearTapTimer = useCallback(() => {
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openAssistant = useCallback(() => {
    onOpenAssistant?.("voice");
  }, [onOpenAssistant]);

  const goDashboard = useCallback(() => {
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
  }, [location.pathname, navigate]);

  const handlePointerDown = useCallback(() => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      clearTapTimer();
      openAssistant();
    }, LONG_PRESS_MS);
  }, [clearLongPressTimer, clearTapTimer, openAssistant]);

  const handlePointerUp = useCallback(() => {
    clearLongPressTimer();

    if (longPressTriggeredRef.current) return;

    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current <= DOUBLE_TAP_MS;
    lastTapRef.current = now;

    if (isDoubleTap) {
      clearTapTimer();
      goDashboard();
      return;
    }

    clearTapTimer();
    tapTimerRef.current = window.setTimeout(() => {
      onQuickAdd?.();
      tapTimerRef.current = null;
    }, DOUBLE_TAP_MS);
  }, [clearLongPressTimer, clearTapTimer, goDashboard, onQuickAdd]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[-2.65rem] z-[120] flex justify-center px-4">
      <button
        type="button"
        aria-label="CLARA quick action. Tap to add transaction, long press for CLARA AI, double tap for dashboard."
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        className="pointer-events-auto relative flex h-[11.25rem] w-[11.25rem] items-center justify-center bg-transparent p-0 transition duration-200 active:scale-95"
      >
        <span className="absolute inset-[1.55rem] -z-10 rounded-full bg-black/35 blur-2xl" />
        <span className="absolute inset-[2.15rem] -z-10 rounded-full bg-cyan-300/14 blur-2xl" />
        <img
          src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
          alt="CLARA"
          draggable="false"
          className="h-full w-full select-none object-contain drop-shadow-[0_26px_55px_rgba(0,0,0,0.7)]"
        />
      </button>
    </div>
  );
}
