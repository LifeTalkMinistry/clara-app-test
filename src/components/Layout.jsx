import { useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import QuickAddModal from "./QuickAddModal";
import AdsModal from "./AdsModal";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
import useUserRole from "../hooks/useUserRole";

const MOTION_TRANSITION_KEY = "clara_motion_transition_origin";
const TRANSACTION_TRANSITION_KEY = "clara_transactions_transition_origin";
const MOTION_TARGET_KEY = "clara_motion_target_path";
const TRANSACTION_HINT_KEY = "clara_transactions_swipe_hint_seen_count";
const ANALYTICS_HINT_KEY = "clara_analytics_swipe_hint_seen_count";
const HINT_LIMIT = 3;
const LONG_PRESS_MS = 520;
const LONG_PRESS_MOVE_TOLERANCE = 12;

function getAppLoginUrl() {
  return `${window.location.origin}/clara-app-test/#/login`;
}

function isSettingsPath(pathname) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

function isTransactionsPath(pathname) {
  return pathname === "/expenses" || pathname.startsWith("/expenses/");
}

function isAnalyticsPath(pathname) {
  return pathname === "/analytics" || pathname.startsWith("/analytics/");
}

function isMotionPage(pathname) {
  return isTransactionsPath(pathname) || isAnalyticsPath(pathname);
}

function getHintKey(pathname) {
  return isAnalyticsPath(pathname) ? ANALYTICS_HINT_KEY : TRANSACTION_HINT_KEY;
}

function getFallbackTransitionOrigin() {
  const width = Math.min(window.innerWidth - 32, 360);
  const height = 170;

  return {
    x: (window.innerWidth - width) / 2,
    y: Math.max(window.innerHeight * 0.62, window.innerHeight - 240),
    width,
    height,
  };
}

function normalizeTransitionOrigin(origin) {
  const fallback = getFallbackTransitionOrigin();
  const next = origin && typeof origin === "object" ? origin : fallback;

  const width = Math.max(Number(next.width) || fallback.width, 80);
  const height = Math.max(Number(next.height) || fallback.height, 80);
  const x = Number.isFinite(Number(next.x)) ? Number(next.x) : fallback.x;
  const y = Number.isFinite(Number(next.y)) ? Number(next.y) : fallback.y;

  return { x, y, width, height };
}

function buildTransitionStyle(origin, dragY = 0) {
  if (typeof window === "undefined") return {};

  const rect = normalizeTransitionOrigin(origin);
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const dragProgress = Math.min(Math.max(dragY / 360, 0), 1);
  const dragScale = 1 - dragProgress * 0.075;
  const dragRadius = 26 * dragProgress;

  return {
    "--clara-origin-x": `${centerX - viewportWidth / 2}px`,
    "--clara-origin-y": `${centerY - viewportHeight / 2}px`,
    "--clara-origin-scale-x": Math.min(Math.max(rect.width / viewportWidth, 0.18), 0.95),
    "--clara-origin-scale-y": Math.min(Math.max(rect.height / viewportHeight, 0.12), 0.8),
    "--clara-origin-radius": "30px",
    "--clara-drag-y": `${dragY}px`,
    "--clara-drag-scale": dragScale,
    "--clara-drag-radius": `${dragRadius}px`,
  };
}

function readStoredTransitionOrigin() {
  try {
    const raw =
      sessionStorage.getItem(MOTION_TRANSITION_KEY) ||
      sessionStorage.getItem(TRANSACTION_TRANSITION_KEY);
    if (!raw) return getFallbackTransitionOrigin();
    return normalizeTransitionOrigin(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to read motion transition origin:", error);
    return getFallbackTransitionOrigin();
  }
}

function storeTransitionOriginFromElement(element, targetPath = "/expenses") {
  if (!element) return;

  try {
    const rect = element.getBoundingClientRect();
    const payload = JSON.stringify({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });

    sessionStorage.setItem(MOTION_TRANSITION_KEY, payload);
    sessionStorage.setItem(TRANSACTION_TRANSITION_KEY, payload);
    sessionStorage.setItem(MOTION_TARGET_KEY, targetPath);
  } catch (error) {
    console.error("Failed to store motion transition origin:", error);
  }
}

function shouldShowSwipeHint(hintKey) {
  try {
    const count = Number(localStorage.getItem(hintKey) || 0);
    if (!Number.isFinite(count) || count < 0) return true;
    return count < HINT_LIMIT;
  } catch (error) {
    console.error("Failed to read swipe hint count:", error);
    return true;
  }
}

function markSwipeHintSeen(hintKey) {
  try {
    const count = Number(localStorage.getItem(hintKey) || 0);
    const safeCount = Number.isFinite(count) && count >= 0 ? count : 0;
    localStorage.setItem(hintKey, String(Math.min(safeCount + 1, HINT_LIMIT)));
  } catch (error) {
    console.error("Failed to save swipe hint count:", error);
  }
}

function rubberBandDistance(distance) {
  if (distance <= 0) return 0;
  const viewportHeight = Math.max(window.innerHeight || 760, 1);
  return (distance * viewportHeight * 0.72) / (viewportHeight * 0.72 + distance);
}

function isFinanceCardTarget(element) {
  if (!element) return false;

  const hrefElement = element.closest?.("a[href]");
  const href = hrefElement?.getAttribute?.("href") || "";
  if (href.includes("/expenses") || href.includes("/analytics")) return true;

  const text = String(element.textContent || "").toLowerCase();
  return (
    text.includes("money left") ||
    text.includes("total expense") ||
    text.includes("over budget") ||
    text.includes("pause extra spending") ||
    text.includes("analytics") ||
    text.includes("insights")
  );
}

function findFinanceCardElement(element) {
  if (!element?.closest) return element;

  return (
    element.closest("[data-transaction-card]") ||
    element.closest("[data-analytics-card]") ||
    element.closest("[data-finance-card]") ||
    element.closest("a[href*='/expenses']") ||
    element.closest("a[href*='/analytics']") ||
    element.closest("button") ||
    element.closest(".rounded-[30px]") ||
    element.closest(".rounded-[28px]") ||
    element.closest(".rounded-3xl") ||
    element.closest(".rounded-2xl") ||
    element
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartYRef = useRef(null);
  const touchStartXRef = useRef(null);
  const touchStartScrollTopRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const touchLastYRef = useRef(0);
  const touchLastTimeRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adsModalOpen, setAdsModalOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState("voice");
  const [motionClosing, setMotionClosing] = useState(false);
  const [transitionOrigin, setTransitionOrigin] = useState(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDraggingMotion, setIsDraggingMotion] = useState(false);
  const [isReboundingMotion, setIsReboundingMotion] = useState(false);

  const { user, loading = false } = useUserRole() || {};

  const isDashboard = location.pathname === "/dashboard";
  const activeMotionPage = isMotionPage(location.pathname);

  const dragProgress = useMemo(() => Math.min(Math.max(dragY / 360, 0), 1), [dragY]);
  const overlayOpacity = Math.max(0.18, 1 - dragProgress * 0.78);
  const hintLabel = isAnalyticsPath(location.pathname)
    ? "Swipe down to return from analytics"
    : "Swipe down to go back";

  const openAssistant = useCallback((mode = "voice") => {
    setAssistantMode(mode || "voice");
    setAssistantOpen(true);
  }, []);

  const handleOpenQuickAdd = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleBackToDashboard = useCallback((options = {}) => {
    if (motionClosing) return;

    setShowSwipeHint(false);
    setIsDraggingMotion(false);
    setIsReboundingMotion(false);
    setTransitionOrigin(readStoredTransitionOrigin());
    setMotionClosing(true);

    const closeDelay = options.fast ? 260 : 380;
    window.setTimeout(() => {
      setDragY(0);
      navigate("/dashboard");
      setMotionClosing(false);
    }, closeDelay);
  }, [navigate, motionClosing]);

  useEffect(() => {
    if (activeMotionPage) {
      setTransitionOrigin(readStoredTransitionOrigin());
      setDragY(0);
      setIsDraggingMotion(false);
      setIsReboundingMotion(false);

      const hintKey = getHintKey(location.pathname);
      const canShowHint = shouldShowSwipeHint(hintKey);
      setShowSwipeHint(canShowHint);

      if (canShowHint) {
        markSwipeHintSeen(hintKey);
        const hideTimer = window.setTimeout(() => {
          setShowSwipeHint(false);
        }, 2600);

        return () => window.clearTimeout(hideTimer);
      }
    } else {
      setShowSwipeHint(false);
      setDragY(0);
      setIsDraggingMotion(false);
      setIsReboundingMotion(false);
    }

    setMotionClosing(false);
    return undefined;
  }, [activeMotionPage, location.pathname]);

  useEffect(() => {
    if (!isDashboard) return undefined;

    const captureFinanceOrigin = (event) => {
      const target = event.target;
      if (!isFinanceCardTarget(target)) return;

      const hrefElement = target.closest?.("a[href]");
      const href = hrefElement?.getAttribute?.("href") || "";
      const targetPath = href.includes("/analytics") ? "/analytics" : "/expenses";
      const cardElement = findFinanceCardElement(target);
      storeTransitionOriginFromElement(cardElement, targetPath);
    };

    const startLongPress = (event) => {
      const target = event.target;
      if (!isFinanceCardTarget(target)) return;

      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      longPressStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        target,
      };

      longPressTimerRef.current = window.setTimeout(() => {
        const cardElement = findFinanceCardElement(target);
        storeTransitionOriginFromElement(cardElement, "/analytics");
        longPressTriggeredRef.current = true;
        setShowSwipeHint(false);
        navigate("/analytics");
      }, LONG_PRESS_MS);
    };

    const moveLongPress = (event) => {
      if (!longPressStartRef.current) return;
      const dx = Math.abs(event.clientX - longPressStartRef.current.x);
      const dy = Math.abs(event.clientY - longPressStartRef.current.y);
      if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
        clearLongPressTimer();
      }
    };

    const endLongPress = (event) => {
      clearLongPressTimer();
      longPressStartRef.current = null;

      if (longPressTriggeredRef.current) {
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(() => {
          longPressTriggeredRef.current = false;
        }, 80);
      }
    };

    const blockClickAfterLongPress = (event) => {
      if (!longPressTriggeredRef.current) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("click", captureFinanceOrigin, true);
    document.addEventListener("pointerdown", startLongPress, true);
    document.addEventListener("pointermove", moveLongPress, true);
    document.addEventListener("pointerup", endLongPress, true);
    document.addEventListener("pointercancel", endLongPress, true);
    document.addEventListener("click", blockClickAfterLongPress, true);

    return () => {
      clearLongPressTimer();
      document.removeEventListener("click", captureFinanceOrigin, true);
      document.removeEventListener("pointerdown", startLongPress, true);
      document.removeEventListener("pointermove", moveLongPress, true);
      document.removeEventListener("pointerup", endLongPress, true);
      document.removeEventListener("pointercancel", endLongPress, true);
      document.removeEventListener("click", blockClickAfterLongPress, true);
    };
  }, [clearLongPressTimer, isDashboard, navigate]);

  useEffect(() => {
    const handleAssistantOpen = (event) => {
      openAssistant(event?.detail?.mode || "voice");
    };

    const handleManualExpenseOpen = () => {
      handleOpenQuickAdd();
    };

    window.addEventListener("clara:open-assistant", handleAssistantOpen);
    window.addEventListener("clara:open-ai-chat", handleAssistantOpen);
    window.addEventListener("clara:open-manual-expense", handleManualExpenseOpen);

    return () => {
      window.removeEventListener("clara:open-assistant", handleAssistantOpen);
      window.removeEventListener("clara:open-ai-chat", handleAssistantOpen);
      window.removeEventListener("clara:open-manual-expense", handleManualExpenseOpen);
    };
  }, [handleOpenQuickAdd, openAssistant]);

  const handleLogout = useCallback(async () => {
    try {
      setQuickAddOpen(false);
      await supabase.auth.signOut();
      window.location.replace(getAppLoginUrl());
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.replace(getAppLoginUrl());
    }
  }, []);

  const handleMotionTouchStart = useCallback((event) => {
    if (!activeMotionPage || motionClosing) return;
    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartYRef.current = touch.clientY;
    touchStartXRef.current = touch.clientX;
    touchStartScrollTopRef.current = event.currentTarget?.scrollTop || 0;
    touchStartTimeRef.current = Date.now();
    touchLastYRef.current = touch.clientY;
    touchLastTimeRef.current = Date.now();
    setIsReboundingMotion(false);
  }, [activeMotionPage, motionClosing]);

  const handleMotionTouchMove = useCallback((event) => {
    if (!activeMotionPage || motionClosing) return;
    if (touchStartYRef.current === null || touchStartXRef.current === null) return;

    const touch = event.touches?.[0];
    if (!touch) return;

    const rawDeltaY = touch.clientY - touchStartYRef.current;
    const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
    const startedAtTop = touchStartScrollTopRef.current <= 8;
    const isPullingDown = rawDeltaY > 0 && rawDeltaY > deltaX * 1.12;

    touchLastYRef.current = touch.clientY;
    touchLastTimeRef.current = Date.now();

    if (!startedAtTop || !isPullingDown) return;

    setShowSwipeHint(false);
    setIsDraggingMotion(true);
    setIsReboundingMotion(false);
    setDragY(rubberBandDistance(rawDeltaY));
  }, [activeMotionPage, motionClosing]);

  const handleMotionTouchEnd = useCallback((event) => {
    if (!activeMotionPage || motionClosing) return;
    if (touchStartYRef.current === null || touchStartXRef.current === null) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const now = Date.now();
    const deltaY = touch.clientY - touchStartYRef.current;
    const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
    const startedAtTop = touchStartScrollTopRef.current <= 8;
    const elapsed = Math.max(now - touchStartTimeRef.current, 16);
    const totalVelocity = deltaY / elapsed;
    const recentElapsed = Math.max(now - touchLastTimeRef.current, 16);
    const recentVelocity = (touch.clientY - touchLastYRef.current) / recentElapsed;
    const velocity = Math.max(totalVelocity, recentVelocity);
    const shouldClose =
      startedAtTop &&
      deltaY > 0 &&
      deltaY > deltaX * 1.15 &&
      (dragY > 128 || deltaY > 172 || (velocity > 0.72 && deltaY > 54));

    touchStartYRef.current = null;
    touchStartXRef.current = null;
    touchStartScrollTopRef.current = 0;
    touchStartTimeRef.current = 0;
    touchLastYRef.current = 0;
    touchLastTimeRef.current = 0;

    if (shouldClose) {
      handleBackToDashboard({ fast: velocity > 1.05 });
      return;
    }

    if (isDraggingMotion || dragY > 0) {
      setIsDraggingMotion(false);
      setIsReboundingMotion(true);
      setDragY(0);
      window.setTimeout(() => {
        setIsReboundingMotion(false);
      }, 260);
    }
  }, [activeMotionPage, dragY, handleBackToDashboard, isDraggingMotion, motionClosing]);

  return (
    <div className="theme-page-shell flex h-screen overflow-hidden text-white">
      <style>{`
        @keyframes claraMotionExpandIn {
          0% {
            opacity: 0.42;
            transform: translate3d(var(--clara-origin-x), var(--clara-origin-y), 0) scale(var(--clara-origin-scale-x), var(--clara-origin-scale-y)) rotateX(62deg);
            border-radius: var(--clara-origin-radius);
            filter: blur(5px) saturate(1.14);
            box-shadow: 0 22px 80px rgba(0,0,0,0.10);
          }
          38% {
            opacity: 0.92;
            transform: translate3d(calc(var(--clara-origin-x) * .18), calc(var(--clara-origin-y) * .18 - 22px), 0) scale(.92, .9) rotateX(13deg);
            border-radius: 30px;
            filter: blur(1px) saturate(1.08);
            box-shadow: 0 30px 110px rgba(0,0,0,0.28);
          }
          68% {
            opacity: 1;
            transform: translate3d(0, -10px, 0) scale(1.018, 1.012) rotateX(-4deg);
            border-radius: 26px;
            filter: blur(0px) saturate(1.04);
            box-shadow: 0 24px 90px rgba(0,0,0,0.22);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1, 1) rotateX(0deg);
            border-radius: 0px;
            filter: blur(0px) saturate(1);
            box-shadow: none;
          }
        }

        @keyframes claraMotionCollapseOut {
          0% {
            opacity: 1;
            transform: translate3d(0, var(--clara-drag-y, 0), 0) scale(var(--clara-drag-scale, 1)) rotateX(0deg);
            border-radius: var(--clara-drag-radius, 0px);
            filter: blur(0px) saturate(1);
          }
          100% {
            opacity: 0.14;
            transform: translate3d(var(--clara-origin-x), var(--clara-origin-y), 0) scale(var(--clara-origin-scale-x), var(--clara-origin-scale-y)) rotateX(64deg);
            border-radius: var(--clara-origin-radius);
            filter: blur(6px) saturate(1.18);
          }
        }

        @keyframes claraOverlayIn {
          0% { opacity: 0; backdrop-filter: blur(0px); }
          100% { opacity: 1; backdrop-filter: blur(10px); }
        }

        @keyframes claraOverlayOut {
          0% { opacity: 1; backdrop-filter: blur(10px); }
          100% { opacity: 0; backdrop-filter: blur(0px); }
        }

        @keyframes claraHintInOut {
          0% { opacity: 0; transform: translate(-50%, -8px); }
          18% { opacity: .5; transform: translate(-50%, 0); }
          76% { opacity: .5; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -8px); }
        }

        @keyframes claraContentSettle {
          0%, 42% { opacity: .72; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .clara-motion-stage {
          transform-origin: center center;
          backface-visibility: hidden;
          perspective: 1600px;
          will-change: transform, opacity, filter, border-radius, box-shadow;
          overflow: hidden;
          position: relative;
          z-index: 30;
          touch-action: pan-y;
        }

        .clara-motion-stage-in {
          animation: claraMotionExpandIn 680ms cubic-bezier(.16,.92,.22,1) both;
        }

        .clara-motion-stage-in > * {
          animation: claraContentSettle 780ms cubic-bezier(.16,.92,.22,1) both;
        }

        .clara-motion-stage-dragging {
          animation: none !important;
          transform: translate3d(0, var(--clara-drag-y), 0) scale(var(--clara-drag-scale)) rotateX(calc(var(--clara-drag-y) * .025deg));
          border-radius: var(--clara-drag-radius);
          box-shadow: 0 26px 90px rgba(0,0,0,0.28);
          transition: none;
        }

        .clara-motion-stage-rebound {
          animation: none !important;
          transform: translate3d(0, 0, 0) scale(1) rotateX(0deg);
          border-radius: 0px;
          transition: transform 260ms cubic-bezier(.18,.9,.24,1), border-radius 260ms cubic-bezier(.18,.9,.24,1), box-shadow 260ms ease;
        }

        .clara-motion-stage-out {
          animation: claraMotionCollapseOut 380ms cubic-bezier(.4,0,.2,1) both;
          pointer-events: none;
        }

        .clara-motion-overlay {
          animation: claraOverlayIn 360ms ease-out both;
          background:
            radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 30%),
            rgba(0,0,0,0.22);
          transition: opacity 120ms linear, backdrop-filter 120ms linear;
        }

        .clara-motion-overlay-out {
          animation: claraOverlayOut 380ms ease-in both;
        }

        .clara-motion-hint {
          animation: claraHintInOut 2600ms ease both;
        }
      `}</style>

      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[color:var(--theme-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
      )}

      {activeMotionPage && (
        <div
          style={!motionClosing ? { opacity: overlayOpacity } : undefined}
          className={`pointer-events-none fixed inset-0 z-20 clara-motion-overlay ${
            motionClosing ? "clara-motion-overlay-out" : ""
          }`}
        />
      )}

      {activeMotionPage && (
        <div
          className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[color:var(--theme-text)]/35 transition-opacity duration-150"
          style={{ opacity: Math.max(0.18, 1 - dragProgress * 1.4) }}
        />
      )}

      {activeMotionPage && showSwipeHint && !motionClosing && !isDraggingMotion && (
        <div className="clara-motion-hint pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+2.05rem)] z-40 -translate-x-1/2 rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-card)]/45 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-[color:var(--theme-text)]/50 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {hintLabel}
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <main
          onTouchStart={handleMotionTouchStart}
          onTouchMove={handleMotionTouchMove}
          onTouchEnd={handleMotionTouchEnd}
          onTouchCancel={handleMotionTouchEnd}
          style={activeMotionPage ? buildTransitionStyle(transitionOrigin, dragY) : undefined}
          className={`flex-1 overflow-y-auto pb-24 pt-3 ${
            activeMotionPage
              ? `clara-motion-stage ${
                  motionClosing
                    ? "clara-motion-stage-out"
                    : isDraggingMotion
                      ? "clara-motion-stage-dragging"
                      : isReboundingMotion
                        ? "clara-motion-stage-rebound"
                        : "clara-motion-stage-in"
                }`
              : ""
          }`}
        >
          {children}
        </main>
      </div>

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        userEmail={user?.email}
      />

      <AdsModal
        open={adsModalOpen}
        onClose={() => setAdsModalOpen(false)}
        userEmail={user?.email}
      />

      <ClaraAssistantPanel
        open={assistantOpen}
        mode={assistantMode}
        onClose={() => setAssistantOpen(false)}
      />
    </div>
  );
}
