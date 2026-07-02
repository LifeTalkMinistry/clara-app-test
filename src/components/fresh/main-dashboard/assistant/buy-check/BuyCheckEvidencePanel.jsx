import { ArrowLeft } from "lucide-react";
import BuyCheckDetailCarousel from "./BuyCheckDetailCarousel.jsx";

export default function BuyCheckEvidencePanel({ open = false, diagnosis, onClose }) {
  if (!open) return null;
  const cards = diagnosis?.detailCards || diagnosis?.cards || [];
  return (
    <section data-clara-buy-check-details-sheet="true" className="absolute inset-0 z-[100] flex flex-col overflow-hidden bg-slate-950 px-3 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),18px)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(124,58,237,0.24),transparent_40%),linear-gradient(180deg,#020617_0%,#020617_100%)]" />
      <header className="relative z-10 flex shrink-0 items-start justify-between gap-3 px-2 pb-5 pt-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">FULL BUY CHECK</p>
          <h2 className="mt-1 text-[22px] font-black text-white">Why this result?</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-300/70">Swipe through the verified financial evidence.</p>
        </div>
        <button type="button" onClick={onClose} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-3 text-[11px] font-black text-white" aria-label="Back to Buy Check result">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </header>
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        <BuyCheckDetailCarousel cards={cards} />
      </div>
    </section>
  );
}
