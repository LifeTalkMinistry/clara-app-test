import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";

const SWIPE_THRESHOLD = 50;

export default function LearningMaterialModal({ isOpen, material, onClose }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const touchStartRef = useRef({ x: null, y: null });

  const pages = Array.isArray(material?.pages) ? material.pages : [];
  const pageCount = pages.length;
  const safePageIndex = pageCount > 0 ? Math.min(pageIndex, pageCount - 1) : 0;
  const currentPage = pages[safePageIndex] ?? null;
  const progress = pageCount > 0 ? ((safePageIndex + 1) / pageCount) * 100 : 0;
  const isFirstPage = safePageIndex === 0;
  const isFinalPage = pageCount === 0 || safePageIndex === pageCount - 1;
  const titleId = "clara-learning-reader-title";

  const goNext = useCallback(() => {
    if (pageCount === 0) return;

    setPageIndex((currentIndex) =>
      Math.min(currentIndex + 1, pageCount - 1),
    );
  }, [pageCount]);

  const goPrevious = useCallback(() => {
    setPageIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }, []);

  const closeReader = useCallback(() => {
    setPageIndex(0);
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  const finishReading = useCallback(() => {
    setPageIndex(0);
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return undefined;
    }

    setPageIndex(0);
    setIsVisible(false);

    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isOpen, material?.id]);

  useEffect(() => {
    setPageIndex((currentIndex) => {
      if (pageCount === 0) return 0;
      return Math.min(currentIndex, pageCount - 1);
    });
  }, [pageCount, material?.id]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeReader();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeReader, goNext, goPrevious, isOpen]);

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const clearTouchStart = () => {
    touchStartRef.current = { x: null, y: null };
  };

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches?.[0];
    const { x: startX, y: startY } = touchStartRef.current;

    clearTouchStart();

    if (!touch || startX === null || startY === null) return;

    const horizontalDistance = touch.clientX - startX;
    const verticalDistance = touch.clientY - startY;
    const isHorizontalGesture =
      Math.abs(horizontalDistance) > Math.abs(verticalDistance);

    if (
      !isHorizontalGesture ||
      Math.abs(horizontalDistance) < SWIPE_THRESHOLD
    ) {
      return;
    }

    if (horizontalDistance < 0) {
      goNext();
      return;
    }

    goPrevious();
  };

  if (!isOpen || !material || typeof document === "undefined") {
    return null;
  }

  const readerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={material.title ? titleId : undefined}
      aria-label={material.title ? undefined : "CLARA Learning Hub reader"}
      className="fixed inset-0 z-[9999] isolate flex h-[100dvh] min-h-[100svh] w-screen flex-col overflow-hidden bg-[#050814] text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-500/[0.09] blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/[0.30] via-slate-950/[0.35] to-black/[0.45]" />
      </div>

      <header
        className="relative z-10 shrink-0 px-4 sm:px-6"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="mx-auto grid w-full max-w-4xl grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-2">
          <button
            type="button"
            onClick={closeReader}
            aria-label="Close reader"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/75 backdrop-blur-md transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <X aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>

          <h2
            id={titleId}
            className="truncate px-2 text-center text-sm font-semibold tracking-[0.01em] text-white/[0.85] sm:text-[15px]"
          >
            {material.title}
          </h2>

          <p className="text-right text-xs font-medium tabular-nums text-white/50 sm:text-sm">
            {pageCount > 0 ? safePageIndex + 1 : 0} / {pageCount}
          </p>
        </div>

        <div className="mx-auto mt-3 h-[2px] w-full max-w-4xl overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-400 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div
          className="h-full touch-pan-y overflow-y-auto overscroll-contain px-5 sm:px-8"
          style={{ WebkitOverflowScrolling: "touch" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={clearTouchStart}
        >
          <div className="mx-auto flex min-h-full w-full max-w-[600px] items-start py-[clamp(2.5rem,10vh,5.5rem)]">
            <article
              aria-live="polite"
              className={`w-full transition-[opacity,transform] duration-300 ease-out ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              }`}
            >
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/[0.55] sm:text-[11px]">
                CLARA Learning Hub
              </p>

              <h3 className="mb-5 text-sm font-bold uppercase tracking-[0.12em] text-white/90 sm:text-[15px]">
                {currentPage?.title ??
                  (pageCount > 0 ? "Lesson" : "Lesson unavailable")}
              </h3>

              <div className="max-w-[58ch] whitespace-pre-line text-[17px] leading-[1.75] text-white/[0.82] sm:text-lg sm:leading-[1.8]">
                {currentPage?.body ??
                  "This lesson does not have readable pages available yet."}
              </div>
            </article>
          </div>
        </div>
      </main>

      <footer
        className="relative z-10 shrink-0 border-t border-white/[0.06] bg-slate-950/[0.45] px-4 pt-3 backdrop-blur-xl sm:px-6"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-[640px] items-center justify-between gap-4">
          <button
            type="button"
            onClick={goPrevious}
            disabled={isFirstPage || pageCount === 0}
            aria-label="Go to previous page"
            className="inline-flex min-h-12 min-w-[112px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/75 backdrop-blur-md transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white/[0.05]"
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.8} />
            Back
          </button>

          {isFinalPage ? (
            <button
              type="button"
              onClick={finishReading}
              aria-label="Finish reading and close reader"
              className="inline-flex min-h-12 min-w-[154px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.12)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Finish Reading
              <Check aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              aria-label="Go to next page"
              className="inline-flex min-h-12 min-w-[112px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/[0.15] bg-cyan-300/[0.09] px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Next
              <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );

  return createPortal(readerContent, document.body);
}
