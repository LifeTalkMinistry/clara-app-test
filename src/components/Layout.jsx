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
  LogOut,
  TrendingUp,
  PiggyBank,
  Share2,
  ChevronRight,
} from "lucide-react";

import BottomNav from "./BottomNav";
import QuickAddModal from "./QuickAddModal";
import ClaraLogo from "./ClaraLogo";

const useUserRole = () => ({
  planLabel: "Admin",
  isAdmin: true,
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

function SidebarContent({ currentPath, planLabel, isAdmin, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-[#04111a] text-white">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,#0b1c16_0%,#11803b_58%,#1696c6_100%)] px-4 pb-5 pt-7">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
          <ClaraLogo variant="full" theme="dark" />
        </Link>

        <div className="mt-5 rounded-full bg-[#c9ef1d] px-4 py-2 text-center text-xs font-bold text-[#071018] shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
          {planLabel}
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        {allNavItems.map((item) => {
          const isActive =
            currentPath === item.path || currentPath.startsWith(item.path + "/");

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
                isActive
                  ? "bg-[linear-gradient(90deg,#0ca86a,#13c07a)] text-white shadow-[0_10px_24px_rgba(12,168,106,0.25)]"
                  : "text-white/72 hover:bg-white/6 hover:text-white"
              }`}
            >
              <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-white/65"}`} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 text-white/85" />}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-5">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Admin
            </div>

            <Link
              to="/admin"
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
                currentPath.startsWith("/admin")
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/6 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/60 transition hover:bg-white/6 hover:text-white">
          <LogOut className="h-4 w-4" />
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
      <div className="flex min-h-screen items-center justify-center bg-[#020817] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#134e3a_0%,transparent_22%),radial-gradient(circle_at_bottom_right,#0b1735_0%,transparent_28%),linear-gradient(180deg,#020817_0%,#04111a_100%)] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 shadow-[20px_0_60px_rgba(0,0,0,0.35)] lg:flex">
          <SidebarContent
            currentPath={location.pathname}
            planLabel={planLabel}
            isAdmin={isAdmin}
            onNavigate={() => {}}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-transparent px-4 py-3 backdrop-blur-xl lg:hidden">
            <Link to="/dashboard">
              <ClaraLogo variant="full" theme="dark" />
            </Link>

            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          <main className="flex-1 px-0 py-0 pb-24 md:px-0 md:py-0 lg:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            className="flex-1 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="h-full w-[290px] border-l border-white/10 shadow-2xl">
            <SidebarContent
              currentPath={location.pathname}
              planLabel={planLabel}
              isAdmin={isAdmin}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}