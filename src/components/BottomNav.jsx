import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Plus,
  ArrowRightLeft,
  Lock,
  Sparkles,
  User,
  Settings,
  X,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabaseClient";
import { FEATURE_ROUTE_MAP } from "@/lib/plan-config";

const LONG_PRESS_MS = 720;

const CORE_PATHS = ["/dashboard", "/expenses", "/analytics"];

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

const BOTTOM_ITEMS = [
  { path: "/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/expenses", label: "Transactions", icon: Receipt },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
];

const DASHBOARD_THEME_STORAGE_PREFIX = "clara_dashboard_theme_";

const DEFAULT_NAV_THEME = {
  accent: "#34d399",
  accentEnd: "#059669",
  accentSoft: "rgba(52, 211, 153, 0.12)",
  accentBorder: "rgba(52, 211, 153, 0.18)",
  accentGlow: "rgba(52, 211, 153, 0.28)",
  shellStart: "rgba(11, 18, 32, 0.92)",
  shellEnd: "rgba(11, 18, 32, 0.74)",
  surfaceGlowFrom: "rgba(52, 211, 153, 0.06)",
  surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
  surfaceGlowTo: "rgba(59, 130, 246, 0.06)",
  panelStart: "rgba(11, 18, 32, 0.98)",
  panelEnd: "rgba(11, 18, 32, 0.94)",
  panelBorder: "rgba(255, 255, 255, 0.10)",
  fabRing: "rgba(11, 18, 32, 0.96)",
  mutedText: "rgba(255, 255, 255, 0.64)",
  strongText: "#ffffff",
};

const THEME_PALETTE_MAP = {
  obsidian: {
    accent: "#ffffff",
    accentEnd: "#cbd5e1",
    accentSoft: "rgba(255, 255, 255, 0.10)",
    accentBorder: "rgba(255, 255, 255, 0.18)",
    accentGlow: "rgba(255, 255, 255, 0.18)",
    shellStart: "rgba(10, 13, 18, 0.94)",
    shellEnd: "rgba(10, 13, 18, 0.78)",
    surfaceGlowFrom: "rgba(255, 255, 255, 0.05)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(148, 163, 184, 0.05)",
  },
  arctic: {
    accent: "#475569",
    accentEnd: "#64748b",
    accentSoft: "rgba(71, 85, 105, 0.12)",
    accentBorder: "rgba(71, 85, 105, 0.20)",
    accentGlow: "rgba(148, 163, 184, 0.20)",
    shellStart: "rgba(255, 255, 255, 0.90)",
    shellEnd: "rgba(237, 245, 255, 0.82)",
    surfaceGlowFrom: "rgba(191, 219, 254, 0.14)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.28)",
    surfaceGlowTo: "rgba(203, 213, 225, 0.14)",
    panelStart: "rgba(255, 255, 255, 0.94)",
    panelEnd: "rgba(241, 245, 249, 0.92)",
    panelBorder: "rgba(148, 163, 184, 0.22)",
    fabRing: "rgba(226, 232, 240, 0.96)",
    mutedText: "rgba(51, 65, 85, 0.76)",
    strongText: "#0f172a",
  },
  royal: {
    accent: "#60a5fa",
    accentEnd: "#2563eb",
    accentSoft: "rgba(96, 165, 250, 0.14)",
    accentBorder: "rgba(147, 197, 253, 0.24)",
    accentGlow: "rgba(96, 165, 250, 0.24)",
    shellStart: "rgba(10, 37, 90, 0.94)",
    shellEnd: "rgba(11, 27, 59, 0.78)",
    surfaceGlowFrom: "rgba(96, 165, 250, 0.10)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(37, 99, 235, 0.08)",
  },
  emerald: {
    accent: "#34d399",
    accentEnd: "#059669",
    accentSoft: "rgba(52, 211, 153, 0.12)",
    accentBorder: "rgba(110, 231, 183, 0.20)",
    accentGlow: "rgba(16, 185, 129, 0.26)",
    shellStart: "rgba(6, 44, 33, 0.94)",
    shellEnd: "rgba(8, 28, 22, 0.78)",
    surfaceGlowFrom: "rgba(52, 211, 153, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(16, 185, 129, 0.08)",
  },
  crimson: {
    accent: "#f87171",
    accentEnd: "#dc2626",
    accentSoft: "rgba(248, 113, 113, 0.12)",
    accentBorder: "rgba(252, 165, 165, 0.22)",
    accentGlow: "rgba(239, 68, 68, 0.24)",
    shellStart: "rgba(65, 12, 20, 0.95)",
    shellEnd: "rgba(25, 7, 9, 0.80)",
    surfaceGlowFrom: "rgba(248, 113, 113, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(239, 68, 68, 0.08)",
  },
  violet: {
    accent: "#a78bfa",
    accentEnd: "#7c3aed",
    accentSoft: "rgba(167, 139, 250, 0.12)",
    accentBorder: "rgba(196, 181, 253, 0.22)",
    accentGlow: "rgba(168, 85, 247, 0.22)",
    shellStart: "rgba(48, 15, 91, 0.95)",
    shellEnd: "rgba(20, 8, 31, 0.80)",
    surfaceGlowFrom: "rgba(196, 181, 253, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(168, 85, 247, 0.08)",
  },
  midnight: {
    accent: "#34d399",
    accentEnd: "#0ea5e9",
    accentSoft: "rgba(52, 211, 153, 0.12)",
    accentBorder: "rgba(45, 212, 191, 0.20)",
    accentGlow: "rgba(59, 130, 246, 0.20)",
    shellStart: "rgba(10, 25, 60, 0.95)",
    shellEnd: "rgba(52, 17, 39, 0.78)",
    surfaceGlowFrom: "rgba(34, 211, 238, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(239, 68, 68, 0.08)",
  },
  rainy: {
    accent: "#38bdf8",
    accentEnd: "#2563eb",
    accentSoft: "rgba(56, 189, 248, 0.14)",
    accentBorder: "rgba(125, 211, 252, 0.22)",
    accentGlow: "rgba(56, 189, 248, 0.24)",
    shellStart: "rgba(10, 32, 64, 0.95)",
    shellEnd: "rgba(8, 49, 80, 0.78)",
    surfaceGlowFrom: "rgba(125, 211, 252, 0.10)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(56, 189, 248, 0.08)",
  },
  sunset: {
    accent: "#fb923c",
    accentEnd: "#ec4899",
    accentSoft: "rgba(251, 146, 60, 0.14)",
    accentBorder: "rgba(253, 186, 116, 0.22)",
    accentGlow: "rgba(244, 114, 182, 0.20)",
    shellStart: "rgba(70, 20, 10, 0.95)",
    shellEnd: "rgba(59, 18, 7, 0.80)",
    surfaceGlowFrom: "rgba(251, 146, 60, 0.10)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(244, 114, 182, 0.08)",
  },
  ocean: {
    accent: "#2dd4bf",
    accentEnd: "#0891b2",
    accentSoft: "rgba(45, 212, 191, 0.14)",
    accentBorder: "rgba(153, 246, 228, 0.22)",
    accentGlow: "rgba(34, 211, 238, 0.22)",
    shellStart: "rgba(3, 30, 38, 0.95)",
    shellEnd: "rgba(7, 39, 42, 0.80)",
    surfaceGlowFrom: "rgba(45, 212, 191, 0.10)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(34, 211, 238, 0.08)",
  },
  forest: {
    accent: "#a3e635",
    accentEnd: "#16a34a",
    accentSoft: "rgba(163, 230, 53, 0.14)",
    accentBorder: "rgba(190, 242, 100, 0.22)",
    accentGlow: "rgba(101, 163, 13, 0.22)",
    shellStart: "rgba(15, 37, 15, 0.95)",
    shellEnd: "rgba(17, 24, 39, 0.80)",
    surfaceGlowFrom: "rgba(190, 242, 100, 0.10)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(34, 197, 94, 0.08)",
  },
  rainbow: {
    accent: "#d946ef",
    accentEnd: "#0ea5e9",
    accentSoft: "rgba(217, 70, 239, 0.14)",
    accentBorder: "rgba(244, 114, 182, 0.20)",
    accentGlow: "rgba(59, 130, 246, 0.22)",
    shellStart: "rgba(56, 10, 72, 0.95)",
    shellEnd: "rgba(58, 12, 22, 0.82)",
    surfaceGlowFrom: "rgba(244, 114, 182, 0.10)",
    surfaceGlowMid: "rgba(34, 197, 94, 0.03)",
    surfaceGlowTo: "rgba(59, 130, 246, 0.10)",
  },
  "dawn-blade": {
    accent: "#fb923c",
    accentEnd: "#ea580c",
    accentSoft: "rgba(251, 146, 60, 0.14)",
    accentBorder: "rgba(253, 186, 116, 0.22)",
    accentGlow: "rgba(249, 115, 22, 0.24)",
    shellStart: "rgba(74, 24, 7, 0.95)",
    shellEnd: "rgba(42, 15, 8, 0.82)",
    surfaceGlowFrom: "rgba(254, 215, 170, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(251, 146, 60, 0.08)",
  },
  "moon-aura": {
    accent: "#818cf8",
    accentEnd: "#2563eb",
    accentSoft: "rgba(129, 140, 248, 0.14)",
    accentBorder: "rgba(199, 210, 254, 0.22)",
    accentGlow: "rgba(99, 102, 241, 0.22)",
    shellStart: "rgba(8, 14, 39, 0.95)",
    shellEnd: "rgba(9, 13, 29, 0.82)",
    surfaceGlowFrom: "rgba(224, 231, 255, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(129, 140, 248, 0.08)",
  },
  "spirit-sakura": {
    accent: "#f472b6",
    accentEnd: "#d946ef",
    accentSoft: "rgba(244, 114, 182, 0.14)",
    accentBorder: "rgba(251, 207, 232, 0.22)",
    accentGlow: "rgba(236, 72, 153, 0.22)",
    shellStart: "rgba(72, 13, 32, 0.95)",
    shellEnd: "rgba(42, 10, 24, 0.82)",
    surfaceGlowFrom: "rgba(251, 207, 232, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(244, 114, 182, 0.08)",
  },
  "hero-red": {
    accent: "#f87171",
    accentEnd: "#3b82f6",
    accentSoft: "rgba(248, 113, 113, 0.14)",
    accentBorder: "rgba(252, 165, 165, 0.22)",
    accentGlow: "rgba(59, 130, 246, 0.20)",
    shellStart: "rgba(6, 16, 40, 0.95)",
    shellEnd: "rgba(25, 8, 12, 0.82)",
    surfaceGlowFrom: "rgba(59, 130, 246, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(239, 68, 68, 0.08)",
  },
  "gamma-smash": {
    accent: "#84cc16",
    accentEnd: "#22c55e",
    accentSoft: "rgba(132, 204, 22, 0.14)",
    accentBorder: "rgba(190, 242, 100, 0.22)",
    accentGlow: "rgba(132, 204, 22, 0.24)",
    shellStart: "rgba(18, 50, 26, 0.95)",
    shellEnd: "rgba(16, 20, 11, 0.82)",
    surfaceGlowFrom: "rgba(190, 242, 100, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(34, 197, 94, 0.08)",
  },
  "pirate-gold": {
    accent: "#f59e0b",
    accentEnd: "#d97706",
    accentSoft: "rgba(245, 158, 11, 0.14)",
    accentBorder: "rgba(253, 230, 138, 0.22)",
    accentGlow: "rgba(245, 158, 11, 0.24)",
    shellStart: "rgba(53, 30, 9, 0.95)",
    shellEnd: "rgba(31, 16, 7, 0.82)",
    surfaceGlowFrom: "rgba(253, 230, 138, 0.08)",
    surfaceGlowMid: "rgba(255, 255, 255, 0.02)",
    surfaceGlowTo: "rgba(245, 158, 11, 0.08)",
  },
};

function getDashboardThemeStorageKey(userId) {
  return `${DASHBOARD_THEME_STORAGE_PREFIX}${userId || "guest"}`;
}

function findStoredDashboardThemeKey(userId) {
  try {
    const candidateKeys = [
      getDashboardThemeStorageKey(userId),
      getDashboardThemeStorageKey("guest"),
    ].filter(Boolean);

    for (const key of candidateKeys) {
      const value = localStorage.getItem(key);
      if (typeof value === "string" && value.trim()) return value.trim();
    }

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(DASHBOARD_THEME_STORAGE_PREFIX)) continue;
      const value = localStorage.getItem(key);
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch (error) {
    console.error("Failed to read dashboard theme key:", error);
  }

  return "emerald";
}

function resolveThemePalette(themeKey) {
  const normalized = String(themeKey || "").trim().toLowerCase();
  const mapped = THEME_PALETTE_MAP[normalized];

  if (mapped) {
    return {
      ...DEFAULT_NAV_THEME,
      ...mapped,
    };
  }

  if (normalized.includes("gold") || normalized.includes("amber")) {
    return {
      ...DEFAULT_NAV_THEME,
      ...THEME_PALETTE_MAP["pirate-gold"],
    };
  }

  if (normalized.includes("red") || normalized.includes("crimson")) {
    return {
      ...DEFAULT_NAV_THEME,
      ...THEME_PALETTE_MAP.crimson,
    };
  }

  if (normalized.includes("violet") || normalized.includes("purple")) {
    return {
      ...DEFAULT_NAV_THEME,
      ...THEME_PALETTE_MAP.violet,
    };
  }

  if (normalized.includes("blue") || normalized.includes("royal")) {
    return {
      ...DEFAULT_NAV_THEME,
      ...THEME_PALETTE_MAP.royal,
    };
  }

  if (normalized.includes("ocean") || normalized.includes("teal")) {
    return {
      ...DEFAULT_NAV_THEME,
      ...THEME_PALETTE_MAP.ocean,
    };
  }

  if (
    normalized.includes("forest") ||
    normalized.includes("lime") ||
    normalized.includes("gamma")
  ) {
    return {
      ...DEFAULT_NAV_THEME,
      ...THEME_PALETTE_MAP.forest,
    };
  }

  return DEFAULT_NAV_THEME;
}

function resolveThemePaletteFromEventDetail(detail) {
  if (!detail || typeof detail !== "object") return null;

  if (detail.palette && typeof detail.palette === "object") {
    return {
      ...DEFAULT_NAV_THEME,
      ...detail.palette,
    };
  }

  const themeKeyCandidates = [
    detail.themeKey,
    detail.key,
    detail.theme,
    detail.selectedTheme,
    detail.dashboardTheme,
    detail.value,
  ];

  const matchedThemeKey = themeKeyCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim()
  );

  if (matchedThemeKey) {
    return resolveThemePalette(matchedThemeKey);
  }

  const directColorKeys = [
    "accent",
    "accentEnd",
    "accentSoft",
    "accentBorder",
    "accentGlow",
    "shellStart",
    "shellEnd",
    "surfaceGlowFrom",
    "surfaceGlowMid",
    "surfaceGlowTo",
    "panelStart",
    "panelEnd",
    "panelBorder",
    "fabRing",
    "mutedText",
    "strongText",
  ];

  const hasDirectPaletteValues = directColorKeys.some(
    (key) => typeof detail[key] === "string" && detail[key].trim()
  );

  if (hasDirectPaletteValues) {
    return {
      ...DEFAULT_NAV_THEME,
      ...detail,
    };
  }

  return null;
}

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
      <div className="nav-icon-wrap">
        <Icon className="icon" />
      </div>
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
  themePalette,
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
        className="rounded-t-[28px] px-4 pb-5 pt-5 shadow-2xl backdrop-blur-xl"
        style={{
          color: themePalette.strongText,
          borderColor: themePalette.panelBorder,
          background: `linear-gradient(180deg, ${themePalette.panelStart} 0%, ${themePalette.panelEnd} 100%)`,
        }}
      >
        <div className="mx-auto max-w-md">
          <div className="mb-4 pr-10">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.24em]"
              style={{ color: themePalette.accent }}
            >
              More
            </p>
            <h3
              className="mt-1 text-xl font-bold"
              style={{ color: themePalette.strongText }}
            >
              Open more features
            </h3>
            <p
              className="mt-1 text-sm"
              style={{ color: themePalette.mutedText }}
            >
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
                <p
                  className="text-sm font-semibold"
                  style={{ color: themePalette.strongText }}
                >
                  Profile
                </p>
                <p
                  className="text-xs"
                  style={{ color: themePalette.mutedText }}
                >
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
                <p
                  className="text-sm font-semibold"
                  style={{ color: themePalette.strongText }}
                >
                  Settings
                </p>
                <p
                  className="text-xs"
                  style={{ color: themePalette.mutedText }}
                >
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
                  <p
                    className="text-sm font-semibold"
                    style={{ color: themePalette.strongText }}
                  >
                    Admin Panel
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: themePalette.mutedText }}
                  >
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
  themePalette,
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      <div className="fixed bottom-24 left-0 right-0 z-[60] px-4">
        <div
          className="mx-auto max-w-sm rounded-3xl border p-4 backdrop-blur-xl"
          style={{
            borderColor: themePalette.panelBorder,
            background: `linear-gradient(180deg, ${themePalette.panelStart} 0%, ${themePalette.panelEnd} 100%)`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px ${themePalette.accentSoft} inset`,
          }}
        >
          <div className="mb-3">
            <p
              className="text-sm font-semibold"
              style={{ color: themePalette.strongText }}
            >
              Quick Actions
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: themePalette.mutedText }}
            >
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

function ClaraAiPanel({
  open,
  accessLevel = "pro",
  onOpenChange,
  onUpgrade,
  onQuickAdd,
  themePalette,
}) {
  const [lifeQuestion, setLifeQuestion] = useState("");
  const [lifeResponse, setLifeResponse] = useState({
    alignment: "Pause for one clear breath before committing.",
    reason: "CLARA is checking whether this action supports your money, time, and current priorities.",
    suggestion: "If it still matters after the pause, choose the smallest version that keeps your plan intact.",
  });
  const [coreInsight, setCoreInsight] = useState(
    "Review today's essentials first, then choose one flexible spend that still leaves room for tomorrow."
  );

  if (!open) return null;

  const isLife = accessLevel === "life_os";
  const isCore = accessLevel === "core";

  const close = () => onOpenChange(false);
  const runLifePrompt = (prompt) => {
    const text = String(prompt || lifeQuestion || "").trim();
    setLifeQuestion(text);
    setLifeResponse({
      alignment: text.toLowerCase().includes("spend")
        ? "This is a spending decision, so CLARA is checking impact before emotion takes over."
        : "This decision should support the life system you are building, not just the moment in front of you.",
      reason:
        "A strong choice protects your essentials, your schedule, and your longer-term direction at the same time.",
      suggestion:
        "Make the decision smaller, time-box it, or delay it until your next planned review if the answer is not clear.",
    });
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-[5px]"
        onClick={close}
        aria-label="Close CLARA AI"
      />

      <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-3">
        <div
          className="mx-auto max-w-md rounded-[30px] border p-4 shadow-[0_28px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl"
          style={{
            borderColor: themePalette.panelBorder,
            background: `linear-gradient(180deg, ${themePalette.panelStart} 0%, ${themePalette.panelEnd} 100%)`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  borderColor: themePalette.accentBorder,
                  background: themePalette.accentSoft,
                  color: themePalette.accent,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                CLARA Mode
              </div>
              <h2
                className="mt-3 text-2xl font-semibold"
                style={{ color: themePalette.strongText }}
              >
                {isLife ? "CLARA" : isCore ? "CLARA Companion" : "Unlock CLARA AI"}
              </h2>
              <p className="mt-1 text-sm" style={{ color: themePalette.mutedText }}>
                {isLife
                  ? "Ask before you act."
                  : isCore
                    ? "Smart help for today's spending."
                    : "Get smarter guidance with CORE or full decision intelligence with LIFE OS."}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!isCore && !isLife ? (
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => {
                  close();
                  onUpgrade?.();
                }}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${themePalette.accent} 0%, ${themePalette.accentEnd} 100%)`,
                }}
              >
                Upgrade to CORE
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75"
              >
                Maybe later
              </button>
            </div>
          ) : null}

          {isCore ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                  Today's guidance
                </p>
                <p className="mt-2 text-sm leading-7 text-white/78">{coreInsight}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Log expense", () => { close(); onQuickAdd?.("expense"); }],
                  ["Review today", () => setCoreInsight("Your best move today is to compare planned spending against wallet balance before adding anything unplanned.")],
                  ["Quick suggestion", () => setCoreInsight("Keep one small flexible allowance, then protect the rest for essentials and tomorrow's needs.")],
                ].map(([label, action]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-xs font-semibold text-white/78"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isLife ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                <input
                  value={lifeQuestion}
                  onChange={(event) => setLifeQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") runLifePrompt();
                  }}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-white/35"
                  placeholder="Ask before you act..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["Ask before spending", "Log expense", "Review today"].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      if (prompt === "Log expense") {
                        close();
                        onQuickAdd?.("expense");
                        return;
                      }
                      runLifePrompt(prompt);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/72"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="grid gap-3">
                {[
                  ["Alignment", lifeResponse.alignment],
                  ["Reason", lifeResponse.reason],
                  ["Suggestion", lifeResponse.suggestion],
                ].map(([label, body]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      {label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/78">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
  user,
  onLogout,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [moreOpen, setMoreOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [claraOpen, setClaraOpen] = useState(false);
  const [didLongPress, setDidLongPress] = useState(false);
  const [holdActive, setHoldActive] = useState(false);
  const [hideForOnboarding, setHideForOnboarding] = useState(false);
  const [themePalette, setThemePalette] = useState(DEFAULT_NAV_THEME);

  const pressTimerRef = useRef(null);
  const pointerDownRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const rafSyncRef = useRef(null);

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
  const accessLevel = useMemo(() => {
    const value = String(
      user?.access_level ||
        user?.subscription?.access_level ||
        user?.subscription_status ||
        "pro"
    )
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (["life_os", "lifeos", "life_os_499", "lifeos_499", "coaching_1299"].includes(value)) {
      return "life_os";
    }

    if (["core", "core_199", "core_599"].includes(value)) {
      return "core";
    }

    return "pro";
  }, [user?.access_level, user?.subscription?.access_level, user?.subscription_status]);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setHoldActive(false);
  }, []);

  const clearScheduledThemeSync = useCallback(() => {
    if (rafSyncRef.current) {
      cancelAnimationFrame(rafSyncRef.current);
      rafSyncRef.current = null;
    }
  }, []);

  const applyThemePalette = useCallback((palette) => {
    setThemePalette((previous) => {
      const next = {
        ...DEFAULT_NAV_THEME,
        ...palette,
      };

      const same =
        previous.accent === next.accent &&
        previous.accentEnd === next.accentEnd &&
        previous.shellStart === next.shellStart &&
        previous.shellEnd === next.shellEnd &&
        previous.panelStart === next.panelStart &&
        previous.panelEnd === next.panelEnd &&
        previous.strongText === next.strongText &&
        previous.mutedText === next.mutedText &&
        previous.accentGlow === next.accentGlow &&
        previous.panelBorder === next.panelBorder;

      return same ? previous : next;
    });
  }, []);

  const syncThemeFromStorage = useCallback(
    (userId = currentUserIdRef.current, forcedThemeKey = null) => {
      try {
        const themeKey =
          typeof forcedThemeKey === "string" && forcedThemeKey.trim()
            ? forcedThemeKey.trim()
            : findStoredDashboardThemeKey(userId);

        applyThemePalette(resolveThemePalette(themeKey));
      } catch (error) {
        console.error("Failed to sync BottomNav theme:", error);
      }
    },
    [applyThemePalette]
  );

  const syncThemeOnNextFrame = useCallback(
    (userId = currentUserIdRef.current, forcedThemeKey = null) => {
      clearScheduledThemeSync();
      rafSyncRef.current = requestAnimationFrame(() => {
        syncThemeFromStorage(userId, forcedThemeKey);
      });
    },
    [clearScheduledThemeSync, syncThemeFromStorage]
  );

  useEffect(() => {
    return () => {
      clearPressTimer();
      clearScheduledThemeSync();
    };
  }, [clearPressTimer, clearScheduledThemeSync]);

  useEffect(() => {
    let isMounted = true;

    syncThemeFromStorage();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isMounted) return;
        currentUserIdRef.current = data?.user?.id || null;
        syncThemeFromStorage(currentUserIdRef.current);
      })
      .catch((error) => {
        console.error("Failed to load user for BottomNav theme sync:", error);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      currentUserIdRef.current = session?.user?.id || null;
      syncThemeOnNextFrame(currentUserIdRef.current);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, [syncThemeFromStorage, syncThemeOnNextFrame]);

  useEffect(() => {
    const handleThemeSync = (event) => {
      if (document.visibilityState && document.visibilityState === "hidden") {
        return;
      }

      const detailPalette = resolveThemePaletteFromEventDetail(event?.detail);

      if (detailPalette) {
        const detailUserId =
          event?.detail?.userId ||
          event?.detail?.uid ||
          event?.detail?.profileId ||
          currentUserIdRef.current ||
          null;

        currentUserIdRef.current = detailUserId;
        applyThemePalette(detailPalette);
        syncThemeOnNextFrame(detailUserId);
        return;
      }

      const detailThemeKey =
        typeof event?.detail?.themeKey === "string"
          ? event.detail.themeKey
          : typeof event?.detail?.key === "string"
            ? event.detail.key
            : typeof event?.detail?.theme === "string"
              ? event.detail.theme
              : null;

      const detailUserId =
        event?.detail?.userId ||
        event?.detail?.uid ||
        event?.detail?.profileId ||
        currentUserIdRef.current ||
        null;

      currentUserIdRef.current = detailUserId;
      syncThemeOnNextFrame(detailUserId, detailThemeKey);
    };

    const handleVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        syncThemeOnNextFrame();
      }
    };

    const handlePageshowSync = () => {
      syncThemeOnNextFrame();
    };

    const handleDocumentAttrSync = () => {
      syncThemeOnNextFrame();
    };

    const documentObserver = new MutationObserver(handleDocumentAttrSync);

    documentObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-dashboard-theme"],
    });

    documentObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-dashboard-theme"],
    });

    window.addEventListener("storage", handleThemeSync);
    window.addEventListener("focus", handleThemeSync);
    window.addEventListener("pageshow", handlePageshowSync);
    window.addEventListener("clara-theme-change", handleThemeSync);
    window.addEventListener("clara-theme-preview", handleThemeSync);
    window.addEventListener("clara-theme-selected", handleThemeSync);
    window.addEventListener("clara-dashboard-theme-updated", handleThemeSync);
    window.addEventListener("clara-dashboard-updated", handleThemeSync);
    document.addEventListener("visibilitychange", handleVisibilitySync);

    return () => {
      documentObserver.disconnect();
      window.removeEventListener("storage", handleThemeSync);
      window.removeEventListener("focus", handleThemeSync);
      window.removeEventListener("pageshow", handlePageshowSync);
      window.removeEventListener("clara-theme-change", handleThemeSync);
      window.removeEventListener("clara-theme-preview", handleThemeSync);
      window.removeEventListener("clara-theme-selected", handleThemeSync);
      window.removeEventListener(
        "clara-dashboard-theme-updated",
        handleThemeSync
      );
      window.removeEventListener("clara-dashboard-updated", handleThemeSync);
      document.removeEventListener("visibilitychange", handleVisibilitySync);
    };
  }, [applyThemePalette, syncThemeOnNextFrame]);

  useEffect(() => {
    const syncOnboardingState = () => {
      const isOpen =
        document.body.classList.contains("clara-onboarding-open") ||
        document.documentElement.classList.contains("clara-onboarding-open");
      setHideForOnboarding(isOpen);

      if (isOpen) {
        setMoreOpen(false);
        setActionsOpen(false);
        setClaraOpen(false);
      }
    };

    syncOnboardingState();

    const observer = new MutationObserver(syncOnboardingState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
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

  const closeClara = useCallback(() => {
    setClaraOpen(false);
  }, []);

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

  const navigateSafely = useCallback(
    (path) => {
      closeMore();
      closeActions();
      closeClara();

      if (pathname !== path) {
        navigate(path);
      }
    },
    [closeActions, closeClara, closeMore, navigate, pathname]
  );

  const goToEnroll = useCallback(() => {
    if (pathname === "/enroll") {
      closeMore();
      closeActions();
      closeClara();
      return;
    }

    navigateSafely("/enroll");
  }, [closeActions, closeClara, closeMore, navigateSafely, pathname]);

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
    setHoldActive(true);

    pressTimerRef.current = setTimeout(() => {
      if (!pointerDownRef.current) return;
      setDidLongPress(true);
      setMoreOpen(false);
      setActionsOpen(false);
      setClaraOpen(true);
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
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
    closeClara();
    onQuickAdd?.("expense");
  }, [closeActions, closeClara, didLongPress, hideForOnboarding, onQuickAdd]);

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
        themePalette={themePalette}
      />

      <ClaraAiPanel
        open={claraOpen}
        accessLevel={accessLevel}
        onOpenChange={setClaraOpen}
        onUpgrade={() => navigateSafely("/enroll?plan=core_599&view=detail")}
        onQuickAdd={onQuickAdd}
        themePalette={themePalette}
      />

      <nav
        data-bottom-nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      >
        <div
          className="mx-3 mb-3 rounded-[30px] border backdrop-blur-2xl"
          style={{
            borderColor: themePalette.panelBorder,
            background: `linear-gradient(180deg, ${themePalette.shellStart} 0%, ${themePalette.shellEnd} 100%)`,
            boxShadow:
              "0 12px 36px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.02) inset",
          }}
        >
          <div className="relative overflow-visible rounded-[30px]">
            <div
              className="pointer-events-none absolute inset-0 rounded-[30px]"
              style={{
                background: `linear-gradient(90deg, ${themePalette.surfaceGlowFrom} 0%, ${themePalette.surfaceGlowMid} 50%, ${themePalette.surfaceGlowTo} 100%)`,
              }}
            />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

            <div className="relative flex h-[76px] items-end justify-between px-4 pb-2">
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

              <div className="w-[82px] flex-shrink-0" />

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
                <div className="nav-icon-wrap">
                  <MoreHorizontal className="icon" />
                </div>
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
                className={`absolute left-1/2 top-0 z-50 flex h-[58px] w-[58px] -translate-x-1/2 -translate-y-[28%] items-center justify-center rounded-full transition-transform duration-200 active:scale-95 ${holdActive ? "fab-holding" : ""}`}
                style={{
                  background: `linear-gradient(180deg, ${themePalette.accent} 0%, ${themePalette.accent} 38%, ${themePalette.accentEnd} 100%)`,
                  boxShadow: holdActive
                    ? `0 16px 34px ${themePalette.accentGlow}, 0 0 0 7px ${themePalette.fabRing}, 0 0 28px ${themePalette.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.22)`
                    : `0 10px 22px ${themePalette.accentGlow}, 0 0 0 5px ${themePalette.fabRing}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
                aria-label="Quick add expense. Long press for CLARA AI."
              >
                <span className="fab-inner-ring" />
                <Plus
                  className="relative z-[1] h-7 w-7 text-white"
                  strokeWidth={2.35}
                />
              </button>
            </div>
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
          transition:
            color 0.14s ease,
            transform 0.18s ease,
            opacity 0.14s ease,
            filter 0.14s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-item:active {
          transform: scale(0.96);
        }

        .nav-item.active {
          color: ${themePalette.accent};
        }

        .nav-item.active .nav-icon-wrap {
          background: ${themePalette.accentSoft};
          border-color: ${themePalette.accentBorder};
          box-shadow:
            0 0 0 1px ${themePalette.accentSoft} inset,
            0 0 10px ${themePalette.accentGlow};
        }

        .nav-item.active .icon {
          filter: drop-shadow(0 0 6px ${themePalette.accentGlow});
        }

        .nav-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid transparent;
          transition:
            background-color 0.14s ease,
            border-color 0.14s ease,
            box-shadow 0.14s ease;
        }

        .nav-item span {
          line-height: 1.1;
          font-weight: 500;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }

        .icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          transition: transform 0.14s ease, filter 0.14s ease, opacity 0.14s ease;
        }

        [data-fab] {
          -webkit-tap-highlight-color: transparent;
          transition:
            transform 0.16s ease,
            box-shadow 0.14s ease,
            background 0.14s ease;
        }

        [data-fab].fab-holding {
          transform: translateX(-50%) translateY(-28%) scale(1.08);
          animation: clara-fab-pulse 0.72s ease-out infinite alternate;
        }

        @keyframes clara-fab-pulse {
          from {
            filter: saturate(1);
          }
          to {
            filter: saturate(1.2) brightness(1.08);
          }
        }

        .fab-inner-ring {
          position: absolute;
          inset: 3px;
          border-radius: 999px;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0.14) 0%,
            rgba(255,255,255,0.03) 44%,
            rgba(0,0,0,0.08) 100%
          );
          pointer-events: none;
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
          color: ${themePalette.strongText};
          border: 1px solid rgba(255,255,255,0.06);
          transition:
            transform 0.18s ease,
            background-color 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
          will-change: transform;
          -webkit-tap-highlight-color: transparent;
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
          color: ${themePalette.strongText};
          border: 1px solid rgba(255,255,255,0.06);
          text-align: center;
          font-size: 12px;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            background-color 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
          will-change: transform;
          contain: layout paint;
          -webkit-tap-highlight-color: transparent;
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
          color: ${themePalette.strongText};
          border: 1px solid rgba(255,255,255,0.06);
          transition:
            transform 0.18s ease,
            background-color 0.18s ease,
            box-shadow 0.18s ease;
          -webkit-tap-highlight-color: transparent;
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
          color: ${themePalette.accent};
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
          transition:
            transform 0.18s ease,
            background-color 0.18s ease,
            box-shadow 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .logout-btn:active {
          transform: scale(0.99);
        }
      `}</style>
    </>
  );
}

export default memo(BottomNav);
