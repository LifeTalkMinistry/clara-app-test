import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { buildLifeStageDiagnosisSlides } from "./lifeStageDiagnosisModel";

const NEXT_LABELS = {
  opening: "Yeah… show me what you noticed.",
  chips: "That actually feels true.",
  distribution: "Show me the strongest signal.",
  strongestSignal: "What does that mean for me?",
  commonPattern: "Okay… keep going.",
  rhythm: "Okay… keep going.",
  trigger: "I needed to hear that.",
  meter: "Let’s protect that first.",
  final: "Bring me back to Me",
};

function SummaryVisual({ slide, index, total }) {
  if (slide.kind === "chips") {
    return (
      <div className="relative z-10 mt-2 flex flex-wrap gap-2">
        {(slide.chips || []).map((chip) => (
          <span
            key={chip}
            className="max-w-full rounded-full border border-cyan-100/15 bg-white/[0.055] px-3 py-2 text-[11px] font-bold leading-tight text-cyan-50/82 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]"
          >
            {chip}
          </span>
        ))}
      </div>
    );
  }

  if (slide.kind === "distribution") {
    return (
      <div className="relative z-10 mt-2 rounded-[24px] border border-cyan-100/15 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_18px_44px_rgba(2,8,23,.18)]">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/58">
          Current distribution
        </p>
        <p className="mt-3 text-[12px] font-bold leading-6 text-white/80">
          {slide.body}
        </p>
      </div>
    );
  }

  if (slide.kind === "strongestSignal") {
    return (
      <div className="relative z-10 mx-auto mt-3 grid h-36 w-36 place-items-center rounded-full border border-cyan-100/15 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,.17),transparent_28%),radial-gradient(circle_at_50%_58%,rgba(103,232,249,.16),rgba(124,58,237,.15))] shadow-[0_0_52px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.08)]">
        <div className="text-center">
          <p className="text-3xl font-black leading-none text-white">
            {slide.metric || index + 1}
          </p>
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/52">
            strongest
          </p>
        </div>
      </div>
    );
  }

  if (["commonPattern", "trigger"].includes(slide.kind)) {
    return (
      <div className="relative z-10 mx-auto mt-3 grid h-36 w-36 place-items-center">
        <span className="absolute inset-0 rounded-full border border-violet-200/20 bg-violet-300/[0.055]" />
        <span className="absolute inset-5 rounded-full border border-cyan-100/16 bg-cyan-200/[0.045]" />
        <span className="absolute inset-10 rounded-full border border-white/12 bg-white/[0.035]" />
        <p className="relative max-w-[82px] text-center text-[9px] font-black uppercase leading-4 tracking-[0.12em] text-cyan-50/58">
          pressure response
        </p>
      </div>
    );
  }

  if (slide.kind === "final") {
    return (
      <div className="relative z-10 mx-auto mt-3 grid h-32 w-32 place-items-center rounded-full border border-cyan-100/18 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.18),transparent_30%),linear-gradient(145deg,rgba(45,212,191,.16),rgba(91,63,209,.22))] shadow-[0_0_54px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.08)]">
        <Check className="h-10 w-10 text-cyan-50" strokeWidth={2.4} />
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto mt-3 grid h-36 w-36 place-items-center rounded-full border border-cyan-100/15 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,.17),transparent_28%),radial-gradient(circle_at_50%_58%,rgba(103,232,249,.16),rgba(124,58,237,.15))] shadow-[0_0_52px_rgba(34,211,238,.12),inset_0_1px_0_rgba(255,255,255,.08)]">
      <div className="text-center">
        <Sparkles className="mx-auto h-8 w-8 text-cyan-50" />
        <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/52">
          {index + 1} of {total}
        </p>
      </div>
    </div>
  );
}

export default function LifeStageDiagnosisSummary({ profile, onClose }) {
  const slides = useMemo(
    () => buildLifeStageDiagnosisSlides(profile),
    [profile]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef(null);
  const activeSlide = slides[activeIndex] || slides[0];
  const isLastSlide = activeIndex >= slides.length - 1;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => {
          if (current >= slides.length - 1) return current;
          return current + 1;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, slides.length]);

  if (!activeSlide) return null;

  const goBack = () => {
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    if (isLastSlide) {
      onClose();
      return;
    }
    setActiveIndex((current) => Math.min(slides.length - 1, current + 1));
  };

  const handlePointerUp = (event) => {
    if (pointerStartX.current == null) return;
    const delta = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(delta) < 44) return;
    if (delta > 0) goBack();
    else goNext();
  };

  return (
    <div
      data-clara-life-stage-summary="true"
      className="fixed inset-0 left-1/2 z-[10000] flex h-[100dvh] w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden bg-[#020817] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] text-white shadow-[0_24px_90px_rgba(0,0,0,.68)]"
      role="dialog"
      aria-modal="true"
      aria-label="CLARA Life Stage summary"
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX;
      }}
      onPointerCancel={() => {
        pointerStartX.current = null;
      }}
      onPointerUp={handlePointerUp}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,.16),transparent_31%),radial-gradient(circle_at_94%_14%,rgba(124,58,237,.25),transparent_35%),linear-gradient(180deg,#030816,#06051f_52%,#020817)]" />

      <section className="relative z-10 grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden rounded-[34px] border border-cyan-100/15 bg-[radial-gradient(circle_at_10%_4%,rgba(94,234,212,.16),transparent_30%),radial-gradient(circle_at_90%_92%,rgba(124,58,237,.22),transparent_34%),linear-gradient(145deg,rgba(8,28,55,.90),rgba(15,18,66,.91)_53%,rgba(45,22,100,.84))] p-4 shadow-[0_30px_92px_rgba(0,0,0,.55),0_0_48px_rgba(34,211,238,.08),inset_0_1px_0_rgba(255,255,255,.08)]">
        <div
          className="relative z-10 grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, slides.length)}, minmax(0, 1fr))`,
          }}
          aria-hidden="true"
        >
          {slides.map((slide, index) => (
            <span
              key={`${slide.kind}-${index}`}
              className="h-1 overflow-hidden rounded-full bg-white/10"
            >
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,rgba(103,232,249,.96),rgba(147,197,253,.92),rgba(196,181,253,.96))] shadow-[0_0_16px_rgba(125,211,252,.28)] transition-[width] duration-300"
                style={{
                  width:
                    index < activeIndex
                      ? "100%"
                      : index === activeIndex
                        ? "72%"
                        : "0%",
                }}
              />
            </span>
          ))}
        </div>

        <div
          key={`${activeSlide.kind}-${activeIndex}`}
          className="relative z-10 min-h-0 overflow-y-auto rounded-[28px] border border-white/[0.085] bg-[#030a1f]/38 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,.055),0_18px_54px_rgba(2,8,23,.20)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-live="polite"
        >
          <div className="flex min-h-full flex-col justify-center">
            <p className="text-[9px] font-black uppercase tracking-[0.19em] text-cyan-100/62">
              {activeSlide.eyebrow}
            </p>
            <h1 className="mt-4 max-w-[330px] text-[clamp(29px,8.7vw,39px)] font-black leading-[1.045] tracking-[-0.038em] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,.30)]">
              {activeSlide.title}
            </h1>
            {activeSlide.kind !== "distribution" ? (
              <p className="mt-4 max-w-[330px] text-[clamp(13px,3.3vw,14.5px)] font-semibold leading-6 text-white/76">
                {activeSlide.body}
              </p>
            ) : null}
            {activeSlide.supporting ? (
              <p className="mt-3 max-w-[320px] text-[clamp(11.5px,2.9vw,13px)] font-semibold leading-5 text-cyan-50/58">
                {activeSlide.supporting}
              </p>
            ) : null}
            <SummaryVisual
              slide={activeSlide}
              index={activeIndex}
              total={slides.length}
            />
          </div>
        </div>

        <footer className="relative z-20 flex gap-2.5">
          <button
            type="button"
            onClick={goBack}
            disabled={activeIndex === 0}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white/70 transition active:scale-95 disabled:pointer-events-none disabled:opacity-0"
            aria-label="Previous summary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.30),transparent_25%),linear-gradient(135deg,#67e8f9,#7dd3fc_46%,#a5b4fc)] px-4 text-center text-[12px] font-black leading-tight text-slate-950 shadow-[0_16px_34px_rgba(45,212,191,.16),0_0_30px_rgba(125,211,252,.10),inset_0_1px_0_rgba(255,255,255,.45)] transition active:scale-[0.985]"
          >
            <span>{NEXT_LABELS[activeSlide.kind] || "Continue"}</span>
            {isLastSlide ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
