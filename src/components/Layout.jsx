import { useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import QuickCircle from "@/components/QuickCircle";
import QuickAddModal from "./QuickAddModal";
import AdsModal from "./AdsModal";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
import useUserRole from "../hooks/useUserRole";

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

    setTransactionsClosing(true);
    window.setTimeout(() => {
      navigate("/dashboard");
      setTransactionsClosing(false);
    }, 260);
  }, [navigate, transactionsClosing]);

  useEffect(() => {
    setTransactionsClosing(false);
  }, [location.pathname]);

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
            opacity: 0.62;
            transform: translateY(46vh) scale(0.58) rotateX(58deg);
            border-radius: 28px;
            filter: blur(4px);
          }
          58% {
            opacity: 1;
            transform: translateY(-1.5vh) scale(1.018) rotateX(-5deg);
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateX(0deg);
            border-radius: 0px;
            filter: blur(0px);
          }
        }

        @keyframes claraTransactionsCollapseOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateX(0deg);
            filter: blur(0px);
          }
          100% {
            opacity: 0.18;
            transform: translateY(46vh) scale(0.56) rotateX(60deg);
            filter: blur(5px);
          }
        }

        .clara-transactions-stage {
          transform-origin: center bottom;
          backface-visibility: hidden;
          perspective: 1200px;
          will-change: transform, opacity, filter;
        }

        .clara-transactions-stage-in {
          animation: claraTransactionsExpandIn 520ms cubic-bezier(.18,.88,.2,1) both;
        }

        .clara-transactions-stage-out {
          animation: claraTransactionsCollapseOut 260ms cubic-bezier(.4,0,.2,1) both;
          pointer-events: none;
        }
      `}</style>

      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[color:var(--theme-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
      )}

      {isTransactionsPage && (
        <button
          type="button"
          onClick={handleBackToDashboard}
          aria-label="Back to dashboard"
          className="fixed left-4 top-[calc(env(safe-area-inset-top)+0.875rem)] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-card)]/75 text-[color:var(--theme-text)] shadow-[0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--theme-card)]/90 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>
      )}

      {isTransactionsPage && (
        <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[color:var(--theme-text)]/35" />
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <main
          onTouchStart={handleTransactionsTouchStart}
          onTouchEnd={handleTransactionsTouchEnd}
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
