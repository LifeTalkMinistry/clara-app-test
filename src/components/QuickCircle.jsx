import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 520;

function ClaraFabLogo() {
  return (
    <svg
      viewBox="0 0 128 128"
      aria-hidden="true"
      className="relative z-10 h-12 w-12 drop-shadow-[0_8px_16px_rgba(0,0,0,0.42)]"
    >
      <defs>
        <linearGradient id="claraFabGreen" x1="24" y1="25" x2="105" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#dfff3f" />
          <stop offset="0.42" stopColor="#1ed760" />
          <stop offset="0.72" stopColor="#059669" />
          <stop offset="1" stopColor="#063b72" />
        </linearGradient>
        <linearGradient id="claraFabArrow" x1="56" y1="34" x2="116" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#eaff35" />
          <stop offset="0.55" stopColor="#b6ff21" />
          <stop offset="1" stopColor="#55d84e" />
        </linearGradient>
        <linearGradient id="claraFabBlue" x1="40" y1="91" x2="101" y2="111" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#052b78" />
          <stop offset="0.58" stopColor="#0878df" />
          <stop offset="1" stopColor="#28d7ff" />
        </linearGradient>
        <filter id="claraFabGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.1 0 0 0 0 1 0 0 0 0 0.58 0 0 0 0.7 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M101.7 38.9C92.8 29.9 79.4 24.6 64.9 25.2C38.8 26.3 19 45.8 19 68.5C19 85.7 30.7 100.9 47.1 107.5C31.8 99.8 25.1 84.5 30.6 70.8C38.4 51.3 63.4 43.8 87.2 53.8L101.7 38.9Z"
        fill="url(#claraFabGreen)"
        filter="url(#claraFabGlow)"
      />
      <path
        d="M26.9 79.5C37.5 102 69.6 106.8 91.9 90.8C77.4 104.2 54 110.5 34.2 100.2C26 96 20.2 89.5 17.8 81.6C17.1 79.2 18.6 76.9 21.1 76.6C23.4 76.3 25.8 77.4 26.9 79.5Z"
        fill="url(#claraFabBlue)"
      />
      <path
        d="M50.4 82.8C66.2 81 80.3 70.8 89.9 57.8L73.4 58.2L113.8 23.4L105.7 79.9L94.3 66.8C84.2 82.5 69.1 92.7 50.4 92.7C43.1 92.7 36.6 91.1 31.2 88.2C36.6 85.6 42.9 83.6 50.4 82.8Z"
        fill="url(#claraFabArrow)"
        filter="url(#claraFabGlow)"
      />
      <path
        d="M29.8 60.6C37.4 40.8 63.9 32.6 88 42.4"
        fill="none"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M42.8 101.7C60.1 109 79.3 104.9 93.3 92.9"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        aria-label="CLARA quick action. Tap to add transaction, long press for CLARA AI, double tap for dashboard."
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        className="pointer-events-auto group relative flex h-[4.65rem] w-[4.65rem] items-center justify-center rounded-full border border-cyan-200/25 bg-[radial-gradient(circle_at_32%_20%,rgba(255,255,255,0.35),transparent_24%),radial-gradient(circle_at_50%_78%,rgba(34,211,238,0.32),transparent_44%),linear-gradient(145deg,rgba(6,78,86,0.94),rgba(8,47,73,0.96)_48%,rgba(5,20,38,0.98))] shadow-[0_18px_50px_rgba(6,182,212,0.32),0_0_0_8px_rgba(4,12,18,0.66),0_0_34px_rgba(52,211,153,0.32)] backdrop-blur-2xl transition duration-200 active:scale-95"
      >
        <span className="absolute -inset-2 -z-10 rounded-full bg-[conic-gradient(from_220deg,rgba(34,211,238,0.16),rgba(163,230,53,0.44),rgba(16,185,129,0.24),rgba(59,130,246,0.34),rgba(34,211,238,0.16))] blur-md transition duration-300 group-active:blur-sm" />
        <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_38%,rgba(255,255,255,0.08)_72%,transparent)] opacity-90" />
        <span className="absolute inset-[0.32rem] rounded-full border border-white/10 bg-black/10 shadow-[inset_0_1px_12px_rgba(255,255,255,0.14),inset_0_-12px_24px_rgba(0,0,0,0.22)]" />
        <ClaraFabLogo />
        <span className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-cyan-100/25 bg-black/45 shadow-[0_0_18px_rgba(52,211,153,0.55)] backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
        </span>
      </button>
    </div>
  );
}
