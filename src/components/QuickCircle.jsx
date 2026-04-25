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
    <div className="pointer-events-none fixed bottom-[calc(5.7rem+env(safe-area-inset-bottom))] right-5 z-[120] flex justify-end sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6">

      {expanded && (
        <button
          type="button"
          className="pointer-events-auto fixed inset-0 z-[-1]"
          onClick={() => setExpanded(false)}
        />
      )}

      <div className="relative flex h-[3.6rem] w-[3.6rem] items-center justify-center">

        <span
          className="absolute inset-[-0.7rem] rounded-full blur-xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-primary) 45%, transparent) 0%, transparent 70%)",
          }}
        />

        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={clearLongPressTimer}
          onPointerLeave={clearLongPressTimer}
          className="pointer-events-auto relative flex h-[3.6rem] w-[3.6rem] items-center justify-center rounded-full border border-white/20 backdrop-blur-xl active:scale-95"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 35%), radial-gradient(circle, color-mix(in srgb, var(--theme-primary) 55%, rgba(0,0,0,0.5)) 0%, rgba(0,0,0,0.7) 75%)",
            boxShadow:
              "0 10px 24px rgba(0,0,0,0.45), 0 0 18px color-mix(in srgb, var(--theme-primary) 35%, transparent)",
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
            alt=""
            className="h-[3rem] w-[3rem] object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,1)]"
          />
        </button>
      </div>
    </div>
  );
}
