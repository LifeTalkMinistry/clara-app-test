import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const resetSource = readSource("src/lib/clear-clara-device-data.js");
const policySource = readSource("src/lib/cloud-sync-policy.js");
const storageModeSource = readSource("src/lib/clara-storage-mode.js");
const strictPolicySource = readSource("src/lib/strict-storage-mode-policy.js");
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

test("Device-Only mode suppresses automatic finance sync", () => {
  assert.match(storageModeSource, /LOCAL_ONLY: "local_only"/);
  assert.match(storageModeSource, /ONLINE_SYNC: "online_sync"/);
  assert.match(strictPolicySource, /storageMode !== CLARA_STORAGE_MODES\.ONLINE_SYNC/);
  assert.match(strictPolicySource, /state: "local_only"/);
  assert.match(bridgeSource, /const \[syncPaused, setSyncPaused\]/);
  assert.match(bridgeSource, /storageMode !== CLARA_STORAGE_MODES\.ONLINE_SYNC/);
  assert.match(bridgeSource, /Device-Only mode never installs upload listeners/);
  assert.match(bridgeSource, /CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT/);
  assert.match(bridgeSource, /syncFinanceForActiveMode/);
  assert.match(bridgeSource, /resumeOnlineSync\(\)/);
});

test("Security and privacy owns explicit strict mode controls", () => {
  assert.match(dataExportSource, /SECURITY & PRIVACY/);
  assert.match(dataExportSource, /Move & Restore Data/);
  assert.match(dataExportSource, /Device-Only Mode/);
  assert.match(dataExportSource, /Online Sync Mode/);
  assert.match(dataExportSource, /Ready when you are/);
  assert.match(dataExportSource, /Bring saved data to this device/);
  assert.match(dataExportSource, /Save this device's data online/);
  assert.match(dataExportSource, /syncFinanceForActiveMode\(\{ user, forcePull: true \}\)/);
  assert.match(dataExportSource, /enableStrictDeviceOnlyMode/);
  assert.match(dataExportSource, /clearClaraDeviceData/);
  assert.match(dataExportSource, /resumeOnlineSync\(\)/);
  assert.doesNotMatch(dataExportSource, /Revision \{/);
  assert.doesNotMatch(dataExportSource, /One account database across devices/);
  assert.doesNotMatch(dataExportSource, /source of truth/i);
  assert.doesNotMatch(runtimeRegistrySource, /import "\.\/installSettingsOnlineSync"/);
});
