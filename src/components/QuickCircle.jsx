import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 520;

function ClaraFabLogo() {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className="relative z-10 h-[3.35rem] w-[3.35rem] drop-shadow-[0_10px_16px_rgba(0,0,0,0.5)]"
    >
      <defs>
        <linearGradient id="claraMainGreen" x1="19" y1="18" x2="98" y2="87" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ecff43" />
          <stop offset="0.32" stopColor="#63df35" />
          <stop offset="0.72" stopColor="#019a52" />
          <stop offset="1" stopColor="#006544" />
        </linearGradient>
        <linearGradient id="claraArrowYellow" x1="60" y1="35" x2="106" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffff3d" />
          <stop offset="0.56" stopColor="#d9ff23" />
          <stop offset="1" stopColor="#78dc2e" />
        </linearGradient>
        <linearGradient id="claraBottomBlue" x1="29" y1="82" x2="92" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#003681" />
          <stop offset="0.58" stopColor="#087ee6" />
          <stop offset="1" stopColor="#26d7ff" />
        </linearGradient>
      </defs>

      <path
        d="M97.6 32.6C88.3 23.8 75.6 19.3 61.8 20.2C36.8 21.8 18 40.9 18 63.1C18 79.7 29 94.8 46.4 102.1C34.4 94.9 28.9 82.9 32.7 70.8C38.7 51.6 62.1 41.9 87.5 51.1L97.6 32.6Z"
        fill="url(#claraMainGreen)"
      />
      <path
        d="M27.8 72.8C33.6 92.2 58.8 102.1 82.2 91.8C71.3 101.5 53.7 106.1 36.3 99.5C25.8 95.5 18.7 87.4 17.1 77.3C16.7 74.8 18.8 72.8 21.4 72.8H27.8Z"
        fill="url(#claraBottomBlue)"
      />
      <path
        d="M49.1 76.8C64.8 74.8 77.7 65.8 86.3 53.9L71.2 54.4L106.7 24.1L100.4 75.2L90.9 64.2C80.1 81.3 65.6 90.8 47.1 90.8C40.1 90.8 34.4 89.6 29.6 87.4C35.4 82 42 77.7 49.1 76.8Z"
        fill="url(#claraArrowYellow)"
      />
      <path
        d="M31.1 57.4C39.4 38.6 63.4 30.4 86.8 39.4"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      <path
        d="M44.9 99.8C58.8 105.1 75.1 102.9 87.7 93.6"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
        className="pointer-events-auto group relative flex h-[4.65rem] w-[4.65rem] items-center justify-center rounded-full border border-cyan-200/30 bg-[radial-gradient(circle_at_34%_18%,rgba(255,255,255,0.24),transparent_28%),linear-gradient(145deg,rgba(7,89,91,0.97),rgba(6,55,81,0.98)_50%,rgba(2,18,35,0.98))] shadow-[0_18px_42px_rgba(6,182,212,0.22),0_0_0_7px_rgba(4,12,18,0.7)] backdrop-blur-xl transition duration-200 active:scale-95"
      >
        <span className="absolute -inset-1.5 -z-10 rounded-full bg-[conic-gradient(from_210deg,rgba(34,211,238,0.12),rgba(163,230,53,0.28),rgba(16,185,129,0.18),rgba(59,130,246,0.22),rgba(34,211,238,0.12))] blur-sm" />
        <span className="absolute inset-[0.22rem] rounded-full border border-white/10 bg-black/15 shadow-[inset_0_1px_10px_rgba(255,255,255,0.12),inset_0_-10px_20px_rgba(0,0,0,0.26)]" />
        <ClaraFabLogo />
      </button>
    </div>
  );
}
