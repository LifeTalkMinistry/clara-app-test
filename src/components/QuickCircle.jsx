import { useCallback, useRef, useState } from "react";
import { Plus, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LONG_PRESS_MS = 520;

const quickActions = [
  { key: "expense", label: "Add Expense", icon: Plus },
  { key: "funds", label: "Add Funds", icon: Wallet },
  { key: "clara", label: "Ask CLARA", icon: Sparkles },
];

export default function QuickCircle({ onQuickAdd, onOpenAssistant }) {
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

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

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.9rem+env(safe-area-inset-bottom))] right-5 z-[120] flex justify-end sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6">

      {expanded && (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 z-[-1]"
          onClick={() => setExpanded(false)}
        />
      )}

      <div className="relative flex h-[3.6rem] w-[3.6rem] items-center justify-center">
        <div
          className={`absolute bottom-[4.2rem] right-0 flex flex-col-reverse items-end gap-2 transition-all duration-300 ${expanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                onClick={() => handleQuickAction(action.key)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white backdrop-blur-xl border border-white/10"
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </button>
            );
          })}
        </div>

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={clearLongPressTimer}
          onPointerLeave={clearLongPressTimer}
          className="pointer-events-auto relative flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-full border border-white/20 backdrop-blur-xl active:scale-95"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 60%, transparent))",
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
            alt=""
            className="h-[2.4rem] w-[2.4rem] object-contain"
          />
        </button>
      </div>
    </div>
  );
}
