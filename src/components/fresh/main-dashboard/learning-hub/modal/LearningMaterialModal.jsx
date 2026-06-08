import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const SWIPE_THRESHOLD = 50;
const PDF_MAX_WIDTH = 720;

const resolvePublicAssetUrl = (assetPath) => {
  const normalizedPath = assetPath.trim().replace(/^\/+/, "");
  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return `${normalizedBaseUrl}${normalizedPath}`;
};

export default function LearningMaterialModal({ isOpen, material, onClose }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfStatus, setPdfStatus] = useState("idle");
  const [pdfError, setPdfError] = useState(null);
  const [pdfReloadKey, setPdfReloadKey] = useState(0);
  const [pdfRenderWidth, setPdfRenderWidth] = useState(0);
  const touchStartRef = useRef({ x: null, y: null });
  const scrollContainerRef = useRef(null);
  const pdfViewportRef = useRef(null);

  const legacyPages = Array.isArray(material?.pages) ? material.pages : [];
  const hasPdf =
    typeof material?.pdfPath === "string" &&
    material.pdfPath.trim().length > 0;
  const pdfUrl = hasPdf ? resolvePublicAssetUrl(material.pdfPath) : "";
  const pageCount = hasPdf ? pdfPageCount : legacyPages.length;
  const safePageIndex = pageCount > 0 ? Math.min(pageIndex, pageCount - 1) : 0;
  const currentPage = legacyPages[safePageIndex] ?? null;
  const canNavigate =
    pageCount > 0 && (!hasPdf || pdfStatus === "ready");
  const progress =
    canNavigate && pageCount > 0
      ? ((safePageIndex + 1) / pageCount) * 100
      : 0;
  const isFirstPage = safePageIndex === 0;
  const isFinalPage = pageCount > 0 && safePageIndex === pageCount - 1;
  const showFinishReading = canNavigate && isFinalPage;
  const titleId = "clara-learning-reader-title";
  const pageCounter =
    hasPdf && pdfStatus !== "ready"
      ? "— / —"
      : `${pageCount > 0 ? safePageIndex + 1 : 0} / ${pageCount}`;

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  const goNext = useCallback(() => {
    if (!canNavigate || pageCount === 0) return;

    setPageIndex((currentIndex) =>
      Math.min(currentIndex + 1, pageCount - 1),
    );
  }, [canNavigate, pageCount]);

  const goPrevious = useCallback(() => {
    if (!canNavigate) return;

    setPageIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }, [canNavigate]);

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

  const handlePdfLoadSuccess = useCallback(
    ({ numPages }) => {
      const nextPageCount = Number.isFinite(numPages)
        ? Math.max(0, Math.trunc(numPages))
        : 0;

      if (nextPageCount === 0) {
        setPdfPageCount(0);
        setPageIndex(0);
        setPdfStatus("error");
        setPdfError("Check the PDF file and try again.");
        return;
      }

      setPdfPageCount(nextPageCount);
      setPageIndex((currentIndex) =>
        Math.min(Math.max(currentIndex, 0), nextPageCount - 1),
      );
      setPdfStatus("ready");
      setPdfError(null);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handlePdfLoadError = useCallback(() => {
    setPdfPageCount(0);
    setPageIndex(0);
    setPdfStatus("error");
    setPdfError("Check the PDF file and try again.");
  }, []);

  const retryPdf = useCallback(() => {
    setPageIndex(0);
    setPdfPageCount(0);
    setPdfError(null);
    setPdfStatus("loading");
    setPdfReloadKey((currentKey) => currentKey + 1);
    scrollToTop();
  }, [scrollToTop]);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return undefined;
    }

    setPageIndex(0);
    setPdfPageCount(0);
    setPdfStatus(hasPdf ? "loading" : "idle");
    setPdfError(null);
    setPdfReloadKey(0);
    setPdfRenderWidth(0);
    setIsVisible(false);
    scrollToTop();

    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [hasPdf, isOpen, material?.id, material?.pdfPath, scrollToTop]);

  useEffect(() => {
    setPageIndex((currentIndex) => {
      if (pageCount === 0) return 0;
      return Math.min(currentIndex, pageCount - 1);
    });
  }, [pageCount, material?.id, material?.pdfPath]);

  useEffect(() => {
    if (!isOpen || !hasPdf || typeof window === "undefined") {
      return undefined;
    }

    const viewport = pdfViewportRef.current;
    if (!viewport) return undefined;

    const measureViewport = () => {
      const availableWidth = Math.floor(viewport.getBoundingClientRect().width);
      const nextWidth =
        availableWidth > 0 ? Math.min(availableWidth, PDF_MAX_WIDTH) : 0;

      setPdfRenderWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    const animationFrame = window.requestAnimationFrame(measureViewport);
    let resizeObserver = null;

    if (typeof window.ResizeObserver === "function") {
      resizeObserver = new window.ResizeObserver(measureViewport);
      resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", measureViewport);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();

      if (!resizeObserver) {
        window.removeEventListener("resize", measureViewport);
      }
    };
  }, [hasPdf, isOpen, material?.id, material?.pdfPath]);

  useEffect(() => {
    if (!isOpen) return;
    scrollToTop();
  }, [
    isOpen,
    material?.id,
    material?.pdfPath,
    pdfReloadKey,
    safePageIndex,
    scrollToTop,
  ]);

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
            {pageCounter}
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
          ref={scrollContainerRef}
          className="h-full touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain px-5 sm:px-8"
          style={{ WebkitOverflowScrolling: "touch" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={clearTouchStart}
        >
          {hasPdf ? (
            <div className="mx-auto flex min-h-full w-full max-w-[720px] items-start justify-center py-6 sm:py-10">
              <section
                ref={pdfViewportRef}
                aria-label={
                  pdfStatus === "ready" && pageCount > 0
                    ? `Page ${safePageIndex + 1} of ${pageCount} of ${material.title}`
                    : `PDF reader for ${material.title}`
                }
                className={`w-full transition-[opacity,transform] duration-300 ease-out ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
              >
                {pdfStatus !== "error" ? (
                  <>
                    <Document
                      key={`${pdfUrl}-${pdfReloadKey}`}
                      file={pdfUrl}
                      onLoadSuccess={handlePdfLoadSuccess}
                      onLoadError={handlePdfLoadError}
                      onSourceError={handlePdfLoadError}
                      loading={null}
                      error={null}
                      noData={null}
                      className="flex w-full justify-center"
                    >
                      {pdfStatus === "ready" &&
                      pdfPageCount > 0 &&
                      pdfRenderWidth > 0 ? (
                        <Page
                          pageNumber={safePageIndex + 1}
                          width={pdfRenderWidth}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          onLoadError={handlePdfLoadError}
                          onRenderError={handlePdfLoadError}
                          loading={
                            <div
                              role="status"
                              aria-live="polite"
                              className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 text-center"
                            >
                              <div className="h-9 w-9 animate-pulse rounded-full border border-cyan-200/25 bg-cyan-300/10" />
                              <p className="text-sm font-medium text-white/65">
                                Preparing your page...
                              </p>
                            </div>
                          }
                          error={null}
                          className="mx-auto overflow-hidden rounded-[10px] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.32)]"
                        />
                      ) : null}
                    </Document>

                    {(pdfStatus === "idle" ||
                      pdfStatus === "loading" ||
                      (pdfStatus === "ready" && pdfRenderWidth === 0)) && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 text-center"
                      >
                        <div className="h-9 w-9 animate-pulse rounded-full border border-cyan-200/25 bg-cyan-300/10" />
                        <div>
                          <p className="text-sm font-semibold text-white/75">
                            Preparing your book...
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            CLARA is setting up your reading page.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    role="alert"
                    className="flex min-h-[50vh] w-full flex-col items-center justify-center text-center"
                  >
                    <div className="max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-7 backdrop-blur-md">
                      <h3 className="text-base font-semibold text-white/90">
                        This book could not be opened.
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/55">
                        {pdfError ?? "Check the PDF file and try again."}
                      </p>
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={retryPdf}
                          className="min-h-11 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={closeReader}
                          className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-medium text-white/75 transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : (
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
          )}
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
            disabled={!canNavigate || isFirstPage}
            aria-label="Go to previous page"
            className="inline-flex min-h-12 min-w-[112px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/75 backdrop-blur-md transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white/[0.05]"
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.8} />
            Back
          </button>

          {showFinishReading ? (
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
              disabled={!canNavigate}
              aria-label="Go to next page"
              className="inline-flex min-h-12 min-w-[112px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/[0.15] bg-cyan-300/[0.09] px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-cyan-300/[0.09]"
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
