import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_PANEL_ORDER } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

const COMMITMENT_DECLINE_HOME_EVENT = "clara:commitment-decline-home";

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

  useEffect(() => {
    const target = typeof globalThis !== "undefined" ? globalThis : null;
    if (!target?.addEventListener) return undefined;

    const handleCommitmentDeclineHome = () => {
      setDashboardPanelDirection("backward");
      setActiveDashboardPanel("home");
    };

    target.addEventListener(COMMITMENT_DECLINE_HOME_EVENT, handleCommitmentDeclineHome);
    return () => target.removeEventListener(COMMITMENT_DECLINE_HOME_EVENT, handleCommitmentDeclineHome);
  }, []);

  return {
    activeDashboardPanel,
    setActiveDashboardPanel,
    dashboardPanelDirection,
    setDashboardPanelDirection,
    navigateDashboardPanel,
  };
}
