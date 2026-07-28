import { isDashboardPanelKey } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

export const DASHBOARD_NAVIGATION_ACTIONS = {
  IGNORE: "ignore",
  COMMIT: "commit",
  PUSH: "push",
  REPLACE: "replace",
  GO_BACK: "go-back",
  UNWIND_DETAIL: "unwind-detail",
};

export function planDashboardNavigation({
  currentPanel,
  nextPanel,
  hasPanelEntry = false,
  hasSettingsDetail = false,
}) {
  if (!isDashboardPanelKey(nextPanel) || nextPanel === currentPanel) {
    return { type: DASHBOARD_NAVIGATION_ACTIONS.IGNORE };
  }

  if (currentPanel === "home" && nextPanel !== "home") {
    return { type: DASHBOARD_NAVIGATION_ACTIONS.PUSH, panel: nextPanel };
  }

  if (currentPanel !== "home" && nextPanel === "home" && hasPanelEntry) {
    return {
      type: DASHBOARD_NAVIGATION_ACTIONS.GO_BACK,
      delta: hasSettingsDetail ? -2 : -1,
    };
  }

  if (currentPanel !== "home" && nextPanel !== "home") {
    if (hasSettingsDetail) {
      return {
        type: DASHBOARD_NAVIGATION_ACTIONS.UNWIND_DETAIL,
        panel: nextPanel,
      };
    }

    return {
      type: hasPanelEntry
        ? DASHBOARD_NAVIGATION_ACTIONS.REPLACE
        : DASHBOARD_NAVIGATION_ACTIONS.PUSH,
      panel: nextPanel,
    };
  }

  return { type: DASHBOARD_NAVIGATION_ACTIONS.COMMIT, panel: nextPanel };
}
