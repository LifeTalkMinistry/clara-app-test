import test from "node:test";
import assert from "node:assert/strict";

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
  clear() {
    this.values.clear();
  }
}

class NameList {
  constructor(values = []) {
    this.values = values;
  }
  contains(name) {
    return this.values.includes(name);
  }
  add(name) {
    if (!this.contains(name)) this.values.push(name);
  }
  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }
}

class FakeObjectStore {
  constructor(definition) {
    this.keyPath = definition.keyPath || "id";
    this.records = definition.records || new Map();
    this.indexNames = new NameList(definition.indexes || []);
  }
  createIndex(name) {
    this.indexNames.add(name);
  }
  put(record) {
    this.records.set(record[this.keyPath], structuredClone(record));
  }
  getAll() {
    const request = {};
    setTimeout(() => {
      request.result = [...this.records.values()].map((record) => structuredClone(record));
      request.onsuccess?.();
    }, 0);
    return request;
  }
}

class FakeDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.stores = new Map();
    this.objectStoreNames = new NameList();
  }
  createObjectStore(name, options = {}) {
    const store = new FakeObjectStore({ keyPath: options.keyPath || "id" });
    this.stores.set(name, store);
    this.objectStoreNames.add(name);
    return store;
  }
  transaction(storeNames) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = {
      objectStore: (name) => this.stores.get(name),
    };
    setTimeout(() => transaction.oncomplete?.(), 0);
    names.forEach((name) => {
      if (!this.stores.has(name)) throw new Error(`Missing store ${name}`);
    });
    return transaction;
  }
  close() {}
}

class FakeIndexedDB {
  constructor({ supportDatabases = true } = {}) {
    this.dbs = new Map();
    if (supportDatabases) {
      this.databases = async () => [...this.dbs.values()].map((db) => ({ name: db.name, version: db.version }));
    }
  }
  open(name, version) {
    const request = {};
    setTimeout(() => {
      let db = this.dbs.get(name);
      const needsUpgrade = !db || (version && version > db.version);
      if (!db) {
        db = new FakeDatabase(name, version || 1);
        this.dbs.set(name, db);
      } else if (version && version > db.version) {
        db.version = version;
      }
      request.result = db;
      request.transaction = {
        objectStore: (storeName) => db.stores.get(storeName),
      };
      if (needsUpgrade) request.onupgradeneeded?.();
      request.onsuccess?.();
    }, 0);
    return request;
  }
}

function installBrowser({ indexedDB = new FakeIndexedDB() } = {}) {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const events = [];
  globalThis.indexedDB = indexedDB;
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  globalThis.document = { body: { appendChild() {} }, createElement: () => ({ click() {}, remove() {} }) };
  globalThis.window = {
    indexedDB,
    localStorage,
    sessionStorage,
    location: { origin: "https://example.test", pathname: "/clara-app-test/" },
    navigator: { userAgent: "node-test" },
    dispatchEvent: (event) => events.push(event.type),
  };
  return { localStorage, sessionStorage, events, indexedDB };
}

function backupFile(backup) {
  return { text: async () => JSON.stringify(backup) };
}

async function loadModule() {
  return import(`../src/lib/local-data-export.js?cache=${Date.now()}-${Math.random()}`);
}

function makeBackup() {
  return {
    app: "CLARA",
    type: "local-device-transfer-backup",
    version: 1,
    created_at: "2026-07-10T00:00:00.000Z",
    raw: {
      localStorage: {
        clara_local_vault_id_v1: "vault-a",
        clara_active_local_vault_v1: "vault-a",
        "clara_daily_check_in_v3:vault-a": JSON.stringify({ streak: 7 }),
      },
      sessionStorage: {
        clara_settings_session_test: JSON.stringify({ open: true }),
      },
    },
    data: {
      indexedDB: {
        databases: [
          {
            name: "clara_local_finance",
            version: 3,
            stores: {
              wallets: {
                records: [
                  {
                    id: "wallet-1",
                    localUserId: "vault-a",
                    name: "Cash",
                    balance: 500,
                    createdAt: "2026-07-01T00:00:00.000Z",
                    updatedAt: "2026-07-02T00:00:00.000Z",
                    deletedAt: null,
                    syncStatus: "local_only",
                  },
                ],
              },
              expenses: [
                {
                  id: "expense-1",
                  localUserId: "vault-a",
                  amount: 75,
                  createdAt: "2026-07-03T00:00:00.000Z",
                  updatedAt: "2026-07-03T00:00:00.000Z",
                  deletedAt: "2026-07-04T00:00:00.000Z",
                  syncStatus: "local_deleted",
                },
              ],
            },
          },
          {
            name: "clara_local_notifications",
            version: 1,
            stores: {
              notifications: {
                records: [
                  {
                    id: "notification-1",
                    userId: "user-1",
                    dedupeKey: "daily:test",
                    scopeKey: "user-1:daily:test",
                    createdAt: "2026-07-05T00:00:00.000Z",
                    readAt: null,
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };
}

test("restore imports localStorage, sessionStorage, finance IndexedDB, and notifications", async () => {
  const browser = installBrowser();
  const { restoreClaraLocalDataFromFile } = await loadModule();

  const result = await restoreClaraLocalDataFromFile(backupFile(makeBackup()));

  assert.equal(browser.localStorage.getItem("clara_local_vault_id_v1"), "vault-a");
  assert.equal(browser.localStorage.getItem("clara_active_local_vault_v1"), "vault-a");
  assert.equal(browser.sessionStorage.getItem("clara_settings_session_test"), JSON.stringify({ open: true }));
  assert.equal(result.shouldReload, true);
  assert.equal(result.summary.restoredIndexedDBDatabases, 2);
  assert.equal(result.summary.restoredIndexedDBRecords, 3);
  assert.ok(browser.events.includes("clara:active-local-vault-updated"));
  assert.ok(browser.events.includes("clara-data-restored"));

  const finance = browser.indexedDB.dbs.get("clara_local_finance");
  assert.equal(finance.stores.get("wallets").records.get("wallet-1").localUserId, "vault-a");
  assert.equal(finance.stores.get("expenses").records.get("expense-1").deletedAt, "2026-07-04T00:00:00.000Z");
  assert.equal(finance.stores.get("expenses").records.get("expense-1").syncStatus, "local_deleted");

  const notifications = browser.indexedDB.dbs.get("clara_local_notifications");
  assert.equal(notifications.stores.get("notifications").records.get("notification-1").scopeKey, "user-1:daily:test");
});

test("known IndexedDB databases export even when indexedDB.databases is unavailable", async () => {
  const browser = installBrowser({ indexedDB: new FakeIndexedDB({ supportDatabases: false }) });
  const { restoreClaraLocalDataFromFile, buildClaraLocalDataExport } = await loadModule();

  await restoreClaraLocalDataFromFile(backupFile(makeBackup()));
  const backup = await buildClaraLocalDataExport();
  const names = backup.data.indexedDB.databases.map((database) => database.name);

  assert.ok(names.includes("clara_local_finance"));
  assert.ok(names.includes("clara_local_notifications"));
  const finance = backup.data.indexedDB.databases.find((database) => database.name === "clara_local_finance");
  assert.equal(finance.recordCounts.wallets, 1);
});

test("version 1 backup without IndexedDB remains accepted", async () => {
  installBrowser();
  const { restoreClaraLocalDataFromFile } = await loadModule();
  const result = await restoreClaraLocalDataFromFile(
    backupFile({
      app: "CLARA",
      type: "local-device-transfer-backup",
      version: 1,
      raw: { localStorage: { clara_settings_test: "yes" }, sessionStorage: {} },
      data: {},
    })
  );

  assert.equal(result.summary.restoredLocalStorageKeys, 1);
  assert.equal(result.summary.restoredIndexedDBRecords, 0);
});
