import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 12;
const DEFAULT_POSITION = {
  top: 0,
  left: VIEWPORT_MARGIN,
  arrowLeft: 40,
  placement: "below",
  isReady: false,
};

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export default function MonthlyCoachingComingSoonPopover({
  isOpen,
  anchorRef,
  onRequestClose,
}) {
  const popoverRef = useRef(null);
  const gotItButtonRef = useRef(null);
  const positionFrameRef = useRef(null);
  const focusFrameRef = useRef(null);
  const [position, setPosition] = useState(DEFAULT_POSITION);

  const measureAndPosition = useCallback(() => {
    const anchorElement = anchorRef.current;
    const popoverElement = popoverRef.current;

    if (!anchorElement || !popoverElement || typeof window === "undefined") {
      return;
    }

    const anchorRect = anchorElement.getBoundingClientRect();
    const popoverRect = popoverElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableBelow =
      viewportHeight - anchorRect.bottom - ANCHOR_GAP - VIEWPORT_MARGIN;
    const availableAbove = anchorRect.top - ANCHOR_GAP - VIEWPORT_MARGIN;
    const placement =
      availableBelow >= popoverRect.height || availableBelow >= availableAbove
        ? "below"
        : "above";
    const preferredTop =
      placement === "below"
        ? anchorRect.bottom + ANCHOR_GAP
        : anchorRect.top - ANCHOR_GAP - popoverRect.height;
    const maximumTop = Math.max(
      VIEWPORT_MARGIN,
      viewportHeight - popoverRect.height - VIEWPORT_MARGIN,
    );
    const top = clamp(preferredTop, VIEWPORT_MARGIN, maximumTop);
    const preferredLeft =
      anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;
    const maximumLeft = Math.max(
      VIEWPORT_MARGIN,
      viewportWidth - popoverRect.width - VIEWPORT_MARGIN,
    );
    const left = clamp(preferredLeft, VIEWPORT_MARGIN, maximumLeft);
    const anchorCenter = anchorRect.left + anchorRect.width / 2;
    const arrowLeft = clamp(
      anchorCenter - left,
      28,
      Math.max(28, popoverRect.width - 28),
    );

    setPosition({
      top,
      left,
      arrowLeft,
      placement,
      isReady: true,
    });
  }, [anchorRef]);

  const schedulePosition = useCallback(() => {
    if (typeof window === "undefined") return;

    if (positionFrameRef.current !== null) {
      window.cancelAnimationFrame(positionFrameRef.current);
    }

    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      measureAndPosition();
    });
  }, [measureAndPosition]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return undefined;

    setPosition(DEFAULT_POSITION);
    schedulePosition();

    const anchorElement = anchorRef.current;
    const popoverElement = popoverRef.current;
    const handlePointerDown = (event) => {
      const target = event.target;

      if (
        popoverRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }

      onRequestClose({ restoreFocus: false });
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      onRequestClose({ restoreFocus: true });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", schedulePosition);
    window.addEventListener("orientationchange", schedulePosition);
    window.addEventListener("scroll", schedulePosition, true);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(schedulePosition);
      if (anchorElement) resizeObserver.observe(anchorElement);
      if (popoverElement) resizeObserver.observe(popoverElement);
    }

    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusFrameRef.current = window.requestAnimationFrame(() => {
        focusFrameRef.current = null;
        gotItButtonRef.current?.focus({ preventScroll: true });
      });
    });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", schedulePosition);
      window.removeEventListener("orientationchange", schedulePosition);
      window.removeEventListener("scroll", schedulePosition, true);
      resizeObserver?.disconnect();

      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }

      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
    };
  }, [anchorRef, isOpen, onRequestClose, schedulePosition]);

  if (!isOpen || typeof document === "undefined") return null;

  const arrowPlacementClass =
    position.placement === "below"
      ? "-top-[7px] border-l border-t"
      : "-bottom-[7px] border-b border-r";

  return createPortal(
    <div
      id="clara-monthly-coaching-notice"
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="clara-monthly-coaching-notice-title"
      className="fixed z-[220] rounded-[24px] border border-cyan-200/30 px-5 py-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.48),0_0_36px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
      style={{
        top: position.top,
        left: position.left,
        width: "min(calc(100vw - 32px), 340px)",
        visibility: position.isReady ? "visible" : "hidden",
        background:
          "linear-gradient(145deg, rgba(4, 16, 36, 0.98), rgba(31, 21, 75, 0.97))",
      }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute h-3.5 w-3.5 rotate-45 border-cyan-200/30 ${arrowPlacementClass}`}
        style={{
          left: position.arrowLeft,
          transform: "translateX(-50%) rotate(45deg)",
          background: "rgba(10, 18, 49, 0.98)",
        }}
      />

      <div className="relative z-10">
        <span className="inline-flex min-h-6 items-center rounded-full border border-cyan-100/25 bg-cyan-300/15 px-2.5 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]">
          UNDER CONSTRUCTION
        </span>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="clara-monthly-coaching-notice-title"
              className="text-[15px] font-black uppercase tracking-[0.08em] text-white"
            >
              MONTHLY COACHING
            </h2>
            <p className="mt-2.5 text-[12px] font-medium leading-[1.65] text-slate-100/82">
              Active members will be able to book one private 30-minute coaching
              session each month, choose an available date and time, and complete
              a short check-in so the coach can prepare.
            </p>
          </div>

          <button
            ref={gotItButtonRef}
            type="button"
            onClick={() => onRequestClose({ restoreFocus: true })}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-cyan-100/25 bg-cyan-300 px-3.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_10px_24px_rgba(34,211,238,0.22)] transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.97]"
          >
            GOT IT
          </button>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-[9px] font-black uppercase leading-relaxed tracking-[0.14em] text-cyan-100/88">
            APPOINTMENT BOOKING IS COMING SOON.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
