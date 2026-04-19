import { Link, useLocation, useNavigate } from "react-router-dom";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  BarChart2,
  MoreHorizontal,
  Wallet,
  Target,
  BookOpen,
  Users,
  GraduationCap,
  Shield,
  LogOut,
  PiggyBank,
  TrendingUp,
  Plus,
  ArrowRightLeft,
  Lock,
  User,
  Settings,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import { FEATURE_ROUTE_MAP } from "@/lib/plan-config";

const LONG_PRESS_MS = 500;

const CORE_PATHS = ["/dashboard", "/expenses", "/analytics"];

const MORE_ITEMS = [
  { path: "/wallets", label: "Wallets", icon: Wallet, pro: false },
  { path: "/budgets", label: "Budgets", icon: Target, pro: false },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank, pro: true },
  { path: "/modules", label: "Modules", icon: BookOpen, pro: true },
  { path: "/community", label: "Community", icon: Users, pro: true },
  { path: "/coaching", label: "Coaching", icon: GraduationCap, pro: true },
];

const QUICK_ACTIONS = [
  { key: "expense", label: "Add Expense", icon: Receipt },
  { key: "income", label: "Add Funds", icon: TrendingUp },
  { key: "transfer", label: "Transfer", icon: ArrowRightLeft },
];

const BOTTOM_ITEMS = [
  { path: "/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/expenses", label: "Transactions", icon: Receipt },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
];

const ProBadge = memo(function ProBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
      <Lock className="h-3 w-3" />
      PRO
    </span>
  );
});

const BottomNavLink = memo(function BottomNavLink({
  to,
  label,
  icon: Icon,
  active,
}) {
  return (
    <Link to={to} className={`nav-item ${active ? "active" : ""}`}>
      <Icon className="icon" />
      <span>{label}</span>
    </Link>
  );
});

const QuickActionButton = memo(function QuickActionButton({
  label,
  icon: Icon,
  actionKey,
  locked = false,
  onSelect,
}) {
  const handleClick = useCallback(() => {
    onSelect(actionKey, locked);
  }, [actionKey, locked, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`quick-btn ${locked ? "locked" : ""}`}
    >
      <Icon className="icon" />
      <span>{label}</span>
      {locked ? <ProBadge /> : null}
    </button>
  );
});

const MoreFeatureCard = memo(function MoreFeatureCard({
  path,
  label,
  icon: Icon,
  locked,
  onSelect,
}) {
  const handleClick = useCallback(() => {
    onSelect(path, locked);
  }, [locked, onSelect, path]);

  return (
    <button
      type="button"
      className={`more-item ${locked ? "locked" : ""}`}
      onClick={handleClick}
    >
      <div className="more-icon-wrap">
        <Icon className="icon" />
      </div>
      <span>{label}</span>
      {locked ? <ProBadge /> : null}
    </button>
  );
});

function MorePanel({
  open,
  isAdmin,
  featureItems,
  onFeatureSelect,
  onAdminNavigate,
  onLogout,
  onOpenChange,
}) {
  const handleAdminClick = useCallback(() => {
    onAdminNavigate();
  }, [onAdminNavigate]);

  const handleProfileClick = useCallback(() => {
    onFeatureSelect("/profile", false);
  }, [onFeatureSelect]);

  const handleSettingsClick = useCallback(() => {
    onFeatureSelect("/settings/account", false);
  }, [onFeatureSelect]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[28px] border-white/10 bg-[#0B1220]/98 px-4 pb-5 pt-5 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="mx-auto max-w-md">
          <div className="mb-4 pr-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300/70">
              More
            </p>
            <h3 className="mt-1 text-xl font-bold text-white">
              Open more features
            </h3>
            <p className="mt-1 text-sm text-white/55">
              Jump into your tools without losing momentum.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {featureItems.map((item) => (
              <MoreFeatureCard
                key={item.path}
                path={item.path}
                label={item.label}
                icon={item.icon}
                locked={item.locked}
                onSelect={onFeatureSelect}
              />
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={handleProfileClick}
              className="more-admin"
            >
              <div className="more-admin-icon">
                <User className="icon" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">Profile</p>
                <p className="text-xs text-white/50">
                  View and manage your account.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleSettingsClick}
              className="more-admin"
            >
              <div className="more-admin-icon">
                <Settings className="icon" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">Settings</p>
                <p className="text-xs text-white/50">
                  Preferences, account, and app setup.
                </p>
              </div>
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleAdminClick}
                className="more-admin"
              >
                <div className="more-admin-icon">
                  <Shield className="icon" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">Admin Panel</p>
                  <p className="text-xs text-white/50">
                    Manage users, access, and program content.
                  </p>
                </div>
              </button>
            ) : null}

            <button type="button" onClick={onLogout} className="logout-btn">
              <LogOut className="icon" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QuickActionsSheet({
  open,
  savingsGoalLocked,
  onOpenChange,
  onActionSelect,
  onGoalSelect,
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      <div className="fixed bottom-24 left-0 right-0 z-[60] px-4">
        <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-[#0B1220]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3">
            <p className="text-sm font-semibold text-white">Quick Actions</p>
            <p className="mt-1 text-xs text-white/55">
              Add something fast without leaving your flow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton
                key={action.key}
                actionKey={action.key}
                label={action.label}
                icon={action.icon}
                onSelect={onActionSelect}
              />
            ))}

            <QuickActionButton
              actionKey="savings-goals"
              label="Add Goal"
              icon={PiggyBank}
              locked={savingsGoalLocked}
              onSelect={onGoalSelect}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function BottomNav({
  onQuickAdd,
  isAdmin = false,
  isFree = false,
  isFeatureAvailable = () => true,
  onLogout,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [moreOpen, setMoreOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [didLongPress, setDidLongPress] = useState(false);
  const [hideForOnboarding, setHideForOnboarding] = useState(false);

  const pressTimerRef = useRef(null);
  const pointerDownRef = useRef(false);

  const pathname = location.pathname;

  const isDashboardActive = useMemo(
    () => pathname === "/dashboard" || pathname.startsWith("/dashboard/"),
    [pathname]
  );
  const isExpensesActive = useMemo(
    () => pathname === "/expenses" || pathname.startsWith("/expenses/"),
    [pathname]
  );
  const isAnalyticsActive = useMemo(
    () => pathname === "/analytics" || pathname.startsWith("/analytics/"),
    [pathname]
  );
  const isMoreActive = useMemo(() => !CORE_PATHS.includes(pathname), [pathname]);

  const featureItems = useMemo(
    () =>
      MORE_ITEMS.map((item) => ({
        ...item,
        locked: !isFeatureAvailable(FEATURE_ROUTE_MAP[item.path]),
      })),
    [isFeatureAvailable]
  );

  const savingsGoalLocked = !isFeatureAvailable("savings_goals");

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPressTimer, [clearPressTimer]);

  useEffect(() => {
    const syncOnboardingState = () => {
      const isOpen =
        document.body.classList.contains("clara-onboarding-open") ||
        document.documentElement.classList.contains("clara-onboarding-open");
      setHideForOnboarding(isOpen);

      if (isOpen) {
        setMoreOpen(false);
        setActionsOpen(false);
      }
    };

    syncOnboardingState();

    const observer = new MutationObserver(syncOnboardingState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("focus", syncOnboardingState);
    document.addEventListener("visibilitychange", syncOnboardingState);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", syncOnboardingState);
      document.removeEventListener("visibilitychange", syncOnboardingState);
    };
  }, []);

  const closeMore = useCallback(() => {
    setMoreOpen(false);
  }, []);

  const closeActions = useCallback(() => {
    setActionsOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    closeMore();
    closeActions();

    if (onLogout) {
      await onLogout();
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [closeActions, closeMore, onLogout]);

  const navigateSafely = useCallback(
    (path) => {
      closeMore();
      closeActions();

      if (pathname !== path) {
        navigate(path);
      }
    },
    [closeActions, closeMore, navigate, pathname]
  );

  const goToEnroll = useCallback(() => {
    if (pathname === "/enroll") {
      closeMore();
      closeActions();
      return;
    }

    navigateSafely("/enroll");
  }, [closeActions, closeMore, navigateSafely, pathname]);

  const handleProtectedNavigation = useCallback(
    (path, locked) => {
      if (locked) {
        goToEnroll();
        return;
      }

      navigateSafely(path);
    },
    [goToEnroll, navigateSafely]
  );

  const openAdminPanel = useCallback(() => {
    navigateSafely("/admin");
  }, [navigateSafely]);

  const startPress = useCallback(() => {
    if (hideForOnboarding) return;

    pointerDownRef.current = true;
    clearPressTimer();

    pressTimerRef.current = setTimeout(() => {
      if (!pointerDownRef.current) return;
      setDidLongPress(true);
      setMoreOpen(false);
      setActionsOpen(true);
    }, LONG_PRESS_MS);
  }, [clearPressTimer, hideForOnboarding]);

  const endPress = useCallback(() => {
    pointerDownRef.current = false;
    clearPressTimer();
  }, [clearPressTimer]);

  const handleFabClick = useCallback(() => {
    if (hideForOnboarding) return;

    if (didLongPress) {
      setDidLongPress(false);
      return;
    }

    closeActions();
    onQuickAdd?.();
  }, [closeActions, didLongPress, hideForOnboarding, onQuickAdd]);

  const openQuickAction = useCallback(
    (action) => {
      closeActions();
      setDidLongPress(false);
      onQuickAdd?.(action);
    },
    [closeActions, onQuickAdd]
  );

  const handleQuickActionSelect = useCallback(
    (actionKey) => {
      openQuickAction(actionKey);
    },
    [openQuickAction]
  );

  const handleGoalQuickAction = useCallback(
    (_, locked) => {
      if (locked) {
        goToEnroll();
        return;
      }

      navigateSafely("/savings-goals");
    },
    [goToEnroll, navigateSafely]
  );

  if (hideForOnboarding) {
    return null;
  }

  return (
    <>
      <QuickActionsSheet
        open={actionsOpen}
        savingsGoalLocked={savingsGoalLocked}
        onOpenChange={setActionsOpen}
        onActionSelect={handleQuickActionSelect}
        onGoalSelect={handleGoalQuickAction}
      />

      <nav
        data-bottom-nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      >
        <div className="mx-3 mb-3 rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl backdrop-blur-xl">
          <div className="relative flex h-16 items-center justify-between px-6">
            <BottomNavLink
              to={BOTTOM_ITEMS[0].path}
              label={BOTTOM_ITEMS[0].label}
              icon={BOTTOM_ITEMS[0].icon}
              active={isDashboardActive}
            />

            <BottomNavLink
              to={BOTTOM_ITEMS[1].path}
              label={BOTTOM_ITEMS[1].label}
              icon={BOTTOM_ITEMS[1].icon}
              active={isExpensesActive}
            />

            <div className="w-16" />

            <BottomNavLink
              to={BOTTOM_ITEMS[2].path}
              label={BOTTOM_ITEMS[2].label}
              icon={BOTTOM_ITEMS[2].icon}
              active={isAnalyticsActive}
            />

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
              data-fab
              onMouseDown={startPress}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={startPress}
              onTouchEnd={endPress}
              onTouchCancel={endPress}
              onClick={handleFabClick}
              className="absolute left-1/2 z-50 flex h-16 w-16 -translate-x-1/2 -top-8 items-center justify-center rounded-full shadow-xl transition-transform duration-150 active:scale-95"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              aria-label="Quick add"
            >
              <Plus className="h-8 w-8 text-white" />
            </button>
          </div>
        </div>
      </nav>

      <MorePanel
        open={moreOpen}
        isAdmin={isAdmin}
        featureItems={featureItems}
        onFeatureSelect={handleProtectedNavigation}
        onAdminNavigate={openAdminPanel}
        onLogout={handleLogout}
        onOpenChange={setMoreOpen}
      />

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
          transition: color 0.18s ease;
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
          transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
          will-change: transform;
        }

        .quick-btn:active {
          transform: scale(0.98);
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
          min-height: 104px;
          padding: 12px 10px;
          border-radius: 18px;
          background: rgba(255,255,255,0.05);
          color: white;
          border: 1px solid rgba(255,255,255,0.06);
          text-align: center;
          font-size: 12px;
          cursor: pointer;
          transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
          will-change: transform;
          contain: layout paint;
        }

        .more-item:active {
          transform: scale(0.98);
        }

        .more-item.locked {
          opacity: 0.85;
        }

        .more-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
        }

        .more-admin {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.05);
          color: white;
          border: 1px solid rgba(255,255,255,0.06);
          transition: transform 0.18s ease, background-color 0.18s ease;
        }

        .more-admin:active {
          transform: scale(0.99);
        }

        .more-admin-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          color: #86efac;
          flex-shrink: 0;
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #f87171;
          background: rgba(248, 113, 113, 0.08);
          border: 1px solid rgba(248, 113, 113, 0.14);
          padding: 14px 16px;
          border-radius: 18px;
          transition: transform 0.18s ease, background-color 0.18s ease;
        }

        .logout-btn:active {
          transform: scale(0.99);
        }
      `}</style>
    </>
  );
}

export default memo(BottomNav);