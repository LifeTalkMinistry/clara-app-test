import { useCallback, useState } from "react";

export const DEFAULT_DASHBOARD_PANEL = "home";

export function useDashboardPanelController(initialPanel = DEFAULT_DASHBOARD_PANEL) {
  const [activeDashboardPanel, setActiveDashboardPanel] = useState(
    initialPanel || DEFAULT_DASHBOARD_PANEL
  );

  const openDashboardPanel = useCallback((panelKey) => {
    if (!panelKey) return;
    setActiveDashboardPanel(panelKey);
  }, []);

  const resetDashboardPanel = useCallback(() => {
    setActiveDashboardPanel(DEFAULT_DASHBOARD_PANEL);
  }, []);

  return {
    activeDashboardPanel,
    setActiveDashboardPanel,
    openDashboardPanel,
    resetDashboardPanel,
  };
}

export default useDashboardPanelController;
