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
  TrendingUp,
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
  { path: "/add-funds", label: "Add Funds", icon: TrendingUp },
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
  planLabel,
  isAdmin,
  isPaid,
  user,
  onLogout,
}) {
  return (
    <div className="flex flex-col h-full bg-[#071018] text-white">
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
          className="flex items-center gap-3 mb-4"
        >
          <ClaraLogo variant="full" theme="dark" />
        </Link>

        <div
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-center"
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
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold"
                  : isLocked
                  ? "text-white/30 cursor-not-allowed"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>

              {isLocked && (
                <span className="text-[9px] font-bold bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-md">
                  PRO
                </span>
              )}

              {isActive && (
                <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-yellow-400 to-lime-400" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Admin
              </p>
            </div>

            <Link
              to="/admin"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                currentPath.startsWith("/admin")
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        {!isPaid && (
          <Link
            to="/enroll"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full"
            style={{
              background: "linear-gradient(135deg, #15803D 0%, #0EA5E9 100%)",
              color: "white",
            }}
          >
            <Star className="w-4 h-4" />
            <span>Enroll Now</span>
          </Link>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 w-full transition-all"
        >
          <LogOut className="w-4 h-4" />
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

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020617]">
        <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-[#0b1f1a] via-[#0f172a] to-[#020617] text-white overflow-hidden">
      <aside className="hidden lg:flex w-64 border-r border-white/10 flex-shrink-0 flex-col shadow-lg">
        <SidebarContent
          currentPath={location.pathname}
          onClose={() => {}}
          planLabel={planLabel}
          isAdmin={isAdmin}
          isPaid={isPaid}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#071018] flex-shrink-0">
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
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent
                currentPath={location.pathname}
                onClose={() => setSidebarOpen(false)}
                planLabel={planLabel}
                isAdmin={isAdmin}
                isPaid={isPaid}
                user={user}
                onLogout={handleLogout}
              />
            </SheetContent>
          </Sheet>
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