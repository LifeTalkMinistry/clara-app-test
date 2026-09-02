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
import {
  buildDeterministicMeansScheduleEventDateIndex,
  deriveDeterministicLegacyMeansRequirementIdentity,
  getExplicitMeansRequirementKey,
} from "../src/lib/clara-means-requirement-identity.js";
import {
  addFinancialDays,
  financialDateKey,
} from "../src/lib/clara-financial-day.js";

const meansSource = await fs.readFile(
  new URL("../src/lib/clara-means-authority.js", import.meta.url),
  "utf8"
);
const vaultSource = await fs.readFile(
  new URL("../src/lib/device-transfer-vault.js", import.meta.url),
  "utf8"
);

const ACTIVE_DATE = financialDateKey(new Date());
const CYCLE_START = addFinancialDays(ACTIVE_DATE, -1);
const CYCLE_END = addFinancialDays(ACTIVE_DATE, 2);

function v7Baseline(anchor = 3000) {
  return {
    version: 7,
    cycleStart: CYCLE_START,
    cycleEnd: CYCLE_END,
    cycle100Anchor: anchor,
    anchorState: "anchored",
    protectedOccurrences: {},
    anchorRequirements: [],
  };
}

function baselinePreference(anchor = 3000) {
  return {
    id: `means-cycle-baseline:source-vault:${CYCLE_START}:${CYCLE_END}`,
    recordKind: "means_cycle_baseline",
    cycleStart: CYCLE_START,
    cycleEnd: CYCLE_END,
    baseline: v7Baseline(anchor),
  };
}

function preparedFixture({ events = [], expenses = [], transactions = [], preferences = [] } = {}) {
  return {
    data: {
      localStorage: {
        "clara_schedule_events_v2:source-vault": events,
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
              private_preferences: { records: preferences, count: preferences.length },
            },
          },
        ],
      },
    },
  };
}

function sourceRequirementKey(expense, transaction, scheduleEventDates = new Map()) {
  return (
    getExplicitMeansRequirementKey(expense) ||
    getExplicitMeansRequirementKey(transaction) ||
    deriveDeterministicLegacyMeansRequirementIdentity(expense, { scheduleEventDates })?.key ||
    deriveDeterministicLegacyMeansRequirementIdentity(transaction, { scheduleEventDates })?.key ||
    ""
  );
}

function requirementState({ key, planned = 3000, paid = 0, kind = "money_schedule", sourceId = "legacy-electric" }) {
  return resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(planned),
    cycleStart: CYCLE_START,
    cycleEnd: CYCLE_END,
    today: ACTIVE_DATE,
    occurrences: [
      {
        id: key,
        requirementKey: key,
        sourceType: kind,
        kind,
        sourceId,
        date: ACTIVE_DATE,
        amount: planned,
        actualPaid: paid,
      },
    ],
  });
}

function semanticSnapshot(state, vaultId, wallet = 3000) {
  const score = calculateMeansScoreState({
    availableWalletMoney: wallet,
    remainingPlannedSpending: state.remainingPlannedSpending,
    cycle100Anchor: state.cycle100Anchor,
  });
  return {
    localVaultId: vaultId,
    activeCycle: {
      sourceId: "income-master",
      cycleStart: CYCLE_START,
      cycleEnd: CYCLE_END,
    },
    availableWalletMoney: wallet,
    remainingPlannedSpending: state.remainingPlannedSpending,
    cycle100Anchor: state.cycle100Anchor,
    anchorState: state.anchorState,
    migrationUnresolved: Boolean(state.migrationUnresolved),
    wallBill: score.wallBill,
    meansScore: score.score,
  };
}

function simulateLegacyScheduleTransfer(payment) {
  const events = [
    { id: "legacy-electric", date: ACTIVE_DATE, amount: 3000, direction: "out" },
  ];
  const expense = {
    id: "expense-legacy-1",
    moneyScheduleEventId: "legacy-electric",
    planning_status: "planned",
    date: ACTIVE_DATE,
  };
  const transaction = {
    id: "txn-legacy-1",
    expense_id: expense.id,
    amount: -Math.abs(payment),
    date: ACTIVE_DATE,
  };
  const prepared = preparedFixture({
    events,
    expenses: [expense],
    transactions: [transaction],
    preferences: [baselinePreference()],
  });

  const { byId } = buildDeterministicMeansScheduleEventDateIndex(events);
  const sourceKey = sourceRequirementKey(expense, transaction, byId);
  const sourceState = requirementState({ key: sourceKey, paid: Math.abs(payment) });
  const source = semanticSnapshot(sourceState, "source-vault");

  const wireCopy = JSON.parse(JSON.stringify(prepared));
  const normalized = normalizePreparedFinancialContext(wireCopy);
  const stores = normalized.prepared.data.indexedDB.databases[0].stores;
  const destinationKey =
    getExplicitMeansRequirementKey(stores.expenses.records[0]) ||
    getExplicitMeansRequirementKey(stores.wallet_transactions.records[0]);
  const destinationState = requirementState({ key: destinationKey, paid: Math.abs(payment) });
  const destination = semanticSnapshot(destinationState, "destination-vault");
  const migration = reconcileFinancialContextMigration({
    source,
    destination,
    unresolved: normalized.unresolved,
  });

  return {
    sourceKey,
    destinationKey,
    sourceState,
    destinationState,
    source,
    destination,
    normalized,
    migration,
  };
}

test("source canonical Means resolves legacy identity in the required strict order", () => {
  const explicitExpense = meansSource.indexOf("getExplicitMeansRequirementKey(expense)");
  const explicitTransaction = meansSource.indexOf("getExplicitMeansRequirementKey(transaction)", explicitExpense);
  const legacyExpense = meansSource.indexOf("deriveDeterministicLegacyMeansRequirementIdentity(expense", explicitTransaction);
  const legacyTransaction = meansSource.indexOf("deriveDeterministicLegacyMeansRequirementIdentity(transaction", legacyExpense);

  assert.ok(explicitExpense >= 0);
  assert.ok(explicitTransaction > explicitExpense);
  assert.ok(legacyExpense > explicitTransaction);
  assert.ok(legacyTransaction > legacyExpense);
  assert.ok(meansSource.includes("buildDeterministicMeansScheduleEventDateIndex"));
});

test("legacy Money Schedule full fulfillment is semantically identical before and after normalization", () => {
  const result = simulateLegacyScheduleTransfer(3000);
  const expectedKey = `money-schedule:legacy-electric:${ACTIVE_DATE}`;

  assert.equal(result.sourceKey, expectedKey);
  assert.equal(result.destinationKey, expectedKey);
  assert.equal(result.normalized.unresolved.length, 0);
  assert.equal(result.sourceState.requirements[0].fulfilledAmount, 3000);
  assert.equal(result.destinationState.requirements[0].fulfilledAmount, 3000);
  assert.equal(result.source.remainingPlannedSpending, 0);
  assert.equal(result.destination.remainingPlannedSpending, 0);
  assert.equal(result.source.cycle100Anchor, 3000);
  assert.equal(result.destination.cycle100Anchor, 3000);
  assert.equal(result.source.availableWalletMoney, 3000);
  assert.equal(result.destination.availableWalletMoney, 3000);
  assert.equal(result.source.wallBill, 3000);
  assert.equal(result.destination.wallBill, 3000);
  assert.equal(result.source.meansScore, 200);
  assert.equal(result.destination.meansScore, 200);
  assert.deepEqual(result.migration.reconciliation, {
    cycleMatch: true,
    walletMatch: true,
    remainingPlanMatch: true,
    anchorMatch: true,
    wallBillMatch: true,
    meansScoreMatch: true,
  });
  assert.equal(result.migration.status, "success");
  assert.deepEqual(result.migration.unresolved, []);
});

test("legacy Money Schedule partial fulfillment preserves the exact 1800 remainder", () => {
  const result = simulateLegacyScheduleTransfer(1200);
  assert.equal(result.sourceState.requirements[0].fulfilledAmount, 1200);
  assert.equal(result.destinationState.requirements[0].fulfilledAmount, 1200);
  assert.equal(result.source.remainingPlannedSpending, 1800);
  assert.equal(result.destination.remainingPlannedSpending, 1800);
  assert.equal(result.migration.status, "success");
});

test("legacy Money Schedule overpayment caps fulfillment at the planned 3000", () => {
  const result = simulateLegacyScheduleTransfer(3500);
  assert.equal(result.sourceState.requirements[0].fulfilledAmount, 3000);
  assert.equal(result.destinationState.requirements[0].fulfilledAmount, 3000);
  assert.equal(result.source.remainingPlannedSpending, 0);
  assert.equal(result.destination.remainingPlannedSpending, 0);
  assert.equal(result.migration.status, "success");
});

test("same-title active-cycle legacy records without deterministic identity remain unresolved", () => {
  const prepared = preparedFixture({
    events: [
      { id: "internet-a", title: "Internet Bill", date: ACTIVE_DATE, amount: 1500 },
      { id: "internet-b", title: "Internet Bill", date: addFinancialDays(ACTIVE_DATE, 1), amount: 1500 },
    ],
    expenses: [
      {
        id: "legacy-internet",
        title: "Internet Bill",
        source: "money_schedule",
        planning_status: "planned",
        date: ACTIVE_DATE,
      },
    ],
    transactions: [
      {
        id: "txn-internet",
        expense_id: "legacy-internet",
        amount: -1500,
        date: ACTIVE_DATE,
      },
    ],
    preferences: [baselinePreference(1500)],
  });

  const normalized = normalizePreparedFinancialContext(prepared);
  const expense = normalized.prepared.data.indexedDB.databases[0].stores.expenses.records[0];
  assert.equal(getExplicitMeansRequirementKey(expense), "");
  assert.ok(
    normalized.unresolved.some((item) => item.code === "legacy_requirement_identity_unresolved")
  );
});

test("legacy Debt identity is only debt ID plus exact due occurrence and remains semantically identical", () => {
  const expense = {
    id: "expense-debt-legacy",
    debtId: "debt-7",
    dueDate: ACTIVE_DATE,
    planning_status: "planned",
    date: ACTIVE_DATE,
  };
  const transaction = {
    id: "txn-debt-legacy",
    expense_id: expense.id,
    amount: -1200,
    date: ACTIVE_DATE,
  };
  const sourceKey = sourceRequirementKey(expense, transaction);
  assert.equal(sourceKey, `debt:debt-7:${ACTIVE_DATE}`);

  const normalized = normalizePreparedFinancialContext(
    preparedFixture({
      expenses: [expense],
      transactions: [transaction],
      preferences: [baselinePreference()],
    })
  );
  const stores = normalized.prepared.data.indexedDB.databases[0].stores;
  const destinationKey = getExplicitMeansRequirementKey(stores.expenses.records[0]);
  assert.equal(destinationKey, sourceKey);
  assert.equal(getExplicitMeansRequirementKey(stores.wallet_transactions.records[0]), sourceKey);
  assert.deepEqual(normalized.unresolved, []);

  const sourceState = requirementState({
    key: sourceKey,
    paid: 1200,
    kind: "debt",
    sourceId: "debt-7",
  });
  const destinationState = requirementState({
    key: destinationKey,
    paid: 1200,
    kind: "debt",
    sourceId: "debt-7",
  });
  assert.equal(sourceState.remainingPlannedSpending, 1800);
  assert.equal(destinationState.remainingPlannedSpending, 1800);

  const migration = reconcileFinancialContextMigration({
    source: semanticSnapshot(sourceState, "source-vault"),
    destination: semanticSnapshot(destinationState, "destination-vault"),
    unresolved: normalized.unresolved,
  });
  assert.equal(migration.status, "success");
  assert.equal(migration.reconciliation.remainingPlanMatch, true);
});

function extractFunction(startMarker, endMarker) {
  const start = vaultSource.indexOf(startMarker);
  const end = vaultSource.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing ${startMarker}`);
  assert.ok(end > start, `Missing end marker after ${startMarker}`);
  return vaultSource.slice(start, end).trim();
}

function loadProductionNamespacingFunction() {
  const rewrite = extractFunction(
    "function rewriteRecordReferences",
    "\n\nfunction isMeansBaselineRecord"
  );
  const isBaseline = extractFunction(
    "function isMeansBaselineRecord",
    "\n\nfunction transferredFinanceRecordId"
  );
  const transferredId = extractFunction(
    "function transferredFinanceRecordId",
    "\n\nfunction namespaceTransferredFinanceRecordIds"
  );
  const namespace = extractFunction(
    "function namespaceTransferredFinanceRecordIds",
    "\n\nfunction indexedDbOnly"
  );

  const text = (value) => String(value ?? "").trim();
  const dateKey = (value) => text(value).slice(0, 10);
  const normalizeStoreRecords = (store) => Array.isArray(store) ? store : (store?.records || []);
  const getFinanceDatabase = (snapshot) =>
    (snapshot?.data?.indexedDB?.databases || []).find((database) => database?.name === "clara_local_finance");
  const meansCycleBaselineRecordId = (vaultId, start, end) =>
    `means-cycle-baseline:${vaultId}:${start}:${end}`;

  return new Function(
    "text",
    "dateKey",
    "normalizeStoreRecords",
    "getFinanceDatabase",
    "MEANS_BASELINE_RECORD_KIND",
    "meansCycleBaselineRecordId",
    `${rewrite}\n${isBaseline}\n${transferredId}\n${namespace}\nreturn namespaceTransferredFinanceRecordIds;`
  )(
    text,
    dateKey,
    normalizeStoreRecords,
    getFinanceDatabase,
    "means_cycle_baseline",
    meansCycleBaselineRecordId
  );
}

test("production finance namespacing keeps record links, requirement keys, and baseline references coherent", () => {
  const namespaceTransferredFinanceRecordIds = loadProductionNamespacingFunction();
  const scheduleKey = `money-schedule:schedule-1:${ACTIVE_DATE}`;
  const debtKey = `debt:debt-1:${ACTIVE_DATE}`;
  const prepared = {
    data: {
      localStorage: {
        "clara_schedule_events_v2:source-vault": [
          { id: "schedule-1", date: ACTIVE_DATE, amount: 3000 },
        ],
      },
      indexedDB: {
        databases: [
          {
            name: "clara_local_finance",
            stores: {
              wallets: { records: [{ id: "wallet-1" }] },
              expenses: {
                records: [{
                  id: "expense-1",
                  wallet_id: "wallet-1",
                  debtId: "debt-1",
                  scheduleEventId: "schedule-1",
                  requirementKey: scheduleKey,
                }],
              },
              wallet_transactions: {
                records: [{
                  id: "txn-1",
                  expense_id: "expense-1",
                  wallet_id: "wallet-1",
                  debt_id: "debt-1",
                  schedule_event_id: "schedule-1",
                  requirementKey: debtKey,
                }],
              },
              private_preferences: {
                records: [
                  { id: "debt-1", recordKind: "debt_obligation" },
                  {
                    id: `means-cycle-baseline:source-vault:${CYCLE_START}:${CYCLE_END}`,
                    recordKind: "means_cycle_baseline",
                    cycleStart: CYCLE_START,
                    cycleEnd: CYCLE_END,
                    baseline: {
                      cycleStart: CYCLE_START,
                      cycleEnd: CYCLE_END,
                      anchorRequirements: [{
                        walletId: "wallet-1",
                        debtId: "debt-1",
                        scheduleEventId: "schedule-1",
                        debtRequirementKey: debtKey,
                        scheduleRequirementKey: scheduleKey,
                      }],
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };

  const namespaced = namespaceTransferredFinanceRecordIds(prepared, "destination-vault");
  const stores = namespaced.data.indexedDB.databases[0].stores;
  const wallet = stores.wallets.records[0];
  const expense = stores.expenses.records[0];
  const transaction = stores.wallet_transactions.records[0];
  const debt = stores.private_preferences.records.find((row) => row.recordKind === "debt_obligation");
  const baseline = stores.private_preferences.records.find((row) => row.recordKind === "means_cycle_baseline");

  assert.equal(wallet.id, "transfer:destination-vault:wallet-1");
  assert.equal(expense.id, "transfer:destination-vault:expense-1");
  assert.equal(transaction.id, "transfer:destination-vault:txn-1");
  assert.equal(transaction.expense_id, expense.id);
  assert.equal(expense.wallet_id, wallet.id);
  assert.equal(transaction.wallet_id, wallet.id);
  assert.equal(debt.id, "transfer:destination-vault:debt-1");
  assert.equal(expense.debtId, debt.id);
  assert.equal(transaction.debt_id, debt.id);
  assert.equal(expense.scheduleEventId, "schedule-1");
  assert.equal(transaction.schedule_event_id, "schedule-1");
  assert.equal(expense.requirementKey, scheduleKey);
  assert.equal(transaction.requirementKey, `debt:transfer:destination-vault:debt-1:${ACTIVE_DATE}`);
  assert.equal(
    baseline.id,
    `means-cycle-baseline:destination-vault:${CYCLE_START}:${CYCLE_END}`
  );
  assert.equal(baseline.baseline.anchorRequirements[0].walletId, wallet.id);
  assert.equal(baseline.baseline.anchorRequirements[0].debtId, debt.id);
  assert.equal(baseline.baseline.anchorRequirements[0].scheduleEventId, "schedule-1");
  assert.equal(
    baseline.baseline.anchorRequirements[0].debtRequirementKey,
    transaction.requirementKey
  );
  assert.equal(baseline.baseline.anchorRequirements[0].scheduleRequirementKey, scheduleKey);
  assert.deepEqual(namespaced.data.localStorage, prepared.data.localStorage);
});
