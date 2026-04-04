import { useState } from "react";
import { Lightbulb } from "lucide-react";

export default function DailyTipCard() {
  const [flipped, setFlipped] = useState(false);

  const tipText = "Track every peso. Awareness creates control.";

  return (
    <div
      className="h-full cursor-pointer select-none"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        className="relative h-full min-h-[180px]"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.55s ease",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-[24px] border border-emerald-400/20 bg-[linear-gradient(135deg,#032418,#064e3b)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.22)]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-white/70">
              Daily Money Tip
            </span>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Lightbulb className="h-4 w-4 text-emerald-300" />
            </div>
          </div>

          <p className="text-lg font-semibold text-white">
            Flip for today&apos;s tip
          </p>
        </div>

        <div
          className="absolute inset-0 flex flex-col justify-between rounded-[24px] border border-emerald-400/20 bg-[linear-gradient(135deg,#043726,#065f46)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.22)]"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <span className="text-xs font-bold uppercase tracking-wide text-white/60">
            Today&apos;s Tip
          </span>

          <p className="text-base font-semibold leading-7 text-white">
            “{tipText}”
          </p>

          <p className="text-[11px] text-white/45">Tap to flip back</p>
        </div>
      </div>
    </div>
  );
}