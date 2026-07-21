import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_VAULT_DIRECTORY_KEY,
  findAccountMappingByVaultId,
  getVaultMappingForAccount,
  listAccountVaultMappings,
  saveVaultMappingForAccount,
} from "../src/lib/account-vault-directory.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("stores separate vaults for separate backend accounts", () => {
  const storage = memoryStorage();
  saveVaultMappingForAccount(
    { accountId: "A", accountEmail: "A@EXAMPLE.COM", vaultId: "vault-a" },
    storage
  );
  saveVaultMappingForAccount(
    { accountId: "B", accountEmail: "b@example.com", vaultId: "vault-b" },
    storage
  );
  assert.equal(getVaultMappingForAccount("A", storage).vaultId, "vault-a");
  assert.equal(getVaultMappingForAccount("B", storage).vaultId, "vault-b");
  assert.equal(listAccountVaultMappings(storage).length, 2);
  assert.equal(findAccountMappingByVaultId("vault-a", storage).accountId, "A");
});

test("rejects one vault mapped to two accounts", () => {
  const storage = memoryStorage();
  saveVaultMappingForAccount({ accountId: "A", vaultId: "vault-a" }, storage);
  assert.throws(
    () => saveVaultMappingForAccount({ accountId: "B", vaultId: "vault-a" }, storage),
    (error) => error.code === "ACCOUNT_VAULT_DIRECTORY_CORRUPT"
  );
});

test("fails closed for a corrupted duplicate mapping", () => {
  const storage = memoryStorage({
    [ACCOUNT_VAULT_DIRECTORY_KEY]: JSON.stringify({
      version: 1,
      accounts: {
        A: { accountId: "A", vaultId: "shared" },
        B: { accountId: "B", vaultId: "shared" },
      },
    }),
  });
  assert.throws(
    () => listAccountVaultMappings(storage),
    (error) => error.code === "ACCOUNT_VAULT_DIRECTORY_CORRUPT"
  );
});
