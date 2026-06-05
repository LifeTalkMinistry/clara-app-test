import { useEffect, useState } from "react";
import useDailyTip from "../logic/useDailyTip";
import { exitYoungProfessionalCurrentState } from "@/lib/clara-young-professional-current-state";

const ACTIVE_CURRENT_STATE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";

function readActiveCurrentState() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_CURRENT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.mode === "current_state" ? parsed : null;
  } catch {
    return null;
  }
}

export default function DailyTipCard() {
  const { tip, hasSeenToday, markSeenToday } = useDailyTip();
  const [flipped, setFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [activeCurrentState, setActiveCurrentState] = useState(() => readActiveCurrentState());
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const syncActiveState = () => setActiveCurrentState(readActiveCurrentState());

    syncActiveState();
    window.addEventListener("clara-young-professional-current-state-loaded", syncActiveState);
    window.addEventListener("storage", syncActiveState);

    return () => {
      window.removeEventListener("clara-young-professional-current-state-loaded", syncActiveState);
      window.removeEventListener("storage", syncActiveState);
    };
  }, []);

  const handleFlip = () => {
    setIsFlipping(true);
    setFlipped((current) => !current);
    if (!hasSeenToday) markSeenToday();

    window.setTimeout(() => {
      setIsFlipping(false);
    }, 760);
  };

  const handleExitCurrentState = async () => {
    if (exiting) return;

    try {
      setExiting(true);
      await exitYoungProfessionalCurrentState();
      setActiveCurrentState(null);

      window.setTimeout(() => {
        window.location.hash = "#/dashboard";
        window.location.reload();
      }, 350);
    } catch (error) {
      console.error("Unable to exit Sample Data learning mode:", error);
      setExiting(false);
    }
  };

  if (activeCurrentState) {
    return (
      <div className="clara-budget-focus-shift clara-budget-focus-tip px-3 mt-1.5">
        <div className="relative h-[150px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-indigo-500/10 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.10),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_48%)]" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-black uppercase leading-none tracking-[0.18em] text-cyan-100/60">
                Sample Mode
              </div>
              <button
                type="button"
                onClick={handleExitCurrentState}
                disabled={exiting}
                className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white/75 transition hover:bg-white/12 disabled:opacity-60"
              >
                {exiting ? "Exiting..." : "Exit"}
              </button>
            </div>

            <div className="mt-5 max-w-[19.25rem] pr-1">
              <p className="text-[11px] font-semibold leading-[1.58] text-cyan-50/72">
                Explore without risking real records. Practice first so CLARA can show how it reads income, explains your setup, and guides decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clara-budget-focus-shift clara-budget-focus-tip px-3 mt-1.5">
      <button
        type="button"
        onClick={handleFlip}
        className="group relative h-[150px] w-full cursor-pointer bg-transparent text-left transition-transform duration-300 active:scale-[0.98]"
        style={{ perspective: "1500px", WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className="clara-preserve-flip-motion absolute inset-0 rounded-2xl transition-transform duration-700 will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transitionTimingFunction: "cubic-bezier(0.18, 0.85, 0.28, 1.15)",
            transform: flipped
              ? "translateZ(0px) rotateY(180deg)"
              : "translateZ(0px) rotateY(0deg)",
          }}
        >
          <div
            className="clara-preserve-flip-face absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-indigo-500/10"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(1px)",
            }}
          >
            <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.10),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_48%)]" />

            <div className="relative flex h-full items-center justify-center p-5 text-center text-white">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
                  Daily Money Tip
                </div>
                <div className="text-sm font-semibold text-white/75">
                  Tap to flip
                </div>
              </div>
            </div>
          </div>

          <div
            className="clara-preserve-flip-face absolute inset-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-indigo-500/15 via-slate-950/70 to-cyan-400/10"
            style={{
              transform: "rotateY(180deg) translateZ(1px)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.12),transparent_44%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.12),transparent_48%)]" />

            <div className="relative flex h-full items-center justify-center p-5 text-center text-white">
              <div className="space-y-3">
                <div className="text-sm font-semibold leading-relaxed text-white/90">
                  {tip}
                </div>

                <div className="flex items-center justify-center text-[11px] font-semibold text-cyan-300/80">
                  <span className="opacity-90">Ask CLARA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
