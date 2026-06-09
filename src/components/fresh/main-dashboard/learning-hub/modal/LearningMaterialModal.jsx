import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Minimize2,
  MoreHorizontal,
  X,
  ZoomIn,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_DELAY = 300;
const TAP_MOVE_TOLERANCE = 12;
const PDF_MAX_WIDTH = 1040;
const PDF_COMFORTABLE_FIT_HEIGHT_RATIO = 0.78;
const PDF_NARROW_SCREEN_MAX_OVERSIZE = 1.06;
const PDF_NARROW_SCREEN_BREAKPOINT = 640;
const PDF_READING_ZOOM_MULTIPLIER = 1.75;
const PDF_ZOOM_MAX_WIDTH = 1800;

const resolvePublicAssetUrl = (assetPath) => {
  const normalizedPath = assetPath.trim().replace(/^\/+/, "");
  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return `${normalizedBaseUrl}${normalizedPath}`;
};

const validatePdfParts = (pdfParts, declaredTotalPages) => {
  if (!Array.isArray(pdfParts) || pdfParts.length === 0) {
    return { isValid: false, parts: [], totalPages: 0 };
  }

  const parts = pdfParts.map((part) => ({
    id: typeof part?.id === "string" ? part.id.trim() : "",
    path: typeof part?.path === "string" ? part.path.trim() : "",
    startPage: Number(part?.startPage),
    endPage: Number(part?.endPage),
    expectedPageCount: Number(part?.expectedPageCount),
  }));

  const hasInvalidEntry = parts.some((part) => {
    const mappedPageCount = part.endPage - part.startPage + 1;

    return (
      !part.id ||
      !part.path ||
      !Number.isInteger(part.startPage) ||
      !Number.isInteger(part.endPage) ||
      !Number.isInteger(part.expectedPageCount) ||
      part.startPage < 1 ||
      part.endPage < part.startPage ||
      part.expectedPageCount < 1 ||
      mappedPageCount !== part.expectedPageCount
    );
  });

  if (hasInvalidEntry) {
    return { isValid: false, parts: [], totalPages: 0 };
  }

  const hasNonContiguousRange = parts.some((part, index) => {
    if (index === 0) return part.startPage !== 1;
    return part.startPage !== parts[index - 1].endPage + 1;
  });

  const totalPages = Number(declaredTotalPages);
  const lastPart = parts[parts.length - 1];

  if (
    hasNonContiguousRange ||
    !Number.isInteger(totalPages) ||
    totalPages < 1 ||
    lastPart.endPage !== totalPages
  ) {
    return { isValid: false, parts: [], totalPages: 0 };
  }

  return { isValid: true, parts, totalPages };
};

const findPartForGlobalPage = (parts, globalPageIndex) => {
  const visiblePageNumber = globalPageIndex + 1;

  return parts.findIndex(
    (part) =>
      visiblePageNumber >= part.startPage &&
      visiblePageNumber <= part.endPage,
  );
};

const getLocalPageNumber = (globalPageIndex, part) => {
  if (!part) return 1;
  return globalPageIndex + 2 - part.startPage;
};

export default function LearningMaterialModal({ isOpen, material, onClose }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [pendingGlobalPageIndex, setPendingGlobalPageIndex] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfStatus, setPdfStatus] = useState("idle");
  const [pdfError, setPdfError] = useState(null);
  const [pdfReloadKey, setPdfReloadKey] = useState(0);
  const [pdfRenderWidth, setPdfRenderWidth] = useState(0);
  const [pdfPageAspectRatio, setPdfPageAspectRatio] = useState(0);
  const [isReaderMenuOpen, setIsReaderMenuOpen] = useState(false);
  const [isPdfZoomed, setIsPdfZoomed] = useState(false);
  const touchStartRef = useRef({ x: null, y: null });
  const lastPdfTapTimeRef = useRef(0);
  const ignoreDoubleClickUntilRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const pdfViewportRef = useRef(null);
  const activeLoadTokenRef = useRef("");
  const isOpenRef = useRef(isOpen);
  const transitionLockRef = useRef(false);

  isOpenRef.current = isOpen;

  const legacyPages = Array.isArray(material?.pages) ? material.pages : [];
  const pdfPartsManifest = useMemo(
    () => validatePdfParts(material?.pdfParts, material?.totalPages),
    [material?.pdfParts, material?.totalPages],
  );
  const hasMultiPartPdf = pdfPartsManifest.isValid;
  const hasSinglePdf =
    !hasMultiPartPdf &&
    typeof material?.pdfPath === "string" &&
    material.pdfPath.trim().length > 0;
  const hasPdf = hasMultiPartPdf || hasSinglePdf;
  const pdfParts = pdfPartsManifest.parts;
  const multiPartTotalPages = pdfPartsManifest.totalPages;
  const activePart = hasMultiPartPdf
    ? pdfParts[activePartIndex] ?? pdfParts[0] ?? null
    : null;
  const activePdfPath = hasMultiPartPdf
    ? activePart?.path ?? ""
    : hasSinglePdf
      ? material.pdfPath
      : "";
  const pdfUrl = hasPdf ? resolvePublicAssetUrl(activePdfPath) : "";
  const pageCount = hasMultiPartPdf
    ? multiPartTotalPages
    : hasSinglePdf
      ? pdfPageCount
      : legacyPages.length;
  const safePageIndex = pageCount > 0 ? Math.min(pageIndex, pageCount - 1) : 0;
  const currentPage = legacyPages[safePageIndex] ?? null;
  const localPdfPageNumber = hasMultiPartPdf
    ? getLocalPageNumber(safePageIndex, activePart)
    : safePageIndex + 1;
  const isBoundaryTransition =
    hasMultiPartPdf && pendingGlobalPageIndex !== null;
  const canNavigate =
    pageCount > 0 &&
    (!hasPdf ||
      (pdfStatus === "ready" && pendingGlobalPageIndex === null));
  const canTogglePdfZoom =
    hasPdf &&
    pdfStatus === "ready" &&
    pdfRenderWidth > 0 &&
    !isBoundaryTransition;
  const activePdfRenderWidth = isPdfZoomed
    ? Math.min(
        Math.round(pdfRenderWidth * PDF_READING_ZOOM_MULTIPLIER),
        PDF_ZOOM_MAX_WIDTH,
      )
    : pdfRenderWidth;
  const progress =
    pageCount > 0 &&
    (!hasPdf ||
      pdfStatus === "ready" ||
      isBoundaryTransition ||
      pdfStatus === "error")
      ? ((safePageIndex + 1) / pageCount) * 100
      : 0;
  const isFirstPage = safePageIndex === 0;
  const isFinalPage = pageCount > 0 && safePageIndex === pageCount - 1;
  const showFinishReading = canNavigate && isFinalPage;
  const titleId = "clara-learning-reader-title";
  const isInitialPdfLoad =
    hasPdf &&
    pdfStatus !== "ready" &&
    !isBoundaryTransition &&
    pdfPageCount === 0;
  const pageCounter = isInitialPdfLoad
    ? "— / —"
    : `${pageCount > 0 ? safePageIndex + 1 : 0} / ${pageCount}`;
  const pdfPartsSignature = hasMultiPartPdf
    ? pdfParts
        .map(
          (part) =>
            `${part.id}:${part.path}:${part.startPage}:${part.endPage}:${part.expectedPageCount}`,
        )
        .join("|")
    : "";
  const pdfSourceSignature = hasMultiPartPdf
    ? `parts:${pdfPartsSignature}:${multiPartTotalPages}`
    : hasSinglePdf
      ? `single:${material.pdfPath.trim()}`
      : "text";
  const activeDocumentKey = `${material?.id ?? "material"}:${pdfUrl}:${pdfReloadKey}`;

  activeLoadTokenRef.current = activeDocumentKey;

  const clearTouchTracking = useCallback(() => {
    touchStartRef.current = { x: null, y: null };
  }, []);

  const clearTapTracking = useCallback(() => {
    lastPdfTapTimeRef.current = 0;
    ignoreDoubleClickUntilRef.current = 0;
  }, []);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  const syncPdfScrollPosition = useCallback((centerHorizontally) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: 0,
      left: centerHorizontally
        ? Math.max(0, (container.scrollWidth - container.clientWidth) / 2)
        : 0,
      behavior: "auto",
    });
  }, []);

  const resetReaderState = useCallback(() => {
    setPageIndex(0);
    setActivePartIndex(0);
    setPendingGlobalPageIndex(null);
    setPdfPageCount(0);
    setPdfStatus("idle");
    setPdfError(null);
    setPdfReloadKey(0);
    setPdfRenderWidth(0);
    setPdfPageAspectRatio(0);
    setIsReaderMenuOpen(false);
    setIsPdfZoomed(false);
    clearTouchTracking();
    clearTapTracking();
    transitionLockRef.current = false;
  }, [clearTapTracking, clearTouchTracking]);

  const togglePdfZoom = useCallback(() => {
    if (!canTogglePdfZoom || isReaderMenuOpen) return;

    clearTouchTracking();
    lastPdfTapTimeRef.current = 0;
    setIsPdfZoomed((currentZoomed) => !currentZoomed);
  }, [canTogglePdfZoom, clearTouchTracking, isReaderMenuOpen]);

  const navigateToGlobalPage = useCallback(
    (targetGlobalPageIndex) => {
      if (
        !canNavigate ||
        transitionLockRef.current ||
        targetGlobalPageIndex < 0 ||
        targetGlobalPageIndex >= pageCount ||
        targetGlobalPageIndex === safePageIndex
      ) {
        return;
      }

      if (hasPdf) {
        setIsPdfZoomed(false);
        clearTouchTracking();
        clearTapTracking();
      }

      if (!hasMultiPartPdf) {
        setPageIndex(targetGlobalPageIndex);
        return;
      }

      const targetPartIndex = findPartForGlobalPage(
        pdfParts,
        targetGlobalPageIndex,
      );

      if (targetPartIndex < 0) {
        setIsPdfZoomed(false);
        setPdfStatus("error");
        setPdfError("This section of the book is not configured correctly.");
        return;
      }

      if (targetPartIndex === activePartIndex) {
        setPageIndex(targetGlobalPageIndex);
        return;
      }

      transitionLockRef.current = true;
      setIsPdfZoomed(false);
      setPendingGlobalPageIndex(targetGlobalPageIndex);
      setActivePartIndex(targetPartIndex);
      setPdfPageCount(0);
      setPdfError(null);
      setPdfStatus("loading");
      scrollToTop();
    },
    [
      activePartIndex,
      canNavigate,
      clearTapTracking,
      clearTouchTracking,
      hasMultiPartPdf,
      hasPdf,
      pageCount,
      pdfParts,
      safePageIndex,
      scrollToTop,
    ],
  );

  const goNext = useCallback(() => {
    navigateToGlobalPage(Math.min(safePageIndex + 1, pageCount - 1));
  }, [navigateToGlobalPage, pageCount, safePageIndex]);

  const goPrevious = useCallback(() => {
    navigateToGlobalPage(Math.max(safePageIndex - 1, 0));
  }, [navigateToGlobalPage, safePageIndex]);

  const closeReader = useCallback(() => {
    resetReaderState();
    setIsVisible(false);
    onClose?.();
  }, [onClose, resetReaderState]);

  const finishReading = useCallback(() => {
    resetReaderState();
    setIsVisible(false);
    onClose?.();
  }, [onClose, resetReaderState]);

  const handlePdfLoadSuccess = useCallback(
    ({ numPages }, loadToken) => {
      if (!isOpenRef.current || loadToken !== activeLoadTokenRef.current) {
        return;
      }

      setIsPdfZoomed(false);
      const nextPageCount = Number.isFinite(numPages)
        ? Math.max(0, Math.trunc(numPages))
        : 0;

      if (nextPageCount === 0) {
        setPdfPageCount(0);
        setPdfStatus("error");
        setPdfError("Check the PDF file and try again.");
        return;
      }

      if (hasMultiPartPdf) {
        if (!activePart || nextPageCount !== activePart.expectedPageCount) {
          setPdfPageCount(0);
          setPdfStatus("error");
          setPdfError(
            "This section of the book does not match its expected page count.",
          );
          return;
        }

        setPdfPageCount(nextPageCount);

        if (pendingGlobalPageIndex !== null) {
          const pendingPartIndex = findPartForGlobalPage(
            pdfParts,
            pendingGlobalPageIndex,
          );

          if (pendingPartIndex !== activePartIndex) {
            setPdfStatus("error");
            setPdfError("This section of the book is not configured correctly.");
            return;
          }

          setPageIndex(pendingGlobalPageIndex);
          setPendingGlobalPageIndex(null);
        }

        setPdfStatus("ready");
        setPdfError(null);
        transitionLockRef.current = false;
        scrollToTop();
        return;
      }

      setPdfPageCount(nextPageCount);
      setPageIndex((currentIndex) =>
        Math.min(Math.max(currentIndex, 0), nextPageCount - 1),
      );
      setPdfStatus("ready");
      setPdfError(null);
      transitionLockRef.current = false;
      scrollToTop();
    },
    [
      activePart,
      activePartIndex,
      hasMultiPartPdf,
      pdfParts,
      pendingGlobalPageIndex,
      scrollToTop,
    ],
  );

  const handlePdfLoadError = useCallback(
    (loadToken) => {
      if (!isOpenRef.current || loadToken !== activeLoadTokenRef.current) {
        return;
      }

      setIsPdfZoomed(false);
      setPdfPageAspectRatio(0);
      clearTapTracking();
      clearTouchTracking();
      setPdfPageCount(0);

      if (!hasMultiPartPdf) {
        setPageIndex(0);
      }

      setPdfStatus("error");
      setPdfError("Check the PDF file and try again.");
      scrollToTop();
    },
    [
      clearTapTracking,
      clearTouchTracking,
      hasMultiPartPdf,
      scrollToTop,
    ],
  );

  const retryPdf = useCallback(() => {
    setIsPdfZoomed(false);
    setPdfPageAspectRatio(0);
    setIsReaderMenuOpen(false);
    clearTapTracking();
    clearTouchTracking();

    if (!hasMultiPartPdf) {
      setPageIndex(0);
    }

    setPdfPageCount(0);
    setPdfError(null);
    setPdfStatus("loading");
    setPdfReloadKey((currentKey) => currentKey + 1);
    scrollToTop();
  }, [
    clearTapTracking,
    clearTouchTracking,
    hasMultiPartPdf,
    scrollToTop,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      resetReaderState();
      return undefined;
    }

    setPageIndex(0);
    setActivePartIndex(0);
    setPendingGlobalPageIndex(null);
    setPdfPageCount(0);
    setPdfStatus(hasPdf ? "loading" : "idle");
    setPdfError(null);
    setPdfReloadKey(0);
    setPdfRenderWidth(0);
    setPdfPageAspectRatio(0);
    setIsReaderMenuOpen(false);
    setIsPdfZoomed(false);
    setIsVisible(false);
    clearTouchTracking();
    clearTapTracking();
    transitionLockRef.current = false;
    scrollToTop();

    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    clearTapTracking,
    clearTouchTracking,
    hasPdf,
    isOpen,
    material?.id,
    pdfSourceSignature,
    resetReaderState,
    scrollToTop,
  ]);

  useEffect(() => {
    setPageIndex((currentIndex) => {
      if (pageCount === 0) return 0;
      return Math.min(currentIndex, pageCount - 1);
    });
  }, [material?.id, pageCount, pdfSourceSignature]);

  useEffect(() => {
    if (!isOpen || !hasPdf || typeof window === "undefined") {
      return undefined;
    }

    const viewport = pdfViewportRef.current;
    if (!viewport) return undefined;

    const measureViewport = () => {
    const viewportRect = viewport.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const availableWidth = Math.floor(viewportRect.width);
    const availableHeight = Math.floor(
      scrollContainer?.getBoundingClientRect().height ?? window.innerHeight,
    );

    if (availableWidth <= 0 || availableHeight <= 0) {
      setPdfRenderWidth(0);
      return;
    }

    const isNarrowPortraitScreen =
      availableWidth < PDF_NARROW_SCREEN_BREAKPOINT &&
      availableHeight > availableWidth;
    const widthLimit =
      availableWidth *
      (isNarrowPortraitScreen ? PDF_NARROW_SCREEN_MAX_OVERSIZE : 1);
    const heightDrivenWidth =
      pdfPageAspectRatio > 0
        ? availableHeight *
          PDF_COMFORTABLE_FIT_HEIGHT_RATIO *
          pdfPageAspectRatio
        : availableWidth;
    const nextWidth = Math.round(
      Math.min(
        Math.max(availableWidth, heightDrivenWidth),
        widthLimit,
        PDF_MAX_WIDTH,
      ),
    );

    setPdfRenderWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth,
    );
  };

  const animationFrame = window.requestAnimationFrame(measureViewport);
    let resizeObserver = null;

    if (typeof window.ResizeObserver === "function") {
      resizeObserver = new window.ResizeObserver(measureViewport);
      resizeObserver.observe(viewport);
      if (scrollContainerRef.current) {
        resizeObserver.observe(scrollContainerRef.current);
      }
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
  }, [
    activePdfPath,
    hasPdf,
    isOpen,
    material?.id,
    pdfPageAspectRatio,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    setIsReaderMenuOpen(false);
    setIsPdfZoomed(false);
    setPdfPageAspectRatio(0);
    clearTouchTracking();
    clearTapTracking();
    scrollToTop();
  }, [
    activePdfPath,
    clearTapTracking,
    clearTouchTracking,
    isOpen,
    material?.id,
    pdfReloadKey,
    safePageIndex,
    scrollToTop,
  ]);

  useEffect(() => {
    if (!isOpen || !hasPdf || typeof window === "undefined") {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      syncPdfScrollPosition(isPdfZoomed);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activePdfRenderWidth,
    hasPdf,
    isOpen,
    isPdfZoomed,
    syncPdfScrollPosition,
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

        if (isReaderMenuOpen) {
          setIsReaderMenuOpen(false);
          return;
        }

        if (hasPdf && isPdfZoomed) {
          setIsPdfZoomed(false);
          clearTapTracking();
          clearTouchTracking();
          return;
        }

        closeReader();
        return;
      }

      if (isReaderMenuOpen || (hasPdf && isPdfZoomed)) return;

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
  }, [
    clearTapTracking,
    clearTouchTracking,
    closeReader,
    goNext,
    goPrevious,
    hasPdf,
    isOpen,
    isPdfZoomed,
    isReaderMenuOpen,
  ]);

  const handleTouchStart = (event) => {
    if (isReaderMenuOpen) {
      clearTouchTracking();
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (event) => {
    if (isReaderMenuOpen) {
      clearTouchTracking();
      return;
    }

    const touch = event.changedTouches?.[0];
    const { x: startX, y: startY } = touchStartRef.current;

    clearTouchTracking();

    if (!touch || startX === null || startY === null) return;

    const horizontalDistance = touch.clientX - startX;
    const verticalDistance = touch.clientY - startY;
    const isTap =
      Math.abs(horizontalDistance) <= TAP_MOVE_TOLERANCE &&
      Math.abs(verticalDistance) <= TAP_MOVE_TOLERANCE;

    if (hasPdf && isTap && canTogglePdfZoom) {
      const now = Date.now();
      const elapsedSinceLastTap = now - lastPdfTapTimeRef.current;

      if (
        lastPdfTapTimeRef.current > 0 &&
        elapsedSinceLastTap <= DOUBLE_TAP_DELAY
      ) {
        event.preventDefault();
        lastPdfTapTimeRef.current = 0;
        ignoreDoubleClickUntilRef.current = now + DOUBLE_TAP_DELAY * 2;
        togglePdfZoom();
        return;
      }

      lastPdfTapTimeRef.current = now;
    } else if (hasPdf) {
      lastPdfTapTimeRef.current = 0;
    }

    if (hasPdf && isPdfZoomed) return;

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

  const handlePdfDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      isReaderMenuOpen ||
      Date.now() < ignoreDoubleClickUntilRef.current
    ) {
      return;
    }

    togglePdfZoom();
  };

  const handlePdfPageRenderSuccess = useCallback(() => {
    syncPdfScrollPosition(isPdfZoomed);
  }, [isPdfZoomed, syncPdfScrollPosition]);

  const handlePdfPageLoadSuccess = useCallback((page) => {
    const pageViewport = page?.getViewport?.({ scale: 1 });
    const nextAspectRatio =
      pageViewport?.width > 0 && pageViewport?.height > 0
        ? pageViewport.width / pageViewport.height
        : 0;

    if (!Number.isFinite(nextAspectRatio) || nextAspectRatio <= 0) return;

    setPdfPageAspectRatio((currentAspectRatio) =>
      Math.abs(currentAspectRatio - nextAspectRatio) < 0.001
        ? currentAspectRatio
        : nextAspectRatio,
    );
  }, []);

  const openReaderMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearTouchTracking();
    clearTapTracking();
    setIsReaderMenuOpen(true);
  };

  const closeReaderMenu = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    clearTouchTracking();
    clearTapTracking();
    setIsReaderMenuOpen(false);
  };

  const handleZoomMenuAction = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsReaderMenuOpen(false);
    clearTouchTracking();
    clearTapTracking();

    if (!canTogglePdfZoom) return;
    setIsPdfZoomed((currentZoomed) => !currentZoomed);
  };

  if (!isOpen || !material || typeof document === "undefined") {
    return null;
  }

  const isForwardBoundary =
    isBoundaryTransition && pendingGlobalPageIndex > safePageIndex;
  const boundaryLoadingMessage = isForwardBoundary
    ? "Preparing the next section..."
    : "Preparing the previous section...";
  const boundaryErrorTitle = isForwardBoundary
    ? "The next section could not be loaded."
    : "The previous section could not be loaded.";
  const errorTitle = isBoundaryTransition
    ? boundaryErrorTitle
    : "This book could not be opened.";

  const readerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={!hasPdf && material.title ? titleId : undefined}
      aria-label={
        hasPdf
          ? `${material.title || "CLARA Learning Hub"} PDF reader`
          : material.title
            ? undefined
            : "CLARA Learning Hub reader"
      }
      className={`fixed inset-0 z-[9999] isolate flex h-[100dvh] min-h-[100svh] w-screen flex-col overflow-hidden text-white ${
        hasPdf ? "bg-[#080a0f]" : "bg-[#050814]"
      }`}
    >
      {!hasPdf && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-3xl" />
          <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-500/[0.09] blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/[0.30] via-slate-950/[0.35] to-black/[0.45]" />
        </div>
      )}

      {!hasPdf && (
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
      )}

      {hasPdf && (
        <button
          type="button"
          onClick={openReaderMenu}
          onTouchStart={(event) => {
            event.stopPropagation();
            clearTouchTracking();
            clearTapTracking();
          }}
          onTouchEnd={(event) => event.stopPropagation()}
          aria-label="Open reader options"
          aria-haspopup="dialog"
          aria-expanded={isReaderMenuOpen}
          aria-controls="clara-reader-options"
          className="absolute left-1/2 z-30 flex h-11 min-h-11 w-11 min-w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.14] bg-black/55 text-white/85 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0f]"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <MoreHorizontal aria-hidden="true" size={22} strokeWidth={2} />
        </button>
      )}

      <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className={`h-full overscroll-contain ${
            hasPdf
              ? isPdfZoomed
                ? "overflow-auto px-2 py-2 sm:px-3 sm:py-3"
                : "overflow-x-hidden overflow-y-auto px-0 py-2 sm:px-2 sm:py-3"
              : "overflow-x-hidden overflow-y-auto px-5 sm:px-8"
          }`}
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: hasPdf
              ? isPdfZoomed
                ? "pan-x pan-y"
                : "pan-y"
              : "pan-y",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={clearTouchTracking}
        >
          {hasPdf ? (
            <div className="mx-auto flex min-h-full w-full max-w-[1040px] flex-col">
              <section
                ref={pdfViewportRef}
                aria-label={
                  pdfStatus === "ready" && pageCount > 0
                    ? `Page ${safePageIndex + 1} of ${pageCount} of ${material.title}`
                    : `PDF reader for ${material.title}`
                }
                onDoubleClick={handlePdfDoubleClick}
                className={`${
                  isPdfZoomed ? "my-0" : "my-auto"
                } w-full transition-[opacity,transform] duration-300 ease-out ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
              >
                {pdfStatus !== "error" ? (
                  <>
                    <Document
                      key={activeDocumentKey}
                      file={pdfUrl}
                      onLoadSuccess={(result) =>
                        handlePdfLoadSuccess(result, activeDocumentKey)
                      }
                      onLoadError={() => handlePdfLoadError(activeDocumentKey)}
                      onSourceError={() =>
                        handlePdfLoadError(activeDocumentKey)
                      }
                      loading={null}
                      error={null}
                      noData={null}
                      className={
                        isPdfZoomed
                          ? "flex w-max min-w-full justify-start"
                          : "flex w-full justify-center"
                      }
                    >
                      {pdfStatus === "ready" &&
                      pdfPageCount > 0 &&
                      activePdfRenderWidth > 0 ? (
                        <Page
                          pageNumber={localPdfPageNumber}
                          width={activePdfRenderWidth}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          onLoadSuccess={handlePdfPageLoadSuccess}
                          onLoadError={() =>
                            handlePdfLoadError(activeDocumentKey)
                          }
                          onRenderError={() =>
                            handlePdfLoadError(activeDocumentKey)
                          }
                          onRenderSuccess={handlePdfPageRenderSuccess}
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
                          className={`${
                            isPdfZoomed ? "mx-0" : "mx-auto"
                          } overflow-hidden rounded-[2px] bg-white shadow-[0_14px_42px_rgba(0,0,0,0.28)]`}
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
                            {isBoundaryTransition
                              ? boundaryLoadingMessage
                              : "Preparing your book..."}
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
                        {errorTitle}
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
                          Exit reader
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

      {!hasPdf && (
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
      )}

      {hasPdf && isReaderMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          onTouchStart={(event) => {
            event.stopPropagation();
            clearTouchTracking();
            clearTapTracking();
          }}
          onTouchEnd={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close reader options"
            onClick={closeReaderMenu}
            className="absolute inset-0 h-full w-full cursor-default appearance-none border-0 bg-black/45 p-0 backdrop-blur-[1px]"
          />

          <section
            id="clara-reader-options"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clara-reader-options-title"
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[24px] rounded-b-[18px] border border-white/[0.12] bg-slate-950/95 px-3 pb-3 pt-3 shadow-[0_24px_80px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:px-4 sm:pb-4"
          >
            <p
              id="clara-reader-options-title"
              className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50"
            >
              Reader options
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleZoomMenuAction}
                disabled={!canTogglePdfZoom}
                className="flex h-12 min-h-12 w-full appearance-none items-center justify-start gap-3 rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-0 text-left text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]"
                style={{ minHeight: "48px", width: "100%", borderRadius: "14px" }}
              >
                {isPdfZoomed ? (
                  <Minimize2
                    aria-hidden="true"
                    className="shrink-0 text-cyan-200/75"
                    size={18}
                    strokeWidth={1.9}
                  />
                ) : (
                  <ZoomIn
                    aria-hidden="true"
                    className="shrink-0 text-cyan-200/75"
                    size={18}
                    strokeWidth={1.9}
                  />
                )}
                <span className="min-w-0 flex-1">
                  {isPdfZoomed ? "Fit page" : "Enlarge page"}
                </span>
              </button>

              <button
                type="button"
                onClick={closeReader}
                className="flex h-12 min-h-12 w-full appearance-none items-center justify-start gap-3 rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-0 text-left text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                style={{ minHeight: "48px", width: "100%", borderRadius: "14px" }}
              >
                <LogOut
                  aria-hidden="true"
                  className="shrink-0 text-white/65"
                  size={18}
                  strokeWidth={1.9}
                />
                <span className="min-w-0 flex-1">Exit reader</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  return createPortal(readerContent, document.body);
}
