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
  isRuntimeOnlyStorageKey,
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

test("runtime access snapshots never enter portable transfer state", async () => {
  assert.equal(isRuntimeOnlyStorageKey("clara_access_snapshot_v2:last"), true);
  assert.equal(isRuntimeOnlyStorageKey("clara_access_snapshot_v2:account-1"), true);
  assert.equal(isRuntimeOnlyStorageKey("clara_daily_check_in_v3:vault-old"), false);

  const sanitized = sanitizeCloudLocalStorage(
    {
      "clara_access_snapshot_v2:last": JSON.stringify({ checkedAt: "source" }),
      "clara_access_snapshot_v2:account-1": JSON.stringify({ checkedAt: "source" }),
      "clara_daily_check_in_v3:vault-old": JSON.stringify({ currentStreak: 21 }),
      "clara_settings_vault-old": JSON.stringify({ compact: true }),
    },
    {
      accountId: "account-1",
      sourceVaultId: "vault-old",
      includeDeviceOnly: true,
    }
  );

  assert.equal(sanitized["clara_access_snapshot_v2:last"], undefined);
  assert.equal(sanitized["clara_access_snapshot_v2:account-1"], undefined);
  assert.ok(sanitized["clara_daily_check_in_v3:vault-old"]);
  assert.ok(sanitized["clara_settings_vault-old"]);

  const legacyApprovedSnapshot = {
    app: "CLARA",
    type: "account-cloud-vault-snapshot",
    version: 2,
    account_id: "account-1",
    created_at: "2026-08-30T00:00:00.000Z",
    source_vault_id: "vault-old",
    source_device_id: "device-old",
    data: {
      localStorage: {
        "clara_access_snapshot_v2:last": JSON.stringify({ checkedAt: "source" }),
        "clara_daily_check_in_v3:vault-old": JSON.stringify({ currentStreak: 21 }),
      },
      indexedDB: { supported: true, databases: [], errors: [] },
    },
  };

  const prepared = prepareCloudSnapshotForRestore(legacyApprovedSnapshot, {
    accountId: "account-1",
    targetVaultId: "vault-new",
    includeDeviceOnly: true,
  });

  assert.equal(prepared.data.localStorage["clara_access_snapshot_v2:last"], undefined);
  assert.equal(prepared.raw.localStorage["clara_access_snapshot_v2:last"], undefined);
  assert.equal(
    JSON.parse(prepared.data.localStorage["clara_daily_check_in_v3:vault-new"]).currentStreak,
    21
  );

  const source = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );
  assert.match(
    source,
    /clearCloudRestoreStorage[\s\S]*isRuntimeOnlyStorageKey\(key\)/
  );
  assert.match(
    source,
    /skippedLocalStorage[\s\S]*isRuntimeOnlyStorageKey\(key\)/
  );
});

test("private backup excludes auth, vault mapping, and device identity secrets", async () => {
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

test("personal backup preserves Daily Check-In data", async () => {
  const snapshotSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );
  const localExportSource = await fs.readFile(
    new URL("../src/lib/local-data-export.js", import.meta.url),
    "utf8"
  );

  assert.match(
    snapshotSource,
    /DEVICE_ONLY_STORAGE_KEY_PATTERN\s*=\s*\/\^clara_daily_check_in_\/i/
  );
  assert.match(snapshotSource, /export function isDeviceOnlyStorageKey\(key\)/);
  assert.match(
    snapshotSource,
    /downloadClaraPrivateBackup[\s\S]*includeDeviceOnly:\s*true/
  );
  assert.match(
    snapshotSource,
    /restoreClaraPrivateBackupFile[\s\S]*includeDeviceOnly:\s*true/
  );

  assert.match(localExportSource, /clara_daily_check_in_v1/);
  assert.match(localExportSource, /clara_daily_check_in_v2:/);
  assert.match(localExportSource, /clara_daily_check_in_v3:/);
});

test("the production app has no background server finance synchronization", async () => {
  const mainSource = await fs.readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  const repositorySource = await fs.readFile(new URL("../src/lib/financeRepository.js", import.meta.url), "utf8");
  const storageScreen = await fs.readFile(new URL("../src/pages/DataExport.jsx", import.meta.url), "utf8");
  const settingsSource = await fs.readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(mainSource, /CloudVaultSyncBridge/);
  assert.doesNotMatch(mainSource, /installFastAccountSync/);
  assert.doesNotMatch(repositorySource, /server-finance-sync/);
  assert.doesNotMatch(repositorySource, /__claraPrepareServerFinanceMutation/);
  assert.match(settingsSource, /DeviceTransferPanel/);
  assert.match(storageScreen, /Backup & Restore/);
  assert.match(storageScreen, /Personal backup file/);
  assert.doesNotMatch(storageScreen, /syncServerFinance/);
  assert.doesNotMatch(storageScreen, /\/api\/finance\/sync/);
});

test("legacy cloud vault remains available only as backup and recovery plumbing", async () => {
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
  const clientSource = await fs.readFile(new URL("../src/lib/clara-backend-client.js", import.meta.url), "utf8");

  assert.match(clientSource, /DEFAULT_API_URL = "https:\/\/api\.clarapmc\.com"/);
  assert.match(clientSource, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(clientSource, /ngrok-skip-browser-warning/);
});
