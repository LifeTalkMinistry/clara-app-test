import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function surfaceFor(card = {}) {
  const key = String(card.eyebrow || "").toUpperCase();
  const decision = String(card.decision || "").toUpperCase();
  if (card.final && decision === "BUY") return "bg-[linear-gradient(145deg,rgba(6,78,59,.16),rgba(8,15,34,.98)_60%,rgba(8,47,73,.14))]";
  if (card.final && /WAIT|DO NOT BUY/.test(decision)) return "bg-[linear-gradient(145deg,rgba(127,29,29,.10),rgba(8,15,34,.98)_60%,rgba(67,20,7,.12))]";
  if (/INCOME|CALENDAR/.test(key)) return "bg-[linear-gradient(145deg,rgba(8,145,178,.09),rgba(8,15,34,.98)_60%,rgba(49,46,129,.09))]";
  if (/WALLET|SAFE TO SPEND|FINAL CALCULATION/.test(key)) return "bg-[linear-gradient(145deg,rgba(13,148,136,.09),rgba(8,15,34,.98)_60%,rgba(30,64,175,.09))]";
  return "bg-[linear-gradient(145deg,rgba(67,56,202,.09),rgba(8,15,34,.98)_60%,rgba(88,28,135,.09))]";
}

function metricLike(value = "") {
  return /₱|^-?\d|\bday\b|\bdays\b|%/i.test(String(value).trim());
}

export default function BuyCheckDetailCarouselCompact({ cards = [], onIndexChange, onFinish }) {
  const items = useMemo(() => (Array.isArray(cards) ? cards.filter(Boolean) : []), [cards]);
  const [index, setIndex] = useState(0);
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const frameRef = useRef(0);

  const publish = useCallback((next) => {
    const safe = clamp(next, 0, Math.max(items.length - 1, 0));
    setIndex(safe);
    onIndexChange?.(safe);
  }, [items.length, onIndexChange]);

  const goTo = useCallback((next) => {
    if (!items.length) return;
    const safe = clamp(next, 0, items.length - 1);
    const track = trackRef.current;
    const slide = slideRefs.current[safe];
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    publish(safe);
  }, [items.length, publish]);

  const readPosition = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) return;
      let nearest = 0;
      let distance = Number.POSITIVE_INFINITY;
      slideRefs.current.forEach((slide, slideIndex) => {
        if (!slide) return;
        const current = Math.abs(slide.offsetLeft - track.scrollLeft);
        if (current < distance) {
          distance = current;
          nearest = slideIndex;
        }
      });
      if (nearest !== index) publish(nearest);
    });
  }, [index, publish]);

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, items.length);
    setIndex(0);
    onIndexChange?.(0);
    const frame = window.requestAnimationFrame(() => trackRef.current?.scrollTo({ left: 0, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [items, onIndexChange]);

  useEffect(() => () => window.cancelAnimationFrame(frameRef.current), []);

  if (!items.length) {
    return <div className="grid min-h-[260px] place-items-center rounded-[22px] border border-white/[0.08] bg-white/[0.025] px-6 text-center text-sm font-medium text-slate-300/75">No detailed evidence is available for this result.</div>;
  }

  const last = index === items.length - 1;

  return (
    <div
      className="w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="Buy Check financial report"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(index - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          last ? onFinish?.() : goTo(index + 1);
        }
      }}
    >
      <span className="sr-only" aria-live="polite">Report {index + 1} of {items.length}</span>

      <div
        ref={trackRef}
        onScroll={readPosition}
        className="flex w-full snap-x snap-mandatory items-center gap-3 overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingInline: 0 }}
      >
        {items.map((card, slideIndex) => (
          <article
            key={`${card.eyebrow || "detail"}-${slideIndex}`}
            ref={(node) => { slideRefs.current[slideIndex] = node; }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${items.length}: ${card.title || "Buy Check finding"}`}
            className={`min-h-[300px] w-full shrink-0 snap-start rounded-[24px] border border-white/[0.08] px-5 py-5 text-left shadow-[0_18px_42px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.04)] ${surfaceFor(card)}`}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-100/56">{card.eyebrow}</p>
            <h3 className="mt-3 max-w-[96%] text-[21px] font-extrabold leading-[1.16] tracking-[-0.025em] text-white/95">{card.title}</h3>
            {card.stat ? metricLike(card.stat)
              ? <p className="mt-4 text-[26px] font-black leading-none tracking-[-0.03em] text-white/94">{card.stat}</p>
              : <div className="mt-4 inline-flex w-fit rounded-full border border-white/[0.08] bg-white/[0.055] px-3 py-1.5 text-[11px] font-semibold text-slate-100/84">{card.stat}</div>
              : null}
            <p className="mt-4 max-w-[96%] text-[13px] font-medium leading-[1.62] text-slate-100/82">{card.body}</p>
            {card.note ? <div className="mt-6 border-t border-white/[0.08] pt-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-100/44">{card.final ? "CLARA’S SAFER MOVE" : "WHAT THIS MEANS"}</p>
              <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-200/70">{card.note}</p>
            </div> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
