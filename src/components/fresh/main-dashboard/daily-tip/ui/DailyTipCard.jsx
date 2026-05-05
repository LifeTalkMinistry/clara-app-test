import { useState } from "react";
import useDailyTip from "../logic/useDailyTip";

export default function DailyTipCard() {
  const { tip } = useDailyTip();
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="px-3 mt-4">
      <div
        onClick={() => setFlipped((f) => !f)}
        className="relative h-[140px] w-full cursor-pointer rounded-2xl bg-gradient-to-br from-cyan-400/10 to-indigo-500/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-500"
        style={{ perspective: "1000px" }}
      >
        <div
          className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT */}
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-white [backface-visibility:hidden]">
            <div>
              <div className="text-xs uppercase tracking-widest text-cyan-300 mb-2">
                Daily Money Tip
              </div>
              <div className="text-sm opacity-80">Tap to reveal</div>
            </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-white [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div className="text-sm font-medium leading-relaxed">
              {tip}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
