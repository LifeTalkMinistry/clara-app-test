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
  Brain,
  Users,
  Shield,
  LogOut,
  PiggyBank,
  TrendingUp,
  ArrowRightLeft,
  Lock,
  User,
  Settings,
  Plus,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import AiCommandPanel from "@/components/AiCommandPanel";
import { supabase } from "@/lib/supabaseClient";
import { FEATURE_ROUTE_MAP } from "@/lib/plan-config";
import { useTheme } from "@/theme/ThemeProvider";
import { buildNavPalette } from "@/theme/themes";

const LONG_PRESS_MS = 500;
const FAB_SIZE = 64;
const FAB_GAP = 16;
const FAB_STORAGE_KEY = "clara_fab_position_v4";

const CORE_PATHS = ["/dashboard", "/expenses", "/analytics"];

const BOTTOM_ITEMS = [
  { path: "/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/expenses", label: "Transactions", icon: Receipt },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
];

const MORE_ITEMS = [
  { path: "/wallets", label: "Wallets", icon: Wallet, pro: false },
  { path: "/budgets", label: "Budgets", icon: Target, pro: false },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank, pro: true },
  { path: "/modules", label: "Modules", icon: BookOpen, pro: true },
  { path: "/ai", label: "CLARA AI", icon: Brain, pro: true },
  { path: "/community", label: "Community", icon: Users, pro: true },
];

const QUICK_ACTIONS = [
  { key: "expense", label: "Add Expense", icon: Receipt },
  { key: "income", label: "Add Funds", icon: TrendingUp },
  { key: "transfer", label: "Transfer", icon: ArrowRightLeft },
];

const FALLBACK_PALETTE = {
  accent: "var(--theme-accent, #2ef6de)",
  accentEnd: "var(--theme-primary, #57a8ff)",
  accentSoft: "color-mix(in srgb, var(--theme-accent, #2ef6de) 14%, transparent)",
  accentBorder: "color-mix(in srgb, var(--theme-border, #1789d5) 36%, transparent)",
  accentGlow: "color-mix(in srgb, var(--theme-glow, #20d8ff) 38%, transparent)",
  shellStart: "color-mix(in srgb, var(--theme-card, #0a2038) 94%, transparent)",
  shellEnd: "color-mix(in srgb, var(--theme-surface, #07182d) 88%, transparent)",
  panelStart: "color-mix(in srgb, var(--theme-card, #0a2038) 96%, black 4%)",
  panelEnd: "color-mix(in srgb, var(--theme-card-alt, #10294a) 94%, black 6%)",
  panelBorder: "color-mix(in srgb, var(--theme-border, #1789d5) 30%, transparent)",
  fabRing: "color-mix(in srgb, var(--theme-card, #0a2038) 86%, transparent)",
  mutedText: "var(--theme-muted-text, rgba(255,255,255,0.64))",
  strongText: "var(--theme-text, #ffffff)",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getSafeFabPosition(position) {
  if (typeof window === "undefined") return { x: 0, y: 0 };

  return {
    x: clamp(position.x, FAB_GAP, Math.max(FAB_GAP, window.innerWidth - FAB_SIZE - FAB_GAP)),
    y: clamp(position.y, FAB_GAP, Math.max(FAB_GAP, window.innerHeight - FAB_SIZE - FAB_GAP)),
  };
}

function getDefaultFabPosition() {
  if (typeof window === "undefined") return { x: 0, y: 0 };

  return getSafeFabPosition({
    x: window.innerWidth / 2 - FAB_SIZE / 2,
    y: window.innerHeight - 150,
  });
}

function readSavedFabPosition() {
  if (typeof window === "undefined") return null;

  try {
    const saved = JSON.parse(localStorage.getItem(FAB_STORAGE_KEY) || "null");
    if (!saved || typeof saved.x !== "number" || typeof saved.y !== "number") return null;
    return getSafeFabPosition(saved);
  } catch {
    return null;
  }
}

function saveFabPosition(position) {
  try {
    localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // ignore storage failures
  }
}

const ProBadge = memo(function ProBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
      <Lock className="h-3 w-3" />
      PRO
    </span>
  );
});

const BottomNavLink = memo(function BottomNavLink({ to, label, icon: Icon, active }) {
  return (
    <Link to={to} className={`nav-item ${active ? "active" : ""}`}>
      <div className="nav-icon-wrap">
        <Icon className="icon" />
      </div>
      <span>{label}</span>
    </Link>
  );
});

const QuickActionButton = memo(function QuickActionButton({ label, icon: Icon, actionKey, locked = false, onSelect }) {
  const handleClick = useCallback(() => onSelect(actionKey, locked), [actionKey, locked, onSelect]);

  return (
    <button type="button" onClick={handleClick} className={`quick-btn ${locked ? "locked" : ""}`}>
      <Icon className="icon" />
      <span>{label}</span>
      {locked ? <ProBadge /> : null}
    </button>
  );
});

function QuickActionsSheet({ open, savingsGoalLocked, onOpenChange, onActionSelect, onGoalSelect, themePalette }) {
  if (!open) return null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px]" onClick={() => onOpenChange(false)} aria-label="Close quick actions" />
      <div className="fixed bottom-24 left-0 right-0 z-[60] px-4">
        <div
          className="mx-auto max-w-sm rounded-3xl border p-4 backdrop-blur-xl"
          style={{
            borderColor: themePalette.panelBorder,
            background: `linear-gradient(180deg, ${themePalette.panelStart} 0%, ${themePalette.panelEnd} 100%)`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.52), 0 0 0 1px ${themePalette.accentSoft} inset`,
          }}
        >
          <div className="mb-3">
            <p className="text-sm font-semibold" style={{ color: themePalette.strongText }}>Quick Actions</p>
            <p className="mt-1 text-xs" style={{ color: themePalette.mutedText }}>Add something fast without leaving your flow.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton key={action.key} actionKey={action.key} label={action.label} icon={action.icon} onSelect={onActionSelect} />
            ))}
            <QuickActionButton actionKey="savings-goals" label="Add Goal" icon={PiggyBank} locked={savingsGoalLocked} onSelect={onGoalSelect} />
          </div>
        </div>
      </div>
    </>
  );
}

function MorePanel({ open, isAdmin, featureItems, onFeatureSelect, onAdminNavigate, onLogout, onOpenChange, themePalette }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[28px] px-4 pb-5 pt-5 shadow-2xl backdrop-blur-xl"
        style={{
          color: themePalette.strongText,
          borderColor: themePalette.panelBorder,
          background: `linear-gradient(180deg, ${themePalette.panelStart} 0%, ${themePalette.panelEnd} 100%)`,
        }}
      >
        <div className="mx-auto max-w-md">
          <div className="mb-4 pr-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: themePalette.accent }}>More</p>
            <h3 className="mt-1 text-xl font-bold" style={{ color: themePalette.strongText }}>Open more features</h3>
            <p className="mt-1 text-sm" style={{ color: themePalette.mutedText }}>Jump into your tools without losing momentum.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.path} type="button" className={`more-item ${item.locked ? "locked" : ""}`} onClick={() => onFeatureSelect(item.path, item.locked)}>
                  <div className="more-icon-wrap"><Icon className="icon" /></div>
                  <span>{item.label}</span>
                  {item.locked ? <ProBadge /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            <button type="button" onClick={() => onFeatureSelect("/profile", false)} className="more-admin">
              <div className="more-admin-icon"><User className="icon" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: themePalette.strongText }}>Profile</p>
                <p className="text-xs" style={{ color: themePalette.mutedText }}>View and manage your account.</p>
              </div>
            </button>
            <button type="button" onClick={() => onFeatureSelect("/settings/account", false)} className="more-admin">
              <div className="more-admin-icon"><Settings className="icon" /></div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: themePalette.strongText }}>Settings</p>
                <p className="text-xs" style={{ color: themePalette.mutedText }}>Preferences, account, and app setup.</p>
              </div>
            </button>
            {isAdmin ? (
              <button type="button" onClick={onAdminNavigate} className="more-admin">
                <div className="more-admin-icon"><Shield className="icon" /></div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: themePalette.strongText }}>Admin Panel</p>
                  <p className="text-xs" style={{ color: themePalette.mutedText }}>Manage users, access, and program content.</p>
                </div>
              </button>
            ) : null}
            <button type="button" onClick={onLogout} className="logout-btn"><LogOut className="icon" /><span>Log Out</span></button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BottomNav({ onQuickAdd, isAdmin = false, isFeatureAvailable = () => true, user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTheme } = useTheme();

  const [moreOpen, setMoreOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [aiCommandOpen, setAiCommandOpen] = useState(false);
  const [aiCommandMode, setAiCommandMode] = useState("chat");
  const [didLongPress, setDidLongPress] = useState(false);
  const [holdActive, setHoldActive] = useState(false);
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const [isSnappingFab, setIsSnappingFab] = useState(false);
  const [fabPosition, setFabPosition] = useState(() => readSavedFabPosition() || getDefaultFabPosition());
  const [themePalette, setThemePalette] = useState(FALLBACK_PALETTE);

  const pressTimerRef = useRef(null);
  const pointerDownRef = useRef(false);
  const dragRef = useRef({ active: false, moved: false, pointerId: null, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const blockClickRef = useRef(false);

  const pathname = location.pathname;

  const isDashboardActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isExpensesActive = pathname === "/expenses" || pathname.startsWith("/expenses/");
  const isAnalyticsActive = pathname === "/analytics" || pathname.startsWith("/analytics/");
  const isMoreActive = !CORE_PATHS.includes(pathname);

  const featureItems = useMemo(
    () => MORE_ITEMS.map((item) => ({ ...item, locked: !isFeatureAvailable(FEATURE_ROUTE_MAP[item.path]) })),
    [isFeatureAvailable]
  );

  const savingsGoalLocked = !isFeatureAvailable("savings_goals");

  useEffect(() => {
    setThemePalette({ ...FALLBACK_PALETTE, ...buildNavPalette(selectedTheme) });
  }, [selectedTheme]);

  useEffect(() => {
    const handleResize = () => {
      setFabPosition((current) => {
        const next = getSafeFabPosition(current || getDefaultFabPosition());
        saveFabPosition(next);
        return next;
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setHoldActive(false);
  }, []);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  const closeActions = useCallback(() => setActionsOpen(false), []);
  const closeClara = useCallback(() => setAiCommandOpen(false), []);

  const navigateSafely = useCallback(
    (path) => {
      closeMore();
      closeActions();
      closeClara();
      if (pathname !== path) navigate(path);
    },
    [closeActions, closeClara, closeMore, navigate, pathname]
  );

  const goToEnroll = useCallback(() => navigateSafely("/enroll"), [navigateSafely]);

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

  const handleLogout = useCallback(async () => {
    closeMore();
    closeActions();
    closeClara();

    if (onLogout) {
      await onLogout();
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [closeActions, closeClara, closeMore, onLogout]);

  const openAiCommand = useCallback(() => {
    setAiCommandMode("chat");
    setAiCommandOpen(true);
    setActionsOpen(false);
    setMoreOpen(false);
  }, []);

  const startPress = useCallback(() => {
    pointerDownRef.current = true;
    setDidLongPress(false);
    clearPressTimer();
    setHoldActive(true);

    pressTimerRef.current = setTimeout(() => {
      if (!pointerDownRef.current || dragRef.current.moved) return;
      setDidLongPress(true);
      pointerDownRef.current = false;
      clearPressTimer();
      openAiCommand();
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    }, LONG_PRESS_MS);
  }, [clearPressTimer, openAiCommand]);

  const endPress = useCallback(() => {
    pointerDownRef.current = false;
    clearPressTimer();
  }, [clearPressTimer]);

  const handleFabPointerDown = useCallback(
    (event) => {
      if (event.button !== undefined && event.button !== 0) return;

      const currentPosition = fabPosition || getDefaultFabPosition();
      dragRef.current = {
        active: true,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseX: currentPosition.x,
        baseY: currentPosition.y,
      };

      startPress();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [fabPosition, startPress]
  );

  const handleFabPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const distance = Math.hypot(dx, dy);

    if (distance < 8 && !drag.moved) return;

    drag.moved = true;
    blockClickRef.current = true;
    pointerDownRef.current = false;
    clearPressTimer();
    setIsDraggingFab(true);

    const next = getSafeFabPosition({ x: drag.baseX + dx, y: drag.baseY + dy });
    setFabPosition(next);
    event.preventDefault();
  }, [clearPressTimer]);

  const handleFabPointerEnd = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    drag.active = false;
    setIsDraggingFab(false);
    endPress();
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (!drag.moved) return;

    setFabPosition((current) => {
      const safe = getSafeFabPosition(current || getDefaultFabPosition());
      const snapX = safe.x + FAB_SIZE / 2 < window.innerWidth / 2 ? FAB_GAP : window.innerWidth - FAB_SIZE - FAB_GAP;
      const snapped = getSafeFabPosition({ x: snapX, y: safe.y });
      saveFabPosition(snapped);
      return snapped;
    });

    setIsSnappingFab(true);
    setTimeout(() => setIsSnappingFab(false), 220);
    setTimeout(() => {
      blockClickRef.current = false;
    }, 240);
  }, [endPress]);

  const handleFabClick = useCallback((event) => {
    if (blockClickRef.current || dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
      return;
    }

    if (didLongPress) {
      setDidLongPress(false);
      return;
    }

    closeMore();
    closeClara();
    closeActions();
    onQuickAdd?.("expense");
  }, [closeActions, closeClara, closeMore, didLongPress, onQuickAdd]);

  const openQuickAction = useCallback((action) => {
    closeActions();
    setDidLongPress(false);
    onQuickAdd?.(action);
  }, [closeActions, onQuickAdd]);

  const handleGoalQuickAction = useCallback((_, locked) => {
    closeActions();
    if (locked) {
      goToEnroll();
      return;
    }
    navigateSafely("/savings-goals");
  }, [closeActions, goToEnroll, navigateSafely]);

  return (
    <>
      <QuickActionsSheet
        open={actionsOpen}
        savingsGoalLocked={savingsGoalLocked}
        onOpenChange={setActionsOpen}
        onActionSelect={openQuickAction}
        onGoalSelect={handleGoalQuickAction}
        themePalette={themePalette}
      />

      <AiCommandPanel open={aiCommandOpen} mode={aiCommandMode} user={user} onOpenChange={setAiCommandOpen} themePalette={themePalette} />

      <nav data-bottom-nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div
          className="mx-3 mb-3 rounded-[30px] border backdrop-blur-2xl"
          style={{
            borderColor: themePalette.panelBorder,
            background: `linear-gradient(180deg, ${themePalette.shellStart} 0%, ${themePalette.shellEnd} 100%)`,
            boxShadow: `0 12px 36px rgba(0,0,0,0.42), 0 0 0 1px ${themePalette.accentSoft} inset`,
          }}
        >
          <div className="relative overflow-visible rounded-[30px]">
            <div className="relative flex h-[76px] items-end justify-between px-4 pb-2">
              <BottomNavLink to={BOTTOM_ITEMS[0].path} label={BOTTOM_ITEMS[0].label} icon={BOTTOM_ITEMS[0].icon} active={isDashboardActive} />
              <BottomNavLink to={BOTTOM_ITEMS[1].path} label={BOTTOM_ITEMS[1].label} icon={BOTTOM_ITEMS[1].icon} active={isExpensesActive} />
              <div className="w-[82px] flex-shrink-0" />
              <BottomNavLink to={BOTTOM_ITEMS[2].path} label={BOTTOM_ITEMS[2].label} icon={BOTTOM_ITEMS[2].icon} active={isAnalyticsActive} />
              <button type="button" onClick={() => setMoreOpen(true)} className={`nav-item ${isMoreActive ? "active" : ""}`}>
                <div className="nav-icon-wrap"><MoreHorizontal className="icon" /></div>
                <span>More</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <button
        type="button"
        data-fab
        onPointerDown={handleFabPointerDown}
        onPointerMove={handleFabPointerMove}
        onPointerUp={handleFabPointerEnd}
        onPointerCancel={handleFabPointerEnd}
        onClick={handleFabClick}
        className={`fixed z-[70] flex h-16 w-16 items-center justify-center rounded-full active:scale-95 ${holdActive ? "fab-holding" : ""} ${isDraggingFab ? "fab-dragging" : ""} ${isSnappingFab ? "fab-snapping" : ""}`}
        style={{
          left: `${fabPosition.x}px`,
          top: `${fabPosition.y}px`,
          background: `linear-gradient(135deg, ${themePalette.accent} 0%, ${themePalette.accentEnd} 100%)`,
          boxShadow: holdActive
            ? `0 16px 34px ${themePalette.accentGlow}, 0 0 0 7px ${themePalette.fabRing}, 0 0 28px ${themePalette.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.22)`
            : `0 10px 22px ${themePalette.accentGlow}, 0 0 0 5px ${themePalette.fabRing}, inset 0 1px 0 rgba(255,255,255,0.18)`,
          touchAction: "none",
        }}
        aria-label="Quick add expense. Long press for CLARA AI chat. Drag to move."
      >
        <span className="fab-inner-ring" />
        <Plus className="relative z-[1] h-7 w-7 text-white" strokeWidth={2.35} />
      </button>

      <MorePanel
        open={moreOpen}
        isAdmin={isAdmin}
        featureItems={featureItems}
        onFeatureSelect={handleProtectedNavigation}
        onAdminNavigate={() => navigateSafely("/admin")}
        onLogout={handleLogout}
        onOpenChange={setMoreOpen}
        themePalette={themePalette}
      />

      <style>{`
        .nav-item {
          position: relative;
          display: flex;
          flex: 1 1 0;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          height: 100%;
          padding: 0 2px 3px;
          font-size: 10px;
          color: ${themePalette.mutedText};
          background: transparent;
          border: 0;
          border-radius: 16px;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-item.active { color: ${themePalette.accent}; }
        .nav-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid transparent;
        }
        .nav-item.active .nav-icon-wrap {
          background: ${themePalette.accentSoft};
          border-color: ${themePalette.accentBorder};
          box-shadow: 0 0 12px ${themePalette.accentGlow};
        }
        .nav-item span { line-height: 1.1; font-weight: 500; white-space: nowrap; }
        .icon { width: 18px; height: 18px; flex-shrink: 0; }

        [data-fab] {
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.16s ease, left 0.22s ease, top 0.22s ease, box-shadow 0.14s ease, background 0.14s ease;
          will-change: left, top, transform;
        }
        [data-fab].fab-dragging { transition: none !important; cursor: grabbing; }
        [data-fab].fab-snapping { transition: left 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.16s ease; }
        [data-fab].fab-holding { transform: scale(1.08); animation: clara-fab-pulse 0.72s ease-out infinite alternate; }
        @keyframes clara-fab-pulse { from { filter: saturate(1); } to { filter: saturate(1.2) brightness(1.08); } }
        .fab-inner-ring {
          position: absolute;
          inset: 3px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 44%, rgba(0,0,0,0.08));
          pointer-events: none;
        }
        .quick-btn, .more-item, .more-admin {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 18px;
          background: linear-gradient(180deg, ${themePalette.accentSoft} 0%, rgba(255,255,255,0.04) 100%);
          color: ${themePalette.strongText};
          border: 1px solid ${themePalette.accentBorder};
          -webkit-tap-highlight-color: transparent;
        }
        .quick-btn { min-height: 84px; flex-direction: column; padding: 12px; }
        .more-item { min-height: 104px; flex-direction: column; padding: 12px 10px; font-size: 12px; text-align: center; }
        .more-icon-wrap, .more-admin-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: ${themePalette.accentSoft};
          color: ${themePalette.accent};
          border: 1px solid ${themePalette.accentBorder};
          flex-shrink: 0;
        }
        .more-admin { width: 100%; justify-content: flex-start; padding: 14px 16px; }
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
        }
      `}</style>
    </>
  );
}

export default memo(BottomNav);
