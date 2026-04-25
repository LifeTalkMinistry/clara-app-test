import { useCallback, useRef, useState } from "react";
import { Plus, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LONG_PRESS_MS = 520;

const quickActions = [
  {
    key: "expense",
    label: "Add Expense",
    icon: Plus,
  },
  {
    key: "funds",
    label: "Add Funds",
    icon: Wallet,
  },
  {
    key: "clara",
    label: "Ask CLARA",
    icon: Sparkles,
  },
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

      if (actionKey === "expense") {
        onQuickAdd?.();
        return;
      }

      if (actionKey === "funds") {
        navigate("/add-funds");
        return;
      }

      openAssistant();
    },
    [navigate, onQuickAdd, openAssistant]
  );

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.9rem+env(safe-area-inset-bottom))] right-5 z-[120] flex justify-end sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-6">
      <style>{`
        @keyframes clara-orb-heartbeat {
          0%, 100% {
            transform: scale(1);
            opacity: 0.62;
            filter: drop-shadow(0 8px 18px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 16%, transparent));
          }
          50% {
            transform: scale(1.06);
            opacity: 1;
            filter: drop-shadow(0 12px 26px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 30%, transparent));
          }
        }

        @keyframes clara-orb-glow-heartbeat {
          0%, 100% {
            opacity: 0.16;
            transform: scale(0.94);
          }
          50% {
            opacity: 0.38;
            transform: scale(1.08);
          }
        }

        @keyframes clara-orb-sheen {
          0%, 100% {
            transform: translate3d(-42%, -42%, 0) rotate(18deg);
            opacity: 0.38;
          }
          50% {
            transform: translate3d(-16%, -18%, 0) rotate(18deg);
            opacity: 0.68;
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

      <div className="relative flex h-[3.35rem] w-[3.35rem] items-center justify-center">
        <div
          className={`absolute bottom-[4.05rem] right-0 flex flex-col-reverse items-end gap-2 transition-all duration-300 ease-in-out ${
            expanded
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          {quickActions.map((action, index) => {
            const Icon = action.icon;

            return (
              <button
                key={action.key}
                type="button"
                onClick={() => handleQuickAction(action.key)}
                className="group flex min-w-[9.2rem] items-center gap-2 rounded-2xl border border-white/15 px-3 py-2 text-left text-xs font-semibold text-white shadow-2xl backdrop-blur-2xl transition duration-200 hover:translate-x-[-2px] active:scale-95"
                style={{
                  transitionDelay: expanded ? `${index * 42}ms` : "0ms",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--theme-surface, rgba(255,255,255,0.12)) 84%, transparent), color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 12%, transparent))",
                  boxShadow:
                    "0 16px 30px rgba(0,0,0,0.24), 0 0 18px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 10%, transparent)",
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.34), color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 40%, transparent) 42%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 24%, transparent) 100%)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap drop-shadow">{action.label}</span>
              </button>
            );
          })}
        </div>

        <span
          aria-hidden="true"
          className="absolute inset-[-0.75rem] rounded-full blur-xl will-change-transform"
          style={{
            animation: "clara-orb-glow-heartbeat 1.8s ease-in-out infinite",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 42%, transparent) 0%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 24%, transparent) 46%, transparent 74%)",
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
          className="pointer-events-auto relative flex h-[3.35rem] w-[3.35rem] items-center justify-center overflow-hidden rounded-full border border-white/20 text-white shadow-2xl outline-none backdrop-blur-2xl transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          style={{
            animation: "clara-orb-heartbeat 1.8s ease-in-out infinite",
            background:
              "radial-gradient(circle at 32% 24%, rgba(255,255,255,0.56), color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 58%, transparent) 34%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 42%, transparent) 66%, color-mix(in srgb, var(--theme-background, #050816) 62%, transparent) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -13px 24px rgba(0,0,0,0.22), 0 11px 24px rgba(0,0,0,0.32), 0 0 18px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 22%, transparent)",
            willChange: "transform, opacity, filter",
          }}
        >
          <span
            aria-hidden="true"
            className="absolute left-2 top-2 h-4 w-4 rounded-full blur-[1px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.72), rgba(255,255,255,0.1) 62%, transparent 72%)",
            }}
          />

          <span
            aria-hidden="true"
            className="absolute inset-y-[-20%] left-[-45%] w-8 rounded-full blur-sm"
            style={{
              animation: "clara-orb-sheen 2.8s ease-in-out infinite",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent)",
            }}
          />

          <span
            aria-hidden="true"
            className="absolute inset-[0.3rem] rounded-full border border-white/10"
          />

          <img
            src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
            alt=""
            draggable="false"
            className="relative h-[1.65rem] w-[1.65rem] select-none object-contain drop-shadow-xl"
          />
        </button>
      </div>
    </div>
  );
}
