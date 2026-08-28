import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const activeSettingsSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const dataExportSource = readSource("src/pages/DataExport.jsx");
const deviceTransferSource = readSource(
  "src/components/device-transfer/DeviceTransferPanel.jsx"
);
const appSource = readSource("src/App.jsx");
const mainSource = readSource("src/main.jsx");
const loginSource = readSource("src/pages/Login.jsx");
const authContextSource = readSource("src/context/AuthContext.jsx");
const layoutSource = readSource("src/components/Layout.jsx");
const dashboardPanelRendererSource = readSource(
  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx"
);
const localVaultIdentityStartup = readSource("src/lib/start-local-vault-identity.js");
const runtimeRegistrySource = readSource("src/runtime/installClaraRuntimePatches.js");

const retiredThemePatchUrl = new URL(
  "../src/settings-hide-theme-appearance.js",
  import.meta.url
);
const retiredDemoPatchUrl = new URL(
  "../src/clara-settings-young-professional-current-state.js",
  import.meta.url
);
const retiredSettingsRuntimeUrls = [
  new URL("../src/runtime/installSettingsAccessLogout.js", import.meta.url),
  new URL("../src/runtime/installSettingsScrollReset.js", import.meta.url),
  new URL("../src/clara-settings-memory-entry.js", import.meta.url),
];

test("active Settings explains device ownership and exposes transfer directly", () => {
  assert.match(activeSettingsSource, /Your CLARA data stays private/);
  assert.match(activeSettingsSource, /Your financial data stays on this device by default/);
  assert.match(activeSettingsSource, /Signing in somewhere else will not automatically copy it/);
  assert.match(activeSettingsSource, /Stays on this device/);
  assert.match(activeSettingsSource, /No automatic device sync/);
  assert.match(activeSettingsSource, /You control backup & transfer/);
  assert.match(activeSettingsSource, /DeviceTransferPanel/);
  assert.doesNotMatch(activeSettingsSource, /Backup & Restore File/);
  assert.doesNotMatch(
    activeSettingsSource,
    /Download or restore your personal CLARA backup file\./
  );
  assert.doesNotMatch(activeSettingsSource, /navigate\("\/data-export"\)/);
});

test("Settings owns detail history and logout without the retired Memory entry", () => {
  assert.match(activeSettingsSource, /SETTINGS_DETAIL_HISTORY_KEY/);
  assert.match(activeSettingsSource, /window\.history\.pushState/);
  assert.match(activeSettingsSource, /window\.addEventListener\("popstate"/);
  assert.match(activeSettingsSource, /signOutFromClaraBackend/);
  assert.match(activeSettingsSource, /"Log out"/);
  assert.doesNotMatch(activeSettingsSource, /title: "Memory"/);
  assert.doesNotMatch(activeSettingsSource, /clara:open-assistant-memory-board/);
  assert.doesNotMatch(activeSettingsSource, /MutationObserver/);
});

test("Settings presents canonical account identity without owning a second profile editor", () => {
  assert.match(activeSettingsSource, /fetchCanonicalClaraProfile/);
  assert.match(activeSettingsSource, /resolveCanonicalDisplayName\(canonicalProfile\)/);
  assert.match(activeSettingsSource, /user\?\.email \|\| "CLARA user"/);
  assert.doesNotMatch(activeSettingsSource, /title: "Profile information"/);
  assert.doesNotMatch(activeSettingsSource, /activeSetting === "profile"/);
  assert.doesNotMatch(activeSettingsSource, /handleSaveProfile|profileName|placeholder="Enter your name"/);
});

test("retired Settings DOM injectors are removed from production", () => {
  retiredSettingsRuntimeUrls.forEach((url) => assert.equal(existsSync(url), false));
  assert.doesNotMatch(mainSource, /installSettingsAccessLogout/);
  assert.doesNotMatch(runtimeRegistrySource, /installSettingsScrollReset/);
  assert.doesNotMatch(runtimeRegistrySource, /clara-settings-memory-entry/);
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

test("Settings owns appearance directly and exposes no theme customization row", () => {
  assert.equal(existsSync(retiredThemePatchUrl), false);
  assert.doesNotMatch(
    activeSettingsSource,
    /openThemePicker|lucide-palette|title: "Appearance"|title: "Theme"/
  );
});

test("hidden Settings demo shortcut has been removed from production source", () => {
  assert.equal(existsSync(retiredDemoPatchUrl), false);
});

test("router exposes the CLARA backend login and protects app routes", () => {
  assert.match(appSource, /pages\/Login/);
  assert.match(appSource, /<Login \/>/);
  assert.match(appSource, /const isPublicAuthRoute =/);
  assert.match(appSource, /loading && !isPublicAuthRoute/);
  assert.match(appSource, /state=\{location\.pathname === "\/" \? undefined : \{ from: location \}\}/);
  assert.match(
    appSource,
    /path="\/link-local-vault"[\s\S]*?<Navigate to=\{user \? CLARA_ORB_PATH : "\/login"\} replace \/>/
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

test("Security settings owns explicit device roles while Backup & Restore owns backup files", () => {
  assert.match(activeSettingsSource, /DeviceTransferPanel/);
  assert.match(deviceTransferSource, /Send data to another device/);
  assert.match(deviceTransferSource, /Receive data on this device/);
  assert.match(deviceTransferSource, /Approve this device/);
  assert.match(deviceTransferSource, /Migrate to this device now/);
  assert.match(dataExportSource, /Backup & Restore/);
  assert.match(dataExportSource, /Personal backup file/);
  assert.match(dataExportSource, /Download backup/);
  assert.match(dataExportSource, /Restore from backup file/);
  assert.match(dataExportSource, /restoreClaraPrivateBackupFile/);
  assert.match(dataExportSource, /accept="application\/json,\.json"/);
  assert.match(dataExportSource, /window\.location\.reload\(\)/);
  assert.doesNotMatch(dataExportSource, /DeviceTransferPanel/);
  assert.doesNotMatch(dataExportSource, /syncServerFinance/);
  assert.doesNotMatch(dataExportSource, /One account database across devices/);
  assert.doesNotMatch(dataExportSource, /source of truth/i);
});

test("router preserves /data-export and retires the legacy account-based Settings surface", () => {
  assert.match(appSource, /path="\/data-export"\s+element=\{<DataExport \/>\}/);
  assert.doesNotMatch(layoutSource, /Account & data/);
  assert.doesNotMatch(localVaultIdentityStartup, /Protect & link my data/);
});
