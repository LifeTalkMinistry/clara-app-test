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

const {
  isDeviceOnlyStorageKey,
  prepareCloudSnapshotForRestore,
  sanitizeCloudLocalStorage,
} = await import("../src/lib/cloud-vault-snapshot.js");

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

test("Daily Check-In is excluded from server sync but included in explicit backup transfer", async () => {
  const dailyCheckInKeys = [
    "clara_daily_check_in_v1",
    "clara_daily_check_in_v1_migrated_to",
    "clara_daily_check_in_v2:user-1",
    "clara_daily_check_in_v3:user-1",
    "clara_daily_check_in_v3_migrated:user-1",
  ];
  const sourceStorage = Object.fromEntries(
    dailyCheckInKeys.map((key, index) => [key, JSON.stringify({ streak: index + 1 })]),
  );
  sourceStorage.clara_settings_theme = "dark";

  dailyCheckInKeys.forEach((key) => assert.equal(isDeviceOnlyStorageKey(key), true));

  const serverSafe = sanitizeCloudLocalStorage(sourceStorage, {
    accountId: "user-1",
    sourceVaultId: "vault-a",
  });
  dailyCheckInKeys.forEach((key) => assert.equal(serverSafe[key], undefined));
  assert.equal(serverSafe.clara_settings_theme, "dark");

  const explicitBackup = sanitizeCloudLocalStorage(sourceStorage, {
    accountId: "user-1",
    sourceVaultId: "vault-a",
    includeDeviceOnly: true,
  });
  dailyCheckInKeys.forEach((key) => assert.equal(explicitBackup[key], sourceStorage[key]));

  const legacyServerSnapshot = {
    app: "CLARA",
    type: "account-cloud-vault-snapshot",
    version: 2,
    account_id: "user-1",
    created_at: "2026-07-28T00:00:00.000Z",
    source_vault_id: "vault-a",
    data: {
      localStorage: {
        "clara_daily_check_in_v3:user-1": JSON.stringify({ streak: 12 }),
        clara_settings_theme: "dark",
      },
      indexedDB: { databases: [] },
    },
  };

  const serverRestore = prepareCloudSnapshotForRestore(legacyServerSnapshot, {
    accountId: "user-1",
    targetVaultId: "vault-b",
  });
  assert.equal(serverRestore.data.localStorage["clara_daily_check_in_v3:user-1"], undefined);
  assert.equal(serverRestore.data.localStorage.clara_settings_theme, "dark");

  const explicitRestore = prepareCloudSnapshotForRestore(legacyServerSnapshot, {
    accountId: "user-1",
    targetVaultId: "vault-b",
    includeDeviceOnly: true,
  });
  assert.equal(
    explicitRestore.data.localStorage["clara_daily_check_in_v3:user-1"],
    JSON.stringify({ streak: 12 }),
  );

  const syncSource = await fs.readFile(
    new URL("../src/lib/server-finance-sync.js", import.meta.url),
    "utf8",
  );
  const snapshotSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8",
  );
  assert.match(syncSource, /!isDeviceOnlyStorageKey\(record\.id\)/);
  assert.match(snapshotSource, /includeDeviceOnly: true/);
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
