import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const resetSource = readSource("src/lib/clear-clara-device-data.js");
const settingsRuntimeSource = readSource("src/runtime/installSettingsDeviceReset.js");
const runtimeRegistrySource = readSource("src/runtime/installClaraRuntimePatches.js");

test("device reset clears local CLARA storage layers", () => {
  assert.match(resetSource, /localStorage\?\.clear\(\)/);
  assert.match(resetSource, /sessionStorage\?\.clear\(\)/);
  assert.match(resetSource, /indexedDB\.deleteDatabase/);
  assert.match(resetSource, /objectStore\(storeName\)\.clear\(\)/);
  assert.match(resetSource, /LOCAL_FINANCE_DB_NAME/);
  assert.match(resetSource, /closeLocalFinanceDb/);
  assert.match(resetSource, /clara_behavioral_memory_db/);
  assert.match(resetSource, /clara_local_notifications/);
  assert.match(resetSource, /caches\.keys\(\)/);
  assert.match(resetSource, /LocalNotifications/);
  assert.match(resetSource, /removeAllDeliveredNotifications/);
  assert.match(resetSource, /PushNotifications/);
  assert.match(resetSource, /unregister/);
});

test("blocked IndexedDB schema deletion does not substitute for clearing records", () => {
  assert.match(resetSource, /clearIndexedDatabaseContents/);
  assert.match(resetSource, /contents were cleared instead/i);
  assert.doesNotMatch(resetSource, /request\.onblocked\s*=\s*finish/);
});

test("device reset never deletes synced account data", () => {
  assert.doesNotMatch(resetSource, /backendRequest/);
  assert.doesNotMatch(resetSource, /supabase/i);
  assert.doesNotMatch(resetSource, /fetch\s*\(/);
  assert.doesNotMatch(resetSource, /\/api\//);
  assert.match(resetSource, /no server-side[\s\S]*delete/i);
  assert.match(resetSource, /Unsynced local changes are intentionally discarded/i);
});

test("Settings exposes a guarded Clear this device flow", () => {
  assert.match(settingsRuntimeSource, /Clear this device/);
  assert.match(settingsRuntimeSource, /Type CLEAR to continue/);
  assert.match(settingsRuntimeSource, /Unsynced changes will be lost/);
  assert.match(settingsRuntimeSource, /Synced account data stays safe/);
  assert.match(settingsRuntimeSource, /clearClaraDeviceData/);
  assert.doesNotMatch(settingsRuntimeSource, /MutationObserver/);
});

test("successful device reset tears down authentication and hard restarts on login", () => {
  assert.match(settingsRuntimeSource, /signOutFromClaraBackend\(\)/);
  assert.match(settingsRuntimeSource, /history\.replaceState[\s\S]*#\/login/);
  assert.match(settingsRuntimeSource, /window\.location\.reload\(\)/);
  assert.doesNotMatch(settingsRuntimeSource, /setTimeout\(\(\) => window\.location\.reload/);
});

test("device reset runtime is loaded by the CLARA runtime registry", () => {
  assert.match(runtimeRegistrySource, /installSettingsDeviceReset/);
});
