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

test("active local-only Settings does not render authentication or account-linking controls", () => {
  assert.doesNotMatch(activeSettingsSource, /Log out/);
  assert.doesNotMatch(activeSettingsSource, /Signing out/);
  assert.doesNotMatch(activeSettingsSource, /handleSignOut/);
  assert.doesNotMatch(activeSettingsSource, /auth\.signOut/);
  assert.doesNotMatch(activeSettingsSource, /Protect & link my data/);
  assert.doesNotMatch(activeSettingsSource, /Signed in as/);
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

test("login and account-link URLs stay hidden in local-only mode", () => {
  assert.doesNotMatch(appSource, /pages\/Login/);
  assert.doesNotMatch(appSource, /pages\/LinkLocalVault/);
  assert.doesNotMatch(appSource, /<Login \/>/);
  assert.doesNotMatch(appSource, /<LinkLocalVault \/>/);
  assert.match(
    appSource,
    /path="\/login" element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
  assert.match(
    appSource,
    /path="\/link-local-vault" element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
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
