import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLARA_GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const CLARA_GUIDE_ME_PHASE_REQUEST_EVENT = "clara:guide-me-phase-request";
const GUIDE_FEATURE_ME_PAGE = "me-page";

const COPY = {
  "me-page-preview": {
    title: "WHY ME MATTERS",
    body: "The same amount of money can mean something different depending on your responsibilities and current life stage.",
    supporting: "",
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
  const markedCard = preview?.querySelector?.("[data-clara-life-stage-setup-card='true']");
  if (markedCard) return markedCard;

  const setupCta = findSetupCta(preview);
  return setupCta?.closest?.("section") || null;
}

function getSafeTop(previewRect) {
  const guideNav = document.querySelector(
    "[data-clara-guide-me-target='true'], [data-clara-guide-exit='true']"
  );
  const navBottom = guideNav?.getBoundingClientRect?.().bottom || 0;
  return Math.max(previewRect.top + 10, navBottom + 10, 10);
}

export default function ClaraGuideMePageOverlay({ phase = "me-page-preview" }) {
  const bubbleRef = useRef(null);
  const completionDispatchRef = useRef(false);
  const reservedTopFrameRef = useRef(null);
  const reservedTopSettleFrameRef = useRef(null);
  const [top, setTop] = useState(null);
  const [arrowPlacement, setArrowPlacement] = useState("bottom");
  const copy = COPY[phase] || COPY["me-page-preview"];

  const scheduleReservedTopUpdate = useCallback(() => {
    if (reservedTopFrameRef.current !== null) {
      window.cancelAnimationFrame(reservedTopFrameRef.current);
    }
    if (reservedTopSettleFrameRef.current !== null) {
      window.cancelAnimationFrame(reservedTopSettleFrameRef.current);
    }

    reservedTopFrameRef.current = window.requestAnimationFrame(() => {
      reservedTopFrameRef.current = null;
      reservedTopSettleFrameRef.current = window.requestAnimationFrame(() => {
        reservedTopSettleFrameRef.current = null;

        const bubble = bubbleRef.current;
        const preview = document.querySelector("[data-clara-guide-me-preview='true']");
        if (!bubble || !preview) return;

        const previewRect = preview.getBoundingClientRect();
        const bubbleRect = bubble.getBoundingClientRect();
        const reservedTop = Math.max(0, bubbleRect.bottom - previewRect.top + 16);

        preview.style.setProperty(
          "--clara-me-guide-reserved-top",
          `${reservedTop}px`
        );
      });
    });
  }, []);

  const updatePosition = useCallback(() => {
    const bubble = bubbleRef.current;
    const preview = document.querySelector("[data-clara-guide-me-preview='true']");
    if (!bubble || !preview) return;

    const previewRect = preview.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const setupCard = findSetupCard(preview);
    const padding = 10;
    const safeTop = getSafeTop(previewRect);
    const safeBottom = Math.min(previewRect.bottom, window.innerHeight - padding);
    const availableHeight = Math.max(0, safeBottom - safeTop);

    // The setup card now reserves the bubble's measured footprint, so the
    // bubble can stay safely below the Guide navigation without chasing the
    // card while the preview scrolls.
    const nextTop =
      availableHeight >= bubbleRect.height
        ? safeTop
        : Math.max(safeTop, safeBottom - bubbleRect.height);

    setArrowPlacement(setupCard ? "bottom" : "top");
    setTop(nextTop);
    scheduleReservedTopUpdate();
  }, [scheduleReservedTopUpdate]);

  useLayoutEffect(() => {
    updatePosition();
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
      scheduleReservedTopUpdate();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase, scheduleReservedTopUpdate, updatePosition]);

  useEffect(() => {
    completionDispatchRef.current = false;
    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    const preview = document.querySelector("[data-clara-guide-me-preview='true']");
    const observer =
      typeof ResizeObserver !== "undefined" && preview
        ? new ResizeObserver(handleViewportChange)
        : null;
    observer?.observe(preview);

    const setupCard = findSetupCard(preview);
    if (setupCard) observer?.observe(setupCard);
    if (bubbleRef.current) observer?.observe(bubbleRef.current);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      observer?.disconnect();
    };
  }, [phase, updatePosition]);

  useEffect(
    () => () => {
      if (reservedTopFrameRef.current !== null) {
        window.cancelAnimationFrame(reservedTopFrameRef.current);
      }
      if (reservedTopSettleFrameRef.current !== null) {
        window.cancelAnimationFrame(reservedTopSettleFrameRef.current);
      }

      const preview = document.querySelector("[data-clara-guide-me-preview='true']");
      preview?.style.removeProperty("--clara-me-guide-reserved-top");
    },
    []
  );

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
      className="pointer-events-none fixed left-1/2 z-[95] w-[min(calc(100vw-16px),414px)] -translate-x-1/2 px-2"
      style={{ top: top === null ? "clamp(108px, 13dvh, 124px)" : `${top}px` }}
    >
      <div
        ref={bubbleRef}
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-me-page-title"
        className="pointer-events-auto relative mx-auto w-full max-w-[372px] rounded-[22px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-3.5 py-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.68),0_0_38px_rgba(34,211,238,0.16)] backdrop-blur-2xl"
      >
        <div
          data-clara-guide-me-arrow="true"
          className={`pointer-events-none absolute left-[42px] h-3.5 w-3.5 rotate-45 border-cyan-100/24 bg-[rgba(12,21,49,0.985)] ${
            arrowPlacement === "top"
              ? "-top-[7px] border-l border-t"
              : "-bottom-[7px] border-b border-r"
          }`}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          <div className="min-w-0">
            <p
              id="clara-guide-me-page-title"
              className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-100"
            >
              {copy.title}
            </p>
            <p
              data-clara-guide-me-body="true"
              className="mt-1 text-[10px] font-bold leading-[1.3] text-white"
            >
              {copy.body}
            </p>

            {copy.supporting ? (
              <p
                data-clara-guide-me-supporting="true"
                className="mt-0.5 text-[9px] font-semibold leading-[1.3] text-white/66"
              >
                {copy.supporting}
              </p>
            ) : null}
          </div>

          <button
            data-clara-guide-me-next="true"
            type="button"
            onClick={handleNext}
            className="min-h-[38px] shrink-0 touch-manipulation rounded-full border border-cyan-100/30 bg-cyan-100/15 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_10px_28px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 active:scale-[0.99]"
          >
            NEXT
          </button>

          <div data-clara-guide-me-footer-row="true" className="col-span-2">
            <div data-clara-guide-me-divider="true" className="mt-2 h-px bg-cyan-100/15" />
            <p
              data-clara-guide-me-footer="true"
              className="mt-2 text-[7px] font-black uppercase leading-[1.25] tracking-[0.06em] text-cyan-100/86"
            >
              {copy.footer}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
