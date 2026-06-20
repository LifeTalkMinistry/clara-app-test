import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const COPY = {
  "await-open": {
    title: "LEARNING HUB",
    body: "This is where CLARA turns money lessons into practical learning, games, and guided activities.",
    supporting: "",
    footer: "TAP LEARNING HUB NOW.",
  },
  preview: {
    title: "LEARN • PLAY • APPLY",
    body: "Explore lessons, money games, videos, and practical tools designed to strengthen your financial habits.",
    supporting: "Swipe through the Learning Hub to see what is available.",
    footer: "LEARNING BECOMES POWERFUL WHEN YOU APPLY IT.",
  },
};

const TARGET_SELECTORS = {
  "await-open": "[data-clara-guide-learning-hub-toggle='true']",
  preview: "[data-clara-guide-learning-hub-preview='true']",
};

function getSafeTop() {
  const navTarget = document.querySelector(
    "[data-clara-guide-exit='true'], [data-clara-guide-me-target='true']",
  );
  const navBottom = navTarget?.getBoundingClientRect?.().bottom || 0;
  return Math.max(12, navBottom + 12);
}

export default function ClaraGuideLearningHubOverlay({ phase = "await-open", onNext }) {
  const bubbleRef = useRef(null);
  const [top, setTop] = useState(null);
  const [arrowPlacement, setArrowPlacement] = useState("top");
  const copy = COPY[phase] || COPY["await-open"];
  const hasNext = phase === "preview" && typeof onNext === "function";

  const updatePosition = useCallback(() => {
    const bubble = bubbleRef.current;
    const target = document.querySelector(TARGET_SELECTORS[phase] || TARGET_SELECTORS["await-open"]);
    if (!bubble || !target) return;

    const targetRect = target.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const gap = 12;
    const safeTop = getSafeTop();
    const safeBottom = window.innerHeight - 12;
    const belowTarget = targetRect.bottom + gap;
    const aboveTarget = targetRect.top - bubbleRect.height - gap;
    const maxTop = Math.max(safeTop, safeBottom - bubbleRect.height);

    if (belowTarget + bubbleRect.height <= safeBottom) {
      setArrowPlacement("top");
      setTop(belowTarget);
      return;
    }

    if (aboveTarget >= safeTop) {
      setArrowPlacement("bottom");
      setTop(aboveTarget);
      return;
    }

    const targetCenter = targetRect.top + targetRect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const fallbackTop = targetCenter <= viewportCenter ? maxTop : safeTop;
    setArrowPlacement(fallbackTop === maxTop ? "top" : "bottom");
    setTop(Math.max(safeTop, Math.min(maxTop, fallbackTop)));
  }, [phase]);

  useLayoutEffect(() => {
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [updatePosition]);

  useEffect(() => {
    const handleChange = () => updatePosition();
    window.addEventListener("resize", handleChange);
    window.addEventListener("orientationchange", handleChange);
    window.addEventListener("scroll", handleChange, true);

    const target = document.querySelector(TARGET_SELECTORS[phase] || TARGET_SELECTORS["await-open"]);
    const observer =
      typeof ResizeObserver !== "undefined" && target
        ? new ResizeObserver(handleChange)
        : null;
    if (target) observer?.observe(target);
    if (bubbleRef.current) observer?.observe(bubbleRef.current);

    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("orientationchange", handleChange);
      window.removeEventListener("scroll", handleChange, true);
      observer?.disconnect();
    };
  }, [phase, updatePosition]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-clara-guide-learning-hub-bubble="true"
      className="pointer-events-none fixed left-1/2 z-[165] w-[min(calc(100vw-24px),390px)] -translate-x-1/2 px-2"
      style={{ top: top === null ? "clamp(116px, 14dvh, 144px)" : `${top}px` }}
    >
      <div
        ref={bubbleRef}
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-learning-hub-title"
        className="pointer-events-auto relative mx-auto w-full max-w-[360px] rounded-[26px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-5 py-4 text-white shadow-[0_24px_76px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div
          className={`pointer-events-none absolute left-12 h-4 w-4 rotate-45 border-cyan-100/24 bg-[rgba(12,21,49,0.985)] ${
            arrowPlacement === "top"
              ? "-top-2 border-l border-t"
              : "-bottom-2 border-b border-r"
          }`}
        />

        <p
          id="clara-guide-learning-hub-title"
          className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          {copy.title}
        </p>
        <p className="mt-2 text-[12px] font-bold leading-[1.5] text-white">{copy.body}</p>
        {copy.supporting ? (
          <p className="mt-1.5 text-[11px] font-semibold leading-[1.5] text-white/68">
            {copy.supporting}
          </p>
        ) : null}
        <div className="mt-3 h-px bg-cyan-100/15" />
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="max-w-[230px] text-[8px] font-black uppercase leading-[1.45] tracking-[0.07em] text-cyan-100/88">
            {copy.footer}
          </p>
          {hasNext ? (
            <button
              type="button"
              onClick={onNext}
              className="clara-guide-learning-hub-next min-h-[42px] shrink-0 touch-manipulation rounded-full border border-cyan-100/30 bg-cyan-100/15 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 active:scale-[0.99]"
            >
              NEXT
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
