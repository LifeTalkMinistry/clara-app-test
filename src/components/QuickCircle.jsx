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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        aria-label="CLARA quick action. Tap to add transaction, long press for CLARA AI, double tap for dashboard."
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        className="pointer-events-auto relative flex h-[4.65rem] w-[4.65rem] items-center justify-center overflow-hidden rounded-full border border-cyan-200/25 bg-[linear-gradient(145deg,rgba(3,37,48,0.92),rgba(5,28,47,0.98))] shadow-[0_18px_42px_rgba(6,182,212,0.20),0_0_0_7px_rgba(4,12,18,0.7)] backdrop-blur-xl transition duration-200 active:scale-95"
      >
        <span className="absolute -inset-1.5 -z-10 rounded-full bg-[conic-gradient(from_210deg,rgba(34,211,238,0.10),rgba(163,230,53,0.22),rgba(16,185,129,0.16),rgba(59,130,246,0.18),rgba(34,211,238,0.10))] blur-sm" />
        <span className="absolute inset-[0.24rem] rounded-full border border-white/10 bg-black/10 shadow-[inset_0_1px_10px_rgba(255,255,255,0.12),inset_0_-10px_20px_rgba(0,0,0,0.24)]" />
        <img
          src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
          alt="CLARA"
          draggable="false"
          className="relative z-10 h-[4.15rem] w-[4.15rem] select-none object-contain p-1 drop-shadow-[0_10px_18px_rgba(0,0,0,0.48)]"
        />
      </button>
    </div>
  );
}
