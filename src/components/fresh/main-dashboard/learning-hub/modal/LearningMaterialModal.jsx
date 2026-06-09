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
const PDF_MIN_ZOOM_SCALE = 1;
const PDF_READING_ZOOM_SCALE = 1.75;
const PDF_MAX_ZOOM_SCALE = 4;
const PDF_ZOOM_EPSILON = 0.01;
const PDF_MAX_RENDER_WIDTH = 3200;
const PDF_PAGE_TURN_OUT_DURATION = 140;
const PDF_PAGE_TURN_IN_DURATION = 180;

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

const getTouchDistance = (firstTouch, secondTouch) =>
  Math.hypot(
    secondTouch.clientX - firstTouch.clientX,
    secondTouch.clientY - firstTouch.clientY,
  );

const getTouchCenter = (firstTouch, secondTouch) => ({
  x: (firstTouch.clientX + secondTouch.clientX) / 2,
  y: (firstTouch.clientY + secondTouch.clientY) / 2,
});

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
  const [pdfZoomScale, setPdfZoomScale] = useState(PDF_MIN_ZOOM_SCALE);
  const [announcedZoomPercentage, setAnnouncedZoomPercentage] = useState(100);
  const [pdfPageTurnDirection, setPdfPageTurnDirection] = useState(null);
  const [pdfPageTurnPhase, setPdfPageTurnPhase] = useState("idle");
  const touchStartRef = useRef({ x: null, y: null });
  const lastPdfTapTimeRef = useRef(0);
  const ignoreDoubleClickUntilRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const pdfViewportRef = useRef(null);
  const pdfContentRef = useRef(null);
  const activeLoadTokenRef = useRef("");
  const isOpenRef = useRef(isOpen);
  const isMountedRef = useRef(true);
  const transitionLockRef = useRef(false);
  const pdfPageTurnLockRef = useRef(false);
  const pdfPageTurnPhaseRef = useRef("idle");
  const pdfPageTurnTimerRef = useRef(null);
  const pdfZoomScaleRef = useRef(PDF_MIN_ZOOM_SCALE);
  const pinchGestureRef = useRef({
    active: false,
    startDistance: 0,
    startScale: PDF_MIN_ZOOM_SCALE,
    latestScale: PDF_MIN_ZOOM_SCALE,
    centerX: 0,
    centerY: 0,
    contentX: 0,
    contentY: 0,
  });
  const panGestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });
  const gestureAnimationFrameRef = useRef(null);
  const pendingPinchFrameRef = useRef(null);
  const pendingFocalPointRef = useRef(null);
  const suppressTouchUntilReleaseRef = useRef(false);

  isOpenRef.current = isOpen;
  pdfZoomScaleRef.current = pdfZoomScale;

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
  const isPdfZoomed =
    pdfZoomScale > PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON;
  const requestedPdfRenderWidth = pdfRenderWidth * pdfZoomScale;
  const activePdfRenderWidth = Math.min(
    Math.round(requestedPdfRenderWidth),
    PDF_MAX_RENDER_WIDTH,
  );
  const effectivePdfZoomScale =
    pdfRenderWidth > 0
      ? activePdfRenderWidth / pdfRenderWidth
      : PDF_MIN_ZOOM_SCALE;
  const zoomPercentage = Math.round(effectivePdfZoomScale * 100);
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

  const getEffectiveScaleForRequestedScale = useCallback(
    (requestedScale) => {
      if (pdfRenderWidth <= 0) return PDF_MIN_ZOOM_SCALE;
      return (
        Math.min(
          Math.round(pdfRenderWidth * requestedScale),
          PDF_MAX_RENDER_WIDTH,
        ) / pdfRenderWidth
      );
    },
    [pdfRenderWidth],
  );

  const clearTouchTracking = useCallback(() => {
    touchStartRef.current = { x: null, y: null };
  }, []);

  const clearTapTracking = useCallback(() => {
    lastPdfTapTimeRef.current = 0;
    ignoreDoubleClickUntilRef.current = 0;
  }, []);

  const clearPdfPageTurnTimer = useCallback(() => {
    if (pdfPageTurnTimerRef.current !== null) {
      clearTimeout(pdfPageTurnTimerRef.current);
      pdfPageTurnTimerRef.current = null;
    }
  }, []);

  const resetPdfPageTurnState = useCallback(
    ({ updateState = true } = {}) => {
      clearPdfPageTurnTimer();
      pdfPageTurnLockRef.current = false;
      pdfPageTurnPhaseRef.current = "idle";

      if (updateState) {
        setPdfPageTurnPhase("idle");
        setPdfPageTurnDirection(null);
      }
    },
    [clearPdfPageTurnTimer],
  );

  const clearGestureTracking = useCallback(() => {
    if (gestureAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(gestureAnimationFrameRef.current);
      gestureAnimationFrameRef.current = null;
    }

    pendingPinchFrameRef.current = null;
    pendingFocalPointRef.current = null;
    pinchGestureRef.current = {
      active: false,
      startDistance: 0,
      startScale: PDF_MIN_ZOOM_SCALE,
      latestScale: PDF_MIN_ZOOM_SCALE,
      centerX: 0,
      centerY: 0,
      contentX: 0,
      contentY: 0,
    };
    panGestureRef.current = {
      active: false,
      startX: 0,
      startY: 0,
      startScrollLeft: 0,
      startScrollTop: 0,
    };
    suppressTouchUntilReleaseRef.current = false;
    clearTouchTracking();
  }, [clearTouchTracking]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, []);

  const applyPendingFocalPoint = useCallback(() => {
    const pending = pendingFocalPointRef.current;
    const container = scrollContainerRef.current;
    const content = pdfContentRef.current;

    if (!pending || !container || !content) return;

    const containerRect = container.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const contentOriginX =
      contentRect.left - containerRect.left + container.scrollLeft;
    const contentOriginY =
      contentRect.top - containerRect.top + container.scrollTop;
    const nextScale = getEffectiveScaleForRequestedScale(pending.scale);
    const maxScrollLeft = Math.max(
      0,
      container.scrollWidth - container.clientWidth,
    );
    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight,
    );

    container.scrollLeft = clamp(
      contentOriginX + pending.contentX * nextScale - pending.centerX,
      0,
      maxScrollLeft,
    );
    container.scrollTop = clamp(
      contentOriginY + pending.contentY * nextScale - pending.centerY,
      0,
      maxScrollTop,
    );
  }, [getEffectiveScaleForRequestedScale]);

  const resetPdfToFit = useCallback(
    ({ announce = true } = {}) => {
      clearGestureTracking();
      clearTapTracking();
      pdfZoomScaleRef.current = PDF_MIN_ZOOM_SCALE;
      setPdfZoomScale(PDF_MIN_ZOOM_SCALE);
      if (announce) setAnnouncedZoomPercentage(100);

      window.requestAnimationFrame(() => {
        scrollContainerRef.current?.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        });
      });
    },
    [clearGestureTracking, clearTapTracking],
  );

  const setReadingZoom = useCallback(() => {
    if (!canTogglePdfZoom) return;

    clearGestureTracking();
    clearTapTracking();
    pdfZoomScaleRef.current = PDF_READING_ZOOM_SCALE;
    setPdfZoomScale(PDF_READING_ZOOM_SCALE);
    setAnnouncedZoomPercentage(
      Math.round(
        getEffectiveScaleForRequestedScale(PDF_READING_ZOOM_SCALE) * 100,
      ),
    );

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        container.scrollTo({
          top: 0,
          left: Math.max(
            0,
            (container.scrollWidth - container.clientWidth) / 2,
          ),
          behavior: "auto",
        });
      });
    });
  }, [
    canTogglePdfZoom,
    clearGestureTracking,
    clearTapTracking,
    getEffectiveScaleForRequestedScale,
  ]);

  const resetReaderState = useCallback(() => {
    resetPdfPageTurnState();
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
    pdfZoomScaleRef.current = PDF_MIN_ZOOM_SCALE;
    setPdfZoomScale(PDF_MIN_ZOOM_SCALE);
    setAnnouncedZoomPercentage(100);
    clearGestureTracking();
    clearTapTracking();
    transitionLockRef.current = false;
  }, [clearGestureTracking, clearTapTracking, resetPdfPageTurnState]);

  const togglePdfZoom = useCallback(() => {
    if (
      !canTogglePdfZoom ||
      isReaderMenuOpen ||
      pdfPageTurnLockRef.current
    ) {
      return;
    }

    if (
      pdfZoomScaleRef.current >
      PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON
    ) {
      resetPdfToFit();
      return;
    }

    setReadingZoom();
  }, [
    canTogglePdfZoom,
    isReaderMenuOpen,
    resetPdfToFit,
    setReadingZoom,
  ]);

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
        resetPdfToFit({ announce: false });
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
        resetPdfPageTurnState();
        resetPdfToFit({ announce: false });
        setPdfStatus("error");
        setPdfError("This section of the book is not configured correctly.");
        return;
      }

      if (targetPartIndex === activePartIndex) {
        setPageIndex(targetGlobalPageIndex);
        return;
      }

      transitionLockRef.current = true;
      resetPdfToFit({ announce: false });
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
      hasMultiPartPdf,
      hasPdf,
      pageCount,
      pdfParts,
      resetPdfPageTurnState,
      resetPdfToFit,
      safePageIndex,
      scrollToTop,
    ],
  );

  const requestPdfPageTurn = useCallback(
    (targetGlobalPageIndex) => {
      if (
        !canNavigate ||
        transitionLockRef.current ||
        pdfPageTurnLockRef.current ||
        targetGlobalPageIndex < 0 ||
        targetGlobalPageIndex >= pageCount ||
        targetGlobalPageIndex === safePageIndex ||
        isReaderMenuOpen
      ) {
        return;
      }

      if (!hasPdf) {
        navigateToGlobalPage(targetGlobalPageIndex);
        return;
      }

      if (
        pdfStatus !== "ready" ||
        isPdfZoomed ||
        effectivePdfZoomScale > PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON ||
        pdfZoomScaleRef.current > PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON
      ) {
        return;
      }

      const direction =
        targetGlobalPageIndex > safePageIndex ? "next" : "previous";
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        navigateToGlobalPage(targetGlobalPageIndex);
        return;
      }

      clearPdfPageTurnTimer();
      pdfPageTurnLockRef.current = true;
      setPdfPageTurnDirection(direction);
      pdfPageTurnPhaseRef.current = "leaving";
      setPdfPageTurnPhase("leaving");

      pdfPageTurnTimerRef.current = window.setTimeout(() => {
        pdfPageTurnTimerRef.current = null;

        if (
          !isMountedRef.current ||
          !isOpenRef.current ||
          transitionLockRef.current
        ) {
          resetPdfPageTurnState({ updateState: isMountedRef.current });
          return;
        }

        pdfPageTurnPhaseRef.current = "entering";
        setPdfPageTurnPhase("entering");
        navigateToGlobalPage(targetGlobalPageIndex);
      }, PDF_PAGE_TURN_OUT_DURATION);
    },
    [
      canNavigate,
      clearPdfPageTurnTimer,
      effectivePdfZoomScale,
      hasPdf,
      isPdfZoomed,
      isReaderMenuOpen,
      navigateToGlobalPage,
      pageCount,
      pdfStatus,
      resetPdfPageTurnState,
      safePageIndex,
    ],
  );

  const goNext = useCallback(() => {
    requestPdfPageTurn(Math.min(safePageIndex + 1, pageCount - 1));
  }, [pageCount, requestPdfPageTurn, safePageIndex]);

  const goPrevious = useCallback(() => {
    requestPdfPageTurn(Math.max(safePageIndex - 1, 0));
  }, [requestPdfPageTurn, safePageIndex]);

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
        if (isOpenRef.current) resetPdfToFit({ announce: false });
        return;
      }

      resetPdfToFit({ announce: false });
      const nextPageCount = Number.isFinite(numPages)
        ? Math.max(0, Math.trunc(numPages))
        : 0;

      if (nextPageCount === 0) {
        resetPdfPageTurnState();
        setPdfPageCount(0);
        setPdfStatus("error");
        setPdfError("Check the PDF file and try again.");
        return;
      }

      if (hasMultiPartPdf) {
        if (!activePart || nextPageCount !== activePart.expectedPageCount) {
          resetPdfPageTurnState();
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
            resetPdfPageTurnState();
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
      resetPdfPageTurnState,
      resetPdfToFit,
      scrollToTop,
    ],
  );

  const handlePdfLoadError = useCallback(
    (loadToken) => {
      if (!isOpenRef.current || loadToken !== activeLoadTokenRef.current) {
        if (isOpenRef.current) resetPdfToFit({ announce: false });
        return;
      }

      resetPdfPageTurnState();
      resetPdfToFit({ announce: false });
      setPdfPageAspectRatio(0);
      setPdfPageCount(0);

      if (!hasMultiPartPdf) {
        setPageIndex(0);
      }

      setPdfStatus("error");
      setPdfError("Check the PDF file and try again.");
      scrollToTop();
    },
    [hasMultiPartPdf, resetPdfPageTurnState, resetPdfToFit, scrollToTop],
  );

  const retryPdf = useCallback(() => {
    resetPdfPageTurnState();
    resetPdfToFit({ announce: false });
    setPdfPageAspectRatio(0);
    setIsReaderMenuOpen(false);

    if (!hasMultiPartPdf) {
      setPageIndex(0);
    }

    setPdfPageCount(0);
    setPdfError(null);
    setPdfStatus("loading");
    setPdfReloadKey((currentKey) => currentKey + 1);
    scrollToTop();
  }, [hasMultiPartPdf, resetPdfPageTurnState, resetPdfToFit, scrollToTop]);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      resetReaderState();
      return undefined;
    }

    resetPdfPageTurnState();
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
    pdfZoomScaleRef.current = PDF_MIN_ZOOM_SCALE;
    setPdfZoomScale(PDF_MIN_ZOOM_SCALE);
    setAnnouncedZoomPercentage(100);
    setIsVisible(false);
    clearGestureTracking();
    clearTapTracking();
    transitionLockRef.current = false;
    scrollToTop();

    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    clearGestureTracking,
    clearTapTracking,
    hasPdf,
    isOpen,
    material?.id,
    pdfSourceSignature,
    resetPdfPageTurnState,
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
    resetPdfToFit({ announce: false });
    setPdfPageAspectRatio(0);
    scrollToTop();
  }, [
    activePdfPath,
    isOpen,
    material?.id,
    pdfReloadKey,
    resetPdfToFit,
    safePageIndex,
    scrollToTop,
  ]);

  useEffect(() => {
    if (!isOpen || !hasPdf || typeof window === "undefined") {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      if (pendingFocalPointRef.current) {
        applyPendingFocalPoint();
        return;
      }

      if (!isPdfZoomed) {
        scrollContainerRef.current?.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        });
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activePdfRenderWidth,
    applyPendingFocalPoint,
    hasPdf,
    isOpen,
    isPdfZoomed,
  ]);

  useEffect(() => {
    if (!pinchGestureRef.current.active && pdfStatus === "ready") {
      setAnnouncedZoomPercentage(zoomPercentage);
    }
  }, [pdfStatus, zoomPercentage]);

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
          resetPdfToFit();
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
    closeReader,
    goNext,
    goPrevious,
    hasPdf,
    isOpen,
    isPdfZoomed,
    isReaderMenuOpen,
    resetPdfToFit,
  ]);

  const processPdfTap = useCallback(() => {
    if (
      !canTogglePdfZoom ||
      isReaderMenuOpen ||
      pdfPageTurnLockRef.current
    ) {
      return false;
    }

    const now = Date.now();
    const elapsedSinceLastTap = now - lastPdfTapTimeRef.current;

    if (
      lastPdfTapTimeRef.current > 0 &&
      elapsedSinceLastTap <= DOUBLE_TAP_DELAY
    ) {
      lastPdfTapTimeRef.current = 0;
      ignoreDoubleClickUntilRef.current = now + DOUBLE_TAP_DELAY * 2;
      togglePdfZoom();
      return true;
    }

    lastPdfTapTimeRef.current = now;
    return false;
  }, [canTogglePdfZoom, isReaderMenuOpen, togglePdfZoom]);

  useEffect(() => {
    if (!isOpen || !hasPdf || typeof window === "undefined") {
      return undefined;
    }

    const gestureSurface = pdfViewportRef.current;
    if (!gestureSurface) return undefined;

    const handleTouchStart = (event) => {
      if (isReaderMenuOpen) {
        clearGestureTracking();
        return;
      }

      if (suppressTouchUntilReleaseRef.current) return;

      if (event.touches.length === 2) {
        event.preventDefault();
        clearTouchTracking();
        clearTapTracking();
        panGestureRef.current.active = false;

        const [firstTouch, secondTouch] = event.touches;
        const startDistance = getTouchDistance(firstTouch, secondTouch);
        if (startDistance <= 0) return;

        const center = getTouchCenter(firstTouch, secondTouch);
        const container = scrollContainerRef.current;
        const content = pdfContentRef.current;
        if (!container || !content) return;

        const containerRect = container.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const centerX = center.x - containerRect.left;
        const centerY = center.y - containerRect.top;
        const contentOriginX =
          contentRect.left - containerRect.left + container.scrollLeft;
        const contentOriginY =
          contentRect.top - containerRect.top + container.scrollTop;
        const currentScale = getEffectiveScaleForRequestedScale(
          pdfZoomScaleRef.current,
        );

        pinchGestureRef.current = {
          active: true,
          startDistance,
          startScale: pdfZoomScaleRef.current,
          latestScale: pdfZoomScaleRef.current,
          centerX,
          centerY,
          contentX:
            (container.scrollLeft + centerX - contentOriginX) / currentScale,
          contentY:
            (container.scrollTop + centerY - contentOriginY) / currentScale,
        };
        return;
      }

      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };

      if (
        pdfZoomScaleRef.current >
        PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON
      ) {
        const container = scrollContainerRef.current;
        if (!container) return;

        panGestureRef.current = {
          active: true,
          startX: touch.clientX,
          startY: touch.clientY,
          startScrollLeft: container.scrollLeft,
          startScrollTop: container.scrollTop,
        };
      }
    };

    const handleTouchMove = (event) => {
      if (event.touches.length === 2 && pinchGestureRef.current.active) {
        event.preventDefault();

        const [firstTouch, secondTouch] = event.touches;
        const currentDistance = getTouchDistance(firstTouch, secondTouch);
        const center = getTouchCenter(firstTouch, secondTouch);
        const container = scrollContainerRef.current;
        if (!container || currentDistance <= 0) return;

        const containerRect = container.getBoundingClientRect();
        const nextScale = clamp(
          pinchGestureRef.current.startScale *
            (currentDistance / pinchGestureRef.current.startDistance),
          PDF_MIN_ZOOM_SCALE,
          PDF_MAX_ZOOM_SCALE,
        );

        pinchGestureRef.current.latestScale = nextScale;
        pendingPinchFrameRef.current = {
          scale: nextScale,
          centerX: center.x - containerRect.left,
          centerY: center.y - containerRect.top,
          contentX: pinchGestureRef.current.contentX,
          contentY: pinchGestureRef.current.contentY,
        };

        if (gestureAnimationFrameRef.current !== null) return;

        gestureAnimationFrameRef.current = window.requestAnimationFrame(() => {
          gestureAnimationFrameRef.current = null;
          const pending = pendingPinchFrameRef.current;
          pendingPinchFrameRef.current = null;
          if (!pending || !pinchGestureRef.current.active) return;

          pendingFocalPointRef.current = pending;
          pdfZoomScaleRef.current = pending.scale;
          setPdfZoomScale(pending.scale);
        });
        return;
      }

      if (
        event.touches.length === 1 &&
        panGestureRef.current.active &&
        pdfZoomScaleRef.current >
          PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON
      ) {
        event.preventDefault();
        const touch = event.touches[0];
        const container = scrollContainerRef.current;
        if (!container) return;

        const maxScrollLeft = Math.max(
          0,
          container.scrollWidth - container.clientWidth,
        );
        const maxScrollTop = Math.max(
          0,
          container.scrollHeight - container.clientHeight,
        );

        container.scrollLeft = clamp(
          panGestureRef.current.startScrollLeft -
            (touch.clientX - panGestureRef.current.startX),
          0,
          maxScrollLeft,
        );
        container.scrollTop = clamp(
          panGestureRef.current.startScrollTop -
            (touch.clientY - panGestureRef.current.startY),
          0,
          maxScrollTop,
        );
      }
    };

    const handleTouchEnd = (event) => {
      if (pinchGestureRef.current.active) {
        if (event.touches.length >= 2) return;

        if (gestureAnimationFrameRef.current !== null) {
          window.cancelAnimationFrame(gestureAnimationFrameRef.current);
          gestureAnimationFrameRef.current = null;
        }

        const pending = pendingPinchFrameRef.current;
        pendingPinchFrameRef.current = null;
        const clampedFinalScale = clamp(
          pending?.scale ?? pinchGestureRef.current.latestScale,
          PDF_MIN_ZOOM_SCALE,
          PDF_MAX_ZOOM_SCALE,
        );
        const finalScale =
          clampedFinalScale <=
          PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON
            ? PDF_MIN_ZOOM_SCALE
            : clampedFinalScale;

        if (pending) pendingFocalPointRef.current = pending;
        pdfZoomScaleRef.current = finalScale;
        setPdfZoomScale(finalScale);
        pinchGestureRef.current.active = false;
        panGestureRef.current.active = false;
        clearTouchTracking();
        clearTapTracking();
        suppressTouchUntilReleaseRef.current = event.touches.length > 0;

        window.requestAnimationFrame(() => {
          if (!isOpenRef.current) return;

          if (finalScale === PDF_MIN_ZOOM_SCALE) {
            pendingFocalPointRef.current = null;
            scrollContainerRef.current?.scrollTo({
              top: 0,
              left: 0,
              behavior: "auto",
            });
          } else {
            applyPendingFocalPoint();
            pendingFocalPointRef.current = null;
          }

          setAnnouncedZoomPercentage(
            Math.round(getEffectiveScaleForRequestedScale(finalScale) * 100),
          );
        });
        return;
      }

      if (suppressTouchUntilReleaseRef.current) {
        if (event.touches.length === 0) {
          suppressTouchUntilReleaseRef.current = false;
          clearTouchTracking();
        }
        return;
      }

      const touch = event.changedTouches?.[0];
      const { x: startX, y: startY } = touchStartRef.current;
      panGestureRef.current.active = false;
      clearTouchTracking();

      if (!touch || startX === null || startY === null) return;

      const horizontalDistance = touch.clientX - startX;
      const verticalDistance = touch.clientY - startY;
      const isTap =
        Math.abs(horizontalDistance) <= TAP_MOVE_TOLERANCE &&
        Math.abs(verticalDistance) <= TAP_MOVE_TOLERANCE;

      if (isTap && processPdfTap()) {
        event.preventDefault();
        return;
      }

      if (!isTap) lastPdfTapTimeRef.current = 0;

      if (
        pdfZoomScaleRef.current >
        PDF_MIN_ZOOM_SCALE + PDF_ZOOM_EPSILON
      ) {
        return;
      }

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

    const handleTouchCancel = () => {
      clearGestureTracking();
      clearTapTracking();
    };

    gestureSurface.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    gestureSurface.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    gestureSurface.addEventListener("touchend", handleTouchEnd, {
      passive: false,
    });
    gestureSurface.addEventListener("touchcancel", handleTouchCancel, {
      passive: false,
    });

    return () => {
      gestureSurface.removeEventListener("touchstart", handleTouchStart);
      gestureSurface.removeEventListener("touchmove", handleTouchMove);
      gestureSurface.removeEventListener("touchend", handleTouchEnd);
      gestureSurface.removeEventListener("touchcancel", handleTouchCancel);
      clearGestureTracking();
    };
  }, [
    applyPendingFocalPoint,
    clearGestureTracking,
    clearTapTracking,
    clearTouchTracking,
    getEffectiveScaleForRequestedScale,
    goNext,
    goPrevious,
    hasPdf,
    isOpen,
    isReaderMenuOpen,
    processPdfTap,
  ]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearGestureTracking();
      resetPdfPageTurnState({ updateState: false });
    };
  }, [clearGestureTracking, resetPdfPageTurnState]);

  const handlePdfDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      isReaderMenuOpen ||
      pdfPageTurnLockRef.current ||
      Date.now() < ignoreDoubleClickUntilRef.current
    ) {
      return;
    }

    togglePdfZoom();
  };

  const handlePdfPageRenderSuccess = useCallback(() => {
    if (pendingFocalPointRef.current) {
      window.requestAnimationFrame(() => {
        applyPendingFocalPoint();
        if (!pinchGestureRef.current.active) {
          pendingFocalPointRef.current = null;
        }
      });
    }

    if (
      !pdfPageTurnLockRef.current ||
      pdfPageTurnPhaseRef.current !== "entering"
    ) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!isMountedRef.current || !isOpenRef.current) {
          resetPdfPageTurnState({ updateState: false });
          return;
        }

        if (
          !pdfPageTurnLockRef.current ||
          pdfPageTurnPhaseRef.current !== "entering"
        ) {
          return;
        }

        clearPdfPageTurnTimer();
        pdfPageTurnPhaseRef.current = "idle";
        setPdfPageTurnPhase("idle");

        pdfPageTurnTimerRef.current = window.setTimeout(() => {
          pdfPageTurnTimerRef.current = null;
          pdfPageTurnLockRef.current = false;

          if (isMountedRef.current && isOpenRef.current) {
            setPdfPageTurnDirection(null);
          }
        }, PDF_PAGE_TURN_IN_DURATION);
      });
    });
  }, [
    applyPendingFocalPoint,
    clearPdfPageTurnTimer,
    resetPdfPageTurnState,
  ]);

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

    if (pdfPageTurnLockRef.current) return;

    clearGestureTracking();
    clearTapTracking();
    setIsReaderMenuOpen(true);
  };

  const closeReaderMenu = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    clearGestureTracking();
    clearTapTracking();
    setIsReaderMenuOpen(false);
  };

  const handleZoomMenuAction = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsReaderMenuOpen(false);

    if (!canTogglePdfZoom) return;

    if (isPdfZoomed) {
      resetPdfToFit();
      return;
    }

    setReadingZoom();
  };

  const pdfPaperTurnStyle = useMemo(() => {
    const restingTransform =
      "translate3d(0, 0, 0) rotateY(0deg) scale(1)";
    const isNext = pdfPageTurnDirection === "next";
    const isPrevious = pdfPageTurnDirection === "previous";
    const hasActiveDirection = isNext || isPrevious;
    const isTransitionActive =
      pdfPageTurnPhase !== "idle" || hasActiveDirection;

    if (pdfPageTurnPhase === "leaving" && hasActiveDirection) {
      return {
        transform: isNext
          ? "translate3d(-6%, 0, 0) rotateY(-4deg) scale(0.985)"
          : "translate3d(6%, 0, 0) rotateY(4deg) scale(0.985)",
        opacity: 0.74,
        transition: `transform ${PDF_PAGE_TURN_OUT_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${PDF_PAGE_TURN_OUT_DURATION}ms ease-out`,
        transformOrigin: isNext ? "left center" : "right center",
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
      };
    }

    if (pdfPageTurnPhase === "entering" && hasActiveDirection) {
      return {
        transform: isNext
          ? "translate3d(6%, 0, 0) rotateY(3deg) scale(0.985)"
          : "translate3d(-6%, 0, 0) rotateY(-3deg) scale(0.985)",
        opacity: 0.78,
        transition: "none",
        transformOrigin: isNext ? "right center" : "left center",
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
      };
    }

    return {
      transform: restingTransform,
      opacity: 1,
      transition: hasActiveDirection
        ? `transform ${PDF_PAGE_TURN_IN_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${PDF_PAGE_TURN_IN_DURATION}ms ease-out`
        : "none",
      transformOrigin: isNext
        ? "right center"
        : isPrevious
          ? "left center"
          : "center center",
      transformStyle: "preserve-3d",
      backfaceVisibility: "hidden",
      willChange: isTransitionActive ? "transform, opacity" : "auto",
    };
  }, [pdfPageTurnDirection, pdfPageTurnPhase]);

  const pdfPaperEdgeStyle = useMemo(() => {
    const isNext = pdfPageTurnDirection === "next";
    const isPrevious = pdfPageTurnDirection === "previous";
    const hasActiveDirection = isNext || isPrevious;
    const edgeOpacity =
      pdfPageTurnPhase === "leaving"
        ? 1
        : pdfPageTurnPhase === "entering"
          ? 0.62
          : 0;

    return {
      width: "44px",
      left: isPrevious ? 0 : undefined,
      right: isNext ? 0 : undefined,
      opacity: hasActiveDirection ? edgeOpacity : 0,
      background: isNext
        ? "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.04) 42%, rgba(0,0,0,0.18) 86%, rgba(255,255,255,0.10) 100%)"
        : "linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,0.04) 42%, rgba(0,0,0,0.18) 86%, rgba(255,255,255,0.10) 100%)",
      transition:
        pdfPageTurnPhase === "idle" && hasActiveDirection
          ? `opacity ${PDF_PAGE_TURN_IN_DURATION}ms ease-out`
          : `opacity ${PDF_PAGE_TURN_OUT_DURATION}ms ease-out`,
      filter: edgeOpacity > 0 ? "blur(0.4px)" : "none",
      zIndex: 2,
    };
  }, [pdfPageTurnDirection, pdfPageTurnPhase]);

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
      <div aria-live="polite" className="sr-only">
        PDF zoom {announcedZoomPercentage} percent
      </div>

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
            clearGestureTracking();
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
            touchAction: "pan-y",
          }}
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
                style={{ touchAction: isPdfZoomed ? "none" : "pan-y" }}
              >
                {pdfStatus !== "error" ? (
                  <>
                    <div className={isPdfZoomed ? "w-max min-w-full" : "w-full"}>
                      <Document
                        key={activeDocumentKey}
                        file={pdfUrl}
                        onLoadSuccess={(result) =>
                          handlePdfLoadSuccess(result, activeDocumentKey)
                        }
                        onLoadError={() =>
                          handlePdfLoadError(activeDocumentKey)
                        }
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
                          <div
                            className="relative shrink-0"
                            style={{ perspective: "1200px" }}
                          >
                            <div
                              className="relative shrink-0"
                              style={pdfPaperTurnStyle}
                            >
                              <Page
                                pageNumber={localPdfPageNumber}
                                inputRef={pdfContentRef}
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

                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0"
                                style={pdfPaperEdgeStyle}
                              />
                            </div>
                          </div>
                        ) : null}
                      </Document>
                    </div>

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
            clearGestureTracking();
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

            <p className="px-1 pb-3 text-xs font-medium tabular-nums text-white/45">
              Zoom: {zoomPercentage}%
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
                  {isPdfZoomed ? "Fit page" : "Reading zoom — 175%"}
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
