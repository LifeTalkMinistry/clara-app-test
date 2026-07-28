import { useCallback, useEffect, useRef, useState } from "react";
import {
  isDashboardPanelKey,
  normalizeDashboardPanel,
  resolveDashboardPanelDirection,
} from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";
import {
  DASHBOARD_NAVIGATION_ACTIONS,
  planDashboardNavigation,
} from "@/components/fresh/main-dashboard/shell/dashboardNavigationModel";

export const DASHBOARD_NAVIGATE_EVENT = "clara:dashboard-navigate";
const COMMITMENT_DECLINE_HOME_EVENT = "clara:commitment-decline-home";
const PANEL_HISTORY_KEY = "__claraDashboardPanel";
const SETTINGS_DETAIL_HISTORY_KEY = "__claraSettingsDetail";

const resolveInitialPanel = (defaultPanel) => {
  const fallback = normalizeDashboardPanel(defaultPanel, "home");
  if (typeof window === "undefined") return fallback;

  const statePanel = window.history.state?.[PANEL_HISTORY_KEY];
  return isDashboardPanelKey(statePanel) ? statePanel : fallback;
};

export default function useDashboardPanelNavigation(defaultPanel = "home") {
  const initialPanel = resolveInitialPanel(defaultPanel);
  const [activeDashboardPanel, setActiveDashboardPanelState] = useState(initialPanel);
  const [dashboardPanelDirection, setDashboardPanelDirection] = useState("forward");
  const activePanelRef = useRef(initialPanel);
  const handlingPopStateRef = useRef(false);
  const pendingPanelAfterBackRef = useRef(null);

  const commitPanelState = useCallback((nextPanel, direction = null) => {
    if (!isDashboardPanelKey(nextPanel)) return activePanelRef.current;

    const currentPanel = activePanelRef.current;
    if (nextPanel === currentPanel) return currentPanel;

    activePanelRef.current = nextPanel;
    setDashboardPanelDirection(
      direction || resolveDashboardPanelDirection(currentPanel, nextPanel)
    );
    setActiveDashboardPanelState(nextPanel);
    return nextPanel;
  }, []);

  const navigateDashboardPanel = useCallback(
    (requestedPanel) => {
      const currentPanel = activePanelRef.current;
      if (!isDashboardPanelKey(requestedPanel)) {
        console.warn(
          `[CLARA Navigation] Ignored unknown dashboard panel: ${String(requestedPanel)}`
        );
        return currentPanel;
      }

      if (typeof window === "undefined" || handlingPopStateRef.current) {
        return commitPanelState(requestedPanel);
      }

      const currentHistoryState = window.history.state || {};
      const action = planDashboardNavigation({
        currentPanel,
        nextPanel: requestedPanel,
        hasPanelEntry: isDashboardPanelKey(
          currentHistoryState?.[PANEL_HISTORY_KEY]
        ),
        hasSettingsDetail: Boolean(
          currentHistoryState?.[SETTINGS_DETAIL_HISTORY_KEY]
        ),
      });

      if (action.type === DASHBOARD_NAVIGATION_ACTIONS.IGNORE) {
        return currentPanel;
      }

      if (action.type === DASHBOARD_NAVIGATION_ACTIONS.GO_BACK) {
        window.history.go(action.delta);
        return currentPanel;
      }

      if (action.type === DASHBOARD_NAVIGATION_ACTIONS.UNWIND_DETAIL) {
        pendingPanelAfterBackRef.current = action.panel;
        window.history.back();
        return currentPanel;
      }

      if (
        action.type === DASHBOARD_NAVIGATION_ACTIONS.PUSH ||
        action.type === DASHBOARD_NAVIGATION_ACTIONS.REPLACE
      ) {
        const nextHistoryState = {
          ...currentHistoryState,
          [PANEL_HISTORY_KEY]: action.panel,
          [SETTINGS_DETAIL_HISTORY_KEY]: undefined,
        };

        if (action.type === DASHBOARD_NAVIGATION_ACTIONS.PUSH) {
          window.history.pushState(nextHistoryState, "", window.location.href);
        } else {
          window.history.replaceState(nextHistoryState, "", window.location.href);
        }
      }

      return commitPanelState(action.panel || requestedPanel);
    },
    [commitPanelState]
  );

  const setActiveDashboardPanel = useCallback(
    (nextValue) => {
      const currentPanel = activePanelRef.current;
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(currentPanel) : nextValue;
      return navigateDashboardPanel(resolvedValue);
    },
    [navigateDashboardPanel]
  );

  const closeDashboardPanel = useCallback(
    () => navigateDashboardPanel("home"),
    [navigateDashboardPanel]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePopState = (event) => {
      handlingPopStateRef.current = true;
      const pendingPanel = pendingPanelAfterBackRef.current;
      pendingPanelAfterBackRef.current = null;

      if (pendingPanel && isDashboardPanelKey(pendingPanel)) {
        window.history.replaceState(
          {
            ...(window.history.state || {}),
            [PANEL_HISTORY_KEY]: pendingPanel,
            [SETTINGS_DETAIL_HISTORY_KEY]: undefined,
          },
          "",
          window.location.href
        );
        commitPanelState(pendingPanel);
      } else {
        const statePanel = event?.state?.[PANEL_HISTORY_KEY];
        commitPanelState(
          isDashboardPanelKey(statePanel) ? statePanel : "home",
          "backward"
        );
      }

      queueMicrotask(() => {
        handlingPopStateRef.current = false;
      });
    };

    const handleNavigationRequest = (event) => {
      const requestedPanel = event?.detail?.panel;
      if (isDashboardPanelKey(requestedPanel)) {
        navigateDashboardPanel(requestedPanel);
      }
    };

    const handleCommitmentDeclineHome = () => navigateDashboardPanel("home");

    window.addEventListener("popstate", handlePopState);
    window.addEventListener(DASHBOARD_NAVIGATE_EVENT, handleNavigationRequest);
    window.addEventListener(
      COMMITMENT_DECLINE_HOME_EVENT,
      handleCommitmentDeclineHome
    );

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(DASHBOARD_NAVIGATE_EVENT, handleNavigationRequest);
      window.removeEventListener(
        COMMITMENT_DECLINE_HOME_EVENT,
        handleCommitmentDeclineHome
      );
    };
  }, [commitPanelState, navigateDashboardPanel]);

  return {
    activeDashboardPanel,
    dashboardPanelDirection,
    navigateDashboardPanel,
    openDashboardPanel: navigateDashboardPanel,
    closeDashboardPanel,
    setActiveDashboardPanel,
  };
}
