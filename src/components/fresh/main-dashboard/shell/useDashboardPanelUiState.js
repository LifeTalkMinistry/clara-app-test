import { useCallback, useMemo } from "react";
import { CalendarDays, Home, Settings, User } from "lucide-react";
import { DEFAULT_THEME_KEY } from "@/theme/themes";
import { DASHBOARD_PANEL_ORDER } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

function readPlanPreview() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("clara_dev_plan_preview") || "";
  } catch {
    return "";
  }
}

export default function useDashboardPanelUiState({
  activeDashboardPanel,
  dashboardPanelDirection,
  setActiveDashboardPanel,
  setDashboardPanelDirection,
  setTheme,
  feedHasHighlight,
  loading,
  hasVisibleFinanceData,
  financeDataLoading,
  financeDataRefreshing,
  plan = "pro_99",
}) {
  const planPreview = readPlanPreview();
  const isFreePlan = (planPreview || plan) === "free";

  const openDashboardPanel = useCallback((panelKey) => {
    if (isFreePlan && ["me", "schedule"].includes(panelKey)) return;

    const targetPanel = DASHBOARD_PANEL_ORDER.includes(panelKey) ? panelKey : "home";
    const currentIndex = DASHBOARD_PANEL_ORDER.indexOf(activeDashboardPanel);
    const nextIndex = DASHBOARD_PANEL_ORDER.indexOf(targetPanel);

    setDashboardPanelDirection(nextIndex >= currentIndex ? "forward" : "backward");
    setActiveDashboardPanel(targetPanel);
  }, [activeDashboardPanel, isFreePlan, setActiveDashboardPanel, setDashboardPanelDirection]);

  const closeDashboardPanel = useCallback(() => {
    setDashboardPanelDirection("backward");
    setActiveDashboardPanel("home");
  }, [setActiveDashboardPanel, setDashboardPanelDirection]);

  const resetDashboardThemeToDefault = useCallback(async () => {
    if (typeof setTheme === "function") {
      await setTheme(DEFAULT_THEME_KEY);
    }
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
        ? "h-[calc(100svh-132px)] max-h-[calc(100svh-132px)] overflow-hidden pr-0.5 pb-0 [padding-bottom:0!important] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        : "max-h-[calc(100svh-132px)] overflow-y-auto overscroll-y-contain touch-pan-y pr-0.5 pb-[calc(env(safe-area-inset-bottom)+14px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  const shouldShowBlockingDashboardLoader = loading && !hasVisibleFinanceData;
  const shouldShowNonBlockingRefresh = Boolean(
    financeDataRefreshing ||
      (financeDataLoading && hasVisibleFinanceData)
  );

  const proBadge = {
    type: "pill",
    value: "PRO",
    className: "border-white/10 bg-white/[0.08] text-white/62",
  };

  const headerQuickActions = useMemo(() => [
    { key: "home", label: "Home", icon: Home, badge: null },
    { key: "me", label: "Me", icon: User, badge: isFreePlan ? proBadge : null, locked: isFreePlan },
    {
      key: "schedule",
      label: "Schedule",
      icon: CalendarDays,
      locked: isFreePlan,
      badge: isFreePlan
        ? proBadge
        : feedHasHighlight
          ? {
              type: "dot",
              value: "",
              className: "border-emerald-400/25 bg-emerald-400 text-emerald-100",
            }
          : null,
    },
    { key: "settings", label: "Settings", icon: Settings, badge: null },
  ], [feedHasHighlight, isFreePlan]);

  return {
    openDashboardPanel,
    closeDashboardPanel,
    resetDashboardThemeToDefault,
    dashboardPanelAnimationClass,
    dashboardPanelViewportClass,
    dashboardSmartScrollClass: "overflow-y-hidden",
    dashboardSmartContentClass: "",
    shouldShowBlockingDashboardLoader,
    shouldShowNonBlockingRefresh,
    headerQuickActions,
  };
}
