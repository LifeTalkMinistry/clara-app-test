import { useState } from "react";
import useDailyTip from "../logic/useDailyTip";

export default function DailyTipCard() {
  const { tip, hasSeenToday, markSeenToday } = useDailyTip();
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped((f) => !f);
    if (!hasSeenToday) markSeenToday();
  };

  return (
    <div className="px-3 mt-4">
      <div
        onClick={handleFlip}
        className="relative h-[150px] w-full cursor-pointer rounded-2xl bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-indigo-500/10 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition-all duration-300 active:scale-[0.98]"
        style={{ perspective: "1200px" }}
      >
        <div className="absolute inset-0 rounded-2xl bg-cyan-400/5 blur-xl opacity-60" />

        <div
          className={`absolute inset-0 transition-transform duration-500 ease-out [transform-style:preserve-3d] ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          <div className="absolute inset-0 flex items-center justify-center p-5 text-center text-white [backface-visibility:hidden]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300 mb-2">
                Today’s Money Tip
              </div>
              <div className="text-sm text-white/70">
                {hasSeenToday ? "Tap to revisit" : "Tap to reveal"}
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center p-5 text-center text-white [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div className="space-y-3">
              <div className="text-sm font-medium leading-relaxed">
                {tip}
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-cyan-300/80">
                <span className="opacity-80">Got it</span>
                <span className="opacity-40">•</span>
                <span className="opacity-80">Ask CLARA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
