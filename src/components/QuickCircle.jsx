import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 520;
const CLARA_FAB_LOGO = "data:image/webp;base64,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";

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
        className="pointer-events-auto relative flex h-[4.65rem] w-[4.65rem] items-center justify-center rounded-full border border-cyan-200/25 bg-[linear-gradient(145deg,rgba(3,37,48,0.92),rgba(5,28,47,0.98))] shadow-[0_18px_42px_rgba(6,182,212,0.20),0_0_0_7px_rgba(4,12,18,0.7)] backdrop-blur-xl transition duration-200 active:scale-95"
      >
        <span className="absolute -inset-1.5 -z-10 rounded-full bg-[conic-gradient(from_210deg,rgba(34,211,238,0.10),rgba(163,230,53,0.22),rgba(16,185,129,0.16),rgba(59,130,246,0.18),rgba(34,211,238,0.10))] blur-sm" />
        <span className="absolute inset-[0.24rem] rounded-full border border-white/10 bg-black/10 shadow-[inset_0_1px_10px_rgba(255,255,255,0.12),inset_0_-10px_20px_rgba(0,0,0,0.24)]" />
        <img
          src={CLARA_FAB_LOGO}
          alt="CLARA"
          draggable="false"
          className="relative z-10 h-[4.25rem] w-[4.25rem] select-none object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.48)]"
        />
      </button>
    </div>
  );
}
