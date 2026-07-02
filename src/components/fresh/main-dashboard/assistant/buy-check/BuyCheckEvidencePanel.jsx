import { X } from "lucide-react";
import BuyCheckDetailCarousel from "./BuyCheckDetailCarousel.jsx";

export default function BuyCheckEvidencePanel({ open = false, diagnosis, onClose }) {
  if (!open) return null;
  const cards = diagnosis?.detailCards || diagnosis?.cards || [];
  return (
    <section data-clara-buy-check-details-sheet="true" className="absolute inset-0 z-[80] flex flex-col bg-slate-950/96 px-3 pb-4 pt-5 backdrop-blur-2xl">
      <header className="flex items-start justify-between gap-3 px-2 pb-4 pt-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">FULL BUY CHECK</p>
          <h2 className="mt-1 text-[22px] font-black text-white">Why this result?</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-300/70">Swipe through the verified financial evidence.</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/14 bg-white/[0.06] text-white" aria-label="Close Buy Check details">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        <BuyCheckDetailCarousel cards={cards} />
      </div>
    </section>
  );
}
