import { useState } from "react";
import dailyTipLightbulbImage from "@/assets/dashboard-card-visuals/daily-tip-lightbulb.png";
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
        aria-label={flipped ? "Daily money tip" : "Tap to flip daily money tip"}
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
            className="clara-preserve-flip-face absolute inset-0 isolate overflow-hidden rounded-2xl border border-cyan-100/12 bg-[#061936] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.22)]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(1px)",
            }}
          >
            <img
              src={dailyTipLightbulbImage}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
              draggable="false"
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_48%,rgba(0,0,0,0.08)_100%)]" />
            <span className="sr-only">Daily Money Tip. Tap to flip.</span>
          </div>

          <div
            className="clara-preserve-flip-face absolute inset-0 isolate overflow-hidden rounded-2xl border border-cyan-100/14 bg-[linear-gradient(135deg,#11194d_0%,#050f2e_48%,#062638_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.22)]"
            style={{
              transform: "rotateY(180deg) translateZ(1px)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <img
              src={dailyTipLightbulbImage}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill opacity-30 blur-[1px]"
              draggable="false"
            />
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(2,6,23,0.78),rgba(5,15,46,0.74)_48%,rgba(6,38,56,0.78)_100%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%,rgba(0,0,0,0.18)_100%)]" />

            <div className="relative z-10 flex h-full items-center justify-center p-5 text-center text-white">
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
