import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const { getBackendAccountId } = await import("../src/lib/clara-account-identity.js");

test("backend account identity never aliases an AuthContext local vault id", () => {
  const authenticatedUser = {
    id: "clara_local_device_vault",
    local_vault_id: "clara_local_device_vault",
    account_id: "42",
    server_user_id: "42",
    is_local_user: false,
  };

  assert.equal(getBackendAccountId(authenticatedUser), "42");
  assert.equal(getBackendAccountId({ id: "42", is_local_user: false }), "42");
  assert.equal(
    getBackendAccountId({
      id: "clara_local_device_vault",
      local_vault_id: "clara_local_device_vault",
    }),
    ""
  );
});

test("cloud snapshots and automatic sync use stable backend account ownership", async () => {
  const snapshot = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );
  const sync = await fs.readFile(
    new URL("../src/lib/cloud-vault-sync.js", import.meta.url),
    "utf8"
  );
  const bridge = await fs.readFile(
    new URL("../src/components/CloudVaultSyncBridge.jsx", import.meta.url),
    "utf8"
  );

  assert.match(snapshot, /getBackendAccountId/);
  assert.match(snapshot, /normalizeAuthenticatedCloudSnapshot/);
  assert.doesNotMatch(snapshot, /const accountId = text\(user\?\.id\)/);

  assert.match(sync, /getBackendAccountId/);
  assert.match(sync, /normalizeAuthenticatedRemote/);
  assert.doesNotMatch(sync, /String\(user\?\.id \|\| ""\)\.trim\(\)/);

  assert.match(bridge, /getBackendAccountId/);
  assert.doesNotMatch(bridge, /getClaraStorageMode\(context\.user\?\.id\)/);
});

test("server finance refresh cannot feed back into another sync or let stale dashboard cache win", async () => {
  const serverSync = await fs.readFile(
    new URL("../src/lib/server-finance-sync.js", import.meta.url),
    "utf8"
  );
  const bridge = await fs.readFile(
    new URL("../src/components/CloudVaultSyncBridge.jsx", import.meta.url),
    "utf8"
  );
  const financeRefreshEvents = await fs.readFile(
    new URL(
      "../src/components/fresh/main-dashboard/finance-notices/useDashboardFinanceRefreshEvents.js",
      import.meta.url
    ),
    "utf8"
  );
  const scheduledRefresh = await fs.readFile(
    new URL(
      "../src/components/fresh/main-dashboard/finance-notices/useDashboardScheduledRefresh.js",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(serverSync, /CLARA_SERVER_FINANCE_EVENT_SOURCE = "server_authority"/);
  assert.match(serverSync, /dispatchServerAppliedEvents\(\);[\s\S]*finally \{[\s\S]*applyingServerState = false/);
  assert.match(serverSync, /serverRevision !== localRevision/);
  assert.match(serverSync, /cacheApplied: shouldApplyServerState/);
  assert.match(bridge, /event\?\.detail\?\.source === CLARA_SERVER_FINANCE_EVENT_SOURCE/);

  assert.doesNotMatch(financeRefreshEvents, /"clara-finance-updated"/);
  assert.match(financeRefreshEvents, /scheduleRefresh\(\{ financeOnly: true \}\)/);
  assert.match(scheduledRefresh, /if \(financeOnly\)/);
  assert.match(
    scheduledRefresh,
    /await loadDashboardData\(\{ background: true \}\);[\s\S]*await refreshFinancialData\?\.\(\)/
  );
});

test("legacy identity migration only removes source data after verified preservation", async () => {
  const migration = await fs.readFile(
    new URL("../src/lib/local-identity-storage-migration.js", import.meta.url),
    "utf8"
  );

  assert.match(migration, /if \(destination !== null\) return destination === serialized/);
  assert.match(migration, /return store\.getItem\(destinationKey\) === serialized/);
  assert.match(migration, /if \(destinationValue !== null\)/);
  assert.match(migration, /if \(destinationValue === sourceValue\)/);
  assert.match(migration, /if \(store\.getItem\(destinationKey\) === sourceValue\)/);
  assert.match(migration, /conflicting entitlement is not migration-safe/i);
});
