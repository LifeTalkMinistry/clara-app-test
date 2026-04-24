import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  BarChart2,
  Brain,
  ListChecks,
  BookOpen,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  PiggyBank,
  Star,
  Share2,
  Shield,
  User,
  Bell,
  Megaphone,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import QuickCircle from "@/components/QuickCircle";
import DashboardInsightCarousel from "@/components/DashboardInsightCarousel";
import QuickAddModal from "./QuickAddModal";
import AdsModal from "./AdsModal";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
import useUserRole from "../hooks/useUserRole";
import ClaraLogo from "./ClaraLogo";

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
  const navigate = useNavigate();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adsModalOpen, setAdsModalOpen] = useState(false);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState("voice");

  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const {
    user,
    isAdmin = false,
    isFree = false,
    isFeatureAvailable,
    loading = false,
  } = useUserRole() || {};

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

  useEffect(() => {
    if (!user?.id || location.pathname !== "/dashboard") return;

    const fetchData = async () => {
      try {
        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .limit(100);

        const { data: budgetsData } = await supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id);

        setExpenses(expensesData || []);
        setBudgets(budgetsData || []);
      } catch (e) {
        console.error("Insight fetch error", e);
      }
    };

    fetchData();
  }, [user?.id, location.pathname]);

  const hideMobileControlCenter = isStandaloneFocusPage(location.pathname);

  return (
    <div className="theme-page-shell flex h-screen overflow-hidden text-white">
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[color:var(--theme-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-24 pt-3">
          {location.pathname === "/dashboard" && (
            <DashboardInsightCarousel expenses={expenses} budgets={budgets} />
          )}

          {children}
        </main>
      </div>

      {!hideMobileControlCenter && (
        <QuickCircle
          onQuickAdd={handleOpenQuickAdd}
          onOpenAssistant={(mode) => {
            setAssistantMode(mode);
            setAssistantOpen(true);
          }}
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
