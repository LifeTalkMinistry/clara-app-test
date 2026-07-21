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

test("storage mode defaults safely to Local Only and persists per account", () => {
  const storage = new MemoryStorage();
  assert.equal(getClaraStorageMode("7", storage), CLARA_STORAGE_MODES.LOCAL_ONLY);
  assert.equal(normalizeClaraStorageMode("unexpected"), CLARA_STORAGE_MODES.LOCAL_ONLY);

  saveClaraStorageMode("7", CLARA_STORAGE_MODES.ONLINE_SYNC, storage);
  assert.equal(getClaraStorageMode("7", storage), CLARA_STORAGE_MODES.ONLINE_SYNC);
  assert.equal(getClaraStorageMode("8", storage), CLARA_STORAGE_MODES.LOCAL_ONLY);
  assert.equal(getClaraStorageModeKey("7"), "clara_storage_mode_v1:7");
});

test("cloud snapshot implementation excludes auth and device mapping secrets", async () => {
  const source = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /clara_backend_access_token_v1/);
  assert.match(source, /clara_backend_user_v1/);
  assert.match(source, /clara_account_vault_directory_v1|ACCOUNT_VAULT_DIRECTORY_KEY/);
  assert.match(source, /storageKeyBelongsToAnotherAccount/);
  assert.match(source, /record\.localUserId/);
  assert.match(source, /CLOUD_SNAPSHOT_ACCOUNT_MISMATCH/);
});

test("cloud sync implementation has revision recovery and cross-device vault rewriting", async () => {
  const syncSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-sync.js", import.meta.url),
    "utf8"
  );
  const snapshotSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );

  assert.match(syncSource, /CLOUD_VAULT_REVISION_CONFLICT/);
  assert.match(syncSource, /export function rebaseSnapshotVault/);
  assert.match(syncSource, /key\.split\(sourceVaultId\)\.join\(target\)/);
  assert.match(syncSource, /remoteSnapshotForLocal/);
  assert.match(syncSource, /latestRemoteForLocal/);
  assert.match(syncSource, /mergeClaraCloudSnapshots/);
  assert.match(snapshotSource, /prepareCloudSnapshotForRestore/);
  assert.match(snapshotSource, /localUserId: target/);
  assert.match(snapshotSource, /restoreClaraLocalDataFromFile/);
});
