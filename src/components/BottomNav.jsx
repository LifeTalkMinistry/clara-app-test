import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  BarChart2,
  MoreHorizontal,
  X,
  Plus,
  Wallet,
  Target,
  PiggyBank,
  TrendingUp,
  ListChecks,
  BookOpen,
  Users,
  MessageSquare,
  GraduationCap,
  LogOut,
} from "lucide-react";

const moreItems = [
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/budgets", label: "Budgets", icon: Target },
  { path: "/savings-goals", label: "Savings", icon: PiggyBank },
  { path: "/add-funds", label: "Funds", icon: TrendingUp },
  { path: "/tasks", label: "Tasks", icon: ListChecks },
  { path: "/modules", label: "Modules", icon: BookOpen },
  { path: "/community", label: "Community", icon: Users },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/coaching", label: "Coaching", icon: GraduationCap },
];

export default function BottomNav({ onQuickAdd }) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#071018]/90 backdrop-blur-xl lg:hidden">
        <div className="relative flex h-16 items-end justify-around px-3 pb-2">
          <NavItem to="/dashboard" active={isActive("/dashboard")}>
            <LayoutDashboard className="h-5 w-5" />
            Home
          </NavItem>

          <NavItem to="/expenses" active={isActive("/expenses")}>
            <Receipt className="h-5 w-5" />
            Expenses
          </NavItem>

          <button
            onClick={onQuickAdd}
            className="absolute -top-6 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,#28d76d,#0ea56d)] shadow-[0_15px_30px_rgba(0,0,0,0.45)]"
          >
            <Plus className="h-6 w-6 text-white" />
          </button>

          <NavItem to="/analytics" active={isActive("/analytics")}>
            <BarChart2 className="h-5 w-5" />
            Analytics
          </NavItem>

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center text-xs text-white/50"
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 lg:hidden">
          <div className="max-h-[85vh] overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#071018] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">More</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-[#020617] p-3 text-white/80 transition hover:bg-white/8 hover:text-white"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] text-center leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>

            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-medium text-white">
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center text-xs transition ${
        active ? "text-emerald-400" : "text-white/50"
      }`}
    >
      {children}
    </Link>
  );
}