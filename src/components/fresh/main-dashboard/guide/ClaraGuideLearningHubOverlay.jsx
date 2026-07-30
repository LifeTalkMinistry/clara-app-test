import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const COPY = {
  title: "LEARNING HUB",
  body: "This is where CLARA turns money lessons into practical learning, games, and guided activities.",
  footer: "TAP LEARNING HUB NOW.",
};

const TARGET_SELECTOR = "[data-clara-guide-learning-hub-toggle='true']";

function getSafeTop() {
  const navTarget = document.querySelector(
    "[data-clara-guide-exit='true'], [data-clara-guide-me-target='true']",
  );
  const navBottom = navTarget?.getBoundingClientRect?.().bottom || 0;
  return Math.max(12, navBottom + 12);
}

export default function ClaraGuideLearningHubOverlay({ phase = "await-open" }) {
  const bubbleRef = useRef(null);
  const positionFrameRef = useRef(null);
  const [top, setTop] = useState(null);
  const [arrowPlacement, setArrowPlacement] = useState("top");

  const commitPosition = useCallback((nextTop, nextArrowPlacement) => {
    setTop((currentTop) =>
      currentTop !== null && Math.abs(currentTop - nextTop) < 0.5
        ? currentTop
        : nextTop,
    );
    setArrowPlacement((currentPlacement) =>
      currentPlacement === nextArrowPlacement
        ? currentPlacement
        : nextArrowPlacement,
    );
  }, []);

  const updatePosition = useCallback(() => {
    if (phase !== "await-open") return;

    const bubble = bubbleRef.current;
    const target = document.querySelector(TARGET_SELECTOR);
    if (!bubble || !target) return;

    const targetRect = target.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const gap = 12;
    const safeTop = getSafeTop();
    const safeBottom = window.innerHeight - 12;
    const maxTop = Math.max(safeTop, safeBottom - bubbleRect.height);
    const belowTarget = targetRect.bottom + gap;
    const aboveTarget = targetRect.top - bubbleRect.height - gap;

    if (belowTarget + bubbleRect.height <= safeBottom) {
      commitPosition(belowTarget, "top");
      return;
    }

    if (aboveTarget >= safeTop) {
      commitPosition(aboveTarget, "bottom");
      return;
    }

    const targetCenter = targetRect.top + targetRect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const fallbackTop = targetCenter <= viewportCenter ? maxTop : safeTop;
    const boundedTop = Math.max(safeTop, Math.min(maxTop, fallbackTop));
    commitPosition(boundedTop, fallbackTop === maxTop ? "top" : "bottom");
  }, [commitPosition, phase]);

  const schedulePositionUpdate = useCallback(() => {
    if (phase !== "await-open" || typeof window === "undefined") return;
    if (positionFrameRef.current) return;

    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      updatePosition();
    });
  }, [phase, updatePosition]);

  useLayoutEffect(() => {
    if (phase !== "await-open") return undefined;

    updatePosition();
    schedulePositionUpdate();

    return () => {
      if (positionFrameRef.current) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [phase, schedulePositionUpdate, updatePosition]);

  useEffect(() => {
    if (phase !== "await-open") return undefined;

    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("orientationchange", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);

    const target = document.querySelector(TARGET_SELECTOR);
    const observer =
      typeof ResizeObserver !== "undefined" && target
        ? new ResizeObserver(schedulePositionUpdate)
        : null;
    if (target) observer?.observe(target);
    if (bubbleRef.current) observer?.observe(bubbleRef.current);

    return () => {
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("orientationchange", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      observer?.disconnect();

      if (positionFrameRef.current) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [phase, schedulePositionUpdate]);

  if (phase !== "await-open" || typeof document === "undefined") return null;

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
          {COPY.title}
        </p>

        <p className="relative z-10 mt-3 text-[14px] font-bold leading-relaxed text-white">
          {COPY.body}
        </p>

        <p className="relative z-10 mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          {COPY.footer}
        </p>
      </div>
    </div>,
    document.body,
  );
}
