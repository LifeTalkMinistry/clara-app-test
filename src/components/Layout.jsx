import { Outlet, Link, useLocation } from "react-router-dom";
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
  X,
  LogOut,
  TrendingUp,
  PiggyBank,
  Share2,
} from "lucide-react";

import BottomNav from "./BottomNav";
import QuickAddModal from "./QuickAddModal";
import ClaraLogo from "./ClaraLogo";

// TEMP STATIC ROLE
const useUserRole = () => ({
  user: { email: "demo@clara.app", referral_enabled: true },
  planLabel: "Admin",
  isAdmin: true,
  isPaid: true,
  loading: false,
});

const allNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/add-funds", label: "Add Funds", icon: TrendingUp },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/budgets", label: "Budgets", icon: Target },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/tasks", label: "Tasks", icon: ListChecks },
  { path: "/modules", label: "Modules", icon: BookOpen },
  { path: "/community", label: "Community", icon: Users },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/coaching", label: "Coaching", icon: GraduationCap },
  { path: "/referrals", label: "Referrals", icon: Share2 },
];

function SidebarContent({ currentPath, onClose, planLabel, isAdmin }) {
  return (
    <div className="flex flex-col h-full bg-[#04111d] text-white">
      <div className="px-4 pt-6 pb-5 bg-gradient-to-br from-[#061018] via-[#0E7A39] to-[#1A9DCC] border-b border-white/10">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 mb-5"
        >
          <ClaraLogo variant="full" theme="dark" />
        </Link>

        <div className="w-full rounded-full bg-[#C7F000] text-[#071018] text-sm font-bold py-2 text-center shadow-sm">
          {planLabel}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {allNavItems.map((item) => {
          const isActive =
            currentPath === item.path || currentPath.startsWith(item.path + "/");

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-all ${
                isActive
                  ? "bg-[#0DBA72] text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "text-white/78 hover:bg-white/8 hover:text-white"
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${
                  isActive ? "text-white" : "text-white/75 group-hover:text-white"
                }`}
              />
              <span>{item.label}</span>

              {isActive && (
                <span className="ml-auto h-6 w-1.5 rounded-full bg-yellow-300" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40">
              Admin
            </div>

            <Link
              to="/admin"
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-all ${
                currentPath === "/admin" || currentPath.startsWith("/admin/")
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/72 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button className="flex items-center gap-3 px-3 py-3 rounded-2xl text-sm text-white/65 hover:bg-white/8 hover:text-white w-full transition">
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { planLabel, isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020817] text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/10 bg-[#04111d]">
          <SidebarContent
            currentPath={location.pathname}
            onClose={() => {}}
            planLabel={planLabel}
            isAdmin={isAdmin}
          />
        </aside>

        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-[82%] max-w-[300px] h-full shadow-2xl">
              <SidebarContent
                currentPath={location.pathname}
                onClose={() => setSidebarOpen(false)}
                planLabel={planLabel}
                isAdmin={isAdmin}
              />
            </div>

            <button
              className="flex-1 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            />
          </div>
        )}

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* MOBILE HEADER */}
          <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#071018]/95 backdrop-blur-xl">
            <ClaraLogo variant="full" theme="dark" className="scale-[0.92] origin-left" />

            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
              aria-label="Open menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </header>

          {/* MAIN */}
          <main className="flex-1 pb-24 lg:pb-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="lg:hidden">
        <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      </div>

      {/* QUICK ADD MODAL */}
      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />
    </div>
  );
}