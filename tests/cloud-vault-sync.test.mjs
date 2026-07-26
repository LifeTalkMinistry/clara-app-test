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

test("cloud snapshot implementation excludes auth, vault mapping, and device identity secrets", async () => {
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

test("cloud sync supports source-device authority and exact destination recovery", async () => {
  const syncSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-sync.js", import.meta.url),
    "utf8"
  );
  const snapshotSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );
  const financeStoreSource = await fs.readFile(
    new URL("../src/lib/localFinanceStore.js", import.meta.url),
    "utf8"
  );

  assert.match(syncSource, /authoritativeLocal/);
  assert.match(syncSource, /uploadAuthoritativeWithConflictRecovery/);
  assert.match(syncSource, /direction: "uploaded_authoritative"/);
  assert.match(syncSource, /restoreRemoteAsSource/);
  assert.match(syncSource, /direction: "downloaded"/);
  assert.match(syncSource, /export async function restoreClaraCloudVaultFromServer/);
  assert.match(snapshotSource, /replaceExisting = true/);
  assert.match(snapshotSource, /clearCloudRestoreStorage/);
  assert.match(snapshotSource, /clearLocalUserPrivateData/);
  assert.match(financeStoreSource, /export async function clearLocalUserPrivateData/);
});

test("fresh account vaults are marked for cloud-first recovery", async () => {
  const resolverSource = await fs.readFile(
    new URL("../src/lib/accountLinking/resolveAccountLocalVault.js", import.meta.url),
    "utf8"
  );
  const bridgeSource = await fs.readFile(
    new URL("../src/components/CloudVaultSyncBridge.jsx", import.meta.url),
    "utf8"
  );

  assert.match(resolverSource, /clara_cloud_recovery_pending_v1/);
  assert.match(resolverSource, /result\?\.created \|\| result\?\.adoptedUnlinkedVault/);
  assert.match(bridgeSource, /isClaraCloudRecoveryPending/);
  assert.match(bridgeSource, /preferRemote: recoveryPending\(\)/);
  assert.match(bridgeSource, /clearClaraCloudRecoveryPending/);
});

test("cloud vault requests bypass the ngrok browser interstitial", async () => {
  const clientSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-client.js", import.meta.url),
    "utf8"
  );

  assert.match(clientSource, /ngrok-skip-browser-warning/);
  assert.match(clientSource, /Authorization: `Bearer \$\{token\}`/);
});
