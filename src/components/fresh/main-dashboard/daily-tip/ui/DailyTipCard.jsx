import { useState } from "react";
import DashboardCardIllustration from "@/components/fresh/main-dashboard/visuals/DashboardCardIllustration";
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
            className="clara-preserve-flip-face absolute inset-0 isolate overflow-hidden rounded-2xl border border-cyan-100/12 bg-[linear-gradient(135deg,#062638_0%,#061936_48%,#1d1550_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.22)]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(1px)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(0,232,255,0.055),transparent_44%,rgba(128,70,255,0.07)_100%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_42%,rgba(0,0,0,0.16)_100%)]" />
            <DashboardCardIllustration variant="money-tip" />

            <div className="relative z-10 flex h-full items-center justify-start p-5 pr-[42%] text-left text-white">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.24)]">
                  Daily Money Tip
                </div>
                <div className="text-sm font-semibold text-white/82">
                  Tap to flip
                </div>
              </div>
            </div>
          </div>

          <div
            className="clara-preserve-flip-face absolute inset-0 isolate overflow-hidden rounded-2xl border border-cyan-100/14 bg-[linear-gradient(135deg,#11194d_0%,#050f2e_48%,#062638_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.22)]"
            style={{
              transform: "rotateY(180deg) translateZ(1px)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(128,70,255,0.045),transparent_46%,rgba(0,232,255,0.045)_100%)]" />
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
