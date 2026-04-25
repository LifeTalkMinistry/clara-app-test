import { useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
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

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adsModalOpen, setAdsModalOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState("voice");

  const { user, loading = false } = useUserRole() || {};

  const openAssistant = useCallback((mode = "voice") => {
    setAssistantMode(mode || "voice");
    setAssistantOpen(true);
  }, []);

  const handleOpenQuickAdd = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

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

  const isDashboard = location.pathname === "/dashboard";
  const isTransactionsPage = isTransactionsPath(location.pathname);
  const hideMobileControlCenter = isStandaloneFocusPage(location.pathname) || isDashboard;

  return (
    <div className="theme-page-shell flex h-screen overflow-hidden text-white">
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

      <div className="relative flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-24 pt-3">{children}</main>
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
