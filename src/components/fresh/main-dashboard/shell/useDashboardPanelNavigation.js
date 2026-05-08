import { useCallback, useState } from "react";
import { DASHBOARD_PANEL_ORDER } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

const resolvePanelIndex = (panelKey) => {
  const index = DASHBOARD_PANEL_ORDER.indexOf(panelKey);
  return index === -1 ? 0 : index;
};

export default function useDashboardPanelNavigation(defaultPanel = "home") {
  const [activeDashboardPanel, setActiveDashboardPanel] = useState(defaultPanel);
  const [dashboardPanelDirection, setDashboardPanelDirection] = useState("forward");

  const navigateDashboardPanel = useCallback((nextPanel) => {
    setActiveDashboardPanel((currentPanel) => {
      if (!nextPanel || nextPanel === currentPanel) return currentPanel;

      const currentIndex = resolvePanelIndex(currentPanel);
      const nextIndex = resolvePanelIndex(nextPanel);

      setDashboardPanelDirection(nextIndex >= currentIndex ? "forward" : "backward");
      return nextPanel;
    });
  }, []);

  return {
    activeDashboardPanel,
    setActiveDashboardPanel,
    dashboardPanelDirection,
    setDashboardPanelDirection,
    navigateDashboardPanel,
  };
}
