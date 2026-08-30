import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  get length() {
    return this.values.size;
  }
  key(index) {
    return [...this.values.keys()][index] || null;
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}

class NameList {
  constructor(values = []) {
    this.values = [...values];
  }
  get length() {
    return this.values.length;
  }
  contains(name) {
    return this.values.includes(name);
  }
  add(name) {
    if (!this.contains(name)) this.values.push(name);
  }
  delete(name) {
    this.values = this.values.filter((value) => value !== name);
  }
  item(index) {
    return this.values[index] ?? null;
  }
  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }
}

class FakeTransaction {
  constructor(database, storeNames) {
    this.database = database;
    this.storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
    this.pending = 0;
    this.finished = false;
    this.completionTimer = null;
    this.error = null;
    this.#scheduleCompletion();
  }

  #scheduleCompletion() {
    if (this.finished || this.pending > 0 || this.completionTimer) return;
    this.completionTimer = setTimeout(() => {
      this.completionTimer = null;
      if (this.finished || this.pending > 0) return;
      this.finished = true;
      this.oncomplete?.();
    }, 0);
  }

  begin() {
    if (this.finished) throw new Error("Transaction is inactive.");
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
    this.pending += 1;
  }

  end() {
    this.pending = Math.max(0, this.pending - 1);
    this.#scheduleCompletion();
  }

  fail(error) {
    if (this.finished) return;
    this.error = error;
    this.finished = true;
    if (this.completionTimer) clearTimeout(this.completionTimer);
    this.onerror?.();
  }

  abort() {
    if (this.finished) return;
    this.error = this.error || new Error("Transaction aborted.");
    this.finished = true;
    if (this.completionTimer) clearTimeout(this.completionTimer);
    this.onabort?.();
  }

  objectStore(name) {
    if (!this.storeNames.includes(name)) throw new Error(`Store ${name} is outside this transaction.`);
    const definition = this.database.stores.get(name);
    if (!definition) throw new Error(`Missing store ${name}`);
    return new FakeObjectStore(definition, this);
  }
}

class FakeObjectStore {
  constructor(definition, transaction = null) {
    this.definition = definition;
    this.transaction = transaction;
  }

  get keyPath() {
    return this.definition.keyPath;
  }

  get indexNames() {
    return new NameList([...this.definition.indexes.keys()]);
  }

  createIndex(name, keyPath, options = {}) {
    this.definition.indexes.set(name, { keyPath, options });
    return this.index(name);
  }

  #request(operation) {
    const request = {};
    this.transaction?.begin();
    setTimeout(() => {
      try {
        request.result = operation();
        request.onsuccess?.();
        this.transaction?.end();
      } catch (error) {
        request.error = error;
        request.onerror?.();
        this.transaction?.fail(error);
      }
    }, 0);
    return request;
  }

  put(record) {
    return this.#request(() => {
      const key = record?.[this.definition.keyPath];
      if (!key) throw new Error(`Missing ${this.definition.keyPath}.`);
      this.definition.records.set(key, structuredClone(record));
      return key;
    });
  }

  get(key) {
    return this.#request(() => {
      const value = this.definition.records.get(key);
      return value == null ? undefined : structuredClone(value);
    });
  }

  getAll() {
    return this.#request(() =>
      [...this.definition.records.values()].map((record) => structuredClone(record))
    );
  }

  delete(key) {
    return this.#request(() => this.definition.records.delete(key));
  }

  index(name) {
    const indexDefinition = this.definition.indexes.get(name);
    if (!indexDefinition) throw new Error(`Missing index ${name}`);
    return new FakeIndex(this.definition, indexDefinition, this.transaction);
  }
}

class FakeIndex {
  constructor(storeDefinition, indexDefinition, transaction) {
    this.storeDefinition = storeDefinition;
    this.indexDefinition = indexDefinition;
    this.transaction = transaction;
  }

  #value(record) {
    return record?.[this.indexDefinition.keyPath];
  }

  getAll(query) {
    const request = {};
    this.transaction?.begin();
    setTimeout(() => {
      try {
        const records = [...this.storeDefinition.records.values()]
          .filter((record) => query === undefined || this.#value(record) === query)
          .map((record) => structuredClone(record));
        request.result = records;
        request.onsuccess?.();
        this.transaction?.end();
      } catch (error) {
        request.error = error;
        request.onerror?.();
        this.transaction?.fail(error);
      }
    }, 0);
    return request;
  }

  openCursor(range) {
    const expected = range?.value ?? range?.only ?? range;
    const entries = [...this.storeDefinition.records.entries()].filter(([, record]) =>
      expected === undefined ? true : this.#value(record) === expected
    );
    const request = {};
    let index = 0;
    this.transaction?.begin();

    const emit = () => {
      setTimeout(() => {
        try {
          if (index >= entries.length) {
            request.result = null;
            request.onsuccess?.();
            this.transaction?.end();
            return;
          }
          const [key, record] = entries[index];
          request.result = {
            key,
            value: structuredClone(record),
            delete: () => this.storeDefinition.records.delete(key),
            continue: () => {
              index += 1;
              emit();
            },
          };
          request.onsuccess?.();
        } catch (error) {
          request.error = error;
          request.onerror?.();
          this.transaction?.fail(error);
        }
      }, 0);
    };

    emit();
    return request;
  }
}

class FakeDatabase {
  constructor(name, version = 1) {
    this.name = name;
    this.version = version;
    this.stores = new Map();
    this.objectStoreNames = new NameList();
  }

  createObjectStore(name, options = {}) {
    const definition = {
      keyPath: options.keyPath || "id",
      records: new Map(),
      indexes: new Map(),
    };
    this.stores.set(name, definition);
    this.objectStoreNames.add(name);
    return new FakeObjectStore(definition);
  }

  deleteObjectStore(name) {
    this.stores.delete(name);
    this.objectStoreNames.delete(name);
  }

  transaction(storeNames) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    names.forEach((name) => {
      if (!this.stores.has(name)) throw new Error(`Missing store ${name}`);
    });
    return new FakeTransaction(this, names);
  }

  close() {}
}

class FakeIndexedDB {
  constructor() {
    this.dbs = new Map();
  }

  async databases() {
    return [...this.dbs.values()].map((database) => ({
      name: database.name,
      version: database.version,
    }));
  }

  open(name, version) {
    const request = {};
    setTimeout(() => {
      try {
        let database = this.dbs.get(name);
        const needsUpgrade = !database || (version && version > database.version);
        if (!database) {
          database = new FakeDatabase(name, version || 1);
          this.dbs.set(name, database);
        } else if (version && version > database.version) {
          database.version = version;
        }

        request.result = database;
        request.transaction = {
          objectStore: (storeName) => {
            const definition = database.stores.get(storeName);
            if (!definition) throw new Error(`Missing store ${storeName}`);
            return new FakeObjectStore(definition);
          },
        };
        if (needsUpgrade) request.onupgradeneeded?.();
        request.onsuccess?.();
      } catch (error) {
        request.error = error;
        request.onerror?.();
      }
    }, 0);
    return request;
  }
}

function installBrowser() {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const indexedDB = new FakeIndexedDB();
  const events = [];

  globalThis.indexedDB = indexedDB;
  globalThis.IDBKeyRange = { only: (value) => ({ value }) };
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  globalThis.document = {
    body: { appendChild() {} },
    createElement: () => ({ click() {}, remove() {} }),
  };
  globalThis.window = {
    indexedDB,
    localStorage,
    sessionStorage,
    location: { origin: "https://example.test", pathname: "/clara-app-test/" },
    navigator: { userAgent: "node-transfer-integration" },
    dispatchEvent: (event) => events.push(event.type),
    addEventListener() {},
    removeEventListener() {},
  };

  return { localStorage, sessionStorage, indexedDB, events };
}

const browser = installBrowser();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vite = await createServer({
  root: repoRoot,
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  resolve: { alias: { "@": path.resolve(repoRoot, "src") } },
});

const financeStore = await vite.ssrLoadModule("/src/lib/localFinanceStore.js");
const baselineRepository = await vite.ssrLoadModule("/src/lib/clara-means-baseline-repository.js");
const moneyScheduleRepository = await vite.ssrLoadModule("/src/lib/clara-money-schedule-repository.js");
const financialDay = await vite.ssrLoadModule("/src/lib/clara-financial-day.js");
const migrationAuthority = await vite.ssrLoadModule("/src/lib/clara-financial-context-migration.js");
const deviceTransfer = await vite.ssrLoadModule("/src/lib/device-transfer-vault.js");
const localVaultIdentity = await vite.ssrLoadModule("/src/lib/localVaultIdentity.js");

const SOURCE_VAULT = "clara_local_source_transfer_test";
const USER = { id: "account-transfer-test", email: "transfer@example.test" };
const PROFILE = { id: SOURCE_VAULT, display_name: "Transfer Test" };

function nearlyEqual(left, right, epsilon = 0.000001) {
  return Math.abs(Number(left || 0) - Number(right || 0)) <= epsilon;
}

function assertFinancialTruthEqual(before, after) {
  assert.equal(after.activeCycle?.cycleStart || null, before.activeCycle?.cycleStart || null);
  assert.equal(after.activeCycle?.cycleEnd || null, before.activeCycle?.cycleEnd || null);
  assert.ok(nearlyEqual(after.availableWalletMoney, before.availableWalletMoney));
  assert.ok(nearlyEqual(after.remainingPlannedSpending, before.remainingPlannedSpending));
  assert.ok(nearlyEqual(after.cycle100Anchor, before.cycle100Anchor));
  assert.equal(after.anchorState, before.anchorState);
  assert.ok(nearlyEqual(after.wallBill, before.wallBill));
  assert.equal(after.meansScore, before.meansScore);
}

async function resetSourceVault() {
  await financeStore.closeLocalFinanceDb().catch(() => {});
  browser.localStorage.clear();
  browser.sessionStorage.clear();
  browser.indexedDB.dbs.clear();
  browser.localStorage.setItem("clara_local_vault_id_v1", SOURCE_VAULT);
  await financeStore.openLocalFinanceDb();
}

function cycleContext() {
  const today = financialDay.financialDateKey(new Date());
  return {
    today,
    cycleStart: financialDay.addFinancialDays(today, -5),
    cycleEnd: financialDay.addFinancialDays(today, 10),
    eventDate: financialDay.addFinancialDays(today, 1),
    previousDate: financialDay.addFinancialDays(today, -6),
  };
}

async function seedIncomeCycle({ cycleStart, cycleEnd }) {
  await financeStore.upsertLocalRecord(
    financeStore.LOCAL_FINANCE_STORES.privatePreferences,
    {
      id: "income-master",
      kind: "income_source",
      recordType: "income_source",
      name: "Salary",
      stability: "Stable",
      usualIncomeDateEnabled: true,
      useForBudgetTiming: true,
      isMasterPayCycle: true,
      customCycleStart: cycleStart,
      customCycleEnd: cycleEnd,
    },
    SOURCE_VAULT
  );
}

function scheduleEvent({ id, title = "Planned Expense", date, amount }) {
  return {
    id,
    title,
    date,
    amount: String(amount),
    direction: "out",
    affectsMoney: true,
    source: "orb-money-schedule",
    userConfirmed: true,
  };
}

function saveSchedule(events) {
  browser.localStorage.setItem(
    moneyScheduleRepository.getClaraMoneyScheduleStorageKey(SOURCE_VAULT),
    JSON.stringify(events)
  );
}

async function seedWallet(balance) {
  return financeStore.upsertLocalRecord(
    financeStore.LOCAL_FINANCE_STORES.wallets,
    {
      id: "wallet-1",
      name: "Cash",
      type: "cash",
      balance,
      starting_balance: balance,
      source: "local",
    },
    SOURCE_VAULT
  );
}

async function seedScheduleFulfillment({
  eventId,
  eventDate,
  amount,
  requirementKey = `money-schedule:${eventId}:${eventDate}`,
  legacy = false,
  title = "Planned Expense",
}) {
  const expense = {
    id: `expense-${eventId}`,
    title,
    amount,
    date: eventDate,
    source: legacy ? "money_schedule" : "local",
    planning_status: legacy ? "planned" : undefined,
  };
  if (!legacy) expense.meansRequirementKey = requirementKey;
  await financeStore.upsertLocalRecord(
    financeStore.LOCAL_FINANCE_STORES.expenses,
    expense,
    SOURCE_VAULT
  );
  await financeStore.upsertLocalRecord(
    financeStore.LOCAL_FINANCE_STORES.walletTransactions,
    {
      id: `txn-${eventId}`,
      wallet_id: "wallet-1",
      expense_id: expense.id,
      amount,
      type: "expense",
      date: eventDate,
      source: "local",
    },
    SOURCE_VAULT
  );
}

async function persistV7Baseline({ cycleStart, cycleEnd, anchor }) {
  await baselineRepository.persistMeansCycleBaseline({
    owner: SOURCE_VAULT,
    cycleStart,
    cycleEnd,
    baseline: {
      version: 7,
      cycleStart,
      cycleEnd,
      cycle100Anchor: anchor,
      anchorState: anchor > 0 ? "anchored" : "no_anchor",
      anchorEstablishedAt: "2026-01-01T00:00:00.000Z",
      protectedOccurrences: {},
      anchorRequirements: [],
    },
  });
}

async function persistLegacyV6Baseline({ cycleStart, cycleEnd, requiredRunway }) {
  await baselineRepository.persistMeansCycleBaseline({
    owner: SOURCE_VAULT,
    cycleStart,
    cycleEnd,
    baseline: {
      version: 6,
      cycleStart,
      cycleEnd,
      requiredRunway,
    },
  });
}

async function transferCurrentState() {
  const outgoing = await deviceTransfer.createDeviceTransferSnapshot({ user: USER, profile: PROFILE });
  const before = outgoing.snapshot.financial_context;
  const result = await deviceTransfer.importDeviceTransferIntoNewVault(outgoing.snapshot, {
    user: USER,
    profile: PROFILE,
  });
  const after = await migrationAuthority.buildFinancialContextMigrationSnapshot({
    profile: PROFILE,
    vaultId: result.newVaultId,
  });
  assert.equal(result.migrationResult.status, "success");
  assertFinancialTruthEqual(before, after);
  return { outgoing, before, result, after };
}

async function activeRecordCounts(vaultId) {
  const counts = {};
  for (const storeName of financeStore.LOCAL_FINANCE_PRIVATE_STORES) {
    const rows = await financeStore.getLocalRecordsByUser(storeName, {
      localUserId: vaultId,
      includeDeleted: true,
    });
    counts[storeName] = rows.length;
  }
  return counts;
}

async function seedStandardPlan({
  wallet,
  plan,
  anchor = plan,
  fulfilled = 0,
  eventTitle = "Planned Expense",
  eventId = "plan-1",
  eventDate = null,
  previousFulfillment = false,
} = {}) {
  const dates = cycleContext();
  await seedIncomeCycle(dates);
  const date = eventDate || dates.eventDate;
  saveSchedule([scheduleEvent({ id: eventId, title: eventTitle, date, amount: plan })]);
  if (fulfilled > 0) {
    await seedScheduleFulfillment({
      eventId,
      eventDate: previousFulfillment ? dates.previousDate : date,
      amount: fulfilled,
      requirementKey: `money-schedule:${eventId}:${date}`,
      title: eventTitle,
    });
  }
  await seedWallet(wallet);
  await persistV7Baseline({ cycleStart: dates.cycleStart, cycleEnd: dates.cycleEnd, anchor });
  return { ...dates, eventDate: date };
}

test("financial context migration executes source snapshot -> staged restore -> canonical destination rebuild", async (t) => {
  await t.test("Test A — fresh user stays no_anchor and scoreless", async () => {
    await resetSourceVault();
    const { before, after } = await transferCurrentState();
    assert.equal(before.activeCycle, null);
    assert.equal(before.anchorState, "no_anchor");
    assert.equal(before.meansScore, null);
    assert.equal(after.meansScore, null);
  });

  await t.test("Test B — active cycle with no spending remains exactly equivalent", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 10000, plan: 10000, anchor: 10000 });
    const { before } = await transferCurrentState();
    assert.equal(before.availableWalletMoney, 10000);
    assert.equal(before.remainingPlannedSpending, 10000);
    assert.equal(before.cycle100Anchor, 10000);
    assert.equal(before.wallBill, 0);
    assert.equal(before.meansScore, 100);
  });

  await t.test("Test C — unplanned spending stays in Wallet only", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 8000, plan: 10000, anchor: 10000 });
    const { before } = await transferCurrentState();
    assert.equal(before.availableWalletMoney, 8000);
    assert.equal(before.remainingPlannedSpending, 10000);
    assert.equal(before.wallBill, -2000);
    assert.equal(before.meansScore, 80);
  });

  await t.test("Test D — fully fulfilled Money Schedule remains fulfilled", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 0, plan: 3000, anchor: 3000, fulfilled: 3000 });
    const { before } = await transferCurrentState();
    assert.equal(before.remainingPlannedSpending, 0);
    assert.equal(before.requirements[0].fulfilledAmount, 3000);
  });

  await t.test("Test E — partial fulfillment preserves the exact remainder", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 1800, plan: 3000, anchor: 3000, fulfilled: 1200 });
    const { before } = await transferCurrentState();
    assert.equal(before.requirements[0].fulfilledAmount, 1200);
    assert.equal(before.remainingPlannedSpending, 1800);
    assert.equal(before.wallBill, 0);
    assert.equal(before.meansScore, 100);
  });

  await t.test("Test F — overpayment keeps overflow unmatched and Remaining Plan at zero", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 0, plan: 3000, anchor: 3000, fulfilled: 3500 });
    const { before } = await transferCurrentState();
    assert.equal(before.requirements[0].fulfilledAmount, 3000);
    assert.equal(before.remainingPlannedSpending, 0);
    assert.equal(before.availableWalletMoney, 0);
  });

  await t.test("Test G — Debt payment history, Wallet effect, and fulfillment survive without replay", async () => {
    await resetSourceVault();
    const dates = cycleContext();
    await seedIncomeCycle(dates);
    await financeStore.upsertLocalRecord(
      financeStore.LOCAL_FINANCE_STORES.privatePreferences,
      {
        id: "debt-1",
        recordKind: "debt_obligation",
        kind: "debt_obligation",
        recordType: "debt_obligation",
        title: "Loan",
        status: "active",
        obligationMode: "balance",
        balance: 10000,
        totalDebt: 10000,
        monthlyPayment: 3000,
        monthly_payment: 3000,
        dueDate: dates.eventDate,
        due_date: dates.eventDate,
        paymentHistory: [
          {
            id: "payment-1",
            amount: 1200,
            dueDate: dates.eventDate,
            due_date: dates.eventDate,
            actualPaymentDate: dates.today,
          },
        ],
      },
      SOURCE_VAULT
    );
    await financeStore.upsertLocalRecord(
      financeStore.LOCAL_FINANCE_STORES.walletTransactions,
      {
        id: "debt-wallet-txn",
        wallet_id: "wallet-1",
        amount: 1200,
        type: "expense",
        date: dates.today,
        source: "local",
      },
      SOURCE_VAULT
    );
    await seedWallet(1800);
    await persistV7Baseline({ cycleStart: dates.cycleStart, cycleEnd: dates.cycleEnd, anchor: 3000 });

    const { before, result } = await transferCurrentState();
    assert.equal(before.remainingPlannedSpending, 1800);
    assert.equal(before.requirements[0].fulfilledAmount, 1200);
    const destinationDebts = await financeStore.getLocalRecordsByUser(
      financeStore.LOCAL_FINANCE_STORES.privatePreferences,
      { localUserId: result.newVaultId, includeDeleted: true }
    );
    const debt = destinationDebts.find((record) => record.recordKind === "debt_obligation");
    assert.equal(debt.paymentHistory.length, 1);
    assert.equal(debt.paymentHistory[0].amount, 1200);
  });

  await t.test("Test H — identical titles with insufficient stable identity fail closed", async () => {
    await resetSourceVault();
    const dates = cycleContext();
    await seedIncomeCycle(dates);
    saveSchedule([
      scheduleEvent({ id: "internet-a", title: "Internet Bill", date: dates.eventDate, amount: 1500 }),
      scheduleEvent({
        id: "internet-b",
        title: "Internet Bill",
        date: financialDay.addFinancialDays(dates.eventDate, 1),
        amount: 2500,
      }),
    ]);
    await seedScheduleFulfillment({
      eventId: "legacy-internet",
      eventDate: dates.today,
      amount: 1500,
      legacy: true,
      title: "Internet Bill",
    });
    await seedWallet(3500);
    await persistV7Baseline({ cycleStart: dates.cycleStart, cycleEnd: dates.cycleEnd, anchor: 4000 });
    const outgoing = await deviceTransfer.createDeviceTransferSnapshot({ user: USER, profile: PROFILE });

    await assert.rejects(
      () => deviceTransfer.importDeviceTransferIntoNewVault(outgoing.snapshot, { user: USER, profile: PROFILE }),
      (error) => {
        assert.equal(error.code, "CLARA_FINANCIAL_MIGRATION_UNRESOLVED");
        assert.ok(
          error.migrationResult.unresolved.some(
            (item) => item.code === "legacy_requirement_identity_unresolved"
          )
        );
        return true;
      }
    );
    assert.equal(localVaultIdentity.getActiveLocalVaultId(), SOURCE_VAULT);
  });

  await t.test("Test I — edited future Money Schedule changes Remaining Plan, never the fixed anchor", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 12000, plan: 9000, anchor: 10000 });
    const { before } = await transferCurrentState();
    assert.equal(before.remainingPlannedSpending, 9000);
    assert.equal(before.cycle100Anchor, 10000);
  });

  await t.test("Test J — previous-cycle history survives but cannot fulfill active cycle", async () => {
    await resetSourceVault();
    const dates = await seedStandardPlan({ wallet: 7000, plan: 3000, anchor: 3000 });
    await seedScheduleFulfillment({
      eventId: "plan-1",
      eventDate: dates.previousDate,
      amount: 3000,
      requirementKey: `money-schedule:plan-1:${dates.eventDate}`,
    });
    await seedWallet(7000);
    const { before } = await transferCurrentState();
    assert.equal(before.remainingPlannedSpending, 3000);
    assert.equal(before.requirements[0].fulfilledAmount, 0);
  });

  await t.test("Test K — existing active-cycle V7 anchor remains exactly fixed", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 8000, plan: 7000, anchor: 12345, fulfilled: 2000 });
    const { before, after } = await transferCurrentState();
    assert.equal(before.remainingPlannedSpending, 5000);
    assert.equal(before.cycle100Anchor, 12345);
    assert.equal(after.cycle100Anchor, 12345);
  });

  await t.test("Test K2 — same-cycle V6 anchor stays unresolved and blocks activation", async () => {
    await resetSourceVault();
    const dates = cycleContext();
    await seedIncomeCycle(dates);
    saveSchedule([scheduleEvent({ id: "legacy-plan", date: dates.eventDate, amount: 7000 })]);
    await seedWallet(10000);
    await persistLegacyV6Baseline({
      cycleStart: dates.cycleStart,
      cycleEnd: dates.cycleEnd,
      requiredRunway: 10000,
    });
    const outgoing = await deviceTransfer.createDeviceTransferSnapshot({ user: USER, profile: PROFILE });
    assert.equal(outgoing.snapshot.financial_context.anchorState, "migration_unresolved");
    assert.equal(outgoing.snapshot.financial_context.cycle100Anchor, 0);

    await assert.rejects(
      () => deviceTransfer.importDeviceTransferIntoNewVault(outgoing.snapshot, { user: USER, profile: PROFILE }),
      (error) => {
        assert.equal(error.code, "CLARA_FINANCIAL_MIGRATION_UNRESOLVED");
        assert.ok(error.migrationResult.unresolved.some((item) => item.code === "unresolved_anchor"));
        return true;
      }
    );
    assert.equal(localVaultIdentity.getActiveLocalVaultId(), SOURCE_VAULT);
  });

  await t.test("Test L — negative Wall Bill and Means are preserved without clamping", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: -2500, plan: 10000, anchor: 10000 });
    const { before } = await transferCurrentState();
    assert.equal(before.availableWalletMoney, -2500);
    assert.equal(before.remainingPlannedSpending, 10000);
    assert.equal(before.wallBill, -12500);
    assert.equal(before.meansScore, -25);
  });

  await t.test("Test M — migrating the already-migrated state again is financially idempotent", async () => {
    await resetSourceVault();
    await seedStandardPlan({ wallet: 1800, plan: 3000, anchor: 3000, fulfilled: 1200 });

    const firstOutgoing = await deviceTransfer.createDeviceTransferSnapshot({ user: USER, profile: PROFILE });
    const firstBefore = firstOutgoing.snapshot.financial_context;
    const first = await deviceTransfer.importDeviceTransferIntoNewVault(firstOutgoing.snapshot, {
      user: USER,
      profile: PROFILE,
    });
    const firstAfter = await migrationAuthority.buildFinancialContextMigrationSnapshot({
      profile: PROFILE,
      vaultId: first.newVaultId,
    });
    const firstCounts = await activeRecordCounts(first.newVaultId);
    assertFinancialTruthEqual(firstBefore, firstAfter);

    const secondOutgoing = await deviceTransfer.createDeviceTransferSnapshot({ user: USER, profile: PROFILE });
    const second = await deviceTransfer.importDeviceTransferIntoNewVault(secondOutgoing.snapshot, {
      user: USER,
      profile: PROFILE,
    });
    const secondAfter = await migrationAuthority.buildFinancialContextMigrationSnapshot({
      profile: PROFILE,
      vaultId: second.newVaultId,
    });
    const secondCounts = await activeRecordCounts(second.newVaultId);

    assertFinancialTruthEqual(firstAfter, secondAfter);
    assert.deepEqual(secondCounts, firstCounts);
    assert.equal(secondAfter.requirements[0].fulfilledAmount, 1200);
    assert.equal(secondAfter.remainingPlannedSpending, 1800);
  });
});

test.after(async () => {
  await financeStore.closeLocalFinanceDb().catch(() => {});
  await vite.close();
});
