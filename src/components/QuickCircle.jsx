import { useCallback, useRef, useState } from "react";
import { Plus, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LONG_PRESS_MS = 520;

const quickActions = [
  { key: "expense", label: "Add Expense", icon: Plus },
  { key: "funds", label: "Add Funds", icon: Wallet },
  { key: "clara", label: "Ask CLARA", icon: Sparkles },
];

export default function QuickCircle({ onQuickAdd, onOpenAssistant, placement = "default" }) {
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const isDashboardPlacement = placement === "dashboard";

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openAssistant = useCallback(() => {
    setExpanded(false);
    onOpenAssistant?.("voice");
  }, [onOpenAssistant]);

  const handlePointerDown = useCallback(() => {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setExpanded((current) => !current);
    }, LONG_PRESS_MS);
  }, [clearLongPressTimer]);

  const handlePointerUp = useCallback(() => {
    clearLongPressTimer();
    if (longPressTriggeredRef.current) return;
    openAssistant();
  }, [clearLongPressTimer, openAssistant]);

  const handleQuickAction = useCallback(
    (actionKey) => {
      setExpanded(false);
      if (actionKey === "expense") return onQuickAdd?.();
      if (actionKey === "funds") return navigate("/add-funds");
      openAssistant();
    },
    [navigate, onQuickAdd, openAssistant]
  );

  const shellPositionClass = isDashboardPlacement
    ? "fixed z-[120] flex justify-end pointer-events-none"
    : "fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] right-5 z-[120] flex justify-end pointer-events-none sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6";

  const shellPositionStyle = isDashboardPlacement
    ? {
        top: "clamp(17rem, 50dvh, 26rem)",
        right: "calc((100vw - min(100vw, 430px)) / 2 + clamp(1.15rem, 7vw, 2rem))",
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

      <div className="relative flex h-[clamp(3.25rem,12vw,3.95rem)] w-[clamp(3.25rem,12vw,3.95rem)] items-center justify-center">

        <span
          className="pointer-events-none absolute inset-[-0.75rem] rounded-full opacity-80 blur-2xl animate-[claraFabPulse_1.9s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-glow) 56%, transparent) 0%, color-mix(in srgb, var(--theme-primary) 28%, transparent) 38%, transparent 72%)",
          }}
        />

        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={clearLongPressTimer}
          onPointerLeave={clearLongPressTimer}
          className="pointer-events-auto relative flex h-[clamp(3.15rem,11vw,3.75rem)] w-[clamp(3.15rem,11vw,3.75rem)] items-center justify-center rounded-full border border-white/25 bg-[color-mix(in_srgb,var(--theme-surface)_42%,transparent)] backdrop-blur-2xl transition duration-200 hover:scale-[1.04] active:scale-95"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.20), 0 14px 30px rgba(0,0,0,0.24), 0 0 26px color-mix(in srgb, var(--theme-primary) 34%, transparent)",
          }}
          aria-label="Open CLARA assistant"
        >
          <img
            src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
            alt=""
            className="relative h-[clamp(2.75rem,9.8vw,3.35rem)] w-[clamp(2.75rem,9.8vw,3.35rem)] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.55)]"
          />
        </button>
      </div>
    </div>
  );
}
