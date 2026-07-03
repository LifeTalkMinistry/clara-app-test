from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]

package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
command = package["scripts"]["test"]
for item in ["tests/local-vault-identity.test.mjs", "tests/local-vault-account-linking.test.mjs"]:
    if item not in command:
        command += " " + item
package["scripts"]["test"] = command
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

(ROOT / "tests/local-vault-account-linking.test.mjs").write_text('''import test from "node:test";
import assert from "node:assert/strict";
import { linkLocalVaultToAccountWithAdapters } from "../src/lib/accountLinking/linkLocalVaultToAccount.js";

const snapshot = {
  expenses: { active: 1, deleted: 1, activeIds: ["expense_1"], deletedIds: ["expense_deleted"] },
  wallets: { active: 1, deleted: 0, activeIds: ["wallet_1"], deletedIds: [] },
};

function adapters(overrides = {}) {
  let metadata = { linkStatus: "local_only", accountUserId: null };
  const calls = { linking: 0, linked: 0, failed: 0, dispatched: 0 };
  return {
    calls,
    current: () => metadata,
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

test("link preserves active and soft-deleted record IDs", async () => {
  const mock = adapters();
  const result = await linkLocalVaultToAccountWithAdapters(
    { expectedVaultId: "local-dev-user", accountUserId: "account-123", accountEmail: "max@example.com" },
    mock
  );
  assert.equal(result.ok, true);
  assert.equal(result.vaultId, "local-dev-user");
  assert.deepEqual(result.recordCounts, snapshot);
  assert.deepEqual(mock.calls, { linking: 1, linked: 1, failed: 0, dispatched: 1 });
});

test("same account link is idempotent", async () => {
  const mock = adapters();
  await linkLocalVaultToAccountWithAdapters({ accountUserId: "account-123" }, mock);
  const second = await linkLocalVaultToAccountWithAdapters({ accountUserId: "account-123" }, mock);
  assert.equal(second.idempotent, true);
  assert.equal(mock.calls.linked, 1);
});

test("different account returns a controlled conflict", async () => {
  const mock = adapters({ getMetadata: async () => ({ linkStatus: "linked", accountUserId: "first" }) });
  await assert.rejects(
    () => linkLocalVaultToAccountWithAdapters({ accountUserId: "second" }, mock),
    (error) => error.code === "VAULT_ACCOUNT_CONFLICT"
  );
  assert.equal(mock.calls.linking, 0);
});

test("unexpected active vault change is rejected", async () => {
  const mock = adapters();
  await assert.rejects(
    () => linkLocalVaultToAccountWithAdapters({ expectedVaultId: "vault-before", accountUserId: "account-123" }, mock),
    (error) => error.code === "VAULT_CHANGED"
  );
  assert.equal(mock.calls.linking, 0);
});

test("failed verification records failure without marking linked", async () => {
  let reads = 0;
  const mock = adapters({
    readSnapshot: async () => {
      reads += 1;
      return reads === 1
        ? structuredClone(snapshot)
        : { ...structuredClone(snapshot), expenses: { active: 0, deleted: 1, activeIds: [], deletedIds: ["expense_deleted"] } };
    },
  });
  await assert.rejects(
    () => linkLocalVaultToAccountWithAdapters({ accountUserId: "account-123" }, mock),
    (error) => error.code === "VAULT_VERIFICATION_FAILED"
  );
  assert.equal(mock.calls.linked, 0);
  assert.equal(mock.calls.failed, 1);
  assert.equal(mock.current().linkStatus, "link_failed");
});

test("temporary local identity is rejected as an account", async () => {
  const mock = adapters();
  await assert.rejects(
    () => linkLocalVaultToAccountWithAdapters({ accountUserId: "local-dev-user" }, mock),
    (error) => error.code === "INVALID_ACCOUNT_ID"
  );
});
''', encoding="utf-8")

identity_path = ROOT / "tests/local-vault-identity.test.mjs"
identity = identity_path.read_text(encoding="utf-8")
if "source guards keep local mode truthful" not in identity:
    identity += '''\nimport fs from "node:fs";\n\ntest("source guards keep local mode truthful", () => {\n  const source = fs.readFileSync(new URL("../src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx", import.meta.url), "utf8");\n  assert.match(source, /Stored on this device/);\n  assert.match(source, /No account linked/);\n  assert.match(source, /\{!isLocalMode \? \(/);\n});\n\ntest("feature flags keep account services opt-in", () => {\n  const source = fs.readFileSync(new URL("../src/config/claraFeatureFlags.js", import.meta.url), "utf8");\n  assert.match(source, /VITE_CLARA_AUTH_ENABLED\", false/);\n  assert.match(source, /VITE_CLARA_ACCOUNT_LINKING_ENABLED\",\s*false/);\n  assert.match(source, /VITE_CLARA_LOCAL_MODE_ENABLED\",\s*true/);\n});\n\ntest("demo fallback returns to stable vault ownership", () => {\n  const source = fs.readFileSync(new URL("../src/lib/demo/activeDemoProfile.js", import.meta.url), "utf8");\n  assert.match(source, /getActiveDemoFinanceLocalUserId\(\) \|\| ensureActiveLocalVaultId\(\)/);\n});\n'''
    identity_path.write_text(identity, encoding="utf-8")

print("Vault tests written and registered.")
