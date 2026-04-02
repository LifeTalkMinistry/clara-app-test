import { useState } from "react";
import { Lightbulb } from "lucide-react";

export default function DailyTipCard() {
  const [flipped, setFlipped] = useState(false);

  const tipText = "Track every peso. Awareness creates control.";

  return (
    <div
      className="cursor-pointer select-none h-full"
      style={{ perspective: "800px" }}
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        className="relative h-full"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.5s",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >

        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl p-4 border border-emerald-400/20 bg-[#0F172A] flex flex-col justify-between"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex justify-between">
            <span className="text-xs text-white/70 font-bold">
              DAILY TIP
            </span>

            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <p className="text-sm text-white/70">
            Tap to reveal today’s tip
          </p>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl p-4 border border-emerald-400/20 bg-[#0F172A] flex flex-col justify-between"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <span className="text-xs text-white/60">
            TODAY’S TIP
          </span>

          <p className="text-sm font-semibold text-white">
            “{tipText}”
          </p>

          <p className="text-[10px] text-white/50">
            Tap to flip back
          </p>
        </div>
      </div>
    </div>
  );
}