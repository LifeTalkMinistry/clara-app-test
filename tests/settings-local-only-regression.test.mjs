import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const activeSettingsSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const dataExportSource = readSource("src/pages/DataExport.jsx");
const appSource = readSource("src/App.jsx");
const loginSource = readSource("src/pages/Login.jsx");
const authContextSource = readSource("src/context/AuthContext.jsx");
const layoutSource = readSource("src/components/Layout.jsx");
const dashboardPanelRendererSource = readSource(
  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx"
);
const localVaultIdentityStartup = readSource("src/lib/start-local-vault-identity.js");
const settingsAccessLogoutSource = readSource(
  "src/runtime/installSettingsAccessLogout.js"
);
const settingsScrollResetSource = readSource(
  "src/runtime/installSettingsScrollReset.js"
);
const settingsMemoryEntrySource = readSource("src/clara-settings-memory-entry.js");
const settingsCleanupSource = readSource("src/settings-cleanup.css");

const retiredThemePatchUrl = new URL(
  "../src/settings-hide-theme-appearance.js",
  import.meta.url
);
const retiredDemoPatchUrl = new URL(
  "../src/clara-settings-young-professional-current-state.js",
  import.meta.url
);

test("active Settings directly exposes Backup & Transfer through /data-export", () => {
  assert.match(activeSettingsSource, /Backup & Transfer/);
  assert.match(activeSettingsSource, /Download or upload your CLARA device backup\./);
  assert.match(activeSettingsSource, /navigate\("\/data-export"\)/);
  assert.match(activeSettingsSource, />Open</);
});

test("active Settings keeps authentication controls out of the financial settings panel", () => {
  assert.doesNotMatch(activeSettingsSource, /Log out/);
  assert.doesNotMatch(activeSettingsSource, /Signing out/);
  assert.doesNotMatch(activeSettingsSource, /handleSignOut/);
  assert.doesNotMatch(activeSettingsSource, /auth\.signOut/);
  assert.doesNotMatch(activeSettingsSource, /Protect & link my data/);
});

test("dashboard renderer does not append a second logout control", () => {
  assert.doesNotMatch(dashboardPanelRendererSource, /SettingsLogoutButton/);
  assert.doesNotMatch(dashboardPanelRendererSource, /renderSettingsWithLogout/);
  assert.doesNotMatch(dashboardPanelRendererSource, /Log out/);
  assert.doesNotMatch(dashboardPanelRendererSource, /auth\.signOut/);
  assert.match(
    dashboardPanelRendererSource,
    /activePanel === "settings"[\s\S]*renderSettings\?\.\(\) \?\? fallback/
  );
});

test("Settings helpers use one event-driven sync instead of document-wide observers", () => {
  assert.match(settingsAccessLogoutSource, /clara:settings-view-synced/);
  assert.match(settingsScrollResetSource, /clara:settings-view-synced/);

  for (const source of [
    settingsAccessLogoutSource,
    settingsScrollResetSource,
    settingsMemoryEntrySource,
  ]) {
    assert.doesNotMatch(source, /MutationObserver/);
  }

  assert.equal(existsSync(retiredThemePatchUrl), false);
  assert.equal(existsSync(retiredDemoPatchUrl), false);
  assert.doesNotMatch(settingsCleanupSource, /body:has\(/);
  assert.match(settingsCleanupSource, /body\.clara-settings-active/);
});

test("Settings permanently hides theme customization through one scoped CSS owner", () => {
  assert.equal(existsSync(retiredThemePatchUrl), false);
  assert.match(
    settingsCleanupSource,
    /button\.group:has\(svg\.lucide-palette\)[\s\S]*display:\s*none\s*!important/
  );
});

test("hidden Settings demo shortcut has been removed from production source", () => {
  assert.equal(existsSync(retiredDemoPatchUrl), false);
});

test("router exposes the CLARA backend login and protects app routes", () => {
  assert.match(appSource, /pages\/Login/);
  assert.match(appSource, /<Login \/>/);
  assert.match(appSource, /const isLoginRoute = location\.pathname === "\/login";/);
  assert.match(appSource, /!authReady \|\| roleLoading \|\| \(loading && !isLoginRoute\)/);
  assert.match(appSource, /<Navigate to="\/login" replace state=\{\{ from: location \}\} \/>/);
  assert.match(
    appSource,
    /path="\/link-local-vault"\s+element=\{<Navigate to=\{user \? "\/dashboard" : "\/login"\} replace \/>\}/
  );
});

test("login and AuthContext use the custom backend instead of Supabase auth", () => {
  assert.doesNotMatch(loginSource, /supabase/i);
  assert.match(loginSource, /signIn/);
  assert.match(loginSource, /signUp/);
  assert.match(authContextSource, /clara-backend-client/);
  assert.match(authContextSource, /restoreClaraBackendSession/);
  assert.doesNotMatch(authContextSource, /device-local and does not use user accounts/);
});

test("storage page exposes Online Sync, Local Only, private download, restore, confirmation, and reload", () => {
  assert.match(dataExportSource, /Online Sync/);
  assert.match(dataExportSource, /Local Only/);
  assert.match(dataExportSource, /Download private backup/);
  assert.match(dataExportSource, /Restore private backup/);
  assert.match(dataExportSource, /accept="application\/json,\.json"/);
  assert.match(dataExportSource, /Switch to Local Only\?/);
  assert.match(dataExportSource, /restoreClaraPrivateBackupFile/);
  assert.match(dataExportSource, /window\.location\.reload\(\)/);
});

test("router preserves /data-export and retires the legacy account-based Settings surface", () => {
  assert.match(appSource, /path="\/data-export"\s+element=\{<DataExport \/>\}/);
  assert.match(
    appSource,
    /path="\/settings"\s+element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
  assert.match(
    appSource,
    /path="\/settings\/:section"\s+element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
  assert.doesNotMatch(appSource, /<Settings \/>/);
});

test("obsolete DOM Settings patch is no longer initialized", () => {
  assert.doesNotMatch(localVaultIdentityStartup, /installLocalVaultSettingsExperience/);
  assert.equal(
    existsSync(
      new URL(
        "../src/runtime/installLocalVaultSettingsExperience.js",
        import.meta.url
      )
    ),
    false
  );
});

test("data export page does not expose the global top padding accent", () => {
  assert.match(layoutSource, /isDataExportPage = location\.pathname === "\/data-export"/);
  assert.match(layoutSource, /clara-data-export-layout/);
  assert.match(
    layoutSource,
    /\.clara-data-export-layout main \{ padding-top: 0 !important; \}/
  );
});
