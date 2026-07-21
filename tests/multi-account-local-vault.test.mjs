import test from "node:test";
import assert from "node:assert/strict";
import { resolveAccountLocalVaultWithAdapters } from "../src/lib/accountLinking/resolveAccountLocalVaultCore.js";

function harness({ activeVaultId = "vault-a", metadata = {}, mappings = {} } = {}) {
  let active = activeVaultId;
  let counter = 0;
  const meta = new Map(Object.entries(metadata));
  const byAccount = new Map(Object.entries(mappings));
  const records = new Map([["vault-a", [{ id: "expense-a", localUserId: "vault-a" }]]]);

  return {
    records,
    active: () => active,
    mapping: (accountId) => byAccount.get(accountId),
    adapters: {
      getMapping: async (accountId) => byAccount.get(accountId) || null,
      saveMapping: async ({ accountId, accountEmail, vaultId }) => {
        const duplicate = [...byAccount.values()].find(
          (entry) => entry.vaultId === vaultId && entry.accountId !== accountId
        );
        if (duplicate) {
          throw Object.assign(new Error("duplicate"), {
            code: "ACCOUNT_VAULT_DIRECTORY_CONFLICT",
          });
        }
        const entry = { accountId, accountEmail, vaultId };
        byAccount.set(accountId, entry);
        return entry;
      },
      findMetadataByAccountId: async (accountId) =>
        [...meta.values()].find((item) => item.accountUserId === accountId) || null,
      getMetadata: async (vaultId) =>
        meta.get(vaultId) || {
          vaultId,
          linkStatus: "local_only",
          accountUserId: null,
        },
      getActiveVaultId: async () => active,
      findMappingByVaultId: async (vaultId) =>
        [...byAccount.values()].find((entry) => entry.vaultId === vaultId) || null,
      createVaultId: async () => `vault-new-${++counter}`,
      initializeMetadata: async (vaultId) => {
        meta.set(vaultId, {
          vaultId,
          linkStatus: "local_only",
          accountUserId: null,
        });
        records.set(vaultId, []);
      },
      activateVault: async (vaultId) => {
        active = vaultId;
      },
      linkVault: async ({ expectedVaultId, accountUserId, accountEmail }) => {
        assert.equal(active, expectedVaultId);
        const current = meta.get(expectedVaultId) || {
          vaultId: expectedVaultId,
          linkStatus: "local_only",
        };
        if (current.accountUserId && current.accountUserId !== accountUserId) {
          throw Object.assign(new Error("conflict"), {
            code: "VAULT_ACCOUNT_CONFLICT",
          });
        }
        meta.set(expectedVaultId, {
          ...current,
          linkStatus: "linked",
          accountUserId,
          accountEmail,
        });
      },
    },
  };
}

test("first account adopts an existing unlinked populated vault", async () => {
  const h = harness();
  const before = structuredClone(h.records.get("vault-a"));
  const result = await resolveAccountLocalVaultWithAdapters(
    { accountUserId: "A", accountEmail: "a@example.com" },
    h.adapters
  );
  assert.equal(result.vaultId, "vault-a");
  assert.equal(result.adoptedUnlinkedVault, true);
  assert.deepEqual(h.records.get("vault-a"), before);
  assert.equal(h.mapping("A").vaultId, "vault-a");
});

test("second account receives a fresh empty vault without mutating account A", async () => {
  const h = harness({
    metadata: {
      "vault-a": {
        vaultId: "vault-a",
        linkStatus: "linked",
        accountUserId: "A",
      },
    },
    mappings: { A: { accountId: "A", vaultId: "vault-a" } },
  });
  const before = structuredClone(h.records.get("vault-a"));
  const result = await resolveAccountLocalVaultWithAdapters(
    { accountUserId: "B", accountEmail: "b@example.com" },
    h.adapters
  );
  assert.equal(result.created, true);
  assert.notEqual(result.vaultId, "vault-a");
  assert.deepEqual(h.records.get("vault-a"), before);
  assert.deepEqual(h.records.get(result.vaultId), []);
});

test("returning accounts reuse their exact mapped vaults", async () => {
  const h = harness({
    activeVaultId: "vault-b",
    metadata: {
      "vault-a": { vaultId: "vault-a", linkStatus: "linked", accountUserId: "A" },
      "vault-b": { vaultId: "vault-b", linkStatus: "linked", accountUserId: "B" },
    },
    mappings: {
      A: { accountId: "A", vaultId: "vault-a" },
      B: { accountId: "B", vaultId: "vault-b" },
    },
  });
  const first = await resolveAccountLocalVaultWithAdapters(
    { accountUserId: "A" },
    h.adapters
  );
  const second = await resolveAccountLocalVaultWithAdapters(
    { accountUserId: "B" },
    h.adapters
  );
  assert.equal(first.vaultId, "vault-a");
  assert.equal(second.vaultId, "vault-b");
});

test("directory corruption fails closed", async () => {
  const h = harness({
    metadata: {
      "vault-a": {
        vaultId: "vault-a",
        linkStatus: "linked",
        accountUserId: "A",
      },
    },
    mappings: { B: { accountId: "B", vaultId: "vault-a" } },
  });
  await assert.rejects(
    () => resolveAccountLocalVaultWithAdapters({ accountUserId: "B" }, h.adapters),
    (error) => error.code === "ACCOUNT_VAULT_DIRECTORY_CONFLICT"
  );
});
