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
} from "lucide-react";

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

function SidebarContent({ currentPath, planLabel, isAdmin }) {
  return (
    <div className="flex flex-col h-full bg-[#03121c] text-white">

      <div className="px-4 pt-6 pb-5 bg-gradient-to-br from-[#061018] via-[#0E7A39] to-[#1A9DCC] border-b border-white/10">
        <Link to="/dashboard" className="text-xl font-bold tracking-wide">
          CLARA
        </Link>

        <div className="mt-4 rounded-full bg-[#C7F000] text-[#071018] text-xs font-bold py-2 text-center">
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
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                isActive
                  ? "bg-[#0DBA72] text-white font-semibold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <div className="px-3 pb-2 text-[11px] uppercase text-white/40">
              Admin
            </div>

            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                currentPath.startsWith("/admin")
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/60 hover:bg-white/10 w-full">
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { planLabel, isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020817] text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#020817] text-white">

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/10">
        <SidebarContent
          currentPath={location.pathname}
          planLabel={planLabel}
          isAdmin={isAdmin}
        />
      </aside>

      {/* MAIN */}
      <main className="flex-1 px-6 py-6">
        <Outlet />
      </main>

    </div>
  );
}