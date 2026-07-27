import fs from "node:fs";

const dashboardPath =
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
const dataExportPath = "src/pages/DataExport.jsx";
const settingsTestPath = "tests/settings-local-only-regression.test.mjs";
const manualSyncTestPath = "tests/manual-online-sync-after-reset.test.mjs";
const cloudSyncTestPath = "tests/cloud-vault-sync.test.mjs";

const replaceOnce = (source, before, after, label) => {
  if (source.includes(after)) return source;

  const firstIndex = source.indexOf(before);
  if (firstIndex === -1) {
    throw new Error(`Missing copy-update anchor: ${label}`);
  }

  if (source.indexOf(before, firstIndex + before.length) !== -1) {
    throw new Error(`Copy-update anchor is not unique: ${label}`);
  }

  return source.slice(0, firstIndex) + after + source.slice(firstIndex + before.length);
};

const writeChanged = (path, source, original) => {
  if (source === original) {
    console.log(`No copy changes needed in ${path}`);
    return;
  }

  fs.writeFileSync(path, source);
  console.log(`Updated ${path}`);
};

{
  let source = fs.readFileSync(dashboardPath, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    "Your CLARA data is private",
    "Your CLARA data stays private",
    "privacy card title"
  );

  source = replaceOnce(
    source,
    "This device is your private CLARA environment.",
    "This device has its own CLARA data. Signing in on another device will not automatically bring your financial records with it.",
    "device ownership explanation"
  );

  source = replaceOnce(
    source,
    '["Financial records protected", "Device-first data", "Not publicly visible"]',
    '["Financial records protected", "Each device starts with its own data", "No automatic device-to-device sync", "You choose when to transfer your data"]',
    "device privacy bullets"
  );

  source = replaceOnce(
    source,
    "Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain protected.",
    "Your wallets, expenses, budgets, savings, transfers, transaction history, and AI context remain on this device unless you choose to back up or transfer them.",
    "device data summary"
  );

  source = replaceOnce(
    source,
    "Backup & Transfer",
    "Move & Restore Data",
    "settings transfer title"
  );

  source = replaceOnce(
    source,
    "Download or upload your CLARA device backup.",
    "Move your CLARA data to another device or restore a previous backup.",
    "settings transfer description"
  );

  writeChanged(dashboardPath, source, original);
}

{
  let source = fs.readFileSync(dataExportPath, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    '<h1 className="text-lg font-black">Backup & Transfer</h1>',
    '<h1 className="text-lg font-black">Move & Restore Data</h1>',
    "data transfer page title"
  );

  source = replaceOnce(
    source,
    "This is the one place to control how this device connects to your saved CLARA account data.",
    "Signing in does not move financial data automatically. Use this screen when you choose to connect this device to saved CLARA account data.",
    "data transfer page explanation"
  );

  writeChanged(dataExportPath, source, original);
}

{
  let source = fs.readFileSync(settingsTestPath, "utf8");
  const original = source;

  const oldBlock = `test("active Settings directly exposes Backup & Transfer through /data-export", () => {
  assert.match(activeSettingsSource, /Backup & Transfer/);
  assert.match(activeSettingsSource, /Download or upload your CLARA device backup\\./);
  assert.match(activeSettingsSource, /navigate\\("\\/data-export"\\)/);
  assert.match(activeSettingsSource, />Open</);
});`;

  const newBlock = `test("active Settings explains device-owned data and exposes Move & Restore Data through /data-export", () => {
  assert.match(activeSettingsSource, /Your CLARA data stays private/);
  assert.match(activeSettingsSource, /Signing in on another device will not automatically bring your financial records with it/);
  assert.match(activeSettingsSource, /Each device starts with its own data/);
  assert.match(activeSettingsSource, /No automatic device-to-device sync/);
  assert.match(activeSettingsSource, /You choose when to transfer your data/);
  assert.match(activeSettingsSource, /Move & Restore Data/);
  assert.match(activeSettingsSource, /Move your CLARA data to another device or restore a previous backup\\./);
  assert.match(activeSettingsSource, /navigate\\("\\/data-export"\\)/);
  assert.match(activeSettingsSource, />Open</);
});`;

  source = replaceOnce(source, oldBlock, newBlock, "Settings wording regression test");
  writeChanged(settingsTestPath, source, original);
}

{
  let source = fs.readFileSync(manualSyncTestPath, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    'test("Security and privacy Backup & Transfer owns the single manual sync control", () => {',
    'test("Security and privacy Move & Restore Data owns the single manual sync control", () => {',
    "manual sync test title"
  );
  source = replaceOnce(
    source,
    "assert.match(dataExportSource, /Backup & Transfer/);",
    "assert.match(dataExportSource, /Move & Restore Data/);",
    "manual sync transfer assertion"
  );

  writeChanged(manualSyncTestPath, source, original);
}

{
  let source = fs.readFileSync(cloudSyncTestPath, "utf8");
  const original = source;

  source = replaceOnce(
    source,
    "assert.match(storageScreen, /Backup & Transfer/);",
    "assert.match(storageScreen, /Move & Restore Data/);",
    "cloud sync transfer assertion"
  );

  writeChanged(cloudSyncTestPath, source, original);
}
