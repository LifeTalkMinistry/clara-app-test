import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import BuyCheckDetailCarousel from "./BuyCheckDetailCarousel.jsx";

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

  const pageCount = cards.length;
  const safeIndex = pageCount ? Math.min(currentIndex, pageCount - 1) : 0;
  const progress = pageCount ? ((safeIndex + 1) / pageCount) * 100 : 0;

  return (
    <section
      data-clara-buy-check-details-sheet="true"
      className="fixed inset-0 z-[400] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020617] px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),16px)] text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_92%_5%,rgba(124,58,237,0.20),transparent_38%),linear-gradient(180deg,#020617_0%,#020617_100%)]" />

      <header className="relative z-10 shrink-0 px-2 pb-4 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-100/58">BUY CHECK REPORT</p>
            <h2 className="mt-1.5 max-w-[285px] text-[24px] font-extrabold leading-[1.12] tracking-[-0.03em] text-white/96">
              Why CLARA gave this result
            </h2>
            <p className="mt-2 text-[11px] font-medium leading-5 text-slate-300/66">
              Verified financial evidence, one finding at a time.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.08] active:scale-[0.97] motion-reduce:transition-none"
            aria-label="Back to Buy Check result"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span aria-live="polite" className="shrink-0 text-[11px] font-medium tabular-nums text-slate-300/68">
            {pageCount ? `${safeIndex + 1} of ${pageCount}` : "No report pages"}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,0.92),rgba(103,232,249,0.92),rgba(139,92,246,0.88))] transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1 px-0.5 pb-1">
        <BuyCheckDetailCarousel cards={cards} onIndexChange={setCurrentIndex} onFinish={onClose} />
      </div>
    </section>
  );
}
