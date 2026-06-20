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

function getDashboardScroller(target) {
  return target?.closest?.("main") || document.scrollingElement || null;
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

    let targetRect = target.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const gap = phase === "preview" ? 16 : 12;
    const safeTop = getSafeTop();
    const safeBottom = window.innerHeight - 12;
    const maxTop = Math.max(safeTop, safeBottom - bubbleRect.height);

    if (phase === "preview") {
      let belowTarget = targetRect.bottom + gap;
      const overflow = belowTarget + bubbleRect.height - safeBottom;

      // The preview explanation belongs after the Learning Hub, never on top of it.
      // Open enough space below the real carousel before positioning the portal.
      if (overflow > 1) {
        const scroller = getDashboardScroller(target);
        if (scroller) {
          const currentScrollTop = Number(scroller.scrollTop) || 0;
          const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          const nextScrollTop = Math.min(
            maxScrollTop,
            currentScrollTop + overflow + 24,
          );

          if (nextScrollTop > currentScrollTop + 1) {
            scroller.scrollTop = nextScrollTop;
            targetRect = target.getBoundingClientRect();
            belowTarget = targetRect.bottom + gap;
          }
        }
      }

      setArrowPlacement("top");
      setTop(Math.max(safeTop, Math.min(maxTop, belowTarget)));
      return;
    }

    const belowTarget = targetRect.bottom + gap;
    const aboveTarget = targetRect.top - bubbleRect.height - gap;

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
      className="pointer-events-none fixed left-1/2 z-[240] w-[min(calc(100vw-48px),360px)] -translate-x-1/2 isolate"
      style={{ top: top === null ? "clamp(116px, 14dvh, 144px)" : `${top}px` }}
    >
      <div
        ref={bubbleRef}
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-learning-hub-title"
        className="pointer-events-auto relative min-h-[150px] rounded-[30px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.98),rgba(10,22,54,0.98)_52%,rgba(27,18,65,0.98))] px-6 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div
          className={`pointer-events-none absolute left-11 h-4 w-4 rotate-45 border-cyan-100/24 bg-[rgba(10,22,54,0.98)] ${
            arrowPlacement === "top"
              ? "-top-2 border-l border-t"
              : "-bottom-2 border-b border-r"
          }`}
        />

        <p
          id="clara-guide-learning-hub-title"
          className="relative z-10 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          {copy.title}
        </p>

        <p className="relative z-10 mt-3 text-[14px] font-bold leading-relaxed text-white">
          {copy.body}
        </p>

        {copy.supporting ? (
          <p className="relative z-10 mt-2 text-[12px] font-semibold leading-relaxed text-white/70">
            {copy.supporting}
          </p>
        ) : null}

        <p className="relative z-10 mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          {copy.footer}
        </p>

        {hasNext ? (
          <button
            type="button"
            data-clara-guide-learning-hub-next="true"
            onClick={onNext}
            className="clara-guide-learning-hub-next pointer-events-auto relative z-20 mt-4 flex min-h-[48px] w-full touch-manipulation select-none cursor-pointer items-center justify-center rounded-full border border-cyan-100/30 bg-[linear-gradient(135deg,rgba(207,250,254,0.18),rgba(103,232,249,0.10)_48%,rgba(129,140,248,0.13))] px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99]"
          >
            NEXT
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
