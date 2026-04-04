import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  BarChart2,
  MoreHorizontal,
  X,
  Wallet,
  Target,
  ListChecks,
  BookOpen,
  Users,
  MessageSquare,
  GraduationCap,
  Settings,
  LogOut,
  PiggyBank,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const moreItems = [
  { path: "/wallets", label: "Wallets", icon: Wallet, tier: "free" },
  { path: "/budgets", label: "Budgets", icon: Target, tier: "free" },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank, tier: "free" },
  { path: "/add-funds", label: "Add Funds", icon: TrendingUp, tier: "free" },
  { path: "/tasks", label: "Tasks", icon: ListChecks, tier: "paid" },
  { path: "/modules", label: "Modules", icon: BookOpen, tier: "paid" },
  { path: "/community", label: "Community", icon: Users, tier: "free" },
  { path: "/messages", label: "Messages", icon: MessageSquare, tier: "paid" },
  { path: "/coaching", label: "Coaching", icon: GraduationCap, tier: "paid" },
];

export default function BottomNav({
  onQuickAdd,
  isAdmin = false,
  isPaid = false,
  onLogout,
}) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const isMoreActive = !["/dashboard", "/expenses", "/analytics"].includes(
    location.pathname
  );

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    // fallback logout for non-Base44 setup
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("clara_user");

    window.location.href = "/login";
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border">
        <div className="relative flex items-end justify-around px-2 h-16">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-1 pb-2 pt-2 px-4 min-w-[52px] ${
              isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link
            to="/expenses"
            className={`flex flex-col items-center gap-1 pb-2 pt-2 px-4 min-w-[52px] ${
              isActive("/expenses") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-medium">Expenses</span>
          </Link>

          <div className="min-w-[64px] flex justify-center">
            <button
              onClick={onQuickAdd}
              className="absolute -top-5 w-14 h-14 grad-green rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
              style={{ boxShadow: "0 4px 20px hsl(145 60% 36% / 0.4)" }}
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          </div>

          <Link
            to="/analytics"
            className={`flex flex-col items-center gap-1 pb-2 pt-2 px-4 min-w-[52px] ${
              isActive("/analytics") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] font-medium">Analytics</span>
          </Link>

          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 pb-2 pt-2 px-4 min-w-[52px] ${
              isMoreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>

        <div className="h-safe-bottom" />
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-8"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-bold text-lg">More</h3>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1"
              type="button"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {moreItems.map((item) => {
              const locked = item.tier === "paid" && !isPaid;

              return (
                <Link
                  key={item.path}
                  to={locked ? "#" : item.path}
                  onClick={
                    locked
                      ? (e) => e.preventDefault()
                      : () => setMoreOpen(false)
                  }
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                    isActive(item.path)
                      ? "bg-primary text-white border-primary"
                      : locked
                      ? "bg-muted border-border text-muted-foreground/50"
                      : "bg-card border-border text-foreground hover:border-primary/30"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium text-center leading-tight">
                    {item.label}
                  </span>
                  {locked && (
                    <span className="text-[9px] font-bold bg-secondary/20 text-secondary-foreground px-1 rounded">
                      PRO
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted text-sm font-medium mb-3 w-full"
            >
              <Settings className="w-4 h-4" />
              Admin Panel
            </Link>
          )}

          <button
            onClick={handleLogout}
            type="button"
            className="flex items-center gap-3 p-3 rounded-xl text-sm text-destructive w-full hover:bg-destructive/5"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}