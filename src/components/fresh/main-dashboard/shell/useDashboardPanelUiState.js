import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Settings, Sparkles, User } from "lucide-react";
import { DEFAULT_THEME_KEY } from "@/theme/themes";
import { DASHBOARD_PANEL_ORDER } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

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
}) {
  const navigate = useNavigate();

  const openDashboardPanel = useCallback((panelKey) => {
    if (panelKey === "lifeos") {
      navigate("/lifeos");
      return;
    }

    const targetPanel = DASHBOARD_PANEL_ORDER.includes(panelKey) ? panelKey : "home";
    const currentIndex = DASHBOARD_PANEL_ORDER.indexOf(activeDashboardPanel);
    const nextIndex = DASHBOARD_PANEL_ORDER.indexOf(targetPanel);

    setDashboardPanelDirection(nextIndex >= currentIndex ? "forward" : "backward");
    setActiveDashboardPanel(targetPanel);
  }, [activeDashboardPanel, navigate, setActiveDashboardPanel, setDashboardPanelDirection]);

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

  const headerQuickActions = useMemo(() => [
    {
      key: "home",
      label: "Home",
      icon: Home,
      badge: null,
    },
    {
      key: "me",
      label: "Me",
      icon: User,
      badge: null,
    },
    {
      key: "lifeos",
      label: "LifeOS",
      icon: Sparkles,
      badge: feedHasHighlight
        ? {
            type: "dot",
            value: "",
            className: "border-emerald-400/25 bg-emerald-400 text-emerald-100",
          }
        : null,
    },
    {
      key: "settings",
      label: "Settings",
      icon: Settings,
      badge: null,
    },
  ], [feedHasHighlight]);

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
