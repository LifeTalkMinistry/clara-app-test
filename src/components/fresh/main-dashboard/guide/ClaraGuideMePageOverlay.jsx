import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

function findSetupCta(preview) {
  const markedCta = preview?.querySelector?.("[data-clara-life-stage-setup-cta='true']");
  if (markedCta) return markedCta;

  return Array.from(preview?.querySelectorAll?.("button") || []).find((button) =>
    String(button.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase()
      .includes("SET LIFE STAGE NOW")
  );
}

function findSetupCard(preview) {
  const setupCta = findSetupCta(preview);
  return setupCta?.closest?.("section") || null;
}

function getSafeTop(previewRect) {
  const guideNav = document.querySelector(
    "[data-clara-guide-me-target='true'], [data-clara-guide-exit='true']"
  );
  const navBottom = guideNav?.getBoundingClientRect?.().bottom || 0;
  return Math.max(previewRect.top + 12, navBottom + 12, 12);
}

export default function ClaraGuideMePageOverlay({ phase = "me-page-preview" }) {
  const bubbleRef = useRef(null);
  const completionDispatchRef = useRef(false);
  const [top, setTop] = useState(null);
  const [arrowPlacement, setArrowPlacement] = useState("top");
  const copy = COPY[phase] || COPY["me-page-preview"];

  const updatePosition = useCallback(() => {
    const bubble = bubbleRef.current;
    const preview = document.querySelector("[data-clara-guide-me-preview='true']");
    if (!bubble || !preview) return;

    const previewRect = preview.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const setupCard = findSetupCard(preview);
    const padding = 12;
    const gap = 10;
    const safeTop = getSafeTop(previewRect);
    const safeBottom = Math.min(previewRect.bottom, window.innerHeight - padding);
    const maxTop = Math.max(safeTop, safeBottom - bubbleRect.height);

    if (!setupCard) {
      setArrowPlacement("top");
      setTop(safeTop);
      return;
    }

    const cardRect = setupCard.getBoundingClientRect();
    const belowCard = cardRect.bottom + gap;
    const aboveCard = cardRect.top - bubbleRect.height - gap;
    const fitsBelow = belowCard + bubbleRect.height <= safeBottom;
    const fitsAbove = aboveCard >= safeTop;

    if (fitsBelow) {
      setArrowPlacement("top");
      setTop(belowCard);
      return;
    }

    if (fitsAbove) {
      setArrowPlacement("bottom");
      setTop(aboveCard);
      return;
    }

    const distanceBelow = Math.abs(safeBottom - cardRect.bottom);
    const distanceAbove = Math.abs(cardRect.top - safeTop);
    const fallbackTop = distanceBelow >= distanceAbove ? maxTop : safeTop;
    setArrowPlacement(fallbackTop === maxTop ? "top" : "bottom");
    setTop(Math.max(safeTop, Math.min(maxTop, fallbackTop)));
  }, []);

  useLayoutEffect(() => {
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, updatePosition]);

  useEffect(() => {
    completionDispatchRef.current = false;
    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    const preview = document.querySelector("[data-clara-guide-me-preview='true']");
    preview?.addEventListener?.("scroll", handleViewportChange, { passive: true });

    const observer =
      typeof ResizeObserver !== "undefined" && preview
        ? new ResizeObserver(handleViewportChange)
        : null;
    observer?.observe(preview);

    const setupCard = findSetupCard(preview);
    if (setupCard) observer?.observe(setupCard);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      preview?.removeEventListener?.("scroll", handleViewportChange);
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-clara-guide-me-bubble="true"
      className="pointer-events-none fixed left-1/2 z-[95] w-[min(calc(100vw-20px),406px)] -translate-x-1/2 px-2.5"
      style={{ top: top === null ? "calc(100svh - 176px)" : `${top}px` }}
    >
      <div
        ref={bubbleRef}
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-me-page-title"
        className="pointer-events-auto relative mx-auto w-full max-w-[360px] rounded-[24px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-4 py-3.5 text-white shadow-[0_24px_76px_rgba(0,0,0,0.74),0_0_48px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div
          className={`pointer-events-none absolute left-12 h-4 w-4 rotate-45 border-cyan-100/24 bg-[rgba(12,21,49,0.985)] ${
            arrowPlacement === "top"
              ? "-top-2 border-l border-t"
              : "-bottom-2 border-b border-r"
          }`}
        />
        <p
          id="clara-guide-me-page-title"
          className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          {copy.title}
        </p>
        <p className="mt-1.5 text-[11px] font-bold leading-[1.4] text-white">{copy.body}</p>
        <p className="mt-1 text-[10px] font-semibold leading-[1.4] text-white/66">{copy.supporting}</p>
        <div className="mt-2.5 h-px bg-cyan-100/15" />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="max-w-[215px] text-[8px] font-black uppercase leading-[1.35] tracking-[0.07em] text-cyan-100/86">
            {copy.footer}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="min-h-[42px] shrink-0 touch-manipulation rounded-full border border-cyan-100/30 bg-cyan-100/15 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 active:scale-[0.99]"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
