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
const PDF_CAROUSEL_DURATION = 170;
const PDF_CAROUSEL_FALLBACK_DURATION = 250;

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
  const [carouselSlots, setCarouselSlots] = useState([
    { globalPageIndex: 0, renderToken: 0 },
    { globalPageIndex: null, renderToken: 0 },
  ]);
  const [activeCarouselSlot, setActiveCarouselSlot] = useState(0);
  const [carouselPendingPageIndex, setCarouselPendingPageIndex] =
    useState(null);
  const [carouselDirection, setCarouselDirection] = useState(null);
  const [carouselPhase, setCarouselPhase] = useState("idle");
  const [carouselError, setCarouselError] = useState(null);
  const [boundarySnapshot, setBoundarySnapshot] = useState(null);
  const [hasRenderedPdfPage, setHasRenderedPdfPage] = useState(false);
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
  const carouselRequestTokenRef = useRef(0);
  const carouselTransitionTimeoutRef = useRef(null);
  const carouselFrameRef = useRef(null);
  const carouselSettleFrameRef = useRef(null);
  const carouselPendingPageIndexRef = useRef(null);
  const carouselPendingSlotRef = useRef(null);
  const carouselPhaseRef = useRef("idle");
  const activeCarouselSlotRef = useRef(0);
  const carouselReducedMotionRef = useRef(false);
  const carouselFinalizeGuardRef = useRef(false);
  const boundarySnapshotHostRef = useRef(null);
  const boundarySnapshotCanvasRef = useRef(null);
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
  const boundaryRenderGlobalPageIndex =
    pendingGlobalPageIndex ?? safePageIndex;
  const isBoundaryTransition =
    hasMultiPartPdf && pendingGlobalPageIndex !== null;
  const isCarouselBusy =
    carouselPhase !== "idle" || carouselPendingPageIndex !== null;
  const canNavigate =
    pageCount > 0 &&
    (!hasPdf ||
      (pdfStatus === "ready" &&
        hasRenderedPdfPage &&
        pendingGlobalPageIndex === null &&
        !isCarouselBusy));
  const canTogglePdfZoom =
    hasPdf &&
    pdfStatus === "ready" &&
    pdfRenderWidth > 0 &&
    !isBoundaryTransition &&
    !isCarouselBusy;
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
    !isBoundaryTransition &&
    (pdfStatus !== "ready" || pdfPageCount === 0 || !hasRenderedPdfPage);
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

  const getCarouselSlotStyle = useCallback(
    (slotIndex) => {
      const slot = carouselSlots[slotIndex];
      const isActiveSlot = slotIndex === activeCarouselSlot;
      const isIncomingSlot =
        carouselPendingPageIndex !== null &&
        slot?.globalPageIndex === carouselPendingPageIndex &&
        slotIndex !== activeCarouselSlot;
      let offset = 0;

      if (carouselPhase === "preparing") {
        if (isIncomingSlot) {
offset = carouselDirection === "forward" ? 100 : -100;
        }
      } else if (carouselPhase === "sliding") {
        if (isActiveSlot) {
offset = carouselDirection === "forward" ? -100 : 100;
        } else if (isIncomingSlot) {
offset = 0;
        }
      } else if (!isActiveSlot) {
        offset = carouselDirection === "backward" ? -100 : 100;
      }

      return {
        transform: `translate3d(${offset}%, 0, 0)`,
        transition:
carouselPhase === "sliding"
  ? `transform ${PDF_CAROUSEL_DURATION}ms ease-out`
  : "none",
        willChange: carouselPhase === "idle" ? "auto" : "transform",
        pointerEvents:
isActiveSlot && carouselPhase === "idle" ? "auto" : "none",
        visibility: slot?.globalPageIndex === null ? "hidden" : "visible",
        zIndex: isIncomingSlot ? 2 : isActiveSlot ? 1 : 0,
      };
    },
    [
      activeCarouselSlot,
      carouselDirection,
      carouselPendingPageIndex,
      carouselPhase,
      carouselSlots,
    ],
  );

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

  const clearCarouselTransitionTimeout = useCallback(() => {
    if (carouselTransitionTimeoutRef.current !== null) {
      if (typeof window !== "undefined") {
        window.clearTimeout(carouselTransitionTimeoutRef.current);
      }
      carouselTransitionTimeoutRef.current = null;
    }
  }, []);

  const clearCarouselFrames = useCallback(() => {
    if (typeof window === "undefined") return;

    if (carouselFrameRef.current !== null) {
      window.cancelAnimationFrame(carouselFrameRef.current);
      carouselFrameRef.current = null;
    }

    if (carouselSettleFrameRef.current !== null) {
      window.cancelAnimationFrame(carouselSettleFrameRef.current);
      carouselSettleFrameRef.current = null;
    }
  }, []);

  const clearBoundarySnapshot = useCallback(() => {
    boundarySnapshotHostRef.current?.replaceChildren();
    boundarySnapshotCanvasRef.current = null;

    if (isMountedRef.current) {
      setBoundarySnapshot(null);
    }
  }, []);

  const resetPdfCarouselState = useCallback(
    ({ globalPageIndex = 0, preserveSnapshot = false } = {}) => {
      carouselRequestTokenRef.current += 1;
      clearCarouselTransitionTimeout();
      clearCarouselFrames();
      carouselPendingPageIndexRef.current = null;
      carouselPendingSlotRef.current = null;
      carouselPhaseRef.current = "idle";
      activeCarouselSlotRef.current = 0;
      carouselReducedMotionRef.current = false;
      carouselFinalizeGuardRef.current = false;
      pdfPageTurnLockRef.current = false;

      if (!preserveSnapshot) {
        clearBoundarySnapshot();
      }

      if (isMountedRef.current) {
        setCarouselSlots([
{ globalPageIndex, renderToken: 0 },
{ globalPageIndex: null, renderToken: 0 },
        ]);
        setActiveCarouselSlot(0);
        setCarouselPendingPageIndex(null);
        setCarouselDirection(null);
        setCarouselPhase("idle");
        setCarouselError(null);
      }
    },
    [clearBoundarySnapshot, clearCarouselFrames, clearCarouselTransitionTimeout],
  );

  const cancelCarouselRequest = useCallback(
    (message = null) => {
      carouselRequestTokenRef.current += 1;
      clearCarouselTransitionTimeout();
      clearCarouselFrames();
      const currentActiveSlot = activeCarouselSlotRef.current;
      carouselPendingPageIndexRef.current = null;
      carouselPendingSlotRef.current = null;
      carouselPhaseRef.current = "idle";
      carouselReducedMotionRef.current = false;
      carouselFinalizeGuardRef.current = false;
      pdfPageTurnLockRef.current = false;

      if (!isMountedRef.current) return;

      setCarouselSlots((currentSlots) =>
        currentSlots.map((slot, slotIndex) =>
slotIndex === currentActiveSlot
  ? slot
  : { globalPageIndex: null, renderToken: 0 },
        ),
      );
      setCarouselPendingPageIndex(null);
      setCarouselDirection(null);
      setCarouselPhase("idle");
      if (message) setCarouselError(message);
    },
    [clearCarouselFrames, clearCarouselTransitionTimeout],
  );

  const createBoundarySnapshot = useCallback((direction) => {
    if (typeof document === "undefined") return false;

    const sourceCanvas = pdfContentRef.current?.querySelector?.("canvas");
    const snapshotHost = boundarySnapshotHostRef.current;
    if (!sourceCanvas || !snapshotHost) return false;

    const sourceRect = sourceCanvas.getBoundingClientRect();
    if (sourceCanvas.width <= 0 || sourceCanvas.height <= 0) return false;

    const snapshotCanvas = document.createElement("canvas");
    snapshotCanvas.width = sourceCanvas.width;
    snapshotCanvas.height = sourceCanvas.height;
    snapshotCanvas.setAttribute("aria-hidden", "true");
    snapshotCanvas.style.display = "block";
    snapshotCanvas.style.width = `${sourceRect.width}px`;
    snapshotCanvas.style.height = `${sourceRect.height}px`;
    snapshotCanvas.style.maxWidth = "100%";

    const snapshotContext = snapshotCanvas.getContext("2d");
    if (!snapshotContext) return false;

    snapshotContext.drawImage(sourceCanvas, 0, 0);
    snapshotHost.replaceChildren(snapshotCanvas);
    boundarySnapshotCanvasRef.current = snapshotCanvas;
    setBoundarySnapshot({
      width: sourceRect.width,
      height: sourceRect.height,
      direction,
    });
    return true;
  }, []);

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
    if (!canTogglePdfZoom || pdfPageTurnLockRef.current) return;

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
    resetPdfCarouselState({ globalPageIndex: 0 });
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
    setHasRenderedPdfPage(false);
    pdfZoomScaleRef.current = PDF_MIN_ZOOM_SCALE;
    setPdfZoomScale(PDF_MIN_ZOOM_SCALE);
    setAnnouncedZoomPercentage(100);
    clearGestureTracking();
    clearTapTracking();
    transitionLockRef.current = false;
  }, [
    clearGestureTracking,
    clearTapTracking,
    resetPdfCarouselState,
  ]);

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

  const finalizeCarouselTransition = useCallback(() => {
    if (carouselFinalizeGuardRef.current) return;

    const targetGlobalPageIndex = carouselPendingPageIndexRef.current;
    const incomingSlot = carouselPendingSlotRef.current;
    if (targetGlobalPageIndex === null || incomingSlot === null) return;

    carouselFinalizeGuardRef.current = true;
    clearCarouselTransitionTimeout();
    clearCarouselFrames();
    setPageIndex(targetGlobalPageIndex);
    setHasRenderedPdfPage(true);
    setActiveCarouselSlot(incomingSlot);
    activeCarouselSlotRef.current = incomingSlot;
    setCarouselSlots((currentSlots) =>
      currentSlots.map((slot, slotIndex) =>
        slotIndex === incomingSlot
? slot
: { globalPageIndex: null, renderToken: 0 },
      ),
    );

    carouselPendingPageIndexRef.current = null;
    carouselPendingSlotRef.current = null;
    carouselPhaseRef.current = "idle";
    carouselReducedMotionRef.current = false;
    pdfPageTurnLockRef.current = false;
    setCarouselPendingPageIndex(null);
    setCarouselDirection(null);
    setCarouselPhase("idle");
    scrollToTop();
  }, [clearCarouselFrames, clearCarouselTransitionTimeout, scrollToTop]);

  const beginCarouselSlide = useCallback(() => {
    if (carouselReducedMotionRef.current) {
      finalizeCarouselTransition();
      return;
    }

    carouselPhaseRef.current = "sliding";
    setCarouselPhase("sliding");
    clearCarouselTransitionTimeout();
    carouselTransitionTimeoutRef.current = window.setTimeout(() => {
      carouselTransitionTimeoutRef.current = null;
      finalizeCarouselTransition();
    }, PDF_CAROUSEL_FALLBACK_DURATION);
  }, [clearCarouselTransitionTimeout, finalizeCarouselTransition]);

  const requestPdfPageChange = useCallback(
    (targetGlobalPageIndex) => {
      if (
        !canNavigate ||
        transitionLockRef.current ||
        pdfPageTurnLockRef.current ||
        carouselPhaseRef.current !== "idle" ||
        carouselPendingPageIndexRef.current !== null ||
        targetGlobalPageIndex < 0 ||
        targetGlobalPageIndex >= pageCount ||
        targetGlobalPageIndex === safePageIndex ||
        isReaderMenuOpen
      ) {
        return;
      }

      if (!hasPdf) {
        setPageIndex(targetGlobalPageIndex);
        return;
      }

      if (
        pdfStatus !== "ready" ||
        isBoundaryTransition ||
        isPdfZoomed ||
        Math.abs(effectivePdfZoomScale - PDF_MIN_ZOOM_SCALE) >
PDF_ZOOM_EPSILON
      ) {
        return;
      }

      const targetPartIndex = hasMultiPartPdf
        ? findPartForGlobalPage(pdfParts, targetGlobalPageIndex)
        : activePartIndex;

      if (targetPartIndex < 0) {
        setPdfStatus("error");
        setPdfError("This section of the book is not configured correctly.");
        return;
      }

      const direction =
        targetGlobalPageIndex > safePageIndex ? "forward" : "backward";
      const requestToken = carouselRequestTokenRef.current + 1;
      carouselRequestTokenRef.current = requestToken;
      carouselFinalizeGuardRef.current = false;
      setCarouselError(null);
      resetPdfToFit({ announce: false });

      if (hasMultiPartPdf && targetPartIndex !== activePartIndex) {
        if (!createBoundarySnapshot(direction)) {
setCarouselError("The next section could not be prepared. Please try again.");
return;
        }

        transitionLockRef.current = true;
        pdfPageTurnLockRef.current = true;
        carouselPendingPageIndexRef.current = null;
        carouselPendingSlotRef.current = null;
        carouselPhaseRef.current = "idle";
        activeCarouselSlotRef.current = 0;
        setCarouselSlots([
{ globalPageIndex: targetGlobalPageIndex, renderToken: requestToken },
{ globalPageIndex: null, renderToken: 0 },
        ]);
        setActiveCarouselSlot(0);
        setCarouselPendingPageIndex(null);
        setCarouselDirection(null);
        setCarouselPhase("idle");
        setPendingGlobalPageIndex(targetGlobalPageIndex);
        setActivePartIndex(targetPartIndex);
        setPdfPageCount(0);
        setPdfError(null);
        setPdfStatus("loading");
        setHasRenderedPdfPage(false);
        scrollToTop();
        return;
      }

      const inactiveSlot = activeCarouselSlotRef.current === 0 ? 1 : 0;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      carouselPendingPageIndexRef.current = targetGlobalPageIndex;
      carouselPendingSlotRef.current = inactiveSlot;
      carouselPhaseRef.current = "preparing";
      carouselReducedMotionRef.current = prefersReducedMotion;
      pdfPageTurnLockRef.current = true;
      setCarouselSlots((currentSlots) =>
        currentSlots.map((slot, slotIndex) =>
slotIndex === inactiveSlot
  ? {
      globalPageIndex: targetGlobalPageIndex,
      renderToken: requestToken,
    }
  : slot,
        ),
      );
      setCarouselPendingPageIndex(targetGlobalPageIndex);
      setCarouselDirection(direction);
      setCarouselPhase("preparing");
    },
    [
      activePartIndex,
      canNavigate,
      createBoundarySnapshot,
      effectivePdfZoomScale,
      hasMultiPartPdf,
      hasPdf,
      isBoundaryTransition,
      isPdfZoomed,
      isReaderMenuOpen,
      pageCount,
      pdfParts,
      pdfStatus,
      resetPdfToFit,
      safePageIndex,
      scrollToTop,
    ],
  );

  const goNext = useCallback(() => {
    requestPdfPageChange(Math.min(safePageIndex + 1, pageCount - 1));
  }, [pageCount, requestPdfPageChange, safePageIndex]);

  const goPrevious = useCallback(() => {
    requestPdfPageChange(Math.max(safePageIndex - 1, 0));
  }, [requestPdfPageChange, safePageIndex]);

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
        setHasRenderedPdfPage(false);

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

setPdfStatus("ready");
setPdfError(null);
scrollToTop();
return;
        }

        setCarouselSlots([
{ globalPageIndex: safePageIndex, renderToken: 0 },
{ globalPageIndex: null, renderToken: 0 },
        ]);
        setActiveCarouselSlot(0);
        activeCarouselSlotRef.current = 0;
        setPdfStatus("ready");
        setPdfError(null);
        transitionLockRef.current = false;
        pdfPageTurnLockRef.current = false;
        scrollToTop();
        return;
      }

      const nextPageIndex = Math.min(
        Math.max(safePageIndex, 0),
        nextPageCount - 1,
      );
      setPdfPageCount(nextPageCount);
      setPageIndex(nextPageIndex);
      setCarouselSlots([
        { globalPageIndex: nextPageIndex, renderToken: 0 },
        { globalPageIndex: null, renderToken: 0 },
      ]);
      setActiveCarouselSlot(0);
      activeCarouselSlotRef.current = 0;
      setHasRenderedPdfPage(false);
      setPdfStatus("ready");
      setPdfError(null);
      transitionLockRef.current = false;
      pdfPageTurnLockRef.current = false;
      scrollToTop();
    },
    [
      activePart,
      activePartIndex,
      hasMultiPartPdf,
      pdfParts,
      pendingGlobalPageIndex,
      resetPdfToFit,
      safePageIndex,
      scrollToTop,
    ],
  );

  const handlePdfLoadError = useCallback(
    (loadToken) => {
      if (!isOpenRef.current || loadToken !== activeLoadTokenRef.current) {
        if (isOpenRef.current) resetPdfToFit({ announce: false });
        return;
      }

      carouselRequestTokenRef.current += 1;
      clearCarouselTransitionTimeout();
      clearCarouselFrames();
      resetPdfToFit({ announce: false });
      setPdfPageAspectRatio(0);
      setPdfPageCount(0);
      setPdfStatus("error");
      setPdfError("Check the PDF file and try again.");

      if (pendingGlobalPageIndex !== null || boundarySnapshotCanvasRef.current) {
        transitionLockRef.current = true;
        pdfPageTurnLockRef.current = true;
        carouselPendingPageIndexRef.current = null;
        carouselPendingSlotRef.current = null;
        carouselPhaseRef.current = "idle";
        setCarouselPendingPageIndex(null);
        setCarouselDirection(null);
        setCarouselPhase("idle");
        return;
      }

      setPageIndex(0);
      setHasRenderedPdfPage(false);
      transitionLockRef.current = false;
      resetPdfCarouselState({ globalPageIndex: 0 });
      scrollToTop();
    },
    [
      clearCarouselFrames,
      clearCarouselTransitionTimeout,
      pendingGlobalPageIndex,
      resetPdfCarouselState,
      resetPdfToFit,
      scrollToTop,
    ],
  );

  const retryPdf = useCallback(() => {
    carouselRequestTokenRef.current += 1;
    clearCarouselTransitionTimeout();
    clearCarouselFrames();
    resetPdfToFit({ announce: false });
    setPdfPageAspectRatio(0);
    setIsReaderMenuOpen(false);
    setPdfPageCount(0);
    setPdfError(null);
    setPdfStatus("loading");
    setHasRenderedPdfPage(false);

    if (pendingGlobalPageIndex !== null) {
      const requestToken = carouselRequestTokenRef.current;
      setCarouselSlots([
        { globalPageIndex: pendingGlobalPageIndex, renderToken: requestToken },
        { globalPageIndex: null, renderToken: 0 },
      ]);
      setActiveCarouselSlot(0);
      activeCarouselSlotRef.current = 0;
      transitionLockRef.current = true;
      pdfPageTurnLockRef.current = true;
    } else {
      setPageIndex(0);
      transitionLockRef.current = false;
      resetPdfCarouselState({ globalPageIndex: 0 });
      setPdfStatus("loading");
    }

    setPdfReloadKey((currentKey) => currentKey + 1);
    scrollToTop();
  }, [
    clearCarouselFrames,
    clearCarouselTransitionTimeout,
    pendingGlobalPageIndex,
    resetPdfCarouselState,
    resetPdfToFit,
    scrollToTop,
  ]);

  useEffect(() => {
    resetPdfCarouselState({ globalPageIndex: 0 });
    clearBoundarySnapshot();

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
    setHasRenderedPdfPage(false);
    setCarouselError(null);
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
    clearBoundarySnapshot,
    clearGestureTracking,
    clearTapTracking,
    hasPdf,
    isOpen,
    material?.id,
    pdfSourceSignature,
    resetPdfCarouselState,
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
      if (pdfPageTurnLockRef.current) {
        clearGestureTracking();
        clearTapTracking();
        return;
      }

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
      carouselRequestTokenRef.current += 1;
      clearCarouselTransitionTimeout();
      clearCarouselFrames();
      clearBoundarySnapshot();
      resetPdfCarouselState({ globalPageIndex: 0 });
      clearGestureTracking();
    };
  }, [
    clearBoundarySnapshot,
    clearCarouselFrames,
    clearCarouselTransitionTimeout,
    clearGestureTracking,
    resetPdfCarouselState,
  ]);

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

  const handlePdfPageRenderSuccess = useCallback(
    (slotIndex, renderToken, slotGlobalPageIndex) => {
      if (!isMountedRef.current || !isOpenRef.current) return;

      const isActiveSlot = slotIndex === activeCarouselSlotRef.current;
      if (isActiveSlot && pendingFocalPointRef.current) {
        window.requestAnimationFrame(() => {
applyPendingFocalPoint();
if (!pinchGestureRef.current.active) {
  pendingFocalPointRef.current = null;
}
        });
      }

      if (
        pendingGlobalPageIndex !== null &&
        slotGlobalPageIndex === pendingGlobalPageIndex &&
        renderToken === carouselRequestTokenRef.current
      ) {
        setHasRenderedPdfPage(true);
        setPageIndex(pendingGlobalPageIndex);
        setPendingGlobalPageIndex(null);
        transitionLockRef.current = false;
        pdfPageTurnLockRef.current = false;
        clearBoundarySnapshot();
        scrollToTop();
        return;
      }

      if (isActiveSlot && slotGlobalPageIndex === safePageIndex) {
        setHasRenderedPdfPage(true);
      }

      if (
        slotIndex !== carouselPendingSlotRef.current ||
        slotGlobalPageIndex !== carouselPendingPageIndexRef.current ||
        renderToken !== carouselRequestTokenRef.current ||
        carouselPhaseRef.current !== "preparing"
      ) {
        return;
      }

      clearCarouselFrames();
      carouselFrameRef.current = window.requestAnimationFrame(() => {
        carouselFrameRef.current = null;
        carouselSettleFrameRef.current = window.requestAnimationFrame(() => {
carouselSettleFrameRef.current = null;

if (
  !isMountedRef.current ||
  !isOpenRef.current ||
  renderToken !== carouselRequestTokenRef.current ||
  slotIndex !== carouselPendingSlotRef.current ||
  slotGlobalPageIndex !== carouselPendingPageIndexRef.current ||
  carouselPhaseRef.current !== "preparing"
) {
  return;
}

beginCarouselSlide();
        });
      });
    },
    [
      applyPendingFocalPoint,
      beginCarouselSlide,
      clearBoundarySnapshot,
      clearCarouselFrames,
      pendingGlobalPageIndex,
      safePageIndex,
      scrollToTop,
    ],
  );

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

  if (!isOpen || !material || typeof document === "undefined") {
    return null;
  }

  const isForwardBoundary =
    isBoundaryTransition && pendingGlobalPageIndex > safePageIndex;
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
      } relative w-full opacity-100`}
      style={{ touchAction: isPdfZoomed ? "none" : "pan-y" }}
    >
      <div className={isPdfZoomed ? "w-max min-w-full" : "w-full"}>
        <div className="relative grid w-full overflow-hidden">
          <div
            ref={boundarySnapshotHostRef}
            aria-hidden="true"
            className={`col-start-1 row-start-1 z-20 flex w-full justify-center ${
              boundarySnapshot
                ? "visible"
                : "pointer-events-none invisible"
            }`}
            style={{
              minHeight: boundarySnapshot?.height
                ? `${boundarySnapshot.height}px`
                : undefined,
            }}
          />

          {pdfStatus !== "error" && (
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
              className={`col-start-1 row-start-1 ${
                isPdfZoomed
                  ? "flex w-max min-w-full justify-start"
                  : "flex w-full justify-center"
              }`}
            >
              {pdfStatus === "ready" &&
              pdfPageCount > 0 &&
              activePdfRenderWidth > 0 ? (
                <div className="grid w-full">
                  {carouselSlots.map((slot, slotIndex) => {
                    const slotGlobalPageIndex = slot.globalPageIndex;
                    if (slotGlobalPageIndex === null) {
                      return (
                        <div
                          key={`pdf-carousel-slot-${slotIndex}`}
                          className="col-start-1 row-start-1"
                          style={getCarouselSlotStyle(slotIndex)}
                        />
                      );
                    }

                    const slotLocalPageNumber = hasMultiPartPdf
                      ? getLocalPageNumber(
                          slotGlobalPageIndex,
                          activePart,
                        )
                      : slotGlobalPageIndex + 1;
                    const isIncomingSlot =
                      slotIndex === carouselPendingSlotRef.current;

                    const handleSlotFailure = () => {
                      if (
                        isIncomingSlot &&
                        slotGlobalPageIndex ===
                          carouselPendingPageIndexRef.current &&
                        slot.renderToken ===
                          carouselRequestTokenRef.current
                      ) {
                        cancelCarouselRequest(
                          "That page could not be prepared. Please try again.",
                        );
                        return;
                      }

                      handlePdfLoadError(activeDocumentKey);
                    };

                    return (
                      <div
                        key={`pdf-carousel-slot-${slotIndex}`}
                        className={`col-start-1 row-start-1 flex w-full ${
                          isPdfZoomed ? "justify-start" : "justify-center"
                        }`}
                        style={getCarouselSlotStyle(slotIndex)}
                        onTransitionEnd={(event) => {
                          if (
                            event.propertyName === "transform" &&
                            carouselPhaseRef.current === "sliding" &&
                            slotIndex === carouselPendingSlotRef.current
                          ) {
                            finalizeCarouselTransition();
                          }
                        }}
                      >
                        <div className="relative shrink-0">
                          <Page
                            key={`${slotGlobalPageIndex}:${slot.renderToken}`}
                            pageNumber={slotLocalPageNumber}
                            inputRef={
                              slotIndex === activeCarouselSlot
                                ? pdfContentRef
                                : null
                            }
                            width={activePdfRenderWidth}
                            renderTextLayer={true}
                            renderAnnotationLayer={false}
                            onLoadSuccess={handlePdfPageLoadSuccess}
                            onLoadError={handleSlotFailure}
                            onRenderError={handleSlotFailure}
                            onRenderSuccess={() =>
                              handlePdfPageRenderSuccess(
                                slotIndex,
                                slot.renderToken,
                                slotGlobalPageIndex,
                              )
                            }
                            loading={null}
                            error={null}
                            className={`${
                              isPdfZoomed ? "mx-0" : "mx-auto"
                            } overflow-hidden rounded-[2px] bg-white shadow-[0_14px_42px_rgba(0,0,0,0.28)]`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Document>
          )}

          {!boundarySnapshot &&
            (pdfStatus === "idle" ||
              pdfStatus === "loading" ||
              (pdfStatus === "ready" &&
                (pdfRenderWidth === 0 || !hasRenderedPdfPage))) && (
              <div
                role="status"
                aria-live="polite"
                className="col-start-1 row-start-1 z-30 flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 text-center"
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

          {pdfStatus === "error" && (
            <div
              role="alert"
              className="col-start-1 row-start-1 z-30 flex min-h-[50vh] w-full flex-col items-center justify-center text-center"
            >
              <div className="max-w-sm rounded-3xl border border-white/10 bg-slate-950/90 px-6 py-7 shadow-2xl backdrop-blur-md">
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
        </div>
      </div>

      {carouselError && (
        <div
          role="alert"
          className="pointer-events-none absolute inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-2xl border border-rose-300/20 bg-slate-950/92 px-4 py-3 text-center text-xs font-medium text-rose-100 shadow-xl backdrop-blur-xl"
        >
          {carouselError}
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
