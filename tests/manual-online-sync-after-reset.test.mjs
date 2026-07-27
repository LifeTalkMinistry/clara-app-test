import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const resetSource = readSource("src/lib/clear-clara-device-data.js");
const policySource = readSource("src/lib/cloud-sync-policy.js");
const resolverSource = readSource("src/lib/accountLinking/resolveAccountLocalVault.js");
const bridgeSource = readSource("src/components/CloudVaultSyncBridge.jsx");
const dataExportSource = readSource("src/pages/DataExport.jsx");
const runtimeRegistrySource = readSource("src/runtime/installClaraRuntimePatches.js");

test("device reset leaves a local marker that pauses online sync", () => {
  assert.match(resetSource, /pauseOnlineSyncAfterDeviceReset/);
  assert.match(policySource, /clara_online_sync_paused_after_reset_v1/);
  assert.match(policySource, /setItem\(CLARA_ONLINE_SYNC_PAUSED_KEY, "1"\)/);
  assert.match(policySource, /removeItem\(CLARA_ONLINE_SYNC_PAUSED_KEY\)/);
});

test("device reset establishes a brand-new local vault identity", () => {
  assert.match(resetSource, /const freshVaultId = createLocalVaultId\(\)/);
  assert.match(resetSource, /setLocalVaultId\(freshVaultId\)/);
  assert.match(resetSource, /pauseOnlineSyncAfterDeviceReset\(\{ freshVaultId \}\)/);
  assert.match(policySource, /clara_reset_fresh_local_vault_v1/);
  assert.match(policySource, /getResetFreshLocalVaultId/);
  assert.match(policySource, /removeItem\(CLARA_RESET_FRESH_VAULT_KEY\)/);
});

test("login cannot reconnect a reset device to a surviving old local vault", () => {
  assert.match(resolverSource, /resolveResetFreshLocalVault/);
  assert.match(resolverSource, /isOnlineSyncPaused\(\)/);
  assert.match(resolverSource, /getResetFreshLocalVaultId\(\)/);
  assert.match(resolverSource, /Never recover account-linked metadata from a surviving old IndexedDB/);
  assert.match(resolverSource, /setActiveLocalVaultId\(vaultId\)/);
  assert.match(resolverSource, /resetFreshVault: true/);
  assert.match(
    resolverSource,
    /const resetResult = await resolveResetFreshLocalVault\(input\);[\s\S]*resetResult \|\|/
  );
});

test("automatic finance sync is suppressed while a reset device is paused", () => {
  assert.match(bridgeSource, /const \[syncPaused, setSyncPaused\]/);
  assert.match(bridgeSource, /if \(syncPaused\)/);
  assert.match(bridgeSource, /No automatic pull or upload is allowed/);
  assert.match(bridgeSource, /CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT/);
  assert.match(bridgeSource, /syncServerFinance\(\{ user: userRef\.current, forcePull \}\)/);
  assert.match(bridgeSource, /resumeOnlineSync\(\)/);
});

test("Security and privacy Backup & Transfer owns the single manual sync control", () => {
  assert.match(dataExportSource, /SECURITY & PRIVACY/);
  assert.match(dataExportSource, /Backup & Transfer/);
  assert.match(dataExportSource, /Online sync paused/);
  assert.match(dataExportSource, /Sync online data/);
  assert.match(dataExportSource, /syncServerFinance\(\{ user, forcePull: currentlyPaused \}\)/);
  assert.match(dataExportSource, /resumeOnlineSync\(\)/);
  assert.doesNotMatch(dataExportSource, /Sync pending offline changes now/);
  assert.doesNotMatch(dataExportSource, /Refresh this device from account database/);
  assert.doesNotMatch(runtimeRegistrySource, /import "\.\/installSettingsOnlineSync"/);
});
