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

const LONG_PRESS_MS = 450;

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
    () => !["/dashboard", "/expenses", "/analytics", "/transactions"].includes(location.pathname),
    [location.pathname]
  );

  const openMore = useCallback(() => {
    setActionsOpen(false);
    setMoreOpen(true);
  }, []);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  const handleLogout = useCallback(async () => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [onLogout]);

  const handleItemClick = useCallback((locked, e) => {
    if (locked) {
      e.preventDefault();
      return;
    }
    setMoreOpen(false);
  }, []);

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

    if (typeof onQuickAdd === "function") {
      onQuickAdd();
    }
  }, [didLongPress, onQuickAdd]);

  const openQuickAction = useCallback(
    (action) => {
      setActionsOpen(false);
      setDidLongPress(false);

      if (typeof onQuickAdd === "function") {
        onQuickAdd(action);
      }
    },
    [onQuickAdd]
  );

  return (
    <>
      {actionsOpen && (
        <>
          <button
            type="button"
            aria-label="Close quick actions"
            onClick={() => setActionsOpen(false)}
            className="fixed inset-0 z-[55] bg-black/35 backdrop-blur-[1px]"
          />

          <div className="lg:hidden fixed inset-x-0 bottom-24 z-[60] px-4">
            <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-[#0B1220]/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-white">Quick Actions</p>
                <button
                  type="button"
                  onClick={() => setActionsOpen(false)}
                  className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => openQuickAction("expense")}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-white transition hover:bg-white/10 active:scale-[0.98]"
                >
                  <Receipt className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs font-medium">Add Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => openQuickAction("income")}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-white transition hover:bg-white/10 active:scale-[0.98]"
                >
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs font-medium">Add Funds</span>
                </button>

                <Link
                  to="/wallets"
                  onClick={() => setActionsOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-white transition hover:bg-white/10 active:scale-[0.98]"
                >
                  <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs font-medium">Transfer</span>
                </Link>

                <Link
                  to="/savings-goals"
                  onClick={() => setActionsOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-white transition hover:bg-white/10 active:scale-[0.98]"
                >
                  <PiggyBank className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs font-medium">Add Goal</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="relative mx-3 mb-3 rounded-3xl border border-white/10 bg-[#0B1220]/95 backdrop-blur-xl shadow-2xl">
          <div className="relative flex items-center justify-around h-16 px-2">
            <Link
              to="/dashboard"
              className={`flex flex-col items-center gap-1 text-[10px] ${
                isActive("/dashboard") ? "text-emerald-400" : "text-white/60"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Home
            </Link>

            <Link
              to="/expenses"
              className={`flex flex-col items-center gap-1 text-[10px] ${
                isActive("/expenses") || isActive("/transactions")
                  ? "text-emerald-400"
                  : "text-white/60"
              }`}
            >
              <Receipt className="w-5 h-5" />
              Transactions
            </Link>

            <div className="w-16" />

            <Link
              to="/analytics"
              className={`flex flex-col items-center gap-1 text-[10px] ${
                isActive("/analytics") ? "text-emerald-400" : "text-white/60"
              }`}
            >
              <BarChart2 className="w-5 h-5" />
              Analytics
            </Link>

            <button
              onClick={openMore}
              className={`flex flex-col items-center gap-1 text-[10px] ${
                isMoreActive ? "text-emerald-400" : "text-white/60"
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              More
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
              className="absolute left-1/2 -translate-x-1/2 -top-7 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.4)] transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
              }}
              aria-label="Quick add"
            >
              <Plus className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-none bg-[#0B1220] text-white"
        >
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold">More</h3>
            <button onClick={closeMore} type="button">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            {moreItems.map((item) => {
              const locked = item.tier === "paid" && !isPaid;

              return (
                <Link
                  key={item.path}
                  to={locked ? "#" : item.path}
                  onClick={(e) => handleItemClick(locked, e)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all ${
                    isActive(item.path)
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : locked
                      ? "border-white/10 bg-white/5 text-white/30"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-center text-[11px]">{item.label}</span>

                  {locked && (
                    <span className="rounded bg-yellow-500/20 px-1 text-[9px] font-bold text-yellow-300">
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
              onClick={closeMore}
              className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm"
            >
              <Settings className="w-4 h-4" />
              Admin Panel
            </Link>
          )}

          <button
            onClick={handleLogout}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl p-3 text-sm text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}