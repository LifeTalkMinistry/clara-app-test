import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const CLARA_GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const CLARA_GUIDE_ME_PHASE_REQUEST_EVENT = "clara:guide-me-phase-request";
const GUIDE_FEATURE_ME_PAGE = "me-page";

const COPY = {
  "me-page-preview": {
    title: "WHY ME MATTERS",
    body: "The same amount of money can mean something different depending on your responsibilities and current life stage.",
    supporting: "This profile helps CLARA personalize her guidance.",
    footer: "CLARA LEARNS THE PERSON BEHIND THE NUMBERS.",
  },
  complete: {
    title: "ME PAGE READY",
    body: "CLARA can now connect money decisions with your real-life context.",
    supporting: "Your existing profile remains unchanged while you are inside Guide Mode.",
    footer: "YOUR REAL-LIFE CONTEXT MAKES THE GUIDANCE PERSONAL.",
  },
};

export default function ClaraGuideMePageOverlay({ phase = "me-page-preview" }) {
  const bubbleRef = useRef(null);
  const completionDispatchRef = useRef(false);
  const [top, setTop] = useState(null);
  const copy = COPY[phase] || COPY["me-page-preview"];

  const updatePosition = useCallback(() => {
    const bubble = bubbleRef.current;
    const preview = document.querySelector("[data-clara-guide-me-preview='true']");
    if (!bubble || !preview) return;

    const previewRect = preview.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const setupCta = preview.querySelector("[data-clara-life-stage-setup-cta='true']");
    const padding = 14;
    const gap = 14;
    const minTop = previewRect.top + padding;
    const maxTop = Math.max(minTop, previewRect.bottom - bubbleRect.height - padding);
    let nextTop = maxTop;

    if (setupCta) {
      const ctaRect = setupCta.getBoundingClientRect();
      const belowCta = ctaRect.bottom + gap;
      const aboveCta = ctaRect.top - bubbleRect.height - gap;

      if (belowCta <= maxTop) nextTop = belowCta;
      else if (aboveCta >= minTop) nextTop = aboveCta;
    }

    setTop(Math.max(minTop, Math.min(maxTop, nextTop)));
  }, []);

  useLayoutEffect(() => {
    updatePosition();
  }, [phase, updatePosition]);

  useEffect(() => {
    completionDispatchRef.current = false;
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);

    const preview = document.querySelector("[data-clara-guide-me-preview='true']");
    const observer =
      typeof ResizeObserver !== "undefined" && preview
        ? new ResizeObserver(handleResize)
        : null;
    observer?.observe(preview);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [phase, updatePosition]);

  const handleNext = () => {
    if (typeof window === "undefined") return;

    if (phase !== "complete") {
      window.dispatchEvent(
        new CustomEvent(CLARA_GUIDE_ME_PHASE_REQUEST_EVENT, {
          detail: { phase: "complete" },
        })
      );
      return;
    }

    if (completionDispatchRef.current) return;
    completionDispatchRef.current = true;
    window.dispatchEvent(
      new CustomEvent(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, {
        detail: { feature: GUIDE_FEATURE_ME_PAGE },
      })
    );
  };

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[95] w-[min(calc(100vw-24px),406px)] -translate-x-1/2 px-3"
      style={{ top: top === null ? "calc(100svh - 250px)" : `${top}px` }}
    >
      <div
        ref={bubbleRef}
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-me-page-title"
        className="pointer-events-auto relative mx-auto w-full max-w-[360px] rounded-[28px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-5 py-5 text-white shadow-[0_24px_76px_rgba(0,0,0,0.74),0_0_48px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute -top-2 left-12 h-4 w-4 rotate-45 border-l border-t border-cyan-100/24 bg-[rgba(8,20,45,0.985)]" />
        <p
          id="clara-guide-me-page-title"
          className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          {copy.title}
        </p>
        <p className="mt-3 text-[13px] font-bold leading-5 text-white">{copy.body}</p>
        <p className="mt-2 text-[12px] font-semibold leading-5 text-white/66">{copy.supporting}</p>
        <div className="mt-4 h-px bg-cyan-100/15" />
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="max-w-[220px] text-[10px] font-black uppercase leading-4 tracking-[0.08em] text-cyan-100/86">
            {copy.footer}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="min-h-[42px] shrink-0 rounded-full border border-cyan-100/30 bg-cyan-100/15 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 active:scale-[0.99]"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
}
