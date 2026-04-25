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
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.35rem] z-[120] flex justify-center px-4 sm:bottom-6 sm:justify-end sm:pr-6">
      <style>{`
        @keyframes clara-orb-heartbeat {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
            filter: drop-shadow(0 12px 28px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 24%, transparent));
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
            filter: drop-shadow(0 18px 42px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 54%, transparent));
          }
        }

        @keyframes clara-orb-glow-heartbeat {
          0%, 100% {
            opacity: 0.34;
            transform: scale(0.94);
          }
          50% {
            opacity: 0.82;
            transform: scale(1.13);
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
          className={`absolute bottom-[4.55rem] left-1/2 flex -translate-x-1/2 flex-col-reverse items-center gap-2 transition-all duration-300 ease-in-out sm:left-auto sm:right-0 sm:translate-x-0 ${
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
                className="group flex min-w-[9.5rem] items-center gap-2 rounded-2xl border border-white/15 px-3 py-2 text-left text-xs font-semibold text-white shadow-2xl backdrop-blur-2xl transition duration-200 active:scale-95"
                style={{
                  transitionDelay: expanded ? `${index * 38}ms` : "0ms",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--theme-surface, rgba(255,255,255,0.12)) 76%, transparent), color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 20%, transparent))",
                  boxShadow:
                    "0 18px 36px rgba(0,0,0,0.28), 0 0 26px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 20%, transparent)",
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.38), color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 50%, transparent) 42%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 34%, transparent) 100%)",
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
          className="absolute inset-[-1.15rem] rounded-full blur-2xl will-change-transform"
          style={{
            animation: "clara-orb-glow-heartbeat 1.8s ease-in-out infinite",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 62%, transparent) 0%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 42%, transparent) 38%, transparent 72%)",
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
          className="pointer-events-auto relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/20 text-white shadow-2xl outline-none backdrop-blur-2xl transition-transform duration-150 active:scale-95"
          style={{
            animation: "clara-orb-heartbeat 1.8s ease-in-out infinite",
            background:
              "radial-gradient(circle at 32% 24%, rgba(255,255,255,0.62), color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 70%, transparent) 32%, color-mix(in srgb, var(--theme-accent, var(--theme-primary)) 55%, transparent) 64%, color-mix(in srgb, var(--theme-background, #050816) 62%, transparent) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -18px 34px rgba(0,0,0,0.22), 0 16px 38px rgba(0,0,0,0.34), 0 0 34px color-mix(in srgb, var(--theme-primary, var(--theme-accent)) 38%, transparent)",
            willChange: "transform, opacity, filter",
          }}
        >
          <span
            aria-hidden="true"
            className="absolute left-2 top-2 h-5 w-5 rounded-full blur-[1px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.82), rgba(255,255,255,0.12) 62%, transparent 72%)",
            }}
          />

          <span
            aria-hidden="true"
            className="absolute inset-[0.35rem] rounded-full border border-white/10"
          />

          <img
            src={`${import.meta.env.BASE_URL || "/"}clara-icon.png`}
            alt=""
            draggable="false"
            className="relative h-8 w-8 select-none object-contain drop-shadow-xl"
          />
        </button>
      </div>
    </div>
  );
}
