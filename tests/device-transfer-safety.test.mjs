import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  normalizePreparedFinancialContext,
  reconcileFinancialContextMigration,
} from "../src/lib/clara-financial-context-migration.js";
import {
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

const vaultSource = await fs.readFile(
  new URL("../src/lib/device-transfer-vault.js", import.meta.url),
  "utf8"
);
const migrationSource = await fs.readFile(
  new URL("../src/lib/clara-financial-context-migration.js", import.meta.url),
  "utf8"
);
const baselineRepositorySource = await fs.readFile(
  new URL("../src/lib/clara-means-baseline-repository.js", import.meta.url),
  "utf8"
);
const clientSource = await fs.readFile(
  new URL("../src/lib/device-transfer-client.js", import.meta.url),
  "utf8"
);
const panelSource = await fs.readFile(
  new URL("../src/components/device-transfer/DeviceTransferPanel.jsx", import.meta.url),
  "utf8"
);
const settingsSource = await fs.readFile(
  new URL(
    "../src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx",
    import.meta.url
  ),
  "utf8"
);
const dataExportSource = await fs.readFile(
  new URL("../src/pages/DataExport.jsx", import.meta.url),
  "utf8"
);
const mainSource = await fs.readFile(
  new URL("../src/main.jsx", import.meta.url),
  "utf8"
);

function preparedFixture({ expenses = [], transactions = [], events = [] } = {}) {
  return {
    data: {
      localStorage: {
        "clara_schedule_events_v2:test-vault": events,
      },
      indexedDB: {
        supported: true,
        errors: [],
        databases: [
          {
            name: "clara_local_finance",
            stores: {
              expenses: { records: expenses, count: expenses.length },
              wallet_transactions: { records: transactions, count: transactions.length },
              private_preferences: { records: [], count: 0 },
            },
          },
        ],
      },
    },
  };
}

function canonicalSnapshot({
  wallet = 0,
  remaining = 0,
  anchor = 0,
  anchorState = anchor > 0 ? "anchored" : "no_anchor",
  migrationUnresolved = false,
  cycleStart = "2026-08-15",
  cycleEnd = "2026-08-31",
  sourceId = "income-master",
  vaultId = "source-vault",
} = {}) {
  const scoreState = calculateMeansScoreState({
    availableWalletMoney: wallet,
    remainingPlannedSpending: remaining,
    cycle100Anchor: anchor,
  });
  return {
    localVaultId: vaultId,
    activeCycle: cycleStart && cycleEnd
      ? { sourceId, cycleStart, cycleEnd }
      : null,
    availableWalletMoney: wallet,
    remainingPlannedSpending: remaining,
    cycle100Anchor: anchor,
    anchorState,
    migrationUnresolved,
    wallBill: scoreState.wallBill,
    meansScore: scoreState.score,
  };
}

function v7Baseline(anchor = 10000) {
  return {
    version: 7,
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    cycle100Anchor: anchor,
    anchorState: "anchored",
    protectedOccurrences: {},
    anchorRequirements: [],
  };
}

function occurrence({
  key = "money-schedule:event-1:2026-08-20",
  date = "2026-08-20",
  amount = 3000,
  actualPaid = 0,
} = {}) {
  return {
    id: key,
    requirementKey: key,
    sourceType: "money_schedule",
    sourceId: "event-1",
    date,
    amount,
    actualPaid,
  };
}

test("device transfer is deliberate, visible in Security settings, and never installed as startup sync", () => {
  assert.doesNotMatch(mainSource, /installFastAccountSync/);
  assert.doesNotMatch(mainSource, /installAccountStreakSyncBridge/);
  assert.doesNotMatch(mainSource, /CloudVaultSyncBridge/);
  assert.match(settingsSource, /DeviceTransferPanel/);
  assert.doesNotMatch(dataExportSource, /DeviceTransferPanel/);
  assert.match(panelSource, /Send data to another device/);
  assert.match(panelSource, /Receive data on this device/);
  assert.match(panelSource, /Approve this device/);
  assert.match(panelSource, /Migrate to this device now/);
});

test("receiving data stages an isolated vault and verifies canonical financial truth before switching", () => {
  assert.match(vaultSource, /const newVaultId = createLocalVaultId\(\)/);
  assert.match(vaultSource, /await saveRecoveryRecord\([\s\S]*status: "staging"/);
  assert.match(vaultSource, /normalizePreparedFinancialContext\(basePrepared\)/);
  assert.match(vaultSource, /namespaceTransferredFinanceRecordIds/);
  assert.match(vaultSource, /`transfer:\$\{targetVaultId\}:\$\{oldId\}`/);
  assert.match(vaultSource, /meansCycleBaselineRecordId\(targetVaultId, cycleStart, cycleEnd\)/);
  assert.match(
    vaultSource,
    /restoreClaraLocalDataFromFile\([\s\S]*indexedDbOnly\(transferPrepared\)/
  );
  assert.match(
    vaultSource,
    /actualFinanceRecordCount\(newVaultId\)[\s\S]*actualRecords !== expectedRecords/
  );
  assert.match(
    vaultSource,
    /storageOnly\(transferPrepared\)[\s\S]*buildFinancialContextMigrationSnapshot\([\s\S]*vaultId: newVaultId/
  );
  assert.match(
    vaultSource,
    /reconcileFinancialContextMigration\([\s\S]*assertSuccessfulFinancialContextMigration\(migrationResult\);[\s\S]*switchAccountVault\(/
  );
  assert.match(vaultSource, /clearLocalUserPrivateData\(newVaultId\)/);
  assert.match(vaultSource, /rollbackLastDeviceTransfer/);
});

test("device transfer source package captures canonical financial truth", () => {
  assert.match(vaultSource, /buildFinancialContextMigrationSnapshot\([\s\S]*vaultId: activeVaultId/);
  assert.match(vaultSource, /financial_context:/);
  assert.match(migrationSource, /buildCanonicalMeansSnapshot/);
  assert.match(migrationSource, /calculateMeansAvailableWalletState/);
  assert.match(migrationSource, /planRequirements/);
  assert.match(migrationSource, /walletContext/);
  assert.match(migrationSource, /fulfillmentContext/);
});

test("device transfer settles canonical source state before freezing the export", () => {
  const start = vaultSource.indexOf("export async function createDeviceTransferSnapshot");
  const end = vaultSource.indexOf("\n}\n\nfunction rewriteRecordReferences", start);
  const sourceFunction = vaultSource.slice(start, end);
  const canonicalIndex = sourceFunction.indexOf("buildFinancialContextMigrationSnapshot");
  const exportIndex = sourceFunction.indexOf("buildClaraCloudVaultSnapshot");

  assert.ok(start >= 0 && end > start);
  assert.ok(canonicalIndex >= 0);
  assert.ok(exportIndex >= 0);
  assert.ok(canonicalIndex < exportIndex);
});

test("Means baseline durable ID is deterministic per vault and backward compatible", () => {
  assert.match(
    baselineRepositorySource,
    /means-cycle-baseline:\$\{localUserId\}:\$\{dateKey\(cycleStart\)\}:\$\{dateKey\(cycleEnd\)\}/
  );
  assert.match(baselineRepositorySource, /legacyRecordId\(start, end\)/);
  assert.match(baselineRepositorySource, /hardDeleteLocalRecord\(STORE_NAME, legacyId, localUserId\)/);
});

test("transfer API requires authenticated one-time sender and receiver capabilities", () => {
  assert.match(clientSource, /getStoredBackendToken/);
  assert.match(clientSource, /\/api\/device-transfers\/claim/);
  assert.match(clientSource, /\/approve/);
  assert.match(clientSource, /\/package/);
  assert.match(clientSource, /\/complete/);
  assert.match(panelSource, /fetchDeviceTransferPackage/);
  assert.match(panelSource, /completeDeviceTransfer/);
});

test("a lost cleanup acknowledgement cannot turn a verified local import into a failure", () => {
  assert.match(clientSource, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(clientSource, /status: "consumed"/);
  assert.match(clientSource, /completionPending: true/);
});

test("device transfer verifies the full active CLARA context instead of trusting one total count", () => {
  assert.match(vaultSource, /requireCompleteExport: true/);
  assert.match(vaultSource, /assertFinanceTransferIntegrity\(transferPrepared, newVaultId\)/);
  assert.match(vaultSource, /stableTransferJson\(actualRecord\) !== stableTransferJson\(expectedRecord\)/);
  assert.match(vaultSource, /verifyTransferredStorage\(transferPrepared\)/);
  assert.match(vaultSource, /verifiedFinancialRecords: actualRecords/);
  assert.match(vaultSource, /verifiedStorageKeys/);
  assert.match(vaultSource, /financialMigration: migrationResult/);
  assert.match(vaultSource, /walletTransactions: storeCount\(snapshot, "wallet_transactions"\)/);
  assert.match(vaultSource, /lifeProfiles: storeCount\(snapshot, "life_profile"\)/);
  assert.match(vaultSource, /privatePreferences: storeCount\(snapshot, "private_preferences"\)/);
  assert.match(vaultSource, /clara_money_schedule_routine_v1/);
  assert.match(panelSource, /Debt \/ obligations/);
  assert.match(panelSource, /Life profile/);
  assert.match(panelSource, /Money Schedule/);
});

test("device transfer refuses to package a source vault that could not be read completely", async () => {
  const snapshotSource = await fs.readFile(
    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),
    "utf8"
  );
  assert.match(snapshotSource, /collectTransferSourceIntegrityErrors/);
  assert.match(snapshotSource, /requireCompleteExport = false/);
  assert.match(snapshotSource, /CLARA_TRANSFER_SOURCE_INCOMPLETE/);
  assert.match(snapshotSource, /source device could not verify all active context/);
  assert.match(snapshotSource, /clara_local_finance could not be read/);
});

test("Test A — fresh user remains no_anchor and does not invent a score", () => {
  const source = canonicalSnapshot({ anchor: 0, wallet: 0, remaining: 0, anchorState: "no_anchor" });
  const destination = { ...source, localVaultId: "destination-vault" };
  const result = reconcileFinancialContextMigration({ source, destination });
  assert.equal(source.meansScore, null);
  assert.equal(result.status, "success");
  assert.equal(result.reconciliation.anchorMatch, true);
});

test("Test B — active cycle with no spending remains exactly equivalent", () => {
  const source = canonicalSnapshot({ wallet: 10000, remaining: 10000, anchor: 10000 });
  const destination = { ...source, localVaultId: "destination-vault" };
  const result = reconcileFinancialContextMigration({ source, destination });
  assert.equal(source.wallBill, 0);
  assert.equal(source.meansScore, 100);
  assert.equal(result.status, "success");
});

test("Test C — unplanned spending preserves lower Wallet and unchanged plan", () => {
  const source = canonicalSnapshot({ wallet: 8000, remaining: 10000, anchor: 10000 });
  const destination = { ...source, localVaultId: "destination-vault" };
  const result = reconcileFinancialContextMigration({ source, destination });
  assert.equal(source.wallBill, -2000);
  assert.equal(source.meansScore, 80);
  assert.equal(result.status, "success");
});

test("Test D — fully fulfilled Money Schedule remains fulfilled after deterministic identity migration", () => {
  const prepared = preparedFixture({
    events: [{ id: "electric", date: "2026-08-20", amount: 3000 }],
    expenses: [{ id: "expense-1", moneyScheduleEventId: "electric" }],
    transactions: [{ id: "txn-1", expense_id: "expense-1", amount: -3000 }],
  });
  const normalized = normalizePreparedFinancialContext(prepared);
  const expense = normalized.prepared.data.indexedDB.databases[0].stores.expenses.records[0];
  assert.equal(expense.requirementKey, "money-schedule:electric:2026-08-20");
  assert.equal(normalized.unresolved.length, 0);

  const state = resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(3000),
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    today: "2026-08-20",
    occurrences: [occurrence({ key: expense.requirementKey, amount: 3000, actualPaid: 3000 })],
  });
  assert.equal(state.remainingPlannedSpending, 0);
});

test("Test E — partial fulfillment preserves exact remaining amount", () => {
  const state = resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(3000),
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    today: "2026-08-20",
    occurrences: [occurrence({ amount: 3000, actualPaid: 1200 })],
  });
  assert.equal(state.requirements[0].fulfilledAmount, 1200);
  assert.equal(state.remainingPlannedSpending, 1800);
});

test("Test F — overpayment caps matched plan and never makes Remaining Plan negative", () => {
  const state = resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(3000),
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    today: "2026-08-20",
    occurrences: [occurrence({ amount: 3000, actualPaid: 3500 })],
  });
  assert.equal(state.requirements[0].fulfilledAmount, 3000);
  assert.equal(state.remainingPlannedSpending, 0);
});

test("Test G — Debt payment identity is derived only from debt ID plus due occurrence", () => {
  const prepared = preparedFixture({
    expenses: [{ id: "expense-debt", debtId: "debt-7", dueDate: "2026-08-25" }],
    transactions: [{ id: "txn-debt", expense_id: "expense-debt", amount: -1200 }],
  });
  const normalized = normalizePreparedFinancialContext(prepared);
  const expense = normalized.prepared.data.indexedDB.databases[0].stores.expenses.records[0];
  const transaction = normalized.prepared.data.indexedDB.databases[0].stores.wallet_transactions.records[0];
  assert.equal(expense.requirementKey, "debt:debt-7:2026-08-25");
  assert.equal(transaction.requirementKey, expense.requirementKey);
  assert.equal(normalized.unresolved.length, 0);
});

test("Test H — identical titles are never fuzzy matched", () => {
  const prepared = preparedFixture({
    events: [
      { id: "internet-a", title: "Internet Bill", date: "2026-08-20", amount: 1500 },
      { id: "internet-b", title: "Internet Bill", date: "2026-08-22", amount: 2500 },
    ],
    expenses: [
      {
        id: "legacy-internet",
        title: "Internet Bill",
        amount: 1500,
        source: "money_schedule",
        planning_status: "planned",
      },
    ],
  });
  const normalized = normalizePreparedFinancialContext(prepared);
  const expense = normalized.prepared.data.indexedDB.databases[0].stores.expenses.records[0];
  assert.equal(expense.requirementKey, undefined);
  assert.equal(normalized.unresolved[0].code, "legacy_requirement_identity_unresolved");
});

test("Test I — editing a future Money Schedule changes Remaining Plan but not the V7 anchor", () => {
  const state = resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(10000),
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    today: "2026-08-18",
    occurrences: [occurrence({ date: "2026-08-25", amount: 9000, actualPaid: 0 })],
  });
  assert.equal(state.cycle100Anchor, 10000);
  assert.equal(state.remainingPlannedSpending, 9000);
});

test("Test J — previous-cycle history cannot fulfill the active cycle", () => {
  const state = resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(10000),
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    today: "2026-08-20",
    occurrences: [
      occurrence({ key: "money-schedule:old:2026-08-10", date: "2026-08-10", amount: 3000, actualPaid: 3000 }),
      occurrence({ key: "money-schedule:new:2026-08-20", date: "2026-08-20", amount: 3000, actualPaid: 0 }),
    ],
  });
  assert.equal(state.requirements.length, 1);
  assert.equal(state.requirements[0].requirementKey, "money-schedule:new:2026-08-20");
  assert.equal(state.remainingPlannedSpending, 3000);
});

test("Test K — existing active-cycle V7 anchor remains exactly fixed", () => {
  const state = resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(12345),
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    today: "2026-08-20",
    occurrences: [occurrence({ amount: 7000, actualPaid: 2000 })],
  });
  assert.equal(state.cycle100Anchor, 12345);
  assert.equal(state.remainingPlannedSpending, 5000);
});

test("Test K2 — same-cycle V6 anchor remains unresolved and cannot silently activate", () => {
  const legacyState = resolveAdaptiveMeansBaselineState({
    stored: {
      version: 6,
      cycleStart: "2026-08-15",
      cycleEnd: "2026-08-31",
      requiredRunway: 10000,
    },
    cycleStart: "2026-08-15",
    cycleEnd: "2026-08-31",
    today: "2026-08-20",
    occurrences: [occurrence({ amount: 7000, actualPaid: 0 })],
  });
  assert.equal(legacyState.cycle100Anchor, 0);
  assert.equal(legacyState.anchorState, "migration_unresolved");
  assert.equal(legacyState.migrationUnresolved, true);

  const source = canonicalSnapshot({
    anchor: 0,
    remaining: 7000,
    anchorState: "migration_unresolved",
    migrationUnresolved: true,
  });
  const destination = { ...source, localVaultId: "destination-vault" };
  const result = reconcileFinancialContextMigration({ source, destination });
  assert.equal(result.status, "unresolved");
  assert.equal(result.unresolved.some((item) => item.code === "unresolved_anchor"), true);
});

test("Test L — negative Wall Bill and Means Score are preserved without clamping", () => {
  const source = canonicalSnapshot({ wallet: -2500, remaining: 10000, anchor: 10000 });
  const destination = { ...source, localVaultId: "destination-vault" };
  const result = reconcileFinancialContextMigration({ source, destination });
  assert.equal(source.wallBill, -12500);
  assert.equal(source.meansScore, -25);
  assert.equal(result.status, "success");
});

test("Test M — running normalization and reconciliation twice is idempotent", () => {
  const prepared = preparedFixture({
    events: [{ id: "electric", date: "2026-08-20", amount: 3000 }],
    expenses: [{ id: "expense-1", moneyScheduleEventId: "electric" }],
    transactions: [{ id: "txn-1", expense_id: "expense-1", amount: -1200 }],
  });
  const first = normalizePreparedFinancialContext(prepared);
  const second = normalizePreparedFinancialContext(first.prepared);
  assert.deepEqual(second.prepared, first.prepared);
  assert.equal(second.unresolved.length, 0);

  const source = canonicalSnapshot({ wallet: 10000, remaining: 7000, anchor: 10000 });
  const destination = { ...source, localVaultId: "destination-vault" };
  const firstResult = reconcileFinancialContextMigration({ source, destination });
  const secondResult = reconcileFinancialContextMigration({ source, destination });
  assert.deepEqual(secondResult.reconciliation, firstResult.reconciliation);
  assert.equal(firstResult.status, "success");
  assert.equal(secondResult.status, "success");
});
