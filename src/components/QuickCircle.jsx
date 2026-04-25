import { useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/theme/ThemeProvider";

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 520;

function hexToRgba(hex, alpha = 1) {
  const normalized = String(hex || "").replace("#", "").trim();
  const source =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const value = Number.parseInt(source, 16);

  if (!Number.isFinite(value)) {
    return `rgba(120, 120, 120, ${alpha})`;
  }

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function QuickCircle({ onQuickAdd, onOpenAssistant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTheme } = useTheme();

  const tapTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapRef = useRef(0);

  const tokens = selectedTheme?.tokens || {};
  const isLight = Boolean(selectedTheme?.isLight);

  const fabStyle = useMemo(() => {
    const accent = tokens.accent || tokens.primary || "#888";
    const glow = tokens.glow || accent;
    const surface = tokens.surface || tokens.card || "#0b1f2e";

    return {
      "--fab-glow": hexToRgba(glow, isLight ? 0.18 : 0.22),
      "--fab-accent": hexToRgba(accent, isLight ? 0.12 : 0.14),
      "--fab-bg": hexToRgba(surface, isLight ? 0.35 : 0.55),
      "--fab-shadow": isLight
        ? "rgba(0,0,0,0.15)"
        : "rgba(0,0,0,0.55)",
    };
  }, [tokens, isLight]);

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
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[-2.65rem] z-[120] flex justify-center px-4"
      style={fabStyle}
    >
      <button
        type="button"
        aria-label="CLARA quick action"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        className="pointer-events-auto relative flex h-[11.25rem] w-[11.25rem] items-center justify-center bg-transparent p-0 transition duration-200 active:scale-95"
      >
        <span className="absolute inset-[1.4rem] -z-10 rounded-full bg-[var(--fab-bg)] blur-2xl" />
        <span className="absolute inset-[2rem] -z-10 rounded-full bg-[var(--fab-glow)] blur-3xl" />
        <span className="absolute inset-[2.8rem] -z-10 rounded-full bg-[radial-gradient(circle,var(--fab-accent),transparent_70%)] blur-xl" />

        <img
          src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
          alt="CLARA"
          draggable="false"
          className="h-full w-full select-none object-contain opacity-[0.92] drop-shadow-[0_22px_45px_var(--fab-shadow)]"
        />
      </button>
    </div>
  );
}
