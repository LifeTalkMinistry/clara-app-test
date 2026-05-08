import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
const settingsPanelPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";

let changed = false;

if (fs.existsSync(settingsPanelPath)) {
  let settingsSource = fs.readFileSync(settingsPanelPath, "utf8");
  const originalSettingsSource = settingsSource;

  settingsSource = settingsSource.replace(
    'import { useCallback, useEffect, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useState } from "react";'
  );

  if (
    settingsSource.includes("useMemo(") &&
    !settingsSource.includes("useMemo, useState") &&
    !settingsSource.includes("useMemo } from \"react\"")
  ) {
    throw new Error("DashboardSettingsPanel uses useMemo but the React import was not fixed.");
  }

  if (settingsSource !== originalSettingsSource) {
    fs.writeFileSync(settingsPanelPath, settingsSource);
    changed = true;
    console.log("Fixed DashboardSettingsPanel React imports.");
  }
}

if (fs.existsSync(dashboardPath)) {
  let dashboardSource = fs.readFileSync(dashboardPath, "utf8");
  const originalDashboardSource = dashboardSource;

  const staleClearLongPressEffect = `
  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);
`;

  dashboardSource = dashboardSource.replace(staleClearLongPressEffect, "\n");

  if (dashboardSource.includes("clearLongPressTimer")) {
    throw new Error("Dashboard still references stale clearLongPressTimer after runtime cleanup.");
  }

  if (dashboardSource !== originalDashboardSource) {
    fs.writeFileSync(dashboardPath, dashboardSource);
    changed = true;
    console.log("Removed stale Dashboard clearLongPressTimer effect.");
  }
}

if (!changed) {
  console.log("No dashboard runtime fixes needed.");
}
