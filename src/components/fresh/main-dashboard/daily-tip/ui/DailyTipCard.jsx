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
            className="clara-preserve-flip-face absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(0,232,255,0.10),rgba(15,23,42,0.48)_48%,rgba(128,70,255,0.10))]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(1px)",
            }}
          >
            <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.045),transparent_44%,rgba(255,255,255,0.025)_100%)]" />

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
            className="clara-preserve-flip-face absolute inset-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(2,6,23,0.72)_48%,rgba(0,232,255,0.08))]"
            style={{
              transform: "rotateY(180deg) translateZ(1px)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_44%,rgba(255,255,255,0.025)_100%)]" />

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
