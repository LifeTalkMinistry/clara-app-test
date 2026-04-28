/**
 * CLARA Local Finance Store
 *
 * Phase 2B — Local IndexedDB Foundation Only
 * Phase LOCAL-1 — Dormant Local Multi-Store Transaction Helper
 *
 * This file creates CLARA's dormant local-first IndexedDB foundation for
 * private finance data. It is intentionally not connected to app pages yet.
 *
 * This module does not:
 * - redesign UI
 * - change dashboard behavior
 * - migrate Supabase data
 * - replace Supabase reads/writes
 * - implement Private Sync
 * - implement encryption
 * - implement backup/export/import
 *
 * Architecture reference: docs/clara-data-boundary.md
 */

export const LOCAL_FINANCE_DB_NAME = "clara_local_finance";

// Version 2 safely adds the missing private_preferences store/index contract
// from the earlier partial Phase 2B foundation.
export const LOCAL_FINANCE_SCHEMA_VERSION = 2;

export const LOCAL_FINANCE_STORES = Object.freeze({
  metadata: "metadata",
  expenses: "expenses",
  wallets: "wallets",
  walletTransactions: "wallet_transactions",
  transfers: "transfers",
  budgets: "budgets",
  savingsGoals: "savings_goals",
  emergencyFund: "emergency_fund",
  lifeProfile: "life_profile",
  aiFinancialMemory: "ai_financial_memory",
  privatePreferences: "private_preferences",
});

export const LOCAL_FINANCE_PRIVATE_STORES = Object.freeze([
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.lifeProfile,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
  LOCAL_FINANCE_STORES.privatePreferences,
]);

const REQUIRED_PRIVATE_INDEXES = Object.freeze([
  ["localUserId", "localUserId", { unique: false }],
  ["updatedAt", "updatedAt", { unique: false }],
  ["deletedAt", "deletedAt", { unique: false }],
  ["syncStatus", "syncStatus", { unique: false }],
]);

const METADATA_INDEXES = Object.freeze([
  ["localUserId", "localUserId", { unique: false }],
  ["updatedAt", "updatedAt", { unique: false }],
]);

const STORE_DEFINITIONS = Object.freeze([
  {
    name: LOCAL_FINANCE_STORES.metadata,
    keyPath: "id",
    indexes: METADATA_INDEXES,
  },
  ...LOCAL_FINANCE_PRIVATE_STORES.map((storeName) => ({
    name: storeName,
    keyPath: "id",
    indexes: REQUIRED_PRIVATE_INDEXES,
  })),
]);

let dbPromise = null;

function getIndexedDb() {
  if (typeof globalThis === "undefined" || !globalThis.indexedDB) {
    throw new Error("IndexedDB is not available in this environment.");
  }

  return globalThis.indexedDB;
}

function getIdbKeyRange() {
  if (typeof globalThis === "undefined" || !globalThis.IDBKeyRange) {
    throw new Error("IDBKeyRange is not available in this environment.");
  }

  return globalThis.IDBKeyRange;
}

function normalizeLocalUserId(localUserId) {
  const safeLocalUserId = String(localUserId || "").trim();

  if (!safeLocalUserId) {
    throw new Error(
      "localUserId is required for private local finance data. Refusing to use a guest/global fallback key."
    );
  }

  return safeLocalUserId;
}

function assertKnownStore(storeName) {
  const storeNames = Object.values(LOCAL_FINANCE_STORES);

  if (!storeNames.includes(storeName)) {
    throw new Error(`Unknown CLARA local finance store: ${storeName}`);
  }
}

function assertPrivateStore(storeName) {
  assertKnownStore(storeName);

  if (!LOCAL_FINANCE_PRIVATE_STORES.includes(storeName)) {
    throw new Error(`${storeName} is not a private finance record store.`);
  }
}

function normalizeStoreNames(storeNames) {
  const list = Array.isArray(storeNames) ? storeNames : [storeNames];
  const uniqueStoreNames = [...new Set(list.map((storeName) => String(storeName || "").trim()))];

  if (!uniqueStoreNames.length || uniqueStoreNames.some((storeName) => !storeName)) {
    throw new Error("At least one local finance store name is required.");
  }

  uniqueStoreNames.forEach(assertKnownStore);
  return uniqueStoreNames;
}

function nowIso() {
  return new Date().toISOString();
}

function createLocalRecordId(storeName) {
  const safeStoreName = String(storeName || "record").replace(/[^a-zA-Z0-9_-]/g, "_");

  if (globalThis?.crypto?.randomUUID) {
    return `${safeStoreName}_${globalThis.crypto.randomUUID()}`;
  }

  return `${safeStoreName}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function createIndexIfMissing(store, indexName, keyPath, options) {
  if (!store.indexNames.contains(indexName)) {
    store.createIndex(indexName, keyPath, options);
  }
}

function createOrUpdateStore(db, transaction, definition) {
  const store = db.objectStoreNames.contains(definition.name)
    ? transaction.objectStore(definition.name)
    : db.createObjectStore(definition.name, { keyPath: definition.keyPath });

  definition.indexes.forEach(([indexName, keyPath, options]) => {
    createIndexIfMissing(store, indexName, keyPath, options);
  });
}

function validateDatabaseShape(db) {
  const missingStores = STORE_DEFINITIONS.filter(
    (definition) => !db.objectStoreNames.contains(definition.name)
  ).map((definition) => definition.name);

  if (missingStores.length > 0) {
    throw new Error(
      `CLARA local finance database is missing object stores: ${missingStores.join(", ")}.`
    );
  }
}

function normalizeRecordForWrite(storeName, record, localUserId, existingRecord = null) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);

  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("A local finance record object is required.");
  }

  if (record.localUserId && String(record.localUserId).trim() !== safeLocalUserId) {
    throw new Error("Record localUserId does not match the provided localUserId.");
  }

  if (existingRecord?.localUserId && existingRecord.localUserId !== safeLocalUserId) {
    throw new Error("Cannot update a local finance record owned by another local user.");
  }

  const timestamp = nowIso();
  const id = record.id || existingRecord?.id || createLocalRecordId(storeName);
  const createdAt = record.createdAt || existingRecord?.createdAt || timestamp;
  const updatedAt = timestamp;

  return {
    ...existingRecord,
    ...record,
    id,
    localUserId: safeLocalUserId,
    createdAt,
    updatedAt,
    deletedAt: record.deletedAt ?? existingRecord?.deletedAt ?? null,
    syncStatus: record.syncStatus ?? existingRecord?.syncStatus ?? "local_only",
    source: record.source ?? existingRecord?.source ?? "local",
  };
}

function normalizeDeleteLocalUserId(localUserIdOrOptions) {
  if (
    localUserIdOrOptions &&
    typeof localUserIdOrOptions === "object" &&
    !Array.isArray(localUserIdOrOptions)
  ) {
    return normalizeLocalUserId(localUserIdOrOptions.localUserId);
  }

  return normalizeLocalUserId(localUserIdOrOptions);
}

function deleteRecordsForLocalUser(store, localUserId) {
  const KeyRange = getIdbKeyRange();
  const request = store.index("localUserId").openCursor(KeyRange.only(localUserId));

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(true);
        return;
      }

      cursor.delete();
      cursor.continue();
    };

    request.onerror = () => reject(request.error || new Error("Failed to clear local user vault."));
  });
}

export function openLocalFinanceDb() {
  if (dbPromise) return dbPromise;

  const indexedDb = getIndexedDb();

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDb.open(LOCAL_FINANCE_DB_NAME, LOCAL_FINANCE_SCHEMA_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;

      STORE_DEFINITIONS.forEach((definition) => {
        createOrUpdateStore(db, transaction, definition);
      });
    };

    request.onsuccess = () => {
      try {
        validateDatabaseShape(request.result);
        resolve(request.result);
      } catch (error) {
        request.result.close();
        dbPromise = null;
        reject(error);
      }
    };

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

/**
 * Runs multiple local finance store operations inside one IndexedDB transaction.
 *
 * This is dormant foundation only. It does not connect IndexedDB to live pages.
 *
 * Usage example:
 * await runLocalFinanceTransaction(
 *   [LOCAL_FINANCE_STORES.wallets, LOCAL_FINANCE_STORES.expenses],
 *   localUserId,
 *   async ({ get, put }) => {
 *     const wallet = await get(LOCAL_FINANCE_STORES.wallets, walletId);
 *     await put(LOCAL_FINANCE_STORES.wallets, { ...wallet, balance: wallet.balance - 100 });
 *   }
 * );
 */
export async function runLocalFinanceTransaction(
  storeNames,
  localUserId,
  callback,
  options = {}
) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const safeStoreNames = normalizeStoreNames(storeNames);
  const mode = options.mode === "readonly" ? "readonly" : "readwrite";

  if (typeof callback !== "function") {
    throw new Error("A local finance transaction callback is required.");
  }

  const db = await openLocalFinanceDb();
  const transaction = db.transaction(safeStoreNames, mode);
  const transactionDone = transactionToPromise(transaction);

  const getStore = (storeName) => {
    assertKnownStore(storeName);

    if (!safeStoreNames.includes(storeName)) {
      throw new Error(
        `Store ${storeName} was not included in this local finance transaction.`
      );
    }

    return transaction.objectStore(storeName);
  };

  const helpers = {
    localUserId: safeLocalUserId,
    transaction,
    storeNames: safeStoreNames,

    store(storeName) {
      return getStore(storeName);
    },

    async get(storeName, id) {
      if (!id) return null;
      const record = await requestToPromise(getStore(storeName).get(id));

      if (!record || record.localUserId !== safeLocalUserId || record.deletedAt) {
        return null;
      }

      return record;
    },

    async getAny(storeName, id) {
      if (!id) return null;
      return requestToPromise(getStore(storeName).get(id));
    },

    async getAllForUser(storeName, includeDeleted = false) {
      const records = await requestToPromise(
        getStore(storeName).index("localUserId").getAll(safeLocalUserId)
      );

      return includeDeleted ? records || [] : (records || []).filter((record) => !record.deletedAt);
    },

    async put(storeName, record, existingRecord = null) {
      assertPrivateStore(storeName);
      const normalizedRecord = normalizeRecordForWrite(
        storeName,
        record,
        safeLocalUserId,
        existingRecord
      );

      getStore(storeName).put(normalizedRecord);
      return normalizedRecord;
    },

    async putRaw(storeName, record) {
      assertKnownStore(storeName);

      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error("A local finance record object is required.");
      }

      getStore(storeName).put(record);
      return record;
    },

    async softDelete(storeName, id, patch = {}) {
      assertPrivateStore(storeName);

      if (!id) {
        throw new Error("Record id is required.");
      }

      const existingRecord = await requestToPromise(getStore(storeName).get(id));

      if (!existingRecord || existingRecord.localUserId !== safeLocalUserId) {
        return null;
      }

      const timestamp = nowIso();
      const deletedRecord = {
        ...existingRecord,
        ...patch,
        id: existingRecord.id,
        localUserId: safeLocalUserId,
        deletedAt: patch.deletedAt || timestamp,
        updatedAt: patch.updatedAt || timestamp,
        syncStatus:
          patch.syncStatus ||
          (existingRecord.syncStatus === "synced" ? "pending_delete" : "local_deleted"),
        source: patch.source || existingRecord.source || "local",
      };

      getStore(storeName).put(deletedRecord);
      return deletedRecord;
    },

    async delete(storeName, id) {
      assertPrivateStore(storeName);

      if (!id) {
        throw new Error("Record id is required.");
      }

      const existingRecord = await requestToPromise(getStore(storeName).get(id));

      if (!existingRecord || existingRecord.localUserId !== safeLocalUserId) {
        return false;
      }

      getStore(storeName).delete(id);
      return true;
    },

    makeRecord(storeName, record, existingRecord = null) {
      return normalizeRecordForWrite(storeName, record, safeLocalUserId, existingRecord);
    },

    createId(storeName) {
      assertKnownStore(storeName);
      return createLocalRecordId(storeName);
    },

    nowIso,
  };

  try {
    const result = await callback(helpers);
    await transactionDone;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // Transaction may already be completed or aborted.
    }

    throw error;
  }
}

export async function getLocalRecords(storeName, localUserId) {
  assertPrivateStore(storeName);
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const records = await requestToPromise(store.index("localUserId").getAll(safeLocalUserId));

  return (records || []).filter((record) => !record.deletedAt);
}

export async function getLocalRecordById(storeName, id, localUserId) {
  assertPrivateStore(storeName);
  const safeLocalUserId = normalizeLocalUserId(localUserId);

  if (!id) {
    throw new Error("Record id is required.");
  }

  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const record = await requestToPromise(store.get(id));

  if (!record || record.localUserId !== safeLocalUserId || record.deletedAt) {
    return null;
  }

  return record;
}

export async function upsertLocalRecord(storeName, record, localUserId) {
  assertPrivateStore(storeName);
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const existingRecord = record?.id ? await requestToPromise(store.get(record.id)) : null;
  const normalizedRecord = normalizeRecordForWrite(
    storeName,
    record,
    safeLocalUserId,
    existingRecord
  );

  store.put(normalizedRecord);
  await transactionToPromise(transaction);

  return normalizedRecord;
}

export async function softDeleteLocalRecord(storeName, id, localUserId) {
  assertPrivateStore(storeName);
  const safeLocalUserId = normalizeDeleteLocalUserId(localUserId);

  if (!id) {
    throw new Error("Record id is required.");
  }

  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const existingRecord = await requestToPromise(store.get(id));

  if (!existingRecord || existingRecord.localUserId !== safeLocalUserId) {
    await transactionToPromise(transaction);
    return null;
  }

  const timestamp = nowIso();
  const deletedRecord = {
    ...existingRecord,
    deletedAt: timestamp,
    updatedAt: timestamp,
    syncStatus: existingRecord.syncStatus === "synced" ? "pending_delete" : "local_deleted",
    source: existingRecord.source || "local",
  };

  store.put(deletedRecord);
  await transactionToPromise(transaction);

  return deletedRecord;
}

export async function hardDeleteLocalRecord(storeName, id, localUserId) {
  assertPrivateStore(storeName);
  const safeLocalUserId = normalizeDeleteLocalUserId(localUserId);

  if (!id) {
    throw new Error("Record id is required.");
  }

  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const existingRecord = await requestToPromise(store.get(id));

  if (!existingRecord || existingRecord.localUserId !== safeLocalUserId) {
    await transactionToPromise(transaction);
    return false;
  }

  store.delete(id);
  await transactionToPromise(transaction);

  return true;
}

export async function clearLocalUserVault(localUserId) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const db = await openLocalFinanceDb();
  const storeNames = [LOCAL_FINANCE_STORES.metadata, ...LOCAL_FINANCE_PRIVATE_STORES];
  const transaction = db.transaction(storeNames, "readwrite");

  await Promise.all(
    storeNames.map((storeName) => {
      const store = transaction.objectStore(storeName);
      return deleteRecordsForLocalUser(store, safeLocalUserId);
    })
  );

  await transactionToPromise(transaction);

  return true;
}

export async function getLocalMetadata(localUserId) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_STORES.metadata, "readonly");
  const store = transaction.objectStore(LOCAL_FINANCE_STORES.metadata);

  return requestToPromise(store.get(`metadata:${safeLocalUserId}`));
}

export async function setLocalMetadata(localUserId, metadata) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Metadata must be an object.");
  }

  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_STORES.metadata, "readwrite");
  const store = transaction.objectStore(LOCAL_FINANCE_STORES.metadata);
  const existingMetadata = await requestToPromise(store.get(`metadata:${safeLocalUserId}`));
  const timestamp = nowIso();
  const metadataRecord = {
    id: `metadata:${safeLocalUserId}`,
    localUserId: safeLocalUserId,
    createdAt: existingMetadata?.createdAt || timestamp,
    updatedAt: timestamp,
    metadata,
  };

  store.put(metadataRecord);
  await transactionToPromise(transaction);

  return metadataRecord;
}

// Compatibility aliases from the earlier partial Phase 2B attempt.
// They remain exported but are not connected to the app yet.
export async function putLocalRecord(storeName, record, options = {}) {
  return upsertLocalRecord(storeName, record, options.localUserId);
}

export async function getLocalRecord(storeName, id, options = {}) {
  const localUserId = options?.localUserId;

  if (localUserId) {
    return getLocalRecordById(storeName, id, localUserId);
  }

  assertPrivateStore(storeName);
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.get(id));
}

export async function getLocalRecordsByUser(storeName, options = {}) {
  const records = await getLocalRecords(storeName, options.localUserId);

  if (options.includeDeleted) {
    assertPrivateStore(storeName);
    const safeLocalUserId = normalizeLocalUserId(options.localUserId);
    const db = await openLocalFinanceDb();
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    return requestToPromise(store.index("localUserId").getAll(safeLocalUserId));
  }

  return records;
}

export async function updateLocalRecord(storeName, id, patch, options = {}) {
  assertPrivateStore(storeName);
  const safeLocalUserId = normalizeLocalUserId(options.localUserId);
  const existingRecord = await getLocalRecordById(storeName, id, safeLocalUserId);

  if (!existingRecord) {
    throw new Error(`Local finance record not found: ${storeName}/${id}`);
  }

  return upsertLocalRecord(storeName, { ...existingRecord, ...patch, id }, safeLocalUserId);
}

export async function initializeLocalFinanceStore(options = {}) {
  const safeLocalUserId = normalizeLocalUserId(options.localUserId);

  await openLocalFinanceDb();

  return setLocalMetadata(safeLocalUserId, {
    dbName: LOCAL_FINANCE_DB_NAME,
    schemaVersion: LOCAL_FINANCE_SCHEMA_VERSION,
    initializedAt: nowIso(),
    stores: Object.values(LOCAL_FINANCE_STORES),
    privateStores: LOCAL_FINANCE_PRIVATE_STORES,
  });
}

export function makeLocalFinanceRecord(record = {}, options = {}) {
  return normalizeRecordForWrite(
    options.storeName || "local_record",
    record,
    options.localUserId || record.localUserId
  );
}
