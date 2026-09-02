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

const meansSource = await fs.readFile(
  new URL("../src/lib/clara-means-authority.js", import.meta.url),
  "utf8"
);
const vaultSource = await fs.readFile(
  new URL("../src/lib/device-transfer-vault.js", import.meta.url),
  "utf8"
);

function dateOffset(days) {
  const value = new Date();
  value.setUTCHours(12, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const ACTIVE_CYCLE = {
  cycleStart: dateOffset(-1),
  activeDate: dateOffset(0),
  cycleEnd: dateOffset(2),
};

function v7Baseline(anchor = 3000) {
  return {
    version: 7,
    cycleStart: ACTIVE_CYCLE.cycleStart,
    cycleEnd: ACTIVE_CYCLE.cycleEnd,
    cycle100Anchor: anchor,
    anchorState: "anchored",
    protectedOccurrences: {},
    anchorRequirements: [],
  };
}

function baselinePreference(anchor = 3000) {
  return {
    id: `means-cycle-baseline:source-vault:${ACTIVE_CYCLE.cycleStart}:${ACTIVE_CYCLE.cycleEnd}`,
    recordKind: "means_cycle_baseline",
    cycleStart: ACTIVE_CYCLE.cycleStart,
    cycleEnd: ACTIVE_CYCLE.cycleEnd,
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

function requirementOccurrence({
  key,
  amount = 3000,
  actualPaid = 0,
  kind = "money_schedule",
  sourceId = "legacy-electric",
  date = ACTIVE_CYCLE.activeDate,
} = {}) {
  return {
    id: key,
    requirementKey: key,
    sourceType: kind,
    kind,
    sourceId,
    date,
    amount,
    actualPaid,
  };
}

function resolveSourceCanonicalRequirementKey(expense, transaction, scheduleEventDates = new Map()) {
  return (
    getExplicitMeansRequirementKey(expense) ||
    getExplicitMeansRequirementKey(transaction) ||
    deriveDeterministicLegacyMeansRequirementIdentity(expense, { scheduleEventDates })?.key ||
    deriveDeterministicLegacyMeansRequirementIdentity(transaction, { scheduleEventDates })?.key ||
    ""
  );
}

function baselineStateFor({ key, planned = 3000, paid = 0, kind = "money_schedule", sourceId } = {}) {
  return resolveAdaptiveMeansBaselineState({
    stored: v7Baseline(planned),
    cycleStart: ACTIVE_CYCLE.cycleStart,
    cycleEnd: ACTIVE_CYCLE.cycleEnd,
    today: ACTIVE_CYCLE.activeDate,
    occurrences: [
      requirementOccurrence({
        key,
        amount: planned,
        actualPaid: paid,
        kind,
        sourceId,
      }),
    ],
  });
}

function semanticSnapshot({ state, wallet = 3000, vaultId = "source-vault" } = {}) {
  const scoreState = calculateMeansScoreState({
    availableWalletMoney: wallet,
    remainingPlannedSpending: state.remainingPlannedSpending,
    cycle100Anchor: state.cycle100Anchor,
  });
  return {
    localVaultId: vaultId,
    activeCycle: {
      sourceId: "income-master",
      cycleStart: ACTIVE_CYCLE.cycleStart,
      cycleEnd: ACTIVE_CYCLE.cycleEnd,
    },
    availableWalletMoney: wallet,
    remainingPlannedSpending: state.remainingPlannedSpending,
    cycle100Anchor: state.cycle100Anchor,
    anchorState: state.anchorState,
    migrationUnresolved: Boolean(state.migrationUnresolved),
    wallBill: scoreState.wallBill,
    meansScore: scoreState.score,
  };
}

function simulateLegacyMoneyScheduleTransfer(paymentAmount) {
  const events = [
    {
      id: "legacy-electric",
      date: ACTIVE_CYCLE.activeDate,
      amount: 3000,
      direction: "out",
    },
  ];
  const expense = {
    id: "expense-legacy-1",
    moneyScheduleEventId: "legacy-electric",
    planning_status: "planned",
    date: ACTIVE_CYCLE.activeDate,
  };
  const transaction = {
    id: "txn-legacy-1",
    expense_id: "expense-legacy-1",
    amount: -Math.abs(paymentAmount),
    date: ACTIVE_CYCLE.activeDate,
  };
  const prepared = preparedFixture({
    events,
    expenses: [expense],
    transactions: [transaction],
    preferences: [baselinePreference(3000)],
  });

  const { byId: scheduleEventDates } = buildDeterministicMeansScheduleEventDateIndex(events);
  const sourceRequirementKey = resolveSourceCanonicalRequirementKey(
    expense,
    transaction,
    scheduleEventDates
  );
  const sourceState = baselineStateFor({
    key: sourceRequirementKey,
    planned: 3000,
    paid: Math.abs(paymentAmount),
  });
  const source = semanticSnapshot({ state: sourceState, wallet: 3000, vaultId: "source-vault" });

  const serialized = JSON.parse(JSON.stringify(prepared));
  const normalized = normalizePreparedFinancialContext(serialized);
  const finance = normalized.prepared.data.indexedDB.databases[0].stores;
  const destinationExpense = finance.expenses.records[0];
  const destinationTransaction = finance.wallet_transactions.records[0];
  const destinationRequirementKey =
    getExplicitMeansRequirementKey(destinationExpense) ||
    getExplicitMeansRequirementKey(destinationTransaction);
  const destinationState = baselineStateFor({
    key: destinationRequirementKey,
    planned: 3000,
    paid: Math.abs(paymentAmount),
  });
  const destination = semanticSnapshot({
    state: destinationState,
    wallet: 3000,
    vaultId: "destination-vault",
  });
  const reconciliation = reconcileFinancialContextMigration({
    source,
    destination,
    unresolved: normalized.unresolved,
  });

  return {
    sourceRequirementKey,
    destinationRequirementKey,
    destinationExpense,
    destinationTransaction,
    normalized,
    sourceState,
    destinationState,
    source,
    destination,
    reconciliation,
  };
}

test("canonical Means and transfer normalization use the same shared deterministic legacy identity authority", () => {
  assert.match(meansSource, /deriveDeterministicLegacyMeansRequirementIdentity/);
  assert.match(meansSource, /buildDeterministicMeansScheduleEventDateIndex/);
  assert.match(
    meansSource,
    /getExplicitMeansRequirementKey\(expense\)[\s\S]*getExplicitMeansRequirementKey\(transaction\)[\s\S]*deriveDeterministicLegacyMeansRequirementIdentity\(expense/[\s\S]*deriveDeterministicLegacyMeansRequirementIdentity\(transaction/
  );

  const result = simulateLegacyMoneyScheduleTransfer(3000);
  assert.equal(result.sourceRequirementKey, "money-schedule:legacy-electric:" + ACTIVE_CYCLE.activeDate);
  assert.equal(result.destinationRequirementKey, result.sourceRequirementKey);
  assert.equal(result.destinationExpense.meansRequirementKey, result.sourceRequirementKey);
  assert.equal(result.destinationTransaction.meansRequirementKey, result.sourceRequirementKey);
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

  assert.deepEqual(result.reconciliation.reconciliation, {
    cycleMatch: true,
    walletMatch: true,
    remainingPlanMatch: true,
    anchorMatch: true,
    wallBillMatch: true,
    meansScoreMatch: true,
  });
  assert.equal(result.reconciliation.status, "success");
  assert.deepEqual(result.reconciliation.unresolved, []);
});

test("partial deterministic legacy fulfillment remains identical before and after normalization", () => {
  const result = simulateLegacyMoneyScheduleTransfer(1200);
  assert.equal(result.sourceState.requirements[0].fulfilledAmount, 1200);
  assert.equal(result.destinationState.requirements[0].fulfilledAmount, 1200);
  assert.equal(result.sourceState.remainingPlannedSpending, 1800);
  assert.equal(result.destinationState.remainingPlannedSpending, 1800);
  assert.equal(result.reconciliation.status, "success");
  assert.equal(result.reconciliation.reconciliation.remainingPlanMatch, true);
});

test("legacy overpayment caps planned fulfillment and never creates negative Remaining Plan", () => {
  const result = simulateLegacyMoneyScheduleTransfer(3500);
  assert.equal(result.sourceState.requirements[0].fulfilledAmount, 3000);
  assert.equal(result.destinationState.requirements[0].fulfilledAmount, 3000);
  assert.equal(result.sourceState.remainingPlannedSpending, 0);
  assert.equal(result.destinationState.remainingPlannedSpending, 0);
  assert.equal(result.reconciliation.status, "success");
});

test("ambiguous active-cycle legacy labels remain unresolved and are never fuzzy matched", () => {
  const prepared = preparedFixture({
    events: [
      { id: "internet-a", title: "Internet Bill", date: ACTIVE_CYCLE.activeDate, amount: 1500 },
      { id: "internet-b", title: "Internet Bill", date: dateOffset(1), amount: 1500 },
    ],
    expenses: [
      {
        id: "legacy-internet",
        title: "Internet Bill",
        source: "money_schedule",
        planning_status: "planned",
        date: ACTIVE_CYCLE.activeDate,
      },
    ],
    transactions: [
      {
        id: "txn-internet",
        expense_id: "legacy-internet",
        amount: -1500,
        date: ACTIVE_CYCLE.activeDate,
      },
    ],
    preferences: [baselinePreference(1500)],
  });

  const normalized = normalizePreparedFinancialContext(prepared);
  const expense = normalized.prepared.data.indexedDB.databases[0].stores.expenses.records[0];
  assert.equal(getExplicitMeansRequirementKey(expense), "");
  assert.equal(
    normalized.unresolved.some((item) => item.code === "legacy_requirement_identity_unresolved"),
    true
  );
});

test("legacy Debt identity uses only debt ID plus exact due occurrence and preserves Remaining Plan", () => {
  const expense = {
    id: "expense-debt-legacy",
    debtId: "debt-7",
    dueDate: ACTIVE_CYCLE.activeDate,
    planning_status: "planned",
    date: ACTIVE_CYCLE.activeDate,
  };
  const transaction = {
    id: "txn-debt-legacy",
    expense_id: "expense-debt-legacy",
    amount: -1200,
    date: ACTIVE_CYCLE.activeDate,
  };
  const sourceKey = resolveSourceCanonicalRequirementKey(expense, transaction);
  assert.equal(sourceKey, `debt:debt-7:${ACTIVE_CYCLE.activeDate}`);

  const prepared = preparedFixture({
    expenses: [expense],
    transactions: [transaction],
    preferences: [baselinePreference(3000)],
  });
  const normalized = normalizePreparedFinancialContext(JSON.parse(JSON.stringify(prepared)));
  const finance = normalized.prepared.data.indexedDB.databases[0].stores;
  const destinationKey = getExplicitMeansRequirementKey(finance.expenses.records[0]);
  assert.equal(destinationKey, sourceKey);
  assert.equal(getExplicitMeansRequirementKey(finance.wallet_transactions.records[0]), sourceKey);
  assert.deepEqual(normalized.unresolved, []);

  const sourceState = baselineStateFor({
    key: sourceKey,
    planned: 3000,
    paid: 1200,
    kind: "debt",
    sourceId: "debt-7",
  });
  const destinationState = baselineStateFor({
    key: destinationKey,
    planned: 3000,
    paid: 1200,
    kind: "debt",
    sourceId: "debt-7",
  });
  assert.equal(sourceState.requirements[0].fulfilledAmount, 1200);
  assert.equal(destinationState.requirements[0].fulfilledAmount, 1200);
  assert.equal(sourceState.remainingPlannedSpending, 1800);
  assert.equal(destinationState.remainingPlannedSpending, 1800);

  const reconciliation = reconcileFinancialContextMigration({
    source: semanticSnapshot({ state: sourceState, wallet: 3000, vaultId: "source-vault" }),
    destination: semanticSnapshot({
      state: destinationState,
      wallet: 3000,
      vaultId: "destination-vault",
    }),
    unresolved: normalized.unresolved,
  });
  assert.equal(reconciliation.status, "success");
  assert.equal(reconciliation.reconciliation.remainingPlanMatch, true);
});

function extractProductionFunctionBlock(startMarker, endMarker) {
  const start = vaultSource.indexOf(startMarker);
  const end = vaultSource.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing production marker: ${startMarker}`);
  assert.ok(end > start, `Missing production end marker after: ${startMarker}`);
  return vaultSource.slice(start, end).trim();
}

function productionFinanceNamespacingFunction() {
  const rewrite = extractProductionFunctionBlock(
    "function rewriteRecordReferences",
    "\n\nfunction isMeansBaselineRecord"
  );
  const isBaseline = extractProductionFunctionBlock(
    "function isMeansBaselineRecord",
    "\n\nfunction transferredFinanceRecordId"
  );
  const transferredId = extractProductionFunctionBlock(
    "function transferredFinanceRecordId",
    "\n\nfunction namespaceTransferredFinanceRecordIds"
  );
  const namespace = extractProductionFunctionBlock(
    "function namespaceTransferredFinanceRecordIds",
    "\n\nfunction indexedDbOnly"
  );

  const text = (value) => String(value ?? "").trim();
  const dateKey = (value) => text(value).slice(0, 10);
  const normalizeStoreRecords = (store) => {
    if (Array.isArray(store)) return store;
    if (Array.isArray(store?.records)) return store.records;
    return [];
  };
  const getFinanceDatabase = (snapshot) =>
    (snapshot?.data?.indexedDB?.databases || []).find(
      (database) => database?.name === "clara_local_finance"
    );
  const meansCycleBaselineRecordId = (vaultId, cycleStart, cycleEnd) =>
    `means-cycle-baseline:${vaultId}:${cycleStart}:${cycleEnd}`;

  return new Function(
    "text",
    "dateKey",
    "normalizeStoreRecords",
    "getFinanceDatabase",
    "MEANS_BASELINE_RECORD_KIND",
    "meansCycleBaselineRecordId",
    `${rewrite}\n\n${isBaseline}\n\n${transferredId}\n\n${namespace}\nreturn namespaceTransferredFinanceRecordIds;`
  )(
    text,
    dateKey,
    normalizeStoreRecords,
    getFinanceDatabase,
    "means_cycle_baseline",
    meansCycleBaselineRecordId
  );
}

test("finance ID namespacing keeps linked finance references and Means identities internally coherent", () => {
  const namespaceTransferredFinanceRecordIds = productionFinanceNamespacingFunction();
  const scheduleRequirementKey = `money-schedule:schedule-1:${ACTIVE_CYCLE.activeDate}`;
  const debtRequirementKey = `debt:debt-1:${ACTIVE_CYCLE.activeDate}`;
  const prepared = {
    data: {
      localStorage: {
        "clara_schedule_events_v2:source-vault": [
          { id: "schedule-1", date: ACTIVE_CYCLE.activeDate, amount: 3000 },
        ],
      },
      indexedDB: {
        supported: true,
        errors: [],
        databases: [
          {
            name: "clara_local_finance",
            stores: {
              wallets: {
                records: [{ id: "wallet-1", name: "Cash" }],
                count: 1,
              },
              expenses: {
                records: [
                  {
                    id: "expense-1",
                    wallet_id: "wallet-1",
                    debtId: "debt-1",
                    scheduleEventId: "schedule-1",
                    meansRequirementKey: scheduleRequirementKey,
                    requirementKey: scheduleRequirementKey,
                  },
                ],
                count: 1,
              },
              wallet_transactions: {
                records: [
                  {
                    id: "txn-1",
                    expense_id: "expense-1",
                    wallet_id: "wallet-1",
                    debt_id: "debt-1",
                    schedule_event_id: "schedule-1",
                    meansRequirementKey: debtRequirementKey,
                    requirementKey: debtRequirementKey,
                  },
                ],
                count: 1,
              },
              private_preferences: {
                records: [
                  {
                    id: "debt-1",
                    recordKind: "debt_obligation",
                  },
                  {
                    id: `means-cycle-baseline:source-vault:${ACTIVE_CYCLE.cycleStart}:${ACTIVE_CYCLE.cycleEnd}`,
                    recordKind: "means_cycle_baseline",
                    cycleStart: ACTIVE_CYCLE.cycleStart,
                    cycleEnd: ACTIVE_CYCLE.cycleEnd,
                    baseline: {
                      cycleStart: ACTIVE_CYCLE.cycleStart,
                      cycleEnd: ACTIVE_CYCLE.cycleEnd,
                      anchorRequirements: [
                        {
                          walletId: "wallet-1",
                          debtId: "debt-1",
                          scheduleEventId: "schedule-1",
                          debtRequirementKey,
                          scheduleRequirementKey,
                        },
                      ],
                    },
                  },
                ],
                count: 2,
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
  const baseline = stores.private_preferences.records.find(
    (row) => row.recordKind === "means_cycle_baseline"
  );

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
  assert.equal(expense.requirementKey, scheduleRequirementKey);
  assert.equal(
    transaction.requirementKey,
    `debt:transfer:destination-vault:debt-1:${ACTIVE_CYCLE.activeDate}`
  );
  assert.equal(
    baseline.id,
    `means-cycle-baseline:destination-vault:${ACTIVE_CYCLE.cycleStart}:${ACTIVE_CYCLE.cycleEnd}`
  );
  assert.equal(baseline.baseline.anchorRequirements[0].walletId, wallet.id);
  assert.equal(baseline.baseline.anchorRequirements[0].debtId, debt.id);
  assert.equal(baseline.baseline.anchorRequirements[0].scheduleEventId, "schedule-1");
  assert.equal(
    baseline.baseline.anchorRequirements[0].debtRequirementKey,
    transaction.requirementKey
  );
  assert.equal(
    baseline.baseline.anchorRequirements[0].scheduleRequirementKey,
    scheduleRequirementKey
  );
  assert.deepEqual(namespaced.data.localStorage, prepared.data.localStorage);
});
