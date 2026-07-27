import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const resetSource = readSource("src/lib/clear-clara-device-data.js");
const policySource = readSource("src/lib/cloud-sync-policy.js");
const bridgeSource = readSource("src/components/CloudVaultSyncBridge.jsx");
const settingsSyncSource = readSource("src/runtime/installSettingsOnlineSync.js");
const runtimeRegistrySource = readSource("src/runtime/installClaraRuntimePatches.js");

test("device reset leaves a local marker that pauses online sync", () => {
  assert.match(resetSource, /pauseOnlineSyncAfterDeviceReset/);
  assert.match(policySource, /clara_online_sync_paused_after_reset_v1/);
  assert.match(policySource, /setItem\(CLARA_ONLINE_SYNC_PAUSED_KEY, "1"\)/);
  assert.match(policySource, /removeItem\(CLARA_ONLINE_SYNC_PAUSED_KEY\)/);
});

test("automatic finance sync is suppressed while a reset device is paused", () => {
  assert.match(bridgeSource, /const \[syncPaused, setSyncPaused\]/);
  assert.match(bridgeSource, /if \(syncPaused\)/);
  assert.match(bridgeSource, /No automatic pull or upload is allowed/);
  assert.match(bridgeSource, /CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT/);
  assert.match(bridgeSource, /syncServerFinance\(\{ user: userRef\.current, forcePull \}\)/);
  assert.match(bridgeSource, /resumeOnlineSync\(\)/);
});

test("Settings exposes explicit online restore and sync controls", () => {
  assert.match(settingsSyncSource, /Online sync paused/);
  assert.match(settingsSyncSource, /Sync online data/);
  assert.match(settingsSyncSource, /Logging in does not restore cloud finance data/);
  assert.match(settingsSyncSource, /requestManualOnlineSync/);
  assert.match(settingsSyncSource, /forcePull: currentlyPaused/);
  assert.match(runtimeRegistrySource, /installSettingsOnlineSync/);
});
