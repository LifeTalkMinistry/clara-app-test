import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

function cardVisual(card = {}) {
  const eyebrow = String(card.eyebrow || "").toUpperCase();
  const decision = String(card.decision || "").toUpperCase();

  if (card.final) {
    if (decision === "BUY") {
      return {
        surface: "bg-[linear-gradient(145deg,rgba(6,78,59,0.30),rgba(2,6,23,0.94)_58%,rgba(8,47,73,0.36))]",
        glow: "bg-emerald-300/12",
        metric: "text-emerald-100",
      };
    }
    if (decision === "WAIT" || decision === "DO NOT BUY") {
      return {
        surface: "bg-[linear-gradient(145deg,rgba(127,29,29,0.20),rgba(2,6,23,0.95)_58%,rgba(67,20,7,0.28))]",
        glow: "bg-rose-300/10",
        metric: "text-rose-100",
      };
    }
    if (decision === "REDUCE") {
      return {
        surface: "bg-[linear-gradient(145deg,rgba(120,53,15,0.22),rgba(2,6,23,0.95)_58%,rgba(69,26,3,0.30))]",
        glow: "bg-amber-300/10",
        metric: "text-amber-100",
      };
    }
    return {
      surface: "bg-[linear-gradient(145deg,rgba(76,29,149,0.24),rgba(2,6,23,0.95)_58%,rgba(30,58,138,0.26))]",
      glow: "bg-violet-300/12",
      metric: "text-violet-100",
    };
  }

  if (/INCOME|CALENDAR/.test(eyebrow)) {
    return {
      surface: "bg-[linear-gradient(145deg,rgba(8,145,178,0.18),rgba(2,6,23,0.95)_58%,rgba(49,46,129,0.20))]",
      glow: "bg-cyan-300/10",
      metric: "text-cyan-100",
    };
  }

  if (/WALLET|SAFE TO SPEND|FINAL CALCULATION/.test(eyebrow)) {
    return {
      surface: "bg-[linear-gradient(145deg,rgba(13,148,136,0.18),rgba(2,6,23,0.95)_58%,rgba(30,64,175,0.20))]",
      glow: "bg-teal-300/10",
      metric: "text-teal-100",
    };
  }

  if (/BUDGET|OBLIGATION|EMERGENCY|SAVINGS/.test(eyebrow)) {
    return {
      surface: "bg-[linear-gradient(145deg,rgba(67,56,202,0.18),rgba(2,6,23,0.95)_58%,rgba(88,28,135,0.20))]",
      glow: "bg-violet-300/10",
      metric: "text-violet-100",
    };
  }

  return {
    surface: "bg-[linear-gradient(145deg,rgba(14,116,144,0.14),rgba(2,6,23,0.95)_58%,rgba(76,29,149,0.18))]",
    glow: "bg-cyan-300/10",
    metric: "text-slate-100",
  };
}

function isPrimaryMetric(value = "") {
  return /₱|^-?\d|\bday\b|\bdays\b|%/i.test(String(value).trim());
}

export default function BuyCheckDetailCarousel({ cards = [], onIndexChange, onFinish }) {
  const visibleCards = useMemo(() => (Array.isArray(cards) ? cards.filter(Boolean) : []), [cards]);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const frameRef = useRef(0);

  const publishIndex = useCallback((index) => {
    const nextIndex = clamp(index, 0, Math.max(visibleCards.length - 1, 0));
    setActiveIndex((current) => {
      if (current === nextIndex) return current;
      return nextIndex;
    });
    onIndexChange?.(nextIndex);
  }, [onIndexChange, visibleCards.length]);

  const goToCard = useCallback((index) => {
    if (!visibleCards.length) return;
    const nextIndex = clamp(index, 0, visibleCards.length - 1);
    const track = trackRef.current;
    const target = cardRefs.current[nextIndex];
    if (!track || !target) return;

    const left = target.offsetLeft - (track.clientWidth - target.clientWidth) / 2;
    track.scrollTo({ left, behavior: "smooth" });
    publishIndex(nextIndex);
  }, [publishIndex, visibleCards.length]);

  const updateIndexFromScroll = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track || !visibleCards.length) return;

      const viewportCenter = track.scrollLeft + track.clientWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      if (nearestIndex !== activeIndex) publishIndex(nearestIndex);
    });
  }, [activeIndex, publishIndex, visibleCards.length]);

  useEffect(() => {
    setActiveIndex(0);
    onIndexChange?.(0);
    const frame = window.requestAnimationFrame(() => {
      trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [onIndexChange, visibleCards]);

  useEffect(() => () => window.cancelAnimationFrame(frameRef.current), []);

  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToCard(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (activeIndex === visibleCards.length - 1) onFinish?.();
      else goToCard(activeIndex + 1);
    }
  };

  if (!visibleCards.length) {
    return (
      <div className="grid h-full min-h-[280px] place-items-center rounded-[26px] border border-white/10 bg-white/[0.035] px-6 text-center">
        <p className="text-sm font-medium leading-6 text-slate-300/75">No detailed evidence is available for this result.</p>
      </div>
    );
  }

  const isLastCard = activeIndex === visibleCards.length - 1;

  return (
    <div
      data-clara-buy-check-detail-carousel="true"
      className="flex h-full min-h-0 flex-col"
      role="region"
      aria-roledescription="carousel"
      aria-label="Buy Check financial report"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={trackRef}
        onScroll={updateIndexFromScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain px-1.5 pb-2 scroll-smooth [scrollbar-width:none] focus:outline-none motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {visibleCards.map((card, index) => {
          const visual = cardVisual(card);
          const metric = isPrimaryMetric(card.stat);
          const active = index === activeIndex;

          return (
            <article
              ref={(element) => { cardRefs.current[index] = element; }}
              key={`${card.eyebrow || "detail"}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${visibleCards.length}: ${card.title || "Buy Check finding"}`}
              style={{ minWidth: "calc(100% - 44px)", flexBasis: "calc(100% - 44px)" }}
              className={`relative h-full min-h-[360px] snap-center overflow-y-auto rounded-[28px] border border-white/10 px-5 py-5 text-left shadow-[0_24px_60px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[opacity,transform,border-color] duration-300 motion-reduce:transition-none ${visual.surface} ${active ? "scale-100 border-white/14 opacity-100" : "scale-[0.985] opacity-70"}`}
            >
              <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${visual.glow}`} />
              <div className="relative z-10 flex min-h-full flex-col">
                <p className="text-[9px] font-bold uppercase tracking-[0.20em] text-cyan-100/58">{card.eyebrow}</p>
                <h3 className="mt-3 max-w-[95%] text-[23px] font-extrabold leading-[1.12] tracking-[-0.025em] text-white/95">{card.title}</h3>

                {card.stat ? (
                  metric ? (
                    <p className={`mt-5 text-[28px] font-black leading-none tracking-[-0.035em] ${visual.metric}`}>{card.stat}</p>
                  ) : (
                    <div className="mt-4 inline-flex w-fit rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold text-slate-100/86">
                      {card.stat}
                    </div>
                  )
                ) : null}

                <p className="mt-5 max-w-[95%] text-[13.5px] font-medium leading-[1.65] text-slate-100/84">{card.body}</p>

                {card.note ? (
                  <div className="mt-auto pt-7">
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-100/46">
                        {card.final ? "CLARA’S SAFER MOVE" : "WHAT THIS MEANS"}
                      </p>
                      <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-200/72">{card.note}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-between gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-1.5 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => goToCard(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous report card"
          className="inline-flex min-h-11 items-center gap-1 rounded-[15px] px-3 text-[11px] font-semibold text-slate-100/82 transition hover:bg-white/[0.06] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span aria-live="polite" className="text-[11px] font-medium tabular-nums text-slate-300/68">
          {activeIndex + 1} of {visibleCards.length}
        </span>

        <button
          type="button"
          onClick={() => isLastCard ? onFinish?.() : goToCard(activeIndex + 1)}
          aria-label={isLastCard ? "Back to Buy Check result" : "Next report card"}
          className="inline-flex min-h-11 items-center gap-1 rounded-[15px] px-3 text-[11px] font-semibold text-cyan-100/88 transition hover:bg-white/[0.06] active:scale-[0.98] motion-reduce:transition-none"
        >
          {isLastCard ? "Back to result" : "Next"}
          {isLastCard ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
