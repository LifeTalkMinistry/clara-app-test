import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  DASHBOARD_PANEL_ORDER,
  DASHBOARD_PRIMARY_PANEL_ORDER,
  isDashboardPanelKey,
} from "../src/components/fresh/main-dashboard/dashboard-panels/dashboardPanelConstants.js";
import {
  DASHBOARD_NAVIGATION_ACTIONS,
  planDashboardNavigation,
} from "../src/components/fresh/main-dashboard/shell/dashboardNavigationModel.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const topNavSource = readSource(
  "src/components/fresh/main-dashboard/top-nav/DashboardTopNav.jsx"
);
const topNavControllerSource = readSource(
  "src/components/fresh/main-dashboard/top-nav/DashboardTopNavController.jsx"
);
const panelUiStateSource = readSource(
  "src/components/fresh/main-dashboard/shell/useDashboardPanelUiState.js"
);
const panelNavigationSource = readSource(
  "src/components/fresh/main-dashboard/shell/useDashboardPanelNavigation.js"
);
const settingsSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const mainSource = readSource("src/main.jsx");
const scheduleRuntimeSource = readSource(
  "src/runtime/claraGuideScheduleRuntime.js"
);
const runtimeRegistrySource = readSource(
  "src/runtime/installClaraRuntimePatches.js"
);

const retiredRuntimePaths = [
  "src/runtime/installSettingsAccessLogout.js",
  "src/runtime/installSettingsScrollReset.js",
  "src/clara-settings-memory-entry.js",
  "src/runtime/claraGuideSchedulePhaseRedirect.js",
  "src/components/fresh/main-dashboard/hooks/useDashboardPanelController.js",
];

test("one dashboard registry includes primary and auxiliary panels", () => {
  assert.deepEqual(DASHBOARD_PRIMARY_PANEL_ORDER, [
    "home",
    "me",
    "schedule",
    "settings",
  ]);
  assert.deepEqual(DASHBOARD_PANEL_ORDER, [
    "home",
    "me",
    "schedule",
    "settings",
    "messages",
    "feed",
    "task",
  ]);
  assert.equal(isDashboardPanelKey("messages"), true);
  assert.equal(isDashboardPanelKey("unknown"), false);
});

test("navigation model handles top nav and Settings detail history sequences", () => {
  assert.deepEqual(
    planDashboardNavigation({ currentPanel: "home", nextPanel: "settings" }),
    { type: DASHBOARD_NAVIGATION_ACTIONS.PUSH, panel: "settings" }
  );

  assert.deepEqual(
    planDashboardNavigation({
      currentPanel: "settings",
      nextPanel: "schedule",
      hasPanelEntry: true,
      hasSettingsDetail: true,
    }),
    { type: DASHBOARD_NAVIGATION_ACTIONS.UNWIND_DETAIL, panel: "schedule" }
  );

  assert.deepEqual(
    planDashboardNavigation({
      currentPanel: "settings",
      nextPanel: "home",
      hasPanelEntry: true,
      hasSettingsDetail: true,
    }),
    { type: DASHBOARD_NAVIGATION_ACTIONS.GO_BACK, delta: -2 }
  );

  assert.deepEqual(
    planDashboardNavigation({
      currentPanel: "me",
      nextPanel: "schedule",
      hasPanelEntry: true,
    }),
    { type: DASHBOARD_NAVIGATION_ACTIONS.REPLACE, panel: "schedule" }
  );

  assert.deepEqual(
    planDashboardNavigation({ currentPanel: "home", nextPanel: "unknown" }),
    { type: DASHBOARD_NAVIGATION_ACTIONS.IGNORE }
  );
});

test("DashboardTopNav is a pure renderer with no hidden global ownership", () => {
  assert.doesNotMatch(topNavSource, /useEffect|useState|useCallback/);
  assert.doesNotMatch(topNavSource, /window\.|document\.|history\./);
  assert.doesNotMatch(topNavSource, /clara:guide-/);
  assert.match(topNavSource, /onSelect\?\.\(item\.selectKey \|\| item\.key\)/);
  assert.match(topNavSource, /data-dashboard-nav-key/);
  assert.doesNotMatch(topNavSource, /clara-theme-nav-pill-active/);
});

test("guide phases are owned by a separate top nav controller", () => {
  assert.match(topNavControllerSource, /CLARA_GUIDE_MODE_CHANGE_EVENT/);
  assert.match(topNavControllerSource, /SCHEDULE_GUIDE_PHASES/);
  assert.match(topNavControllerSource, /<DashboardTopNav/);
  assert.match(topNavControllerSource, /openDashboardPanel\("home"\)/);
  assert.doesNotMatch(topNavControllerSource, /querySelector\([^)]*Home/);
});

test("UI state no longer calculates navigation or exposes dead locked flags", () => {
  assert.doesNotMatch(panelUiStateSource, /setActiveDashboardPanel/);
  assert.doesNotMatch(panelUiStateSource, /setDashboardPanelDirection/);
  assert.doesNotMatch(panelUiStateSource, /locked:/);
  assert.match(panelNavigationSource, /planDashboardNavigation/);
  assert.match(panelNavigationSource, /DASHBOARD_NAVIGATE_EVENT/);
});

test("Settings owns its detail history, logout, memory, and scroll behavior in React", () => {
  assert.match(settingsSource, /SETTINGS_DETAIL_HISTORY_KEY/);
  assert.match(settingsSource, /openSetting/);
  assert.match(settingsSource, /closeActiveSetting/);
  assert.match(settingsSource, /signOutFromClaraBackend/);
  assert.match(settingsSource, /clara:open-assistant-memory-board/);
  assert.match(settingsSource, /settingsRootRef/);
  assert.doesNotMatch(settingsSource, /MutationObserver/);

  retiredRuntimePaths.forEach((relativePath) => {
    assert.equal(existsSync(new URL(`../${relativePath}`, import.meta.url)), false);
  });
  assert.doesNotMatch(mainSource, /installSettingsAccessLogout/);
  assert.doesNotMatch(mainSource, /installClaraGuideSchedulePhaseRedirect/);
  assert.doesNotMatch(runtimeRegistrySource, /installSettingsScrollReset/);
  assert.doesNotMatch(runtimeRegistrySource, /clara-settings-memory-entry/);
});

test("schedule guide runtime cannot click or block the top navigation", () => {
  assert.doesNotMatch(scheduleRuntimeSource, /button\[aria-label="Home"\]/);
  assert.doesNotMatch(scheduleRuntimeSource, /\.click\(\)/);
  assert.match(scheduleRuntimeSource, /isGuideScopedTarget/);
  assert.match(scheduleRuntimeSource, /startObserver/);
  assert.match(scheduleRuntimeSource, /stopObserver/);
  assert.doesNotMatch(
    scheduleRuntimeSource,
    /observer\.observe\(document\.body[\s\S]*installClaraGuideScheduleRuntime/
  );
});
