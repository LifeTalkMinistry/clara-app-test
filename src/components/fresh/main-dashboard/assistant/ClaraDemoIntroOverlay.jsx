import { Sparkles } from "lucide-react";

export default function ClaraDemoIntroOverlay({ isVisible, onSkip }) {
  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[260] mx-auto flex w-full max-w-[430px] flex-col justify-end overflow-hidden px-5 pb-[176px] text-white">
      <div className="absolute inset-0 -z-10 bg-slate-950/52 backdrop-blur-[1.5px]" />

      <div className="pointer-events-auto rounded-[30px] border border-white/14 bg-slate-950/78 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/58">
              CLARA Demo
            </p>
            <h3 className="mt-1 text-[1.05rem] font-black leading-tight text-white">
              This is a sample user’s information.
            </h3>
            <p className="mt-3 text-[12.5px] leading-5 text-slate-200/78">
              Alex is 27, a BPO employee, building an emergency fund while balancing bills, debt, and emotional spending.
            </p>
            <div className="mt-4 rounded-[22px] border border-emerald-200/18 bg-emerald-300/10 px-4 py-3 text-[12.5px] font-black leading-5 text-emerald-100">
              Long press the glowing CLARA orb now.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="mt-4 w-full rounded-[20px] border border-white/10 bg-white/[0.055] px-4 py-3 text-[12px] font-black text-white/70 active:scale-[0.99]"
        >
          Skip guide for now
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-[58px] right-[14px] flex w-[90px] flex-col items-center gap-1.5 text-emerald-100">
        <div className="rounded-full border border-emerald-200/22 bg-slate-950/72 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          Hold here
        </div>
        <div className="clara-demo-pointer-float text-5xl leading-none drop-shadow-[0_0_18px_rgba(110,231,183,0.75)]">
          ↓
        </div>
      </div>
    </div>
  );
}
