import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  PiggyBank,
  Star,
  Share2,
  Shield,
  X,
  User,
  Bell,
  PlayCircle,
  Megaphone,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "./BottomNav";
import QuickAddModal from "./QuickAddModal";
import useUserRole from "../hooks/useUserRole";
import ClaraLogo from "./ClaraLogo";
import { FEATURE_ROUTE_MAP } from "@/lib/plan-config";

const allNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/budgets", label: "Budgets", icon: Target },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank, pro: true },
  { path: "/tasks", label: "Tasks", icon: ListChecks, pro: true },
  { path: "/modules", label: "Modules", icon: BookOpen, pro: true },
  { path: "/community", label: "Community", icon: Users, pro: true },
  { path: "/messages", label: "Messages", icon: MessageSquare, pro: true },
  { path: "/coaching", label: "Coaching", icon: GraduationCap, pro: true },
  { path: "/news", label: "News", icon: Bell },
  { path: "/referrals", label: "Referrals", icon: Share2, ambassadorOnly: true },
];

const advertiserNavItems = [
  { path: "/advertiser", label: "My Ads", icon: Megaphone },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings/account", label: "Settings", icon: Settings },
];

function isSettingsPath(pathname) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

function isStandaloneFocusPage(pathname) {
  return pathname === "/profile" || isSettingsPath(pathname);
}

function SidebarLink({ item, isActive, isLocked, onNavigate, onClose }) {
  const handleClick = (e) => {
    if (isLocked) {
      e.preventDefault();
      onNavigate("/enroll");
      return;
    }

    onClose?.();
  };

  return (
    <Link
      to={isLocked ? "/enroll" : item.path}
      onClick={handleClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
        isActive
          ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white"
          : isLocked
          ? "text-white/65 hover:bg-white/10"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>

      {isLocked && (
        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
          <Lock className="h-3 w-3" />
          PRO
        </span>
      )}

      {isActive && (
        <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-yellow-400 to-lime-400" />
      )}
    </Link>
  );
}

function SidebarContent({
  currentPath,
  onClose,
  onNavigate,
  planLabel,
  isAdmin,
  isFree,
  isPaid,
  isAdvertiser,
  isFeatureAvailable,
  user,
  onLogout,
}) {
  const navItems = isAdvertiser ? advertiserNavItems : allNavItems;

  return (
    <div className="flex h-full flex-col bg-[#071018] text-white">
      <div
        className="px-4 py-5"
        style={{
          background:
            "linear-gradient(160deg, #020617 0%, #15803D 60%, #0EA5E9 100%)",
        }}
      >
        <Link
          to={isAdvertiser ? "/advertiser" : "/dashboard"}
          onClick={onClose}
          className="mb-4 flex items-center gap-3"
        >
          <ClaraLogo variant="full" theme="dark" />
        </Link>

        <div
          className="rounded-lg px-3 py-1.5 text-center text-xs font-bold"
          style={{ background: "#B7E61D", color: "#071018" }}
        >
          {planLabel}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive =
            item.path === "/settings/account"
              ? isSettingsPath(currentPath)
              : currentPath === item.path || currentPath.startsWith(item.path + "/");

          if (!isAdvertiser) {
            const featureKey = FEATURE_ROUTE_MAP[item.path];
            const isLocked = featureKey ? !isFeatureAvailable(featureKey) : Boolean(item.pro && isFree);
            const referralNotEnabled =
              item.ambassadorOnly && (!user?.has_referral_access || !isFeatureAvailable("referrals"));

            if (referralNotEnabled) return null;

            return (
              <SidebarLink
                key={item.path}
                item={item}
                isActive={isActive}
                isLocked={isLocked}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            );
          }

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>

              {isActive && (
                <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-yellow-400 to-lime-400" />
              )}
            </button>
          );
        })}

        {isAdmin && !isAdvertiser && (
          <>
            <div className="px-3 pb-1 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Admin
              </p>
            </div>

            <Link
              to="/admin"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                currentPath.startsWith("/admin")
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        {!isAdvertiser && (
          <button
            type="button"
            onClick={() => onNavigate("/profile")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              currentPath === "/profile"
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </button>
        )}

        {!isPaid && !isAdvertiser && (
          <Link
            to="/enroll"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #15803D 0%, #0EA5E9 100%)",
              color: "white",
            }}
          >
            <Star className="h-4 w-4" />
            <span>Enroll Now</span>
          </Link>
        )}

        {!isAdvertiser && (
          <button
            type="button"
            onClick={() => onNavigate("/settings/account")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              isSettingsPath(currentPath)
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition-all hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}

function MobileControlCenter({
  open,
  onClose,
  onNavigate,
  onLogout,
  isAdmin,
  isPaid,
  isAdvertiser,
  isFeatureAvailable,
  currentPath,
  planLabel,
  user,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleGo = (path) => {
    onClose();
    onNavigate(path);
  };

  const accountItems = isAdvertiser
    ? [
        {
          label: "My Ads",
          icon: Megaphone,
          onClick: () => handleGo("/advertiser"),
          active: currentPath === "/advertiser",
        },
        {
          label: "Profile",
          icon: User,
          onClick: () => handleGo("/profile"),
          active: currentPath === "/profile",
        },
        {
          label: "Settings",
          icon: Settings,
          onClick: () => handleGo("/settings/account"),
          active: isSettingsPath(currentPath),
        },
      ]
    : [
        {
          label: "Profile",
          icon: User,
          onClick: () => handleGo("/profile"),
          active: currentPath === "/profile",
        },
        {
          label: "Settings",
          icon: Settings,
          onClick: () => handleGo("/settings/account"),
          active: isSettingsPath(currentPath),
        },
      ];

  const supportItems = isAdvertiser
    ? []
    : [
        {
          label: "Tutorials",
          icon: PlayCircle,
          onClick: () => handleGo("/modules"),
          active: currentPath === "/modules",
          locked: !isFeatureAvailable("modules"),
        },
      ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:hidden" />

      <div className="fixed right-4 top-16 z-50 lg:hidden">
        <div
          ref={panelRef}
          className="w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#071018]/95 shadow-2xl backdrop-blur-xl"
        >
          <div
            className="px-4 py-3"
            style={{
              background:
                "linear-gradient(160deg, rgba(2,6,23,0.96) 0%, rgba(21,128,61,0.96) 62%, rgba(14,165,233,0.96) 100%)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                  Account
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {user?.full_name || user?.name || user?.email || "CLARA User"}
                </p>
                <div className="mt-1 inline-flex rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-bold text-white/85">
                  {planLabel || "FREE"}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-2">
            <div className="px-3 pb-2 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Account
              </p>
            </div>

            {accountItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                  item.active
                    ? "bg-white/10 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}

            {supportItems.length > 0 && (
              <>
                <div className="my-2 h-px bg-white/10" />
                <div className="px-3 pb-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                    Learn
                  </p>
                </div>
                {supportItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.locked) {
                        handleGo("/enroll");
                        return;
                      }
                      item.onClick();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                      item.active
                        ? "bg-white/10 text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.locked ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
                        <Lock className="h-3 w-3" />
                        PRO
                      </span>
                    ) : null}
                  </button>
                ))}
              </>
            )}

            {isAdmin && !isAdvertiser && (
              <>
                <div className="my-2 h-px bg-white/10" />
                <button
                  type="button"
                  onClick={() => handleGo("/admin")}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                    currentPath.startsWith("/admin")
                      ? "bg-white/10 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span className="flex-1 text-left">Admin Panel</span>
                </button>
              </>
            )}

            {!isPaid && !isAdvertiser && (
              <>
                <div className="my-2 h-px bg-white/10" />
                <button
                  type="button"
                  onClick={() => handleGo("/enroll")}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white transition-all"
                  style={{
                    background:
                      "linear-gradient(135deg, #15803D 0%, #0EA5E9 100%)",
                  }}
                >
                  <Star className="h-4 w-4" />
                  <span className="flex-1 text-left">Enroll Now</span>
                </button>
              </>
            )}

            <div className="my-2 h-px bg-white/10" />

            <button
              type="button"
              onClick={async () => {
                onClose();
                await onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-300 transition-all hover:bg-red-500/10 hover:text-red-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1 text-left">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);

  const {
    user,
    planLabel = "FREE",
    isAdmin = false,
    isPaid = false,
    isFree = false,
    isFeatureAvailable,
    loading = false,
  } = useUserRole() || {};

  const role = String(user?.role || "user").toLowerCase();
  const isAdvertiser = role === "advertiser";

  const effectivePlanLabel = useMemo(() => {
    if (isAdvertiser) return "Advertiser";
    return planLabel;
  }, [isAdvertiser, planLabel]);

  useEffect(() => {
    if (quickAddOpen) setControlOpen(false);
  }, [quickAddOpen]);

  useEffect(() => {
    if (controlOpen) setQuickAddOpen(false);
  }, [controlOpen]);

  const handleLogout = useCallback(async () => {
    try {
      setControlOpen(false);
      setQuickAddOpen(false);
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [navigate]);

  const handleNavigate = useCallback(
    (path) => {
      setControlOpen(false);
      setQuickAddOpen(false);
      navigate(path);
    },
    [navigate]
  );

  const handleOpenQuickAdd = useCallback(() => {
    if (isAdvertiser) return;
    setControlOpen(false);
    setQuickAddOpen(true);
  }, [isAdvertiser]);

  const handleToggleControl = useCallback(() => {
    setQuickAddOpen(false);
    setControlOpen((prev) => !prev);
  }, []);

  const hideMobileControlCenter = isStandaloneFocusPage(location.pathname);

  useEffect(() => {
    if (hideMobileControlCenter && controlOpen) {
      setControlOpen(false);
    }
  }, [hideMobileControlCenter, controlOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#0b1f1a] via-[#0f172a] to-[#020617] text-white">
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#020617]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
        </div>
      )}

      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-white/10 shadow-lg lg:flex">
        <SidebarContent
          currentPath={location.pathname}
          onClose={() => {}}
          onNavigate={handleNavigate}
          planLabel={effectivePlanLabel}
          isAdmin={isAdmin}
          isFree={isFree}
          isPaid={isPaid}
          isAdvertiser={isAdvertiser}
          isFeatureAvailable={isFeatureAvailable}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-20 bg-gradient-to-b from-[#071018]/85 via-[#071018]/35 to-transparent lg:hidden" />

        {!hideMobileControlCenter && (
          <div className="fixed right-4 top-4 z-50 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleControl}
              className={`h-11 w-11 rounded-2xl border border-white/10 bg-[#071018]/70 text-white shadow-lg backdrop-blur-xl transition hover:bg-white/10 ${
                controlOpen ? "bg-white/10" : ""
              }`}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-24 pt-3 lg:pb-0 lg:pt-0">
          {children}
        </main>
      </div>

      {!hideMobileControlCenter && (
        <MobileControlCenter
          open={controlOpen}
          onClose={() => setControlOpen(false)}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          isAdmin={isAdmin}
          isPaid={isPaid}
          isAdvertiser={isAdvertiser}
          isFeatureAvailable={isFeatureAvailable}
          currentPath={location.pathname}
          planLabel={effectivePlanLabel}
          user={user}
        />
      )}

      {!isAdvertiser && (
        <BottomNav
          onQuickAdd={handleOpenQuickAdd}
          isAdmin={isAdmin}
          isPaid={isPaid}
          isFree={isFree}
          isFeatureAvailable={isFeatureAvailable}
          onLogout={handleLogout}
        />
      )}

      {!isAdvertiser && (
        <QuickAddModal
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          userEmail={user?.email}
        />
      )}
    </div>
  );
}
