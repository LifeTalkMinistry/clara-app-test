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
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import QuickAddModal from "./QuickAddModal";
import AdsModal from "./AdsModal";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
import useUserRole from "../hooks/useUserRole";
import useAdvertiserMenuAccess from "../hooks/useAdvertiserMenuAccess";
import ClaraLogo from "./ClaraLogo";
import { FEATURE_ROUTE_MAP } from "@/lib/plan-config";

const allNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/feed", label: "Feed", icon: Users, pro: true },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/budgets", label: "Budgets", icon: Target },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/ai", label: "CLARA AI", icon: Brain, pro: true },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank, pro: true },
  { path: "/tasks", label: "Tasks", icon: ListChecks, pro: true },
  { path: "/modules", label: "Modules", icon: BookOpen, pro: true },
  { path: "/messages", label: "Messages", icon: MessageSquare, pro: true },
  { path: "/news", label: "News", icon: Bell },
  { path: "/referrals", label: "Referrals", icon: Share2, ambassadorOnly: true },
];

const advertiserNavItems = [
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings/account", label: "Settings", icon: Settings },
];

function isSettingsPath(pathname) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

function SidebarLink({ item, isActive, isLocked, onNavigate, onClose }) {
  const handleClick = (e) => {
    if (isLocked) {
      e.preventDefault();
      onNavigate("/enroll");
      return;
    }
    onClose?.();
  };

  return (
    <Link
      to={isLocked ? "/enroll" : item.path}
      onClick={handleClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
        isActive
          ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white"
          : isLocked
          ? "text-white/65 hover:bg-white/10"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>

      {isLocked && (
        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
          <Lock className="h-3 w-3" />
          PRO
        </span>
      )}

      {isActive && (
        <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-yellow-400 to-lime-400" />
      )}
    </Link>
  );
}

function isStandaloneFocusPage(pathname) {
  return pathname === "/profile" || isSettingsPath(pathname);
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adsModalOpen, setAdsModalOpen] = useState(false);

  // ✅ AI assistant state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState("voice");

  const {
    user,
    planLabel = "FREE",
    isAdmin = false,
    isPaid = false,
    isFree = false,
    isFeatureAvailable,
    loading = false,
  } = useUserRole() || {};

  const role = String(user?.role || "user").toLowerCase();
  const isAdvertiser = role === "advertiser";

  const handleLogout = useCallback(async () => {
    try {
      setQuickAddOpen(false);
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [navigate]);

  const handleOpenQuickAdd = useCallback(() => {
    if (isAdvertiser) return;
    setQuickAddOpen(true);
  }, [isAdvertiser]);

  const hideMobileControlCenter = isStandaloneFocusPage(location.pathname);

  useEffect(() => {
    if (hideMobileControlCenter) {
      // no-op
    }
  }, [hideMobileControlCenter]);

  return (
    <div className="theme-page-shell flex h-screen overflow-hidden text-white">
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[color:var(--theme-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto pb-24 pt-3">
          {children}
        </main>
      </div>

      {!isAdvertiser && !hideMobileControlCenter && (
        <button
          type="button"
          onClick={handleOpenQuickAdd}
          aria-label="Open quick add"
          className="fixed bottom-6 left-1/2 z-50 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-[7px] border-black/70 bg-gradient-to-br from-amber-300 via-orange-400 to-amber-600 text-white shadow-[0_18px_45px_rgba(245,158,11,0.35),0_0_0_1px_rgba(255,255,255,0.16)_inset] transition-transform duration-200 active:scale-95"
        >
          <Plus className="h-10 w-10 stroke-[2.6]" />
        </button>
      )}

      {!isAdvertiser && (
        <QuickAddModal
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          userEmail={user?.email}
        />
      )}

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
