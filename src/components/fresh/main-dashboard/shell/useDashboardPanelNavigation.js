import { useCallback, useEffect, useRef, useState } from "react";
import { DASHBOARD_PANEL_ORDER } from "@/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants";

const COMMITMENT_DECLINE_HOME_EVENT = "clara:commitment-decline-home";
const PANEL_HISTORY_KEY = "__claraDashboardPanel";
const SETTINGS_DETAIL_HISTORY_KEY = "__claraSettingsDetail";
const ROUTE_RETURN_PANEL_KEY = "dashboardPanel";

const resolvePanelIndex = (panelKey) => {
  const index = DASHBOARD_PANEL_ORDER.indexOf(panelKey);
  return index === -1 ? 0 : index;
};

const normalizePanel = (panelKey) =>
  DASHBOARD_PANEL_ORDER.includes(panelKey) ? panelKey : "home";

function resolveInitialPanel(defaultPanel) {
  const fallback = normalizePanel(defaultPanel);
  if (typeof window === "undefined") return fallback;

  const historyState = window.history.state || {};
  const routeState = historyState.usr || {};
  return normalizePanel(
    routeState?.[ROUTE_RETURN_PANEL_KEY] || historyState?.[PANEL_HISTORY_KEY] || fallback
  );
}

export default function useDashboardPanelNavigation(defaultPanel = "home") {
  const initialPanel = resolveInitialPanel(defaultPanel);
  const [activeDashboardPanel, setActiveDashboardPanelState] = useState(initialPanel);
  const [dashboardPanelDirection, setDashboardPanelDirection] = useState("forward");
  const activePanelRef = useRef(initialPanel);
  const handlingPopStateRef = useRef(false);
  const pendingPanelAfterBackRef = useRef(null);

  const commitPanelState = useCallback((nextPanel, direction = null) => {
    const currentPanel = activePanelRef.current;
    const normalized = normalizePanel(nextPanel);
    if (normalized === currentPanel) return currentPanel;

    const currentIndex = resolvePanelIndex(currentPanel);
    const nextIndex = resolvePanelIndex(normalized);
    const nextDirection =
      direction || (nextIndex >= currentIndex ? "forward" : "backward");

    activePanelRef.current = normalized;
    setDashboardPanelDirection(nextDirection);
    setActiveDashboardPanelState(normalized);
    return normalized;
  }, []);

  const setActiveDashboardPanel = useCallback(
    (nextValue) => {
      const currentPanel = activePanelRef.current;
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(currentPanel) : nextValue;
      const nextPanel = normalizePanel(resolvedValue);
      if (nextPanel === currentPanel) return currentPanel;

      if (typeof window !== "undefined" && !handlingPopStateRef.current) {
        const currentHistoryState = window.history.state || {};
        const currentHasPanelEntry = Boolean(currentHistoryState?.[PANEL_HISTORY_KEY]);
        const currentHasSettingsDetail = Boolean(
          currentHistoryState?.[SETTINGS_DETAIL_HISTORY_KEY]
        );

        if (currentPanel === "home" && nextPanel !== "home") {
          window.history.pushState(
            {
              ...currentHistoryState,
              [PANEL_HISTORY_KEY]: nextPanel,
              [SETTINGS_DETAIL_HISTORY_KEY]: undefined,
            },
            "",
            window.location.href
          );
          return commitPanelState(nextPanel);
        }

        if (currentPanel !== "home" && nextPanel === "home" && currentHasPanelEntry) {
          commitPanelState("home", "backward");
          window.history.go(currentHasSettingsDetail ? -2 : -1);
          return "home";
        }

        if (currentPanel !== "home" && nextPanel !== "home" && currentHasPanelEntry) {
          if (currentHasSettingsDetail) {
            pendingPanelAfterBackRef.current = nextPanel;
            window.history.back();
            return currentPanel;
          }

          window.history.replaceState(
            {
              ...currentHistoryState,
              [PANEL_HISTORY_KEY]: nextPanel,
              [SETTINGS_DETAIL_HISTORY_KEY]: undefined,
            },
            "",
            window.location.href
          );
        }
      }

      return commitPanelState(nextPanel);
    },
    [commitPanelState]
  );

  const navigateDashboardPanel = useCallback(
    (nextPanel) => setActiveDashboardPanel(nextPanel),
    [setActiveDashboardPanel]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePopState = (event) => {
      handlingPopStateRef.current = true;
      const statePanel = normalizePanel(event?.state?.[PANEL_HISTORY_KEY]);
      const hasPanelEntry = Boolean(event?.state?.[PANEL_HISTORY_KEY]);
      const pendingPanel = pendingPanelAfterBackRef.current;
      pendingPanelAfterBackRef.current = null;

      if (pendingPanel) {
        const nextPanel = normalizePanel(pendingPanel);
        window.history.replaceState(
          {
            ...(window.history.state || {}),
            [PANEL_HISTORY_KEY]: nextPanel,
            [SETTINGS_DETAIL_HISTORY_KEY]: undefined,
          },
          "",
          window.location.href
        );
        commitPanelState(nextPanel, "forward");
      } else if (hasPanelEntry) {
        commitPanelState(statePanel, "backward");
      } else {
        commitPanelState("home", "backward");
      }

      queueMicrotask(() => {
        handlingPopStateRef.current = false;
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [commitPanelState]);

  useEffect(() => {
    const target = typeof globalThis !== "undefined" ? globalThis : null;
    if (!target?.addEventListener) return undefined;

    const handleCommitmentDeclineHome = () => {
      setActiveDashboardPanel("home");
    };

    target.addEventListener(COMMITMENT_DECLINE_HOME_EVENT, handleCommitmentDeclineHome);
    return () => target.removeEventListener(COMMITMENT_DECLINE_HOME_EVENT, handleCommitmentDeclineHome);
  }, [setActiveDashboardPanel]);

  return {
    activeDashboardPanel,
    setActiveDashboardPanel,
    dashboardPanelDirection,
    setDashboardPanelDirection,
    navigateDashboardPanel,
  };
}
