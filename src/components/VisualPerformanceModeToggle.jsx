import { useEffect, useMemo, useState } from "react";
import { Gauge, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  CLARA_VISUAL_MODES,
  applyClaraVisualMode,
  readStoredVisualMode,
  setStoredVisualMode,
} from "@/lib/clara-settings";

export default function VisualPerformanceModeToggle() {
  const location = useLocation();
  const [visualMode, setVisualMode] = useState(() => readStoredVisualMode());

  const isSettingsScreen = location.pathname.startsWith("/settings");
  const performanceMode = visualMode === CLARA_VISUAL_MODES.PERFORMANCE;

  useEffect(() => {
    const nextMode = readStoredVisualMode();
    setVisualMode(nextMode);
    applyClaraVisualMode(nextMode);

    const handleVisualModeUpdate = (event) => {
      const mode = event?.detail?.visualMode || readStoredVisualMode();
      setVisualMode(mode);
      applyClaraVisualMode(mode);
    };

    window.addEventListener("clara-visual-mode-updated", handleVisualModeUpdate);
    window.addEventListener("storage", handleVisualModeUpdate);

    return () => {
      window.removeEventListener("clara-visual-mode-updated", handleVisualModeUpdate);
      window.removeEventListener("storage", handleVisualModeUpdate);
    };
  }, []);

  const statusLabel = useMemo(
    () => (performanceMode ? "Performance" : "Premium"),
    [performanceMode]
  );

  if (!isSettingsScreen) return null;

  const handleToggle = () => {
    const nextMode = performanceMode
      ? CLARA_VISUAL_MODES.PREMIUM
      : CLARA_VISUAL_MODES.PERFORMANCE;
    setVisualMode(setStoredVisualMode(null, nextMode));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[9000] px-4">
      <div className="pointer-events-auto mx-auto max-w-md rounded-[22px] border border-[color:var(--theme-border)]/25 bg-[color:var(--theme-card)]/92 p-4 text-white shadow-[0_18px_46px_rgba(0,0,0,0.30)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
              {performanceMode ? <Gauge size={18} /> : <Sparkles size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-white">Performance Mode</p>
                <span className="rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Reduce animations, glow, blur, and motion effects for smoother performance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
              performanceMode ? "bg-emerald-500" : "bg-white/15"
            }`}
            aria-label="Toggle Performance Mode"
            aria-pressed={performanceMode}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                performanceMode ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
