import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
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
  HelpCircle,
  Shield,
  X,
  User,
  Bell,
  PlayCircle,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "./BottomNav";
import QuickAddModal from "./QuickAddModal";
import useUserRole from "../hooks/useUserRole";
import ClaraLogo from "./ClaraLogo";

const allNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/advertiser", label: "My Ads", icon: Megaphone },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/budgets", label: "Budgets", icon: Target },
  { path: "/savings-goals", label: "Savings Goals", icon: PiggyBank },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/tasks", label: "Tasks", icon: ListChecks, tier: "paid" },
  { path: "/modules", label: "Modules", icon: BookOpen, tier: "paid" },
  { path: "/community", label: "Community", icon: Users },
  { path: "/messages", label: "Messages", icon: MessageSquare, tier: "paid" },
  { path: "/coaching", label: "Coaching", icon: GraduationCap, tier: "paid" },
  { path: "/referrals", label: "Referrals", icon: Share2, ambassadorOnly: true },
];

const advertiserNavItems = [
  { path: "/advertiser", label: "My Ads", icon: Megaphone },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  currentPath,
  onClose,
  onNavigate,
  planLabel,
  isAdmin,
  isPaid,
  isAdvertiser,
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
            currentPath === item.path ||
            currentPath.startsWith(item.path + "/");

          if (!isAdvertiser) {
            const isLocked = item.tier === "paid" && !isPaid;
            const referralNotEnabled =
              item.ambassadorOnly && !user?.referral_enabled;

            if (referralNotEnabled) return null;

            return (
              <Link
                key={item.path}
                to={isLocked ? "#" : item.path}
                onClick={isLocked ? (e) => e.preventDefault() : onClose}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white"
                    : isLocked
                    ? "cursor-not-allowed text-white/30"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>

                {isLocked && (
                  <span className="rounded-md bg-yellow-400/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
                    PRO
                  </span>
                )}

                {isActive && (
                  <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-yellow-400 to-lime-400" />
                )}
              </Link>
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
              <Settings className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
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
            onClick={() => onNavigate("/settings")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              currentPath === "/settings"
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

  const primaryItems = isAdvertiser
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
          onClick: () => handleGo("/settings"),
          active: currentPath === "/settings",
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
          onClick: () => handleGo("/settings"),
          active: currentPath === "/settings",
        },
        {
          label: "Notifications",
          icon: Bell,
          onClick: () => handleGo("/notifications"),
          active: currentPath === "/notifications",
        },
        {
          label: "My Ads",
          icon: Megaphone,
          onClick: () => handleGo("/advertiser"),
          active: currentPath === "/advertiser",
        },
      ];

  const supportItems = isAdvertiser
    ? []
    : [
        {
          label: "Help Center",
          icon: HelpCircle,
          onClick: () => handleGo("/help"),
          active: currentPath === "/help",
        },
        {
          label: "Tutorials",
          icon: PlayCircle,
          onClick: () => handleGo("/tutorials"),
          active: currentPath === "/tutorials",
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
            {primaryItems.map((item) => (
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
                {supportItems.map((item) => (
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
    loading = false,
  } = useUserRole() || {};

  const role = String(user?.role || "user").toLowerCase();
  const isAdvertiser = role === "advertiser";

  const effectivePlanLabel = useMemo(() => {
    if (isAdvertiser) return "Advertiser";
    return planLabel;
  }, [isAdvertiser, planLabel]);

  useEffect(() => {
    if (quickAddOpen) {
      setControlOpen(false);
    }
  }, [quickAddOpen]);

  useEffect(() => {
    if (controlOpen) {
      setQuickAddOpen(false);
    }
  }, [controlOpen]);

  const handleLogout = async () => {
    try {
      setControlOpen(false);
      setQuickAddOpen(false);
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavigate = (path) => {
    setControlOpen(false);
    setQuickAddOpen(false);
    navigate(path);
  };

  const handleOpenQuickAdd = () => {
    if (isAdvertiser) return;
    setControlOpen(false);
    setQuickAddOpen(true);
  };

  const handleToggleControl = () => {
    setQuickAddOpen(false);
    setControlOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020617]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500/20 border-t-green-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#0b1f1a] via-[#0f172a] to-[#020617] text-white">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-white/10 shadow-lg lg:flex">
        <SidebarContent
          currentPath={location.pathname}
          onClose={() => {}}
          onNavigate={handleNavigate}
          planLabel={effectivePlanLabel}
          isAdmin={isAdmin}
          isPaid={isPaid}
          isAdvertiser={isAdvertiser}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-20 bg-gradient-to-b from-[#071018]/85 via-[#071018]/35 to-transparent lg:hidden" />

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

        <main className="flex-1 overflow-y-auto pb-24 pt-3 lg:pb-0 lg:pt-0">
          {children}
        </main>
      </div>

      <MobileControlCenter
        open={controlOpen}
        onClose={() => setControlOpen(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isPaid={isPaid}
        isAdvertiser={isAdvertiser}
        currentPath={location.pathname}
        planLabel={effectivePlanLabel}
        user={user}
      />

      {!isAdvertiser && (
        <BottomNav
          onQuickAdd={handleOpenQuickAdd}
          isAdmin={isAdmin}
          isPaid={isPaid}
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