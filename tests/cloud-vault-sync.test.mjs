import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const {
  CLARA_STORAGE_MODES,
  getClaraStorageMode,
  getClaraStorageModeKey,
  normalizeClaraStorageMode,
  saveClaraStorageMode,
} = await import("../src/lib/clara-storage-mode.js");

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test("legacy storage mode helpers remain readable for existing installs", () => {
  const storage = new MemoryStorage();
  assert.equal(getClaraStorageMode("7", storage), CLARA_STORAGE_MODES.LOCAL_ONLY);
  assert.equal(normalizeClaraStorageMode("unexpected"), CLARA_STORAGE_MODES.LOCAL_ONLY);

  saveClaraStorageMode("7", CLARA_STORAGE_MODES.ONLINE_SYNC, storage);
  assert.equal(getClaraStorageMode("7", storage), CLARA_STORAGE_MODES.ONLINE_SYNC);
  assert.equal(getClaraStorageMode("8", storage), CLARA_STORAGE_MODES.LOCAL_ONLY);
  assert.equal(getClaraStorageModeKey("7"), "clara_storage_mode_v1:7");
});

test("private backup implementation excludes auth, vault mapping, and device identity secrets", async () => {
  const source = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /clara_backend_access_token_v1/);
  assert.match(source, /clara_backend_user_v1/);
  assert.match(source, /clara_backend_user_verified_at_v1/);
  assert.match(source, /clara_sync_device_id_v1/);
  assert.match(source, /clara_account_vault_directory_v1|ACCOUNT_VAULT_DIRECTORY_KEY/);
  assert.match(source, /storageKeyBelongsToAnotherAccount/);
  assert.match(source, /record\.localUserId/);
  assert.match(source, /CLOUD_SNAPSHOT_ACCOUNT_MISMATCH/);
});

test("Daily Check-In remains device-only during server sync", async () => {
  const syncSource = await fs.readFile(
    new URL("../src/lib/server-finance-sync.js", import.meta.url),
    "utf8",
  );
  const snapshotSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8",
  );
  const localExportSource = await fs.readFile(
    new URL("../src/lib/local-data-export.js", import.meta.url),
    "utf8",
  );

  assert.match(snapshotSource, /DEVICE_ONLY_STORAGE_KEY_PATTERN\s*=\s*\/\^clara_daily_check_in_\/i/);
  assert.match(snapshotSource, /export function isDeviceOnlyStorageKey\(key\)/);
  assert.match(
    snapshotSource,
    /sanitizeCloudLocalStorage\([\s\S]*includeDeviceOnly = false[\s\S]*!includeDeviceOnly && isDeviceOnlyStorageKey\(key\)/,
  );
  assert.match(
    snapshotSource,
    /prepareCloudSnapshotForRestore\([\s\S]*includeDeviceOnly = false[\s\S]*!includeDeviceOnly && isDeviceOnlyStorageKey\(rewrittenKey\)/,
  );
  assert.match(
    snapshotSource,
    /clearCloudRestoreStorage\([\s\S]*includeDeviceOnly = false[\s\S]*!includeDeviceOnly && isDeviceOnlyStorageKey\(key\)/,
  );
  assert.match(syncSource, /!isDeviceOnlyStorageKey\(record\.id\)/);

  assert.match(
    snapshotSource,
    /downloadClaraPrivateBackup[\s\S]*includeDeviceOnly:\s*true/,
  );
  assert.match(
    snapshotSource,
    /restoreClaraPrivateBackupFile[\s\S]*includeDeviceOnly:\s*true/,
  );

  assert.match(localExportSource, /clara_daily_check_in_v1/);
  assert.match(localExportSource, /clara_daily_check_in_v2:/);
  assert.match(localExportSource, /clara_daily_check_in_v3:/);
});

test("server finance sync keeps the manual control under simple user-facing Privacy copy", async () => {
  const syncSource = await fs.readFile(
    new URL("../src/lib/server-finance-sync.js", import.meta.url),
    "utf8"
  );
  const bridgeSource = await fs.readFile(
    new URL("../src/components/CloudVaultSyncBridge.jsx", import.meta.url),
    "utf8"
  );
  const storageScreen = await fs.readFile(
    new URL("../src/pages/DataExport.jsx", import.meta.url),
    "utf8"
  );

  assert.match(syncSource, /\/api\/finance\/bootstrap/);
  assert.match(syncSource, /\/api\/finance\/sync/);
  assert.match(syncSource, /firstServerPull/);
  assert.match(syncSource, /const changes = \[\]/);
  assert.match(syncSource, /replaceLocalCacheFromServer/);
  assert.match(syncSource, /initializedLocally/);
  assert.match(bridgeSource, /syncServerFinance/);
  assert.doesNotMatch(bridgeSource, /syncClaraCloudVault/);
  assert.match(storageScreen, /SECURITY & PRIVACY/);
  assert.match(storageScreen, /Move & Restore Data/);
  assert.match(storageScreen, /Save this device's data/);
  assert.match(storageScreen, /Bring saved data to this device/);
  assert.match(storageScreen, /Your CLARA data will not appear automatically/);
  assert.doesNotMatch(storageScreen, /Revision \{/);
  assert.doesNotMatch(storageScreen, /One account database across devices/);
  assert.doesNotMatch(storageScreen, /source of truth/i);
});

test("legacy cloud vault remains available only as backup/recovery plumbing", async () => {
  const syncSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-sync.js", import.meta.url),
    "utf8"
  );
  const snapshotSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );

  assert.match(syncSource, /authoritativeLocal/);
  assert.match(snapshotSource, /replaceExisting = true/);
  assert.match(snapshotSource, /clearCloudRestoreStorage/);
});

test("backend requests bypass the ngrok browser interstitial", async () => {
  const clientSource = await fs.readFile(
    new URL("../src/lib/clara-backend-client.js", import.meta.url),
    "utf8"
  );

  assert.match(clientSource, /ngrok-skip-browser-warning/);
  assert.match(clientSource, /Authorization: `Bearer \$\{token\}`/);
});
