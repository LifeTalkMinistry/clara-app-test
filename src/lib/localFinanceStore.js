/**
 * CLARA Local Finance Store
 *
 * Phase 2 foundation only.
 * This file creates the local-first IndexedDB boundary for private finance data.
 * It does not migrate existing Supabase data, does not enable sync, and does not
 * replace any current app read/write behavior yet.
 */

export const LOCAL_FINANCE_DB_NAME = "clara_local_finance";
export const LOCAL_FINANCE_SCHEMA_VERSION = 1;

export const LOCAL_FIRST_PRIVATE_DATA_TYPES = Object.freeze([
  "expenses",
  "wallets",
  "wallet_transactions",
  "transfers",
  "budgets",
  "savings_goals",
  "emergency_fund",
  "survival_expense",
  "life_profile",
  "ai_financial_memory",
  "spending_behavior_patterns",
  "private_preferences",
]);

export const SUPABASE_SERVER_DATA_TYPES = Object.freeze([
  "authentication_account_identity",
  "subscription_tier",
  "google_play_billing_status",
  "activation_status",
  "admin_access",
  "feed_community",
  "messaging",
  "coaching_access",
  "optional_encrypted_backup_package_storage_only",
]);

export const LOCAL_FINANCE_STORES = Object.freeze({
  expenses: "expenses",
  wallets: "wallets",
  walletTransactions: "wallet_transactions",
  transfers: "transfers",
  budgets: "budgets",
  savingsGoals: "savings_goals",
  emergencyFund: "emergency_fund",
  lifeProfile: "life_profile",
  aiFinancialMemory: "ai_financial_memory",
  metadata: "metadata",
});

const SOFT_DELETE_STORES = new Set([
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.lifeProfile,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
]);

const STORE_DEFINITIONS = Object.freeze([
  {
    name: LOCAL_FINANCE_STORES.expenses,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["walletId", "walletId", { unique: false }],
      ["date", "date", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.wallets,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["sortOrder", "sortOrder", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.walletTransactions,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["walletId", "walletId", { unique: false }],
      ["expenseId", "expenseId", { unique: false }],
      ["transferId", "transferId", { unique: false }],
      ["type", "type", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.transfers,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["fromWalletId", "fromWalletId", { unique: false }],
      ["toWalletId", "toWalletId", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.budgets,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["month", "month", { unique: false }],
      ["category", "category", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.savingsGoals,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["walletId", "walletId", { unique: false }],
      ["priority", "priority", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.emergencyFund,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.lifeProfile,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.aiFinancialMemory,
    keyPath: "id",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["memoryType", "memoryType", { unique: false }],
      ["createdAt", "createdAt", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
      ["deletedAt", "deletedAt", { unique: false }],
      ["syncStatus", "syncStatus", { unique: false }],
    ],
  },
  {
    name: LOCAL_FINANCE_STORES.metadata,
    keyPath: "key",
    indexes: [
      ["localUserId", "localUserId", { unique: false }],
      ["updatedAt", "updatedAt", { unique: false }],
    ],
  },
]);

let dbPromise = null;

function assertIndexedDbAvailable() {
  if (typeof window === "undefined" || !window.indexedDB) {
    throw new Error("IndexedDB is not available in this environment.");
  }
}

function normalizeLocalUserId(localUserId) {
  const value = String(localUserId || "").trim();
  if (!value) {
    throw new Error("localUserId is required for local finance data.");
  }
  return value;
}

function createLocalId(prefix = "local") {
  const safePrefix = String(prefix || "local").replace(/[^a-zA-Z0-9_-]/g, "_");
  const randomPart =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  return `${safePrefix}_${randomPart}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toRequestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function toTransactionPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function createMissingStore(db, definition) {
  if (db.objectStoreNames.contains(definition.name)) return null;

  const store = db.createObjectStore(definition.name, {
    keyPath: definition.keyPath,
  });

  definition.indexes.forEach(([indexName, keyPath, options]) => {
    store.createIndex(indexName, keyPath, options);
  });

  return store;
}

function ensureIndexes(store, definition) {
  definition.indexes.forEach(([indexName, keyPath, options]) => {
    if (!store.indexNames.contains(indexName)) {
      store.createIndex(indexName, keyPath, options);
    }
  });
}

export function openLocalFinanceDb() {
  if (dbPromise) return dbPromise;

  assertIndexedDbAvailable();

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      LOCAL_FINANCE_DB_NAME,
      LOCAL_FINANCE_SCHEMA_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      STORE_DEFINITIONS.forEach((definition) => {
        const newStore = createMissingStore(db, definition);
        if (!newStore) {
          const transaction = request.transaction;
          const existingStore = transaction.objectStore(definition.name);
          ensureIndexes(existingStore, definition);
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error("Failed to open CLARA local finance database."));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("CLARA local finance database upgrade is blocked by another open tab."));
    };
  });

  return dbPromise;
}

export async function closeLocalFinanceDb() {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}

function assertKnownStore(storeName) {
  const names = Object.values(LOCAL_FINANCE_STORES);
  if (!names.includes(storeName)) {
    throw new Error(`Unknown local finance store: ${storeName}`);
  }
}

function decorateRecord(record, localUserId, options = {}) {
  const timestamp = nowIso();
  const idPrefix = options.idPrefix || options.storeName || "local";
  const existingCreatedAt = record?.createdAt || record?.created_at;
  const existingUpdatedAt = record?.updatedAt || record?.updated_at;

  return {
    ...record,
    id: record?.id || createLocalId(idPrefix),
    localUserId: normalizeLocalUserId(localUserId),
    createdAt: existingCreatedAt || timestamp,
    updatedAt: existingUpdatedAt || timestamp,
    deletedAt: record?.deletedAt || record?.deleted_at || null,
    isDeleted: Boolean(record?.isDeleted || record?.deletedAt || record?.deleted_at),
    syncStatus: record?.syncStatus || "local_only",
  };
}

export async function putLocalRecord(storeName, record, { localUserId, idPrefix } = {}) {
  assertKnownStore(storeName);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const payload = decorateRecord(record, localUserId, { storeName, idPrefix });

  store.put(payload);
  await toTransactionPromise(transaction);
  return payload;
}

export async function getLocalRecord(storeName, id) {
  assertKnownStore(storeName);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  return toRequestPromise(store.get(id));
}

export async function getLocalRecordsByUser(
  storeName,
  { localUserId, includeDeleted = false } = {}
) {
  assertKnownStore(storeName);
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const index = store.index("localUserId");
  const rows = await toRequestPromise(index.getAll(safeLocalUserId));

  if (includeDeleted) return rows || [];
  return (rows || []).filter((row) => !row?.isDeleted && !row?.deletedAt);
}

export async function softDeleteLocalRecord(storeName, id, { localUserId } = {}) {
  assertKnownStore(storeName);

  if (!SOFT_DELETE_STORES.has(storeName)) {
    throw new Error(`${storeName} does not support soft delete.`);
  }

  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const existing = await toRequestPromise(store.get(id));

  if (!existing) {
    await toTransactionPromise(transaction);
    return null;
  }

  if (localUserId && existing.localUserId !== normalizeLocalUserId(localUserId)) {
    transaction.abort();
    throw new Error("Cannot delete local finance record owned by another local user.");
  }

  const timestamp = nowIso();
  const payload = {
    ...existing,
    isDeleted: true,
    deletedAt: timestamp,
    updatedAt: timestamp,
    syncStatus: existing.syncStatus === "synced" ? "pending_delete" : "local_deleted",
  };

  store.put(payload);
  await toTransactionPromise(transaction);
  return payload;
}

export async function hardDeleteLocalRecord(storeName, id, { localUserId } = {}) {
  assertKnownStore(storeName);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const existing = await toRequestPromise(store.get(id));

  if (!existing) {
    await toTransactionPromise(transaction);
    return false;
  }

  if (localUserId && existing.localUserId !== normalizeLocalUserId(localUserId)) {
    transaction.abort();
    throw new Error("Cannot hard delete local finance record owned by another local user.");
  }

  store.delete(id);
  await toTransactionPromise(transaction);
  return true;
}

export async function updateLocalRecord(storeName, id, patch, { localUserId } = {}) {
  assertKnownStore(storeName);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const existing = await toRequestPromise(store.get(id));

  if (!existing) {
    transaction.abort();
    throw new Error(`Local finance record not found: ${storeName}/${id}`);
  }

  if (localUserId && existing.localUserId !== normalizeLocalUserId(localUserId)) {
    transaction.abort();
    throw new Error("Cannot update local finance record owned by another local user.");
  }

  const timestamp = nowIso();
  const payload = {
    ...existing,
    ...patch,
    id: existing.id,
    localUserId: existing.localUserId,
    createdAt: existing.createdAt,
    updatedAt: timestamp,
    syncStatus: patch?.syncStatus || (existing.syncStatus === "synced" ? "pending_update" : existing.syncStatus || "local_only"),
  };

  store.put(payload);
  await toTransactionPromise(transaction);
  return payload;
}

export async function getLocalMetadata(key, { localUserId } = {}) {
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_STORES.metadata, "readonly");
  const store = transaction.objectStore(LOCAL_FINANCE_STORES.metadata);
  const id = localUserId ? `${normalizeLocalUserId(localUserId)}:${key}` : String(key || "");
  return toRequestPromise(store.get(id));
}

export async function setLocalMetadata(key, value, { localUserId } = {}) {
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_STORES.metadata, "readwrite");
  const store = transaction.objectStore(LOCAL_FINANCE_STORES.metadata);
  const timestamp = nowIso();
  const safeLocalUserId = localUserId ? normalizeLocalUserId(localUserId) : "system";
  const payload = {
    key: `${safeLocalUserId}:${key}`,
    localUserId: safeLocalUserId,
    value,
    updatedAt: timestamp,
  };

  store.put(payload);
  await toTransactionPromise(transaction);
  return payload;
}

export async function initializeLocalFinanceStore({ localUserId } = {}) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  await openLocalFinanceDb();
  await setLocalMetadata("schema", {
    dbName: LOCAL_FINANCE_DB_NAME,
    schemaVersion: LOCAL_FINANCE_SCHEMA_VERSION,
    initializedAt: nowIso(),
    localFirstPrivateDataTypes: LOCAL_FIRST_PRIVATE_DATA_TYPES,
    serverDataTypes: SUPABASE_SERVER_DATA_TYPES,
  }, { localUserId: safeLocalUserId });

  return {
    dbName: LOCAL_FINANCE_DB_NAME,
    schemaVersion: LOCAL_FINANCE_SCHEMA_VERSION,
    localUserId: safeLocalUserId,
    stores: LOCAL_FINANCE_STORES,
  };
}

export function makeLocalFinanceRecord(record, { localUserId, idPrefix } = {}) {
  return decorateRecord(record || {}, localUserId, { idPrefix });
}
