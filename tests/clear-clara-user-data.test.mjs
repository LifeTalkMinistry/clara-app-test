import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const resetSource = readSource("src/lib/clear-clara-device-data.js");
const resetPanelSource = readSource(
  "src/components/device-transfer/ClaraDataResetPanel.jsx"
);
const transferPanelSource = readSource(
  "src/components/device-transfer/DeviceTransferPanel.jsx"
);

test("start-fresh reset preserves only the CLARA backend account session", () => {
  assert.match(resetSource, /export async function clearClaraDataKeepAccount/);
  assert.match(resetSource, /TOKEN_KEY/);
  assert.match(resetSource, /USER_KEY/);
  assert.match(resetSource, /USER_VERIFIED_AT_KEY/);
  assert.match(resetSource, /captureStorageEntries/);
  assert.match(resetSource, /restoreStorageEntries/);
  assert.match(resetSource, /pauseOnlineSyncAfterDeviceReset/);
  assert.match(resetSource, /createLocalVaultId/);
  assert.match(resetSource, /clara_device_transfer_recovery/);
});

test("start-fresh reset does not mutate or delete the server account", () => {
  const startFreshFunction = resetSource.match(
    /export async function clearClaraDataKeepAccount\(\)[\s\S]*?\n}\n\n\/\*\*/
  )?.[0] || "";

  assert.ok(startFreshFunction, "clearClaraDataKeepAccount source should be discoverable");
  assert.doesNotMatch(startFreshFunction, /signOutFromClaraBackend/);
  assert.doesNotMatch(startFreshFunction, /backendRequest/);
  assert.doesNotMatch(startFreshFunction, /fetch\s*\(/);
  assert.doesNotMatch(startFreshFunction, /supabase/i);
});

test("Security exposes a guarded destructive clear-data flow", () => {
  assert.match(transferPanelSource, /ClaraDataResetPanel/);
  assert.match(resetPanelSource, /Clear all CLARA data/);
  assert.match(resetPanelSource, /Type CLEAR to continue/);
  assert.match(resetPanelSource, /Clear Everything/);
  assert.match(resetPanelSource, /account and membership stay active/i);
  assert.match(resetPanelSource, /clearClaraDataKeepAccount/);
  assert.match(resetPanelSource, /#\/onboarding/);
  assert.match(resetPanelSource, /disabled=\{!confirmationMatches \|\| isClearing\}/);
});
