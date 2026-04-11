import { Link, useLocation } from "react-router-dom";
import { useState, useCallback, useMemo, useRef } from "react";
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
  ArrowRightLeft,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";

const LONG_PRESS_MS = 500;

const moreItems = [
  { path: "/wallets", label: "Wallets", icon: Wallet, tier: "free" },
  { path: "/budgets", label: "Budgets", icon: Target, tier: "free" },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank, tier: "free" },
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const [didLongPress, setDidLongPress] = useState(false);

  const pressTimerRef = useRef(null);
  const pointerDownRef = useRef(false);

  const isActive = useCallback(
    (path) =>
      location.pathname === path || location.pathname.startsWith(path + "/"),
    [location.pathname]
  );

  const isMoreActive = useMemo(
    () =>
      !["/dashboard", "/expenses", "/analytics"].includes(location.pathname),
    [location.pathname]
  );

  const handleLogout = useCallback(async () => {
    if (onLogout) return onLogout();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [onLogout]);

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const startPress = () => {
    pointerDownRef.current = true;

    pressTimerRef.current = setTimeout(() => {
      if (!pointerDownRef.current) return;
      setDidLongPress(true);
      setMoreOpen(false);
      setActionsOpen(true);
    }, LONG_PRESS_MS);
  };

  const endPress = () => {
    pointerDownRef.current = false;
    clearPressTimer();
  };

  const handleFabClick = () => {
    if (didLongPress) {
      setDidLongPress(false);
      return;
    }

    setActionsOpen(false);
    onQuickAdd?.();
  };

  const openQuickAction = (action) => {
    setActionsOpen(false);
    setDidLongPress(false);
    onQuickAdd?.(action);
  };

  return (
    <>
      {/* QUICK ACTIONS */}
      {actionsOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px]"
            onClick={() => setActionsOpen(false)}
          />

          <div className="fixed bottom-24 left-0 right-0 z-[60] px-4">
            <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-[#0B1220]/95 p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex justify-between">
                <p className="text-sm font-semibold text-white">Quick Actions</p>
                <X
                  className="w-4 h-4 text-white/60 cursor-pointer"
                  onClick={() => setActionsOpen(false)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => openQuickAction("expense")} className="quick-btn">
                  <Receipt className="icon" />
                  Add Expense
                </button>

                <button onClick={() => openQuickAction("income")} className="quick-btn">
                  <TrendingUp className="icon" />
                  Add Funds
                </button>

                <button onClick={() => openQuickAction("transfer")} className="quick-btn">
                  <ArrowRightLeft className="icon" />
                  Transfer
                </button>

                <Link to="/savings-goals" onClick={() => setActionsOpen(false)} className="quick-btn">
                  <PiggyBank className="icon" />
                  Add Goal
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* NAV BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="mx-3 mb-3 rounded-3xl border border-white/10 bg-[#0B1220]/95 backdrop-blur-xl shadow-2xl">
          <div className="relative flex items-center justify-between h-16 px-6">

            <Link to="/dashboard" className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}>
              <LayoutDashboard className="icon" />
              Home
            </Link>

            <Link to="/expenses" className={`nav-item ${isActive("/expenses") ? "active" : ""}`}>
              <Receipt className="icon" />
              Transactions
            </Link>

            <div className="w-16" />

            <Link to="/analytics" className={`nav-item ${isActive("/analytics") ? "active" : ""}`}>
              <BarChart2 className="icon" />
              Analytics
            </Link>

            <button onClick={() => setMoreOpen(true)} className={`nav-item ${isMoreActive ? "active" : ""}`}>
              <MoreHorizontal className="icon" />
              More
            </button>

            {/* FLOATING BUTTON */}
            <button
              onMouseDown={startPress}
              onMouseUp={endPress}
              onTouchStart={startPress}
              onTouchEnd={endPress}
              onClick={handleFabClick}
              className="absolute left-1/2 -translate-x-1/2 -top-8 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition active:scale-95"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              <Plus className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </nav>

      {/* MORE PANEL */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="bg-[#0B1220] text-white rounded-t-3xl">
          <div className="mb-4 flex justify-between">
            <h3 className="font-bold text-lg">More</h3>
            <X onClick={() => setMoreOpen(false)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {moreItems.map((item) => {
              const locked = item.tier === "paid" && !isPaid;

              return (
                <Link
                  key={item.path}
                  to={locked ? "#" : item.path}
                  className={`more-item ${locked ? "locked" : ""}`}
                >
                  <item.icon className="icon" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {isAdmin && (
            <Link to="/admin" className="more-admin">
              <Settings className="icon" />
              Admin Panel
            </Link>
          )}

          <button onClick={handleLogout} className="logout-btn">
            <LogOut className="icon" />
            Log Out
          </button>
        </SheetContent>
      </Sheet>

      {/* STYLES (INLINE CLEAN SYSTEM) */}
      <style jsx>{`
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 10px;
          color: rgba(255,255,255,0.6);
        }
        .nav-item.active {
          color: #34d399;
        }
        .icon {
          width: 20px;
          height: 20px;
        }
        .quick-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
        }
        .more-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
        }
        .logout-btn {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          color: #f87171;
        }
      `}</style>
    </>
  );
}