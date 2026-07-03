import test from "node:test";
import assert from "node:assert/strict";
import {
  linkLocalVaultToAccountWithAdapters,
  snapshotsMatch,
} from "../src/lib/accountLinking/linkLocalVaultToAccount.js";

const snapshot = {
  expenses: {
    active: 1,
    deleted: 1,
    activeIds: ["expense_1"],
    deletedIds: ["expense_deleted"],
  },
  wallets: {
    active: 1,
    deleted: 0,
    activeIds: ["wallet_1"],
    deletedIds: [],
  },
};

function createAdapters(overrides = {}) {
  let metadata = {
    linkStatus: "local_only",
    accountUserId: null,
    accountEmail: null,
  };
  const calls = { linking: 0, linked: 0, failed: 0, dispatched: 0 };

  return {
    calls,
    currentMetadata: () => metadata,
    getActiveVaultId: async () => "local-dev-user",
    getMetadata: async () => metadata,
    readSnapshot: async () => structuredClone(snapshot),
    markLinking: async (patch) => {
      calls.linking += 1;
      metadata = { ...metadata, ...patch, linkStatus: "linking" };
      return metadata;
    },
    markLinked: async (patch) => {
      calls.linked += 1;
      metadata = { ...metadata, ...patch, linkStatus: "linked" };
      return metadata;
    },
    markFailed: async (patch) => {
      calls.failed += 1;
      metadata = { ...metadata, linkStatus: "link_failed", linkError: patch };
      return metadata;
    },
    dispatchLinked: () => {
      calls.dispatched += 1;
    },
    ...overrides,
  };
}

test("snapshot comparison preserves active and deleted record IDs", () => {
  assert.equal(snapshotsMatch(snapshot, structuredClone(snapshot)), true);
  assert.equal(
    snapshotsMatch(snapshot, {
      ...structuredClone(snapshot),
      expenses: { ...snapshot.expenses, activeIds: [] },
    }),
    false
  );
});

test("links metadata without changing local records", async () => {
  const adapters = createAdapters();
  const result = await linkLocalVaultToAccountWithAdapters(
    {
      expectedVaultId: "local-dev-user",
      accountUserId: "account-123",
      accountEmail: "max@example.com",
    },
    adapters
  );

  assert.equal(result.ok, true);
  assert.equal(result.vaultId, "local-dev-user");
  assert.deepEqual(result.recordCounts, snapshot);
  assert.deepEqual(adapters.calls, {
    linking: 1,
    linked: 1,
    failed: 0,
    dispatched: 1,
  });
});

test("linking the same account twice is idempotent", async () => {
  const adapters = createAdapters();
  await linkLocalVaultToAccountWithAdapters(
    { accountUserId: "account-123" },
    adapters
  );
  const second = await linkLocalVaultToAccountWithAdapters(
    { accountUserId: "account-123" },
    adapters
  );

  assert.equal(second.idempotent, true);
  assert.equal(adapters.calls.linked, 1);
});

test("linking a different account produces a controlled conflict", async () => {
  const adapters = createAdapters({
    getMetadata: async () => ({
      linkStatus: "linked",
      accountUserId: "first-account",
    }),
  });

  await assert.rejects(
    () =>
      linkLocalVaultToAccountWithAdapters(
        { accountUserId: "second-account" },
        adapters
      ),
    (error) => error.code === "VAULT_ACCOUNT_CONFLICT"
  );
  assert.equal(adapters.calls.linking, 0);
});

test("changed active vault is rejected before linking", async () => {
  const adapters = createAdapters();

  await assert.rejects(
    () =>
      linkLocalVaultToAccountWithAdapters(
        { expectedVaultId: "vault-before", accountUserId: "account-123" },
        adapters
      ),
    (error) => error.code === "VAULT_CHANGED"
  );
  assert.equal(adapters.calls.linking, 0);
});

test("failed verification marks failure without marking linked", async () => {
  let reads = 0;
  const adapters = createAdapters({
    readSnapshot: async () => {
      reads += 1;
      if (reads === 1) return structuredClone(snapshot);
      return {
        ...structuredClone(snapshot),
        expenses: {
          active: 0,
          deleted: 1,
          activeIds: [],
          deletedIds: ["expense_deleted"],
        },
      };
    },
  });

  await assert.rejects(
    () =>
      linkLocalVaultToAccountWithAdapters(
        { accountUserId: "account-123" },
        adapters
      ),
    (error) => error.code === "VAULT_VERIFICATION_FAILED"
  );
  assert.equal(adapters.calls.linked, 0);
  assert.equal(adapters.calls.failed, 1);
  assert.equal(adapters.currentMetadata().linkStatus, "link_failed");
});

test("temporary local identity cannot be linked as an account", async () => {
  const adapters = createAdapters();

  await assert.rejects(
    () =>
      linkLocalVaultToAccountWithAdapters(
        { accountUserId: "local-dev-user" },
        adapters
      ),
    (error) => error.code === "INVALID_ACCOUNT_ID"
  );
});
