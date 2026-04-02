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
  LogOut
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
      {/* NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 
        bg-[#071018]/95 backdrop-blur-xl border-t border-white/10">

        <div className="relative flex items-end justify-around h-16 px-3">

          <NavItem to="/dashboard" active={isActive("/dashboard")}>
            <LayoutDashboard className="w-5 h-5" />
            Home
          </NavItem>

          <NavItem to="/expenses" active={isActive("/expenses")}>
            <Receipt className="w-5 h-5" />
            Expenses
          </NavItem>

          {/* FAB */}
          <button
            onClick={onQuickAdd}
            className="absolute -top-6 left-1/2 -translate-x-1/2 
            w-14 h-14 rounded-full 
            bg-gradient-to-br from-green-400 to-emerald-600 
            flex items-center justify-center 
            shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>

          <NavItem to="/analytics" active={isActive("/analytics")}>
            <BarChart2 className="w-5 h-5" />
            Analytics
          </NavItem>

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center text-xs text-white/50"
          >
            <MoreHorizontal className="w-5 h-5" />
            More
          </button>

        </div>
      </nav>

      {/* MORE */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col justify-end">

          <div className="bg-[#071018] rounded-t-3xl p-4 max-h-[85vh] overflow-y-auto">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">More</h3>
              <button onClick={() => setMoreOpen(false)}>
                <X className="text-white" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 p-3 
                  bg-[#020617] rounded-xl text-white/80 hover:bg-white/10"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] text-center">{item.label}</span>
                </Link>
              ))}
            </div>

            <button className="w-full mt-4 p-3 bg-red-500 rounded-xl text-white flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
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
        active ? "text-green-400" : "text-white/50"
      }`}
    >
      {children}
    </Link>
  );
}