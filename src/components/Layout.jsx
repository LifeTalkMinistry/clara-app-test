import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  BarChart2,
  ListChecks,
  BookOpen,
  Users,
  MessageSquare,
  GraduationCap,
  Settings,
  Menu,
  LogOut,
  PiggyBank,
  Star,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "./BottomNav";
import QuickAddModal from "./QuickAddModal";
import useUserRole from "../hooks/useUserRole";
import ClaraLogo from "./ClaraLogo";

const allNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/budgets", label: "Budgets", icon: Target },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/tasks", label: "Tasks", icon: ListChecks, tier: "paid" },
  { path: "/modules", label: "Modules", icon: BookOpen, tier: "paid" },
  { path: "/community", label: "Community", icon: Users },
  { path: "/messages", label: "Messages", icon: MessageSquare, tier: "paid" },
  { path: "/coaching", label: "Coaching", icon: GraduationCap, tier: "paid" },
  { path: "/referrals", label: "Referrals", icon: Share2, ambassadorOnly: true },
];

function SidebarContent({
  currentPath,
  onClose,
  onNavigate,
  planLabel,
  isAdmin,
  isPaid,
  user,
  onLogout,
}) {
  return (
    <div className="flex h-full flex-col bg-[#071018] text-white">
      <div
        className="px-4 py-5"
        style={{
          background:
            "linear-gradient(160deg, #020617 0%, #15803D 60%, #0EA5E9 100%)",
        }}
      >
        <Link
          to="/dashboard"
          onClick={onClose}
          className="mb-4 flex items-center gap-3"
        >
          <ClaraLogo variant="full" theme="dark" />
        </Link>

        <div
          className="rounded-lg px-3 py-1.5 text-center text-xs font-bold"
          style={{ background: "#B7E61D", color: "#071018" }}
        >
          {planLabel}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {allNavItems.map((item) => {
          const isActive =
            currentPath === item.path ||
            currentPath.startsWith(item.path + "/");
          const isLocked = item.tier === "paid" && !isPaid;
          const referralNotEnabled =
            item.ambassadorOnly && !user?.referral_enabled;

          if (referralNotEnabled) return null;

          return (
            <Link
              key={item.path}
              to={isLocked ? "#" : item.path}
              onClick={isLocked ? (e) => e.preventDefault() : onClose}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white"
                  : isLocked
                    ? "cursor-not-allowed text-white/30"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>

              {isLocked && (
                <span className="rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
                  PRO
                </span>
              )}

              {isActive && (
                <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-yellow-400 to-lime-400" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="px-3 pb-1 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Admin
              </p>
            </div>

            <Link
              to="/admin"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                currentPath.startsWith("/admin")
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        {!isPaid && (
          <Link
            to="/enroll"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #15803D 0%, #0EA5E9 100%)",
              color: "white",
            }}
          >
            <Star className="h-4 w-4" />
            <span>Enroll Now</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => onNavigate("/settings")}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
            currentPath === "/settings"
              ? "bg-white/10 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition-all hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const {
    user,
    planLabel = "FREE",
    isAdmin = false,
    isPaid = false,
    loading = false,
  } = useUserRole() || {};

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSidebarOpen(false);
    navigate("/login");
  };

  const handleNavigate = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020617]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#0b1f1a] via-[#0f172a] to-[#020617] text-white">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-white/10 shadow-lg lg:flex">
        <SidebarContent
          currentPath={location.pathname}
          onClose={() => {}}
          onNavigate={handleNavigate}
          planLabel={planLabel}
          isAdmin={isAdmin}
          isPaid={isPaid}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex-shrink-0 border-b border-white/10 bg-[#071018] px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Link to="/dashboard">
              <ClaraLogo variant="full" theme="dark" />
            </Link>

            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent
                  currentPath={location.pathname}
                  onClose={() => setSidebarOpen(false)}
                  onNavigate={handleNavigate}
                  planLabel={planLabel}
                  isAdmin={isAdmin}
                  isPaid={isPaid}
                  user={user}
                  onLogout={handleLogout}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav
        onQuickAdd={() => setQuickAddOpen(true)}
        isAdmin={isAdmin}
        isPaid={isPaid}
        onLogout={handleLogout}
      />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        userEmail={user?.email}
      />
    </div>
  );
}