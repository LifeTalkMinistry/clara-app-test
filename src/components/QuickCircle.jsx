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
      <style>{`
        @keyframes clara-orb-breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.82;
            filter: drop-shadow(0 10px 22px color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 28%, transparent));
          }
          50% {
            transform: scale(1.07);
            opacity: 1;
            filter: drop-shadow(0 14px 34px color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 52%, transparent));
          }
        }

        @keyframes clara-glow-breathe {
          0%, 100% {
            transform: scale(0.92);
            opacity: 0.38;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.82;
          }
        }
      `}</style>

      {expanded && (
        <button
          type="button"
          aria-label="Close CLARA quick actions"
          className="pointer-events-auto fixed inset-0 z-[-1] cursor-default bg-transparent"
          onClick={() => setExpanded(false)}
        />
      )}

      <div className="relative flex h-[4rem] w-[4rem] items-center justify-center">
        <div
          className={`absolute bottom-[4.5rem] right-0 flex flex-col-reverse items-end gap-2 transition-all duration-300 ease-out ${
            expanded
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0"
          }`}
        >
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => handleQuickAction(action.key)}
                className="flex min-w-[9.25rem] items-center gap-2 rounded-2xl border border-white/15 px-3 py-2 text-left text-xs font-semibold text-white shadow-2xl backdrop-blur-2xl transition duration-200 hover:-translate-x-1 active:scale-95"
                style={{
                  transitionDelay: expanded ? `${index * 35}ms` : "0ms",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--theme-surface, rgba(15,23,42,0.72)) 88%, transparent), color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 18%, rgba(15,23,42,0.72)))",
                  boxShadow:
                    "0 16px 32px rgba(0,0,0,0.34), 0 0 22px color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 18%, transparent)",
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.36), color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 48%, rgba(15,23,42,0.28)) 46%, color-mix(in srgb, var(--theme-background, #020617) 68%, transparent) 100%)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>

        <span
          aria-hidden="true"
          className="absolute inset-[-0.95rem] rounded-full blur-2xl will-change-transform"
          style={{
            animation: "clara-glow-breathe 1.8s ease-in-out infinite",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 62%, transparent) 0%, color-mix(in srgb, var(--theme-accent, #22d3ee) 42%, transparent) 42%, transparent 74%)",
          }}
        />

        <button
          type="button"
          aria-expanded={expanded}
          aria-label="Open CLARA Assistant"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={clearLongPressTimer}
          onPointerLeave={clearLongPressTimer}
          className="pointer-events-auto relative flex h-[3.8rem] w-[3.8rem] items-center justify-center overflow-hidden rounded-full border border-white/25 text-white outline-none backdrop-blur-2xl transition-transform duration-150 active:scale-95"
          style={{
            animation: "clara-orb-breathe 1.8s ease-in-out infinite",
            background:
              "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.34), transparent 30%), radial-gradient(circle at 50% 58%, color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 62%, rgba(2,6,23,0.22)) 0%, color-mix(in srgb, var(--theme-accent, #22d3ee) 40%, rgba(2,6,23,0.48)) 48%, color-mix(in srgb, var(--theme-background, #020617) 78%, rgba(0,0,0,0.45)) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -16px 28px rgba(0,0,0,0.36), 0 12px 30px rgba(0,0,0,0.44), 0 0 24px color-mix(in srgb, var(--theme-primary, var(--theme-accent, #22d3ee)) 42%, transparent), 0 0 48px color-mix(in srgb, var(--theme-accent, #22d3ee) 20%, transparent)",
            willChange: "transform, opacity, filter",
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-[0.3rem] rounded-full border border-white/10"
          />

          <span
            aria-hidden="true"
            className="absolute left-2 top-2 h-4 w-4 rounded-full blur-[1px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.82), rgba(255,255,255,0.18) 62%, transparent 72%)",
            }}
          />

          <img
            src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
            alt=""
            draggable="false"
            className="relative z-10 h-[2.55rem] w-[2.55rem] select-none object-contain drop-shadow-[0_3px_7px_rgba(0,0,0,0.75)]"
          />
        </button>
      </div>
    </div>
  );
}
