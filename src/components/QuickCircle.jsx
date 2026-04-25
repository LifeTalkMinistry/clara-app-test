import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LONG_PRESS_MS = 520;
const DOUBLE_TAP_DELAY_MS = 340;

const quickActions = [
  { key: "expense", label: "Add Expense", icon: Plus },
  { key: "funds", label: "Add Funds", icon: Wallet },
  { key: "clara", label: "Ask CLARA", icon: Sparkles },
];

export default function QuickCircle({ onQuickAdd, onOpenAssistant, placement = "default" }) {
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const longPressTimerRef = useRef(null);
  const singleTapTimerRef = useRef(null);
  const tapCountRef = useRef(0);
  const longPressTriggeredRef = useRef(false);

  const isDashboardPlacement = placement === "dashboard";

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearSingleTapTimer = useCallback(() => {
    if (singleTapTimerRef.current) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }, []);

  const resetTapState = useCallback(() => {
    tapCountRef.current = 0;
    clearSingleTapTimer();
  }, [clearSingleTapTimer]);

  const openAssistant = useCallback(() => {
    resetTapState();
    setExpanded(false);
    onOpenAssistant?.("voice");
  }, [onOpenAssistant, resetTapState]);

  const openManualExpense = useCallback(() => {
    resetTapState();
    setExpanded(false);
    onQuickAdd?.();
  }, [onQuickAdd, resetTapState]);

  const openAnalytics = useCallback(() => {
    resetTapState();
    setExpanded(false);
    navigate("/analytics");
  }, [navigate, resetTapState]);

  const handlePointerDown = useCallback(() => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      openAssistant();
    }, LONG_PRESS_MS);
  }, [clearLongPressTimer, openAssistant]);

  const handlePointerUp = useCallback(() => {
    clearLongPressTimer();

    if (longPressTriggeredRef.current) {
      resetTapState();
      return;
    }

    tapCountRef.current += 1;

    if (tapCountRef.current >= 2) {
      openAnalytics();
      return;
    }

    clearSingleTapTimer();
    singleTapTimerRef.current = window.setTimeout(() => {
      openManualExpense();
    }, DOUBLE_TAP_DELAY_MS);
  }, [clearLongPressTimer, clearSingleTapTimer, openAnalytics, openManualExpense, resetTapState]);

  const handlePointerCancel = useCallback(() => {
    clearLongPressTimer();
    resetTapState();
  }, [clearLongPressTimer, resetTapState]);

  const handleQuickAction = useCallback(
    (actionKey) => {
      resetTapState();
      setExpanded(false);
      if (actionKey === "expense") return onQuickAdd?.();
      if (actionKey === "funds") return navigate("/add-funds");
      openAssistant();
    },
    [navigate, onQuickAdd, openAssistant, resetTapState]
  );

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearSingleTapTimer();
    };
  }, [clearLongPressTimer, clearSingleTapTimer]);

  const shellPositionClass = isDashboardPlacement
    ? "fixed z-[120] flex justify-end pointer-events-none"
    : "fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] right-5 z-[120] flex justify-end pointer-events-none sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6";

  const shellPositionStyle = isDashboardPlacement
    ? {
        top: "clamp(16.8rem, 47.5dvh, 25rem)",
        right: "calc((100vw - min(100vw, 430px)) / 2 + clamp(1.35rem, 8.5vw, 2.35rem))",
      }
    : undefined;

  return (
    <div className={shellPositionClass} style={shellPositionStyle} data-fab="clara-quick-circle">
      {expanded && (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 z-[-1]"
          onClick={() => setExpanded(false)}
          aria-label="Close quick actions"
        />
      )}

      <div className="relative flex h-[clamp(3.05rem,10.8vw,3.6rem)] w-[clamp(3.05rem,10.8vw,3.6rem)] items-center justify-center">
        {expanded && (
          <div className="absolute bottom-[calc(100%+0.7rem)] right-0 flex flex-col items-end gap-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => handleQuickAction(action.key)}
                  className="pointer-events-auto flex min-w-[9.5rem] items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[color-mix(in_srgb,var(--theme-surface)_72%,transparent)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(0,0,0,0.28),0_0_24px_color-mix(in_srgb,var(--theme-glow)_20%,transparent)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-[color-mix(in_srgb,var(--theme-primary)_22%,var(--theme-surface)_68%)] active:scale-[0.98]"
                >
                  <span>{action.label}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10">
                    <Icon className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <span
          className="pointer-events-none absolute inset-[-0.55rem] rounded-full opacity-80 blur-2xl animate-[claraFabPulse_1.9s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-glow) 60%, transparent) 0%, color-mix(in srgb, var(--theme-primary) 32%, transparent) 38%, transparent 72%)",
          }}
        />

        <span
          className="pointer-events-none absolute inset-[-0.12rem] rounded-full border border-white/20 opacity-90"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 42%, transparent), color-mix(in srgb, var(--theme-accent) 28%, transparent))",
            boxShadow:
              "0 0 0 1px color-mix(in srgb, var(--theme-primary) 28%, transparent), 0 0 30px color-mix(in srgb, var(--theme-glow) 42%, transparent)",
          }}
        />

        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={clearLongPressTimer}
          className="pointer-events-auto relative flex h-[clamp(2.95rem,10vw,3.35rem)] w-[clamp(2.95rem,10vw,3.35rem)] items-center justify-center rounded-full border border-white/25 bg-[color-mix(in_srgb,var(--theme-surface)_42%,transparent)] backdrop-blur-2xl transition duration-200 hover:scale-[1.04] active:scale-95"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.24), 0 12px 26px rgba(0,0,0,0.24), 0 0 28px color-mix(in srgb, var(--theme-primary) 42%, transparent)",
          }}
          aria-label="Open CLARA quick actions"
          title="Tap to add expense. Double tap for analytics. Long press for CLARA."
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full opacity-85"
            style={{
              background:
                "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.42), transparent 30%), radial-gradient(circle at 72% 78%, color-mix(in srgb, var(--theme-primary) 38%, transparent), transparent 55%)",
            }}
          />

          <img
            src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
            alt=""
            className="relative h-[clamp(2.45rem,8.8vw,2.95rem)] w-[clamp(2.45rem,8.8vw,2.95rem)] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)]"
          />
        </button>
      </div>
    </div>
  );
}
