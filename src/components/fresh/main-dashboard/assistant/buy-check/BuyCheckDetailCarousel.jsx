function cardTheme(card = {}) {
  const decision = String(card.decision || "").toUpperCase();
  if (!card.final) return "border-white/10 bg-slate-950/30";
  if (decision === "BUY") return "border-emerald-200/22 bg-emerald-300/10";
  if (decision === "WAIT") return "border-orange-200/22 bg-orange-300/10";
  if (decision === "REDUCE") return "border-amber-200/22 bg-amber-300/10";
  if (decision === "DO NOT BUY") return "border-rose-200/22 bg-rose-300/10";
  return "border-violet-200/22 bg-violet-300/10";
}

export default function BuyCheckDetailCarousel({ cards = [] }) {
  const visibleCards = Array.isArray(cards) ? cards.filter(Boolean) : [];
  if (!visibleCards.length) {
    return <p className="text-sm font-semibold text-slate-300/75">No detailed evidence is available for this result.</p>;
  }
  return (
    <div data-clara-buy-check-detail-carousel="true" className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4">
      {visibleCards.map((card, index) => (
        <article key={`${card.eyebrow || "detail"}-${index}`} className={`min-w-full snap-center rounded-[24px] border px-5 py-5 text-left ${cardTheme(card)}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/48">{card.eyebrow}</p>
          <h3 className="mt-2 text-[20px] font-black leading-tight text-white">{card.title}</h3>
          {card.stat ? <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black text-slate-100/90">{card.stat}</div> : null}
          <p className="mt-4 text-[13px] font-bold leading-6 text-slate-100/90">{card.body}</p>
          {card.note ? <p className="mt-4 text-[11px] font-black leading-5 text-slate-300/62">{card.note}</p> : null}
        </article>
      ))}
    </div>
  );
}
