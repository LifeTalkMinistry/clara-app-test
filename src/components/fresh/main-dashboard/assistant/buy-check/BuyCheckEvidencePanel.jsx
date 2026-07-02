import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import BuyCheckDetailCarousel from "./BuyCheckDetailCarouselCompact.jsx";

export default function BuyCheckEvidencePanel({ open = false, diagnosis, onClose }) {
  const cards = useMemo(() => {
    const source = diagnosis?.detailCards || diagnosis?.cards || [];
    return Array.isArray(source) ? source.filter(Boolean) : [];
  }, [diagnosis]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open) setCurrentIndex(0);
  }, [diagnosis, open]);

  if (!open) return null;

  const total = cards.length;
  const safeIndex = total ? Math.min(currentIndex, total - 1) : 0;
  const progress = total ? ((safeIndex + 1) / total) * 100 : 0;

  return (
    <section data-clara-buy-check-details-sheet="true" className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020617] px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),14px)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.10),transparent_32%),radial-gradient(circle_at_92%_4%,rgba(124,58,237,.14),transparent_36%),linear-gradient(180deg,#020617_0%,#020617_100%)]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-0.5 py-4">
        <div className="w-full">
          <header className="px-1 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.20em] text-cyan-100/54">BUY CHECK REPORT</p>
                <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-white/95">Why this result?</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Back to Buy Check result" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.035] text-white/84">
                <ArrowLeft className="h-[17px] w-[17px]" />
              </button>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.88),rgba(103,232,249,.88),rgba(139,92,246,.82))] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
            </div>
          </header>

          <BuyCheckDetailCarousel cards={cards} onIndexChange={setCurrentIndex} onFinish={onClose} />
        </div>
      </div>
    </section>
  );
}
