export const DASHBOARD_PRIMARY_PANEL_ORDER = ["home", "me", "schedule", "settings"];
export const DASHBOARD_AUXILIARY_PANEL_ORDER = ["messages", "feed", "task"];
export const DASHBOARD_PANEL_ORDER = [
  ...DASHBOARD_PRIMARY_PANEL_ORDER,
  ...DASHBOARD_AUXILIARY_PANEL_ORDER,
];

export const isDashboardPanelKey = (panelKey) =>
  DASHBOARD_PANEL_ORDER.includes(panelKey);

export const normalizeDashboardPanel = (panelKey, fallback = "home") =>
  isDashboardPanelKey(panelKey) ? panelKey : fallback;

export const resolveDashboardPanelDirection = (currentPanel, nextPanel) => {
  const currentIndex = DASHBOARD_PANEL_ORDER.indexOf(currentPanel);
  const nextIndex = DASHBOARD_PANEL_ORDER.indexOf(nextPanel);

  if (currentIndex === -1 || nextIndex === -1) return "forward";
  return nextIndex >= currentIndex ? "forward" : "backward";
};

export const dashboardPanelCardClass =
  "rounded-[28px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] backdrop-blur-xl";

export const dashboardPanelTextClass = "text-white/65";
