import { useCallback, useMemo } from "react";
import { CalendarDays, Home, Settings, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_THEME_KEY } from "@/theme/themes";
import { resolveMembership } from "@/lib/membership";

export default function useDashboardPanelUiState({
  activeDashboardPanel,
  dashboardPanelDirection,
  setTheme,
  feedHasHighlight,
  loading,
  hasVisibleFinanceData,
  plan = null,
}) {
  const {
    user: authUser,
    profile: authProfile,
    loading: authLoading,
    authReady,
  } = useAuth();
  const membership = resolveMembership({
    profile: authProfile || {},
    user: authUser,
    plan,
    loading: !authReady || authLoading,
    ready: authReady !== false,
  });
  const lacksCommittedAccess =
    membership.membershipStatus !== "loading" &&
    !membership.hasCommittedAccess;

  const resetDashboardThemeToDefault = useCallback(async () => {
    if (typeof setTheme === "function") await setTheme(DEFAULT_THEME_KEY);
  }, [setTheme]);

  const dashboardPanelAnimationClass =
    activeDashboardPanel === "home"
      ? "animate-[claraDashboardPanelReverseIn_320ms_cubic-bezier(.22,1,.36,1)_both]"
      : dashboardPanelDirection === "forward"
        ? "animate-[claraDashboardPanelForwardIn_340ms_cubic-bezier(.22,1,.36,1)_both]"
        : "animate-[claraDashboardPanelReverseIn_340ms_cubic-bezier(.22,1,.36,1)_both]";

  const dashboardPanelViewportClass =
    activeDashboardPanel === "home"
      ? ""
      : activeDashboardPanel === "messages"
        ? "h-[calc(100dvh-132px)] max-h-[calc(100dvh-132px)] min-h-0 overflow-hidden pr-0.5 pb-0 [padding-bottom:0!important] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        : activeDashboardPanel === "me"
          ? "h-[calc(100dvh-132px)] max-h-[calc(100dvh-132px)] min-h-0 overflow-hidden pr-0.5 pb-[calc(env(safe-area-inset-bottom)+14px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : activeDashboardPanel === "settings"
            ? "min-h-0 overflow-visible pb-[calc(env(safe-area-inset-bottom)+14px)]"
            : "max-h-[calc(100dvh-132px)] min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y pr-0.5 pb-[calc(env(safe-area-inset-bottom)+14px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  const dashboardSmartScrollClass =
    activeDashboardPanel === "home"
      ? "overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      : activeDashboardPanel === "settings"
        ? "overflow-y-visible"
        : "overflow-y-hidden";

  const shouldShowBlockingDashboardLoader = loading && !hasVisibleFinanceData;
  const shouldShowNonBlockingRefresh = false;

  const committedBadge = {
    type: "pill",
    value: "COMMITTED",
    className: "border-white/10 bg-white/[0.08] text-white/62",
  };

  const headerQuickActions = useMemo(
    () => [
      { key: "home", label: "Home", icon: Home, badge: null },
      // Community is universal CLARA core. Membership may never change whether
      // this navigation destination looks locked or paid.
      { key: "community", label: "Community", icon: Users, badge: null },
      {
        key: "schedule",
        label: "Schedule",
        icon: CalendarDays,
        badge: lacksCommittedAccess
          ? committedBadge
          : feedHasHighlight
            ? {
                type: "dot",
                value: "",
                className:
                  "border-emerald-400/25 bg-emerald-400 text-emerald-100",
              }
            : null,
      },
      { key: "settings", label: "Settings", icon: Settings, badge: null },
    ],
    [feedHasHighlight, lacksCommittedAccess]
  );

  return {
    resetDashboardThemeToDefault,
    dashboardPanelAnimationClass,
    dashboardPanelViewportClass,
    dashboardSmartScrollClass,
    dashboardSmartContentClass: "",
    shouldShowBlockingDashboardLoader,
    shouldShowNonBlockingRefresh,
    headerQuickActions,
  };
}
