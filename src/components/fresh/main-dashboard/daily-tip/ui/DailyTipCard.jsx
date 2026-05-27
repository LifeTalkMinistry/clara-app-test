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
          className="clara-preserve-flip-motion absolute inset-0 rounded-[24px] transition-transform duration-700 will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transitionTimingFunction: "cubic-bezier(0.18, 0.85, 0.28, 1.15)",
            transform: flipped
              ? "translateZ(0px) rotateY(180deg)"
              : "translateZ(0px) rotateY(0deg)",
          }}
        >
          <div
            className="clara-preserve-flip-face absolute inset-0 overflow-hidden rounded-[24px] border border-emerald-100/18 bg-[linear-gradient(135deg,rgba(10,126,128,0.54)_0%,rgba(17,44,85,0.66)_46%,rgba(82,45,147,0.70)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_34px_rgba(45,212,191,0.14),0_18px_36px_rgba(0,0,0,0.26)]"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(1px)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_18%_26%,rgba(94,234,212,0.24),transparent_43%),radial-gradient(circle_at_88%_58%,rgba(168,85,247,0.25),transparent_52%)]" />
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/45 to-transparent" />
            <div className="pointer-events-none absolute inset-[1px] rounded-[23px] border border-white/[0.055]" />
            <div className="pointer-events-none absolute -left-10 -top-16 h-36 w-36 rounded-full bg-cyan-300/[0.13] blur-[42px] transition duration-500 group-hover:bg-cyan-300/[0.18]" />
            <div className="pointer-events-none absolute -right-12 -bottom-16 h-40 w-40 rounded-full bg-violet-400/[0.16] blur-[46px] transition duration-500 group-hover:bg-violet-400/[0.22]" />

            <div className="relative flex h-full items-center gap-4 px-4.5 py-4 text-white sm:px-5">
              <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border border-emerald-100/55 bg-emerald-400/[0.16] text-[22px] font-black text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_26px_rgba(94,234,212,0.25)]">
                ₱
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.26em] text-emerald-100/85">
                  Daily Money Tip
                </div>
                <div className="text-[20px] font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.24)]">
                  Tap to flip
                </div>
                <div className="mt-2 text-[12px] font-bold leading-4 text-white/72">
                  One small money decision for today.
                </div>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.075] text-[18px] font-black text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 group-hover:translate-x-0.5 group-hover:border-emerald-100/24 group-hover:bg-emerald-300/[0.10] group-hover:text-emerald-50">
                ›
              </div>
            </div>
          </div>

          <div
            className="clara-preserve-flip-face absolute inset-0 overflow-hidden rounded-[24px] border border-emerald-100/20 bg-[linear-gradient(135deg,rgba(82,45,147,0.70)_0%,rgba(17,44,85,0.70)_46%,rgba(10,126,128,0.56)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_34px_rgba(45,212,191,0.14),0_18px_36px_rgba(0,0,0,0.26)]"
            style={{
              transform: "rotateY(180deg) translateZ(1px)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_88%_24%,rgba(94,234,212,0.22),transparent_44%),radial-gradient(circle_at_18%_78%,rgba(168,85,247,0.24),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/45 to-transparent" />
            <div className="pointer-events-none absolute inset-[1px] rounded-[23px] border border-white/[0.055]" />
            <div className="pointer-events-none absolute -right-10 -top-16 h-36 w-36 rounded-full bg-cyan-300/[0.12] blur-[42px]" />
            <div className="pointer-events-none absolute -left-12 -bottom-16 h-40 w-40 rounded-full bg-violet-400/[0.15] blur-[46px]" />

            <div className="relative flex h-full items-center justify-center px-5 py-4 text-center text-white">
              <div className="space-y-3">
                <div className="mx-auto inline-flex rounded-full border border-emerald-100/20 bg-emerald-300/[0.10] px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-emerald-100/85">
                  Today’s tip
                </div>

                <div className="text-sm font-bold leading-relaxed text-white/92 drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
                  {tip}
                </div>

                <div className="flex items-center justify-center text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/75">
                  <span>Ask CLARA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
