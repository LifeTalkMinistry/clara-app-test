import fs from "node:fs";

const replaceOnce = (source, before, after, label) => {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`Missing anchor: ${label}`);
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Anchor is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
};

const removeOnce = (source, before, label) =>
  replaceOnce(source, before, "", label);

const writeChanged = (path, next, previous) => {
  if (next === previous) {
    console.log(`No changes needed in ${path}`);
    return;
  }
  fs.writeFileSync(path, next);
  console.log(`Updated ${path}`);
};

{
  const path = "src/pages/Dashboard.jsx";
  let source = fs.readFileSync(path, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    'import DashboardTopNav from "@/components/fresh/main-dashboard/top-nav/DashboardTopNav";\n',
    'import DashboardTopNavController from "@/components/fresh/main-dashboard/top-nav/DashboardTopNavController";\n',
    "Dashboard top nav controller import"
  );

  source = replaceOnce(
    source,
    `  const {
    activeDashboardPanel,
    setActiveDashboardPanel,
    dashboardPanelDirection,
    setDashboardPanelDirection,
  } = useDashboardPanelNavigation();`,
    `  const {
    activeDashboardPanel,
    dashboardPanelDirection,
    openDashboardPanel,
    closeDashboardPanel,
  } = useDashboardPanelNavigation();`,
    "dashboard navigation hook ownership"
  );

  source = replaceOnce(
    source,
    `  const {
    openDashboardPanel,
    closeDashboardPanel,
    resetDashboardThemeToDefault,
    dashboardPanelAnimationClass,
    dashboardPanelViewportClass,
    dashboardSmartScrollClass,
    dashboardSmartContentClass,
    shouldShowBlockingDashboardLoader,
    shouldShowNonBlockingRefresh,
    headerQuickActions,
  } = useDashboardPanelUiState({
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
  });`,
    `  const {
    resetDashboardThemeToDefault,
    dashboardPanelAnimationClass,
    dashboardPanelViewportClass,
    dashboardSmartScrollClass,
    dashboardSmartContentClass,
    shouldShowBlockingDashboardLoader,
    shouldShowNonBlockingRefresh,
    headerQuickActions,
  } = useDashboardPanelUiState({
    activeDashboardPanel,
    dashboardPanelDirection,
    setTheme,
    feedHasHighlight,
    loading,
    hasVisibleFinanceData,
    plan,
  });`,
    "dashboard UI state ownership"
  );

  source = replaceOnce(
    source,
    "      <DashboardTopNav\n",
    "      <DashboardTopNavController\n",
    "Dashboard top nav render"
  );

  writeChanged(path, source, original);
}

{
  const path = "src/components/fresh/main-dashboard/top-nav/DashboardTopNav.jsx";
  let source = fs.readFileSync(path, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    `                  data-dashboard-nav-key={item.key}
                  onClick={() => onSelect?.(item.selectKey || item.key)}`,
    `                  data-dashboard-nav-key={item.key}
                  data-clara-guide-exit={item.dataGuideExit ? "true" : undefined}
                  data-clara-guide-me-target={item.dataGuideMeTarget ? "true" : undefined}
                  data-clara-guide-schedule-target={
                    item.dataGuideScheduleTarget ? "true" : undefined
                  }
                  onClick={() => onSelect?.(item.selectKey || item.key)}`,
    "explicit guide data attributes"
  );

  writeChanged(path, source, original);
}

{
  const path = "src/main.jsx";
  let source = fs.readFileSync(path, "utf8");
  const original = source;

  source = removeOnce(
    source,
    'import { installSettingsAccessLogout } from "./runtime/installSettingsAccessLogout";\n',
    "Settings DOM runtime import"
  );
  source = removeOnce(
    source,
    'import { installClaraGuideSchedulePhaseRedirect } from "./runtime/claraGuideSchedulePhaseRedirect";\n',
    "schedule phase redirect import"
  );
  source = removeOnce(
    source,
    `try {
  installSettingsAccessLogout();
} catch (error) {
  console.warn("CLARA Settings access logout failed to init:", error);
}

`,
    "Settings DOM runtime startup"
  );
  source = replaceOnce(
    source,
    `try {
  installClaraGuideSchedulePhaseRedirect();
  installClaraGuideScheduleRuntime();
} catch (error) {`,
    `try {
  installClaraGuideScheduleRuntime();
} catch (error) {`,
    "schedule guide startup"
  );

  writeChanged(path, source, original);
}

{
  const path = "src/runtime/installClaraRuntimePatches.js";
  let source = fs.readFileSync(path, "utf8");
  const original = source;

  source = removeOnce(
    source,
    'import "./installSettingsScrollReset";\n',
    "Settings scroll DOM runtime"
  );
  source = removeOnce(
    source,
    'import "../clara-settings-memory-entry";\n',
    "Settings memory DOM injector"
  );
  source = replaceOnce(
    source,
    "// single user-facing sync control. Device reset remains available here.",
    "// single user-facing sync control. Device reset remains available here.",
    "Settings ownership comment"
  );

  writeChanged(path, source, original);
}

{
  const path = "src/clara-assistant-memory-tab.js";
  let source = fs.readFileSync(path, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    `function installStoryRefresh() {
  window.addEventListener("clara-user-context-story-updated", () => {
    if (document.getElementById(MEMORY_PANEL_ID)) showMemoryPanel();
  });
}

function installClaraAssistantMemoryTab() {`,
    `function installStoryRefresh() {
  window.addEventListener("clara-user-context-story-updated", () => {
    if (document.getElementById(MEMORY_PANEL_ID)) showMemoryPanel();
  });
}

function installExternalMemoryOpen() {
  window.addEventListener("clara:open-assistant-memory-board", () => {
    showMemoryPanel();
  });
}

function installClaraAssistantMemoryTab() {`,
    "assistant memory open event"
  );
  source = replaceOnce(
    source,
    `  installObserver();
  installStoryRefresh();`,
    `  installObserver();
  installStoryRefresh();
  installExternalMemoryOpen();`,
    "assistant memory event installation"
  );

  writeChanged(path, source, original);
}

{
  const path = "src/runtime/claraGuideScheduleRuntime.js";
  let source = fs.readFileSync(path, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    `let clickHandler = null;
let requestHandler = null;

const isScheduleKey`,
    `let clickHandler = null;
let requestHandler = null;

function startObserver() {
  if (observer || !ACTIVE_PHASES.has(phase)) return;
  observer = new MutationObserver(() => refresh());
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
}

const isScheduleKey`,
    "lazy schedule observer helpers"
  );

  source = replaceOnce(
    source,
    `function handleClick(event) {
  if (!ACTIVE_PHASES.has(phase)) return;
  const targetDate`,
    `function isGuideScopedTarget(target) {
  return Boolean(
    target?.closest?.(
      '[data-clara-guide-schedule-preview="true"], [data-clara-schedule-sheet="true"], [data-clara-schedule-event-detail="true"], [data-clara-guide-schedule-overlay-host="true"]'
    )
  );
}

function handleClick(event) {
  if (!ACTIVE_PHASES.has(phase) || !isGuideScopedTarget(event.target)) return;
  const targetDate`,
    "schedule guide click scope"
  );

  source = replaceOnce(
    source,
    `function cleanup() {
  pendingPhase = "";
  guideDateKey = "";
  singleTapAt = 0;
  restoreStorage();
  overlayRoot?.render(null);
  setTimeout(() => {
    const home = document.querySelector('button[aria-label="Home"]');
    if (home && !home.disabled) home.click();
  }, 120);
}`,
    `function cleanup() {
  pendingPhase = "";
  guideDateKey = "";
  singleTapAt = 0;
  stopObserver();
  restoreStorage();
  overlayRoot?.render(null);
}`,
    "schedule guide cleanup ownership"
  );

  source = replaceOnce(
    source,
    `  window.addEventListener(PHASE_CHANGE, (event) => {
    phase = event?.detail?.phase || "inactive";
    pendingPhase = "";
    if (ACTIVE_PHASES.has(phase)) installStorageGuard();
    else if (phase === "inactive") cleanup();
    renderOverlay();
    requestAnimationFrame(() => requestAnimationFrame(refresh));
  });`,
    `  window.addEventListener(PHASE_CHANGE, (event) => {
    phase = event?.detail?.phase || "inactive";
    pendingPhase = "";
    if (ACTIVE_PHASES.has(phase)) {
      installStorageGuard();
      startObserver();
      renderOverlay();
      requestAnimationFrame(() => requestAnimationFrame(refresh));
    } else if (phase === "inactive") {
      cleanup();
    }
  });`,
    "schedule guide active observer lifecycle"
  );

  source = removeOnce(
    source,
    `
  observer = new MutationObserver(() => refresh());
  observer.observe(document.body, { childList: true, subtree: true });`,
    "always-on schedule observer"
  );

  writeChanged(path, source, original);
}

const retiredFiles = [
  "src/runtime/installSettingsAccessLogout.js",
  "src/runtime/installSettingsScrollReset.js",
  "src/clara-settings-memory-entry.js",
  "src/runtime/claraGuideSchedulePhaseRedirect.js",
  "src/components/fresh/main-dashboard/hooks/useDashboardPanelController.js",
];

for (const path of retiredFiles) {
  if (!fs.existsSync(path)) continue;
  fs.unlinkSync(path);
  console.log(`Removed ${path}`);
}
