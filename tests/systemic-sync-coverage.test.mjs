import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const bridgeSource = await fs.readFile(
  new URL("../src/components/CloudVaultSyncBridge.jsx", import.meta.url),
  "utf8",
);
const guardSource = await fs.readFile(
  new URL("../src/runtime/installLocalFinanceSyncGuard.js", import.meta.url),
  "utf8",
);
const mainSource = await fs.readFile(
  new URL("../src/main.jsx", import.meta.url),
  "utf8",
);
const snapshotSource = await fs.readFile(
  new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
  "utf8",
);

test("all local finance IndexedDB stores notify the account sync bridge", () => {
  assert.match(guardSource, /FINANCE_DB_NAME = "clara_local_finance"/);
  assert.match(guardSource, /WRITE_METHODS = \["add", "put", "delete", "clear"\]/);
  assert.match(guardSource, /transaction\.addEventListener\([\s\S]*"complete"/);
  assert.match(guardSource, /FINANCE_UPDATED_EVENT = "clara-local-finance-updated"/);
  assert.match(mainSource, /import "\.\/runtime\/installLocalFinanceSyncGuard";/);
  assert.match(bridgeSource, /"clara-local-finance-updated"/);
});

test("localStorage-backed features and returning devices trigger synchronization", () => {
  assert.match(bridgeSource, /prototype\.setItem = patchedSetItem/);
  assert.match(bridgeSource, /prototype\.removeItem = patchedRemoveItem/);
  assert.match(bridgeSource, /clara:syncable-local-storage-changed/);
  assert.match(bridgeSource, /window\.addEventListener\("focus"/);
  assert.match(bridgeSource, /document\.addEventListener\("visibilitychange"/);
  assert.match(bridgeSource, /FOREGROUND_SYNC_INTERVAL_MS/);
  assert.match(bridgeSource, /__claraPrepareServerFinanceMutation/);
});

test("daily check-in remains intentionally device-only", () => {
  assert.match(bridgeSource, /DEVICE_ONLY_STORAGE_KEY_PATTERN = \/\^clara_daily_check_in_\/i/);
  assert.match(
    snapshotSource,
    /DEVICE_ONLY_STORAGE_KEY_PATTERN\s*=\s*\/\^clara_daily_check_in_\/i/,
  );
});
