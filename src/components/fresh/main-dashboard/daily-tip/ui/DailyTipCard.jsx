import { useState } from "react";
import useDailyTip from "../logic/useDailyTip";

export default function DailyTipCard() {
  const { tip, hasSeenToday, markSeenToday } = useDailyTip();
  const [flipped, setFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  const handleFlip = () => {
    setIsFlipping(true);
    setFlipped((current) => !current);
    if (!hasSeenToday) markSeenToday();

    window.setTimeout(() => {
      setIsFlipping(false);
    }, 760);
  };

  return (
    <div className="px-3 mt-4">
      <button
        type="button"
        onClick={handleFlip}
        className="group relative h-[150px] w-full cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-indigo-500/10 text-left shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 active:scale-[0.98]"
        style={{ perspective: "1500px" }}
      >
        <div
          className={`pointer-events-none absolute inset-0 rounded-2xl bg-cyan-400/5 blur-xl transition-all duration-700 ${
            isFlipping ? "opacity-100 scale-[1.05]" : "opacity-60 scale-100"
          }`}
        />
        <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.16),transparent_46%)]" />

        <div
          className="absolute inset-0 transition-transform duration-700 will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transitionTimingFunction: "cubic-bezier(0.18, 0.85, 0.28, 1.15)",
            transform: flipped
              ? "translateZ(26px) rotateX(3deg) rotateY(180deg) scale(1.015)"
              : "translateZ(26px) rotateX(0deg) rotateY(0deg) scale(1)",
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl p-5 text-center text-white"
            style={{
              backfaceVisibility: "hidden",
              transform: "translateZ(36px)",
            }}
          >
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
                Daily Money Tip
              </div>
              <div className="text-sm font-semibold text-white/75">
                {hasSeenToday ? "Tap to revisit" : "Tap to reveal"}
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl p-5 text-center text-white"
            style={{
              transform: "rotateY(180deg) translateZ(36px)",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="space-y-3">
              <div className="text-sm font-semibold leading-relaxed text-white/90">
                {tip}
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-cyan-300/80">
                <span className="opacity-80">Got it</span>
                <span className="opacity-40">•</span>
                <span className="opacity-80">Ask CLARA</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`pointer-events-none absolute inset-x-8 bottom-[-14px] h-6 rounded-full bg-cyan-900/30 blur-xl transition-all duration-700 ${
            isFlipping ? "opacity-80 scale-x-75" : "opacity-35 scale-x-100"
          }`}
        />
      </button>
    </div>
  );
}
