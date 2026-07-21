import test from "node:test";
import assert from "node:assert/strict";

const {
  CLOUD_VAULT_SNAPSHOT_TYPE,
  mergeClaraCloudSnapshots,
  prepareCloudSnapshotForRestore,
  sanitizeCloudLocalStorage,
} = await import("../src/lib/cloud-vault-snapshot.js");

function snapshot({ createdAt, vaultId, records, localStorage = {} }) {
  return {
    app: "CLARA",
    type: CLOUD_VAULT_SNAPSHOT_TYPE,
    version: 2,
    account_id: "7",
    created_at: createdAt,
    source_vault_id: vaultId,
    source_device_id: `device-${vaultId}`,
    data: {
      localStorage,
      indexedDB: {
        databases: [
          {
            name: "clara_local_finance",
            version: 3,
            stores: {
              wallets: { records, count: records.length },
            },
          },
        ],
      },
    },
  };
}

test("cloud snapshot storage removes auth secrets and other account vault keys", () => {
  const safe = sanitizeCloudLocalStorage(
    {
      clara_backend_access_token_v1: "secret-token",
      clara_backend_user_v1: { id: 7 },
      clara_account_vault_directory_v1: {
        version: 1,
        accounts: {
          7: { accountId: "7", vaultId: "vault-a" },
          8: { accountId: "8", vaultId: "vault-b" },
        },
      },
      "clara_daily_check_in_v3:vault-a": { streak: 4 },
      "clara_daily_check_in_v3:vault-b": { streak: 9 },
      clara_settings_theme: "ocean",
    },
    { accountId: "7", sourceVaultId: "vault-a" }
  );

  assert.equal(safe.clara_backend_access_token_v1, undefined);
  assert.equal(safe.clara_backend_user_v1, undefined);
  assert.equal(safe.clara_account_vault_directory_v1, undefined);
  assert.deepEqual(safe["clara_daily_check_in_v3:vault-a"], { streak: 4 });
  assert.equal(safe["clara_daily_check_in_v3:vault-b"], undefined);
  assert.equal(safe.clara_settings_theme, "ocean");
});

test("cloud merge keeps the newest revision of each financial record", () => {
  const local = snapshot({
    createdAt: "2026-07-21T10:00:00.000Z",
    vaultId: "vault-local",
    records: [
      { id: "wallet-1", localUserId: "vault-local", balance: 100, updatedAt: "2026-07-21T09:00:00.000Z" },
      { id: "wallet-2", localUserId: "vault-local", balance: 50, updatedAt: "2026-07-21T08:00:00.000Z" },
    ],
  });
  const remote = snapshot({
    createdAt: "2026-07-21T11:00:00.000Z",
    vaultId: "vault-remote",
    records: [
      { id: "wallet-1", localUserId: "vault-remote", balance: 175, updatedAt: "2026-07-21T10:30:00.000Z" },
    ],
  });

  const merged = mergeClaraCloudSnapshots(local, remote);
  const wallets = merged.data.indexedDB.databases[0].stores.wallets.records;
  assert.equal(wallets.length, 2);
  assert.equal(wallets.find((item) => item.id === "wallet-1").balance, 175);
  assert.equal(wallets.find((item) => item.id === "wallet-2").balance, 50);
});

test("restore rewrites the source vault into the receiving device vault", () => {
  const source = snapshot({
    createdAt: "2026-07-21T11:00:00.000Z",
    vaultId: "old-device-vault",
    records: [
      { id: "wallet-1", localUserId: "old-device-vault", balance: 175, updatedAt: "2026-07-21T10:30:00.000Z" },
    ],
    localStorage: {
      "clara_daily_check_in_v3:old-device-vault": { vaultId: "old-device-vault", streak: 3 },
    },
  });

  const prepared = prepareCloudSnapshotForRestore(source, {
    accountId: "7",
    targetVaultId: "new-device-vault",
  });
  const wallets = prepared.data.indexedDB.databases[0].stores.wallets.records;

  assert.equal(wallets[0].localUserId, "new-device-vault");
  assert.deepEqual(
    prepared.data.localStorage["clara_daily_check_in_v3:new-device-vault"],
    { vaultId: "new-device-vault", streak: 3 }
  );
  assert.equal(prepared.data.localStorage.clara_backend_access_token_v1, undefined);
});
