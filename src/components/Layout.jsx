import { useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import QuickCircle from "@/components/QuickCircle";
import QuickAddModal from "./QuickAddModal";
import AdsModal from "./AdsModal";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
import useUserRole from "../hooks/useUserRole";

const TRANSACTION_TRANSITION_KEY = "clara_transactions_transition_origin";

function getAppLoginUrl() {
  return `${window.location.origin}/clara-app-test/#/login`;
}

function isSettingsPath(pathname) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

function isTransactionsPath(pathname) {
  return pathname === "/expenses" || pathname.startsWith("/expenses/");
}

function isStandaloneFocusPage(pathname) {
  return (
    pathname === "/profile" ||
    isSettingsPath(pathname) ||
    isTransactionsPath(pathname)
  );
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

function buildTransitionStyle(origin) {
  if (typeof window === "undefined") return {};

  const rect = normalizeTransitionOrigin(origin);
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return {
    "--clara-origin-x": `${centerX - viewportWidth / 2}px`,
    "--clara-origin-y": `${centerY - viewportHeight / 2}px`,
    "--clara-origin-scale-x": Math.min(Math.max(rect.width / viewportWidth, 0.18), 0.95),
    "--clara-origin-scale-y": Math.min(Math.max(rect.height / viewportHeight, 0.12), 0.8),
    "--clara-origin-radius": "30px",
  };
}

function readStoredTransitionOrigin() {
  try {
    const raw = sessionStorage.getItem(TRANSACTION_TRANSITION_KEY);
    if (!raw) return getFallbackTransitionOrigin();
    return normalizeTransitionOrigin(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to read transaction transition origin:", error);
    return getFallbackTransitionOrigin();
  }
}

function storeTransitionOriginFromElement(element) {
  if (!element) return;

  try {
    const rect = element.getBoundingClientRect();
    sessionStorage.setItem(
      TRANSACTION_TRANSITION_KEY,
      JSON.stringify({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
    );
  } catch (error) {
    console.error("Failed to store transaction transition origin:", error);
  }
}

function isExpensesTarget(element) {
  if (!element) return false;

  const hrefElement = element.closest?.("a[href]");
  const href = hrefElement?.getAttribute?.("href") || "";
  if (href.includes("/expenses")) return true;

  const text = String(element.textContent || "").toLowerCase();
  return (
    text.includes("money left") ||
    text.includes("total expense") ||
    text.includes("over budget") ||
    text.includes("pause extra spending")
  );
}

function findTransactionCardElement(element) {
  if (!element?.closest) return element;

  return (
    element.closest("[data-transaction-card]") ||
    element.closest("a[href*='/expenses']") ||
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

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adsModalOpen, setAdsModalOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState("voice");
  const [transactionsClosing, setTransactionsClosing] = useState(false);
  const [transitionOrigin, setTransitionOrigin] = useState(null);

  const { user, loading = false } = useUserRole() || {};

  const isDashboard = location.pathname === "/dashboard";
  const isTransactionsPage = isTransactionsPath(location.pathname);
  const hideMobileControlCenter = isStandaloneFocusPage(location.pathname) || isDashboard;

  const openAssistant = useCallback((mode = "voice") => {
    setAssistantMode(mode || "voice");
    setAssistantOpen(true);
  }, []);

  const handleOpenQuickAdd = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    if (transactionsClosing) return;

    setTransitionOrigin(readStoredTransitionOrigin());
    setTransactionsClosing(true);
    window.setTimeout(() => {
      navigate("/dashboard");
      setTransactionsClosing(false);
    }, 330);
  }, [navigate, transactionsClosing]);

  useEffect(() => {
    if (isTransactionsPage) {
      setTransitionOrigin(readStoredTransitionOrigin());
    }
    setTransactionsClosing(false);
  }, [isTransactionsPage, location.pathname]);

  useEffect(() => {
    if (!isDashboard) return undefined;

    const captureTransactionOrigin = (event) => {
      const target = event.target;
      if (!isExpensesTarget(target)) return;

      const cardElement = findTransactionCardElement(target);
      storeTransitionOriginFromElement(cardElement);
    };

    document.addEventListener("click", captureTransactionOrigin, true);

    return () => {
      document.removeEventListener("click", captureTransactionOrigin, true);
    };
  }, [isDashboard]);

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

  const handleTransactionsTouchStart = useCallback((event) => {
    if (!isTransactionsPage || transactionsClosing) return;
    const touch = event.touches?.[0];
    if (!touch) return;

    touchStartYRef.current = touch.clientY;
    touchStartXRef.current = touch.clientX;
    touchStartScrollTopRef.current = event.currentTarget?.scrollTop || 0;
  }, [isTransactionsPage, transactionsClosing]);

  const handleTransactionsTouchEnd = useCallback((event) => {
    if (!isTransactionsPage || transactionsClosing) return;
    if (touchStartYRef.current === null || touchStartXRef.current === null) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const deltaY = touch.clientY - touchStartYRef.current;
    const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
    const startedAtTop = touchStartScrollTopRef.current <= 8;

    touchStartYRef.current = null;
    touchStartXRef.current = null;
    touchStartScrollTopRef.current = 0;

    if (startedAtTop && deltaY > 110 && deltaY > deltaX * 1.25) {
      handleBackToDashboard();
    }
  }, [handleBackToDashboard, isTransactionsPage, transactionsClosing]);

  return (
    <div className="theme-page-shell flex h-screen overflow-hidden text-white">
      <style>{`
        @keyframes claraTransactionsExpandIn {
          0% {
            opacity: 0.48;
            transform: translate3d(var(--clara-origin-x), var(--clara-origin-y), 0) scale(var(--clara-origin-scale-x), var(--clara-origin-scale-y)) rotateX(58deg);
            border-radius: var(--clara-origin-radius);
            filter: blur(4px) saturate(1.12);
          }
          52% {
            opacity: 1;
            transform: translate3d(0, -10px, 0) scale(1.018, 1.012) rotateX(-4deg);
            border-radius: 26px;
            filter: blur(0px) saturate(1.04);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1, 1) rotateX(0deg);
            border-radius: 0px;
            filter: blur(0px) saturate(1);
          }
        }

        @keyframes claraTransactionsCollapseOut {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1, 1) rotateX(0deg);
            border-radius: 0px;
            filter: blur(0px) saturate(1);
          }
          100% {
            opacity: 0.18;
            transform: translate3d(var(--clara-origin-x), var(--clara-origin-y), 0) scale(var(--clara-origin-scale-x), var(--clara-origin-scale-y)) rotateX(60deg);
            border-radius: var(--clara-origin-radius);
            filter: blur(5px) saturate(1.18);
          }
        }

        .clara-transactions-stage {
          transform-origin: center center;
          backface-visibility: hidden;
          perspective: 1400px;
          will-change: transform, opacity, filter, border-radius;
          overflow: hidden;
        }

        .clara-transactions-stage-in {
          animation: claraTransactionsExpandIn 560ms cubic-bezier(.16,.92,.22,1) both;
        }

        .clara-transactions-stage-out {
          animation: claraTransactionsCollapseOut 330ms cubic-bezier(.4,0,.2,1) both;
          pointer-events: none;
        }
      `}</style>

      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[color:var(--theme-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
      )}

      {isTransactionsPage && (
        <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[color:var(--theme-text)]/35" />
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <main
          onTouchStart={handleTransactionsTouchStart}
          onTouchEnd={handleTransactionsTouchEnd}
          style={isTransactionsPage ? buildTransitionStyle(transitionOrigin) : undefined}
          className={`flex-1 overflow-y-auto pb-24 pt-3 ${
            isTransactionsPage
              ? `clara-transactions-stage ${transactionsClosing ? "clara-transactions-stage-out" : "clara-transactions-stage-in"}`
              : ""
          }`}
        >
          {children}
        </main>
      </div>

      {!hideMobileControlCenter && (
        <QuickCircle
          onQuickAdd={handleOpenQuickAdd}
          onOpenAssistant={openAssistant}
        />
      )}

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
