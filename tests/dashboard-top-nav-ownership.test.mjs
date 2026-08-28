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

const dashboardSource = readSource("src/pages/Dashboard.jsx");
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
const dashboardMeSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel.jsx"
);
const financialClimateSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/me/FinancialClimateUniversalScreen.jsx"
);
const lifeStageFlowSource = readSource("src/life-stage-flow.js");
const openingRefineSource = readSource("src/life-stage-opening-page-refine.js");
const meLayoutCss = readSource("src/me-life-stage-signal-gap-fix.css");
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
  "src/components/CloudVaultSyncBridge.jsx",
  "src/components/fresh/main-dashboard/CloudVaultSyncBridge.jsx",
];

const retiredMeRuntimeImports = [
  "life-stage-support-card",
  "life-stage-default-support-card-guard",
  "life-stage-heart-solution-hint",
  "life-stage-living-with-partner-signals",
  "life-stage-working-student-heart-default-guard",
  "life-stage-living-with-partner-reveal",
  "life-stage-trend-snapshot",
  "life-stage-working-student-identity-context",
  "life-stage-apply-diagnosis",
  "life-stage-working-student-signal-fit",
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
  assert.match(dashboardSource, /<Navigate to=\{CLARA_HOME_PATH\} replace/);
  assert.doesNotMatch(dashboardSource, /DashboardTopNavController|<DashboardTopNav\s/);
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

test("Settings owns its detail history, logout, and scroll behavior without retired Memory", () => {
  assert.match(settingsSource, /SETTINGS_DETAIL_HISTORY_KEY/);
  assert.match(settingsSource, /openSetting/);
  assert.match(settingsSource, /closeActiveSetting/);
  assert.match(settingsSource, /signOutFromClaraBackend/);
  assert.doesNotMatch(settingsSource, /clara:open-assistant-memory-board/);
  assert.doesNotMatch(settingsSource, /title: "Memory"/);
  assert.match(settingsSource, /settingsRootRef/);
  assert.doesNotMatch(settingsSource, /MutationObserver/);

  retiredRuntimePaths.forEach((relativePath) => {
    assert.equal(existsSync(new URL(`../${relativePath}`, import.meta.url)), false);
  });
  assert.doesNotMatch(mainSource, /installSettingsAccessLogout/);
  assert.doesNotMatch(mainSource, /installClaraGuideSchedulePhaseRedirect/);
  assert.doesNotMatch(mainSource, /CloudVaultSyncBridge/);
  assert.doesNotMatch(runtimeRegistrySource, /installSettingsScrollReset/);
  assert.doesNotMatch(runtimeRegistrySource, /clara-settings-memory-entry/);
  assert.doesNotMatch(runtimeRegistrySource, /clara-assistant-memory-tab/);
});

test("schedule guide runtime cannot click or block the top navigation", () => {
  assert.match(scheduleRuntimeSource, /Guide Mode was retired/);
  assert.match(scheduleRuntimeSource, /export function installClaraGuideScheduleRuntime\(\) \{\}/);
  assert.doesNotMatch(scheduleRuntimeSource, /\.click\(\)/);
  assert.doesNotMatch(scheduleRuntimeSource, /MutationObserver/);
  assert.doesNotMatch(scheduleRuntimeSource, /addEventListener/);
  assert.doesNotMatch(scheduleRuntimeSource, /observer\.observe/);
});

test("Me panel has one viewport owner and inherits that height through the component tree", () => {
  assert.match(
    panelUiStateSource,
    /activeDashboardPanel === "me"[\s\S]*h-\[calc\(100dvh-132px\)\][\s\S]*overflow-hidden/
  );
  assert.match(dashboardMeSource, /className=\{`relative h-full min-h-0/);
  assert.doesNotMatch(dashboardMeSource, /100svh-126px/);
  assert.match(meLayoutCss, /data-clara-me-life-stage-root/);
  assert.match(meLayoutCss, /height: 100% !important/);
  assert.match(meLayoutCss, /min-height: 0 !important/);
  assert.doesNotMatch(meLayoutCss, /100svh\s*-/);
  assert.doesNotMatch(runtimeRegistrySource, /import "\.\.\/me-adaptive-viewport\.css"/);
  assert.doesNotMatch(runtimeRegistrySource, /import "\.\.\/me-hero-support-bond\.css"/);
});

test("configured Me Life Stage structure and interactions are React-owned", () => {
  assert.match(financialClimateSource, /function PressureSignalDock/);
  assert.match(financialClimateSource, /<PressureSignalDock/);
  assert.match(financialClimateSource, /data-clara-support-card="true"/);
  assert.match(financialClimateSource, /data-clara-trend-snapshot="true"/);
  assert.match(financialClimateSource, /onClick=\{handleHeartClick\}/);
  assert.match(
    financialClimateSource,
    /const handleHeartClick = \(\) => \{\s*if \(!selectedSignalId\) return;/
  );
  assert.doesNotMatch(financialClimateSource, /selectedSignalId \|\| pressureSignals\[0\]/);
  assert.match(financialClimateSource, /disabled=\{!selectedSignalId\}/);
  assert.match(financialClimateSource, /h-11 w-11 min-w-\[44px\]/);
  assert.match(financialClimateSource, /mx-auto flex min-w-max/);
  assert.doesNotMatch(financialClimateSource, /MutationObserver/);
  assert.doesNotMatch(dashboardMeSource, /function isUnselectedLifeStageHeart/);
  assert.doesNotMatch(dashboardMeSource, /handleLifeStageInteractionCapture/);
  assert.doesNotMatch(dashboardMeSource, /onClickCapture=/);

  retiredMeRuntimeImports.forEach((runtimeName) => {
    const exactSideEffectImport = new RegExp(
      `import\\s+["'][^"']*${runtimeName}["'];`
    );
    assert.doesNotMatch(runtimeRegistrySource, exactSideEffectImport);
  });
});

test("Me viewing is read-only while explicit mutations save locally", () => {
  assert.doesNotMatch(
    financialClimateSource,
    /useEffect\(\(\) => \{\s*if \(lifeStageConfigured\) saveStageProfile/
  );
  assert.match(financialClimateSource, /const savedDraft = saveStageProfile/);
  assert.match(financialClimateSource, /persistProfilePatch/);
  assert.match(lifeStageFlowSource, /CLARA_LIFE_STAGE_UPDATED_EVENT/);
  assert.match(lifeStageFlowSource, /notifyLifeStageUpdated\(\{[\s\S]*kind: "profile"/);
  assert.match(financialClimateSource, /notifyLifeStageUpdated\(\{ kind: "images" \}\)/);
  assert.doesNotMatch(mainSource, /CloudVaultSyncBridge/);
});

test("Snapshot keeps canonical distribution statuses instead of post-render risk relabeling", () => {
  assert.match(financialClimateSource, /\{item\.status \|\| "Active"\}/);
  assert.doesNotMatch(openingRefineSource, /High Risk|Moderate Risk|Low Risk/);
  assert.doesNotMatch(openingRefineSource, /riskLabelFromValue|updateVisibleRiskStatuses/);
});

test("custom stage image selection is explicit and protected from oversized storage writes", () => {
  assert.match(financialClimateSource, /file\.size > 3 \* 1024 \* 1024/);
  assert.match(financialClimateSource, /persistProfilePatch\(\{ imageVariant: "default" \}\)/);
  assert.match(financialClimateSource, /const activeImage = hasExplicitGenderVariant/);
});
