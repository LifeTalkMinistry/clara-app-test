import { useLocation } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
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

function isStandaloneFocusPage(pathname) {
  return pathname === "/profile" || isSettingsPath(pathname);
}

export default function Layout({ children }) {
  const location = useLocation();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adsModalOpen, setAdsModalOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState("voice");

  const { user, loading = false } = useUserRole() || {};

  const openAssistant = useCallback((mode = "voice") => {
    setAssistantMode(mode || "voice");
    setAssistantOpen(true);
  }, []);

  useEffect(() => {
    const handleEmbeddedAssistantOpen = (event) => {
      openAssistant(event?.detail?.mode || "voice");
    };

    window.addEventListener("clara:open-assistant", handleEmbeddedAssistantOpen);

    return () => {
      window.removeEventListener("clara:open-assistant", handleEmbeddedAssistantOpen);
    };
  }, [openAssistant]);

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

  const handleOpenQuickAdd = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

  const isDashboard = location.pathname === "/dashboard";
  const hideMobileControlCenter = isStandaloneFocusPage(location.pathname) || isDashboard;

  return (
    <div className="theme-page-shell flex h-screen overflow-hidden text-white">
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[color:var(--theme-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
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
