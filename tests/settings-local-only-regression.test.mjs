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

test("router exposes the CLARA backend login and protects app routes", () => {
  assert.match(appSource, /pages\/Login/);
  assert.match(appSource, /<Login \/>/);
  assert.match(appSource, /!authReady \|\| loading \|\| roleLoading/);
  assert.match(appSource, /<Navigate to="\/login" replace state=\{\{ from: location \}\} \/>/);
  assert.match(
    appSource,
    /path="\/link-local-vault" element=\{<Navigate to=\{user \? "\/dashboard" : "\/login"\} replace \/>\}/
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

test("backup page keeps download, upload, validation, confirmation, restore, and reload behavior", () => {
  assert.match(dataExportSource, /Download CLARA Backup/);
  assert.match(dataExportSource, /Upload CLARA Backup/);
  assert.match(dataExportSource, /accept="application\/json,\.json"/);
  assert.match(
    dataExportSource,
    /window\.confirm\("Use this CLARA backup file on this device\?"\)/
  );
  assert.match(dataExportSource, /restoreClaraLocalDataFromFile/);
  assert.match(dataExportSource, /window\.location\.reload\(\)/);
});

test("router preserves /data-export and retires the legacy account-based Settings surface", () => {
  assert.match(appSource, /path="\/data-export" element=\{<DataExport \/>\}/);
  assert.match(
    appSource,
    /path="\/settings" element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
  assert.match(
    appSource,
    /path="\/settings\/:section" element=\{<Navigate to="\/dashboard" replace \/>\}/
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
