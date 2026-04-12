import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Lock,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";

const LONG_PRESS_MS = 500;

const moreItems = [
  { path: "/wallets", label: "Wallets", icon: Wallet, pro: false },
  { path: "/budgets", label: "Budgets", icon: Target, pro: false },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank, pro: true },
  { path: "/tasks", label: "Tasks", icon: ListChecks, pro: true },
  { path: "/modules", label: "Modules", icon: BookOpen, pro: true },
  { path: "/community", label: "Community", icon: Users, pro: true },
  { path: "/messages", label: "Messages", icon: MessageSquare, pro: true },
  { path: "/coaching", label: "Coaching", icon: GraduationCap, pro: true },
];

function ProBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
      <Lock className="h-3 w-3" />
      PRO
    </span>
  );
}

export default function BottomNav({
  onQuickAdd,
  isAdmin = false,
  isPaid = false,
  isFree = false,
  onLogout,
}) {
  const location = useLocation();
  const navigate = useNavigate();

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
    () => !["/dashboard", "/expenses", "/analytics"].includes(location.pathname),
    [location.pathname]
  );

  const handleLogout = useCallback(async () => {
    if (onLogout) return onLogout();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [onLogout]);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const startPress = useCallback(() => {
    pointerDownRef.current = true;
    clearPressTimer();

    pressTimerRef.current = setTimeout(() => {
      if (!pointerDownRef.current) return;
      setDidLongPress(true);
      setMoreOpen(false);
      setActionsOpen(true);
    }, LONG_PRESS_MS);
  }, [clearPressTimer]);

  const endPress = useCallback(() => {
    pointerDownRef.current = false;
    clearPressTimer();
  }, [clearPressTimer]);

  const handleFabClick = useCallback(() => {
    if (didLongPress) {
      setDidLongPress(false);
      return;
    }

    setActionsOpen(false);
    onQuickAdd?.();
  }, [didLongPress, onQuickAdd]);

  const openQuickAction = useCallback(
    (action) => {
      setActionsOpen(false);
      setDidLongPress(false);
      onQuickAdd?.(action);
    },
    [onQuickAdd]
  );

  const goToEnroll = useCallback(() => {
    setActionsOpen(false);
    setMoreOpen(false);
    navigate("/enroll");
  }, [navigate]);

  const handleProtectedNavigation = useCallback(
    (path, locked) => {
      if (locked) {
        goToEnroll();
        return;
      }

      setMoreOpen(false);
      navigate(path);
    },
    [goToEnroll, navigate]
  );

  const savingsGoalLocked = isFree;

  return (
    <>
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
                <button
                  type="button"
                  onClick={() => setActionsOpen(false)}
                  className="text-white/60"
                  aria-label="Close quick actions"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => openQuickAction("expense")}
                  className="quick-btn"
                >
                  <Receipt className="icon" />
                  <span>Add Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => openQuickAction("income")}
                  className="quick-btn"
                >
                  <TrendingUp className="icon" />
                  <span>Add Funds</span>
                </button>

                <button
                  type="button"
                  onClick={() => openQuickAction("transfer")}
                  className="quick-btn"
                >
                  <ArrowRightLeft className="icon" />
                  <span>Transfer</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    savingsGoalLocked
                      ? goToEnroll()
                      : handleProtectedNavigation("/savings-goals", false)
                  }
                  className={`quick-btn ${savingsGoalLocked ? "locked" : ""}`}
                >
                  <PiggyBank className="icon" />
                  <span>Add Goal</span>
                  {savingsGoalLocked && <ProBadge />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="mx-3 mb-3 rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl backdrop-blur-xl">
          <div className="relative flex h-16 items-center justify-between px-6">
            <Link to="/dashboard" className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}>
              <LayoutDashboard className="icon" />
              <span>Home</span>
            </Link>

            <Link to="/expenses" className={`nav-item ${isActive("/expenses") ? "active" : ""}`}>
              <Receipt className="icon" />
              <span>Transactions</span>
            </Link>

            <div className="w-16" />

            <Link to="/analytics" className={`nav-item ${isActive("/analytics") ? "active" : ""}`}>
              <BarChart2 className="icon" />
              <span>Analytics</span>
            </Link>

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`nav-item ${isMoreActive ? "active" : ""}`}
            >
              <MoreHorizontal className="icon" />
              <span>More</span>
            </button>

            <button
              type="button"
              onMouseDown={startPress}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={startPress}
              onTouchEnd={endPress}
              onTouchCancel={endPress}
              onClick={handleFabClick}
              className="absolute left-1/2 z-50 flex h-16 w-16 -translate-x-1/2 -top-8 items-center justify-center rounded-full shadow-xl transition active:scale-95"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              aria-label="Quick add"
            >
              <Plus className="h-8 w-8 text-white" />
            </button>
          </div>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-[#0B1220] text-white">
          <div className="mb-4 flex justify-between">
            <h3 className="text-lg font-bold">More</h3>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Close more menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {moreItems.map((item) => {
              const locked = Boolean(item.pro && isFree);

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`more-item ${locked ? "locked" : ""}`}
                  onClick={() => handleProtectedNavigation(item.path, locked)}
                >
                  <item.icon className="icon" />
                  <span>{item.label}</span>
                  {locked && <ProBadge />}
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <Link to="/admin" className="more-admin" onClick={() => setMoreOpen(false)}>
              <Settings className="icon" />
              <span>Admin Panel</span>
            </Link>
          )}

          <button type="button" onClick={handleLogout} className="logout-btn">
            <LogOut className="icon" />
            <span>Log Out</span>
          </button>
        </SheetContent>
      </Sheet>

      <style>{`
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          color: rgba(255,255,255,0.6);
          background: transparent;
          border: 0;
        }

        .nav-item.active {
          color: #34d399;
        }

        .icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .quick-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 84px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          color: white;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .quick-btn.locked {
          opacity: 0.9;
        }

        .more-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 92px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          color: white;
          border: 1px solid rgba(255,255,255,0.06);
          text-align: center;
          font-size: 12px;
          cursor: pointer;
        }

        .more-item.locked {
          opacity: 0.85;
        }

        .more-admin {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.05);
          color: white;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .logout-btn {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f87171;
          background: transparent;
          border: 0;
          padding: 10px 2px;
        }
      `}</style>
    </>
  );
}