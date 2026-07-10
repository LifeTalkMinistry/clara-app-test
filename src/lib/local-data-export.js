const EXPORT_VERSION = 1;

export const CLARA_BACKUP_REGISTRY = Object.freeze({
  storage: {
    localStoragePrefixes: [
      "clara_local_vault_id_v1",
      "clara_active_local_vault_v1",
      "clara_settings_",
      "clara_notification_preferences_v1_",
      "clara_notification_settings_",
      "clara_daily_check_in_v1",
      "clara_daily_check_in_v2:",
      "clara_daily_check_in_v3:",
      "clara_daily_check_in_v1_migrated_to",
      "clara_daily_check_in_v3_migrated:",
      "life_profile",
      "ai_financial_memory",
      "money",
      "wallet",
      "budget",
      "expense",
      "transaction",
      "savings",
      "emergency",
      "finance",
      "daily_tip",
      "guide",
      "onboarding",
      "learning_hub",
      "game_progress",
      "clara_game_",
      "clara_guide_",
      "clara_onboarding_",
    ],
    sessionStoragePrefixes: [
      "clara_local_vault_id_v1",
      "clara_active_local_vault_v1",
      "clara_settings_",
      "clara_notification_preferences_v1_",
      "clara_notification_settings_",
      "clara_daily_check_in_v1",
      "clara_daily_check_in_v2:",
      "clara_daily_check_in_v3:",
      "clara_daily_check_in_v1_migrated_to",
      "clara_daily_check_in_v3_migrated:",
      "life_profile",
      "ai_financial_memory",
      "money",
      "wallet",
      "budget",
      "expense",
      "transaction",
      "savings",
      "emergency",
      "finance",
      "daily_tip",
      "guide",
      "onboarding",
      "learning_hub",
      "game_progress",
      "clara_game_",
      "clara_guide_",
      "clara_onboarding_",
    ],
  },
  indexedDB: {
    restoreOrder: ["clara_local_finance", "clara_local_notifications"],
    databases: {
      clara_local_finance: {
        name: "clara_local_finance",
        version: 3,
        stores: {
          metadata: {
            keyPath: "id",
            indexes: [
              ["localUserId", "localUserId", { unique: false }],
              ["updatedAt", "updatedAt", { unique: false }],
            ],
          },
          expenses: { keyPath: "id", private: true },
          wallets: { keyPath: "id", private: true },
          wallet_transactions: { keyPath: "id", private: true },
          transfers: { keyPath: "id", private: true },
          budgets: { keyPath: "id", private: true },
          savings_goals: { keyPath: "id", private: true },
          emergency_fund: { keyPath: "id", private: true },
          life_profile: { keyPath: "id", private: true },
          ai_financial_memory: { keyPath: "id", private: true },
          private_preferences: { keyPath: "id", private: true },
        },
      },
      clara_local_notifications: {
        name: "clara_local_notifications",
        version: 1,
        stores: {
          notifications: {
            keyPath: "id",
            indexes: [
              ["userId", "userId", { unique: false }],
              ["scopeKey", "scopeKey", { unique: true }],
              ["createdAt", "createdAt", { unique: false }],
            ],
          },
        },
      },
    },
  },
});

const PRIVATE_FINANCE_INDEXES = Object.freeze([
  ["localUserId", "localUserId", { unique: false }],
  ["updatedAt", "updatedAt", { unique: false }],
  ["deletedAt", "deletedAt", { unique: false }],
  ["syncStatus", "syncStatus", { unique: false }],
]);

Object.values(CLARA_BACKUP_REGISTRY.indexedDB.databases.clara_local_finance.stores).forEach((store) => {
  if (store.private && !store.indexes) store.indexes = PRIVATE_FINANCE_INDEXES;
});

const ACTIVE_LOCAL_VAULT_KEYS = new Set([
  "clara_local_vault_id_v1",
  "clara_active_local_vault_v1",
]);

const CLARA_RESTORE_EVENTS = [
  "clara:active-local-vault-updated",
  "clara-local-profile-updated",
  "clara-local-setup-profile-updated",
  "clara-local-journey-reset",
  "clara-data-restored",
];

const CLARA_KEY_PATTERNS = [
  /^clara/i,
  /^life_profile/i,
  /^ai_financial_memory/i,
  /^money/i,
  /^wallet/i,
  /^budget/i,
  /^expense/i,
  /^transaction/i,
  /^savings/i,
  /^emergency/i,
  /^daily_tip/i,
  /^guide/i,
  /^onboarding/i,
  /^learning_hub/i,
  /^game_progress/i,
  /^local_vault/i,
  /^beta/i,
];

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getIndexedDb() {
  return globalThis?.indexedDB || window?.indexedDB || null;
}

function matchesKnownPrefix(key, prefixes) {
  return prefixes.some((prefix) => String(key || "").startsWith(prefix));
}

function shouldIncludeStorageKey(key, storageType = "localStorage") {
  const normalized = String(key || "").trim();
  if (!normalized) return false;
  const registryPrefixes =
    storageType === "sessionStorage"
      ? CLARA_BACKUP_REGISTRY.storage.sessionStoragePrefixes
      : CLARA_BACKUP_REGISTRY.storage.localStoragePrefixes;
  return matchesKnownPrefix(normalized, registryPrefixes) || CLARA_KEY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function readStorage(storage, storageType) {
  const items = {};
  const skipped = [];

  if (!storage) {
    return { items, skipped };
  }

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!shouldIncludeStorageKey(key, storageType)) continue;

    try {
      items[key] = storage.getItem(key);
    } catch (error) {
      skipped.push({ key, reason: error?.message || "Unable to read storage value." });
    }
  }

  return { items, skipped };
}

function readParsedStorage(storage, storageType) {
  const { items, skipped } = readStorage(storage, storageType);
  const parsed = {};

  Object.entries(items).forEach(([key, value]) => {
    try {
      parsed[key] = JSON.parse(value);
    } catch {
      parsed[key] = value;
    }
  });

  return { items, parsed, skipped };
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
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function normalizeStoreBackup(storeBackup) {
  if (Array.isArray(storeBackup)) return storeBackup;
  if (Array.isArray(storeBackup?.records)) return storeBackup.records;
  return [];
}

function createIndexIfMissing(store, indexName, keyPath, options) {
  if (!store.indexNames.contains(indexName)) {
    store.createIndex(indexName, keyPath, options);
  }
}

function createKnownSchema(db, transaction, definition) {
  Object.entries(definition.stores).forEach(([storeName, storeDefinition]) => {
    const store = db.objectStoreNames.contains(storeName)
      ? transaction.objectStore(storeName)
      : db.createObjectStore(storeName, { keyPath: storeDefinition.keyPath || "id" });

    (storeDefinition.indexes || []).forEach(([indexName, keyPath, options]) => {
      createIndexIfMissing(store, indexName, keyPath, options);
    });
  });
}

async function openKnownIndexedDbDatabase(definition) {
  const indexedDb = getIndexedDb();
  if (!indexedDb) throw new Error("IndexedDB is not available.");

  return new Promise((resolve, reject) => {
    const request = indexedDb.open(definition.name, definition.version);

    request.onupgradeneeded = () => {
      createKnownSchema(request.result, request.transaction, definition);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Unable to open ${definition.name}.`));
    request.onblocked = () => reject(new Error(`${definition.name} restore is blocked by another open tab.`));
  });
}

async function readIndexedDbDatabase(databaseInfo, preferredStores = null) {
  const databaseName = databaseInfo?.name;
  const indexedDb = getIndexedDb();
  if (!databaseName || !indexedDb) return null;

  return new Promise((resolve) => {
    const request = indexedDb.open(databaseName);

    request.onerror = () => {
      resolve({
        name: databaseName,
        version: databaseInfo?.version || null,
        stores: {},
        recordCounts: {},
        errors: [request.error?.message || "Unable to open IndexedDB database."],
      });
    };

    request.onsuccess = () => {
      const database = request.result;
      const actualStores = Array.from(database.objectStoreNames || []);
      const requestedStores = Array.isArray(preferredStores) && preferredStores.length ? preferredStores : actualStores;
      const storeNames = requestedStores.filter((storeName) => actualStores.includes(storeName));
      const result = {
        name: database.name,
        version: database.version,
        stores: {},
        recordCounts: {},
        errors: [],
      };

      const missingStores = requestedStores.filter((storeName) => !actualStores.includes(storeName));
      missingStores.forEach((storeName) => {
        result.stores[storeName] = { records: [], count: 0, error: "Object store does not exist." };
        result.recordCounts[storeName] = 0;
      });

      if (storeNames.length === 0) {
        database.close();
        resolve(result);
        return;
      }

      let remaining = storeNames.length;
      const finish = () => {
        remaining -= 1;
        if (remaining === 0) {
          database.close();
          resolve(result);
        }
      };

      try {
        const transaction = database.transaction(storeNames, "readonly");

        storeNames.forEach((storeName) => {
          try {
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
              const records = getAllRequest.result || [];
              result.stores[storeName] = { records, count: records.length };
              result.recordCounts[storeName] = records.length;
              finish();
            };

            getAllRequest.onerror = () => {
              result.stores[storeName] = {
                records: [],
                count: 0,
                error: getAllRequest.error?.message || "Unable to read object store.",
              };
              result.recordCounts[storeName] = 0;
              result.errors.push(`${storeName}: ${result.stores[storeName].error}`);
              finish();
            };
          } catch (error) {
            result.stores[storeName] = { records: [], count: 0, error: error?.message || "Unable to read object store." };
            result.recordCounts[storeName] = 0;
            result.errors.push(`${storeName}: ${result.stores[storeName].error}`);
            finish();
          }
        });
      } catch (error) {
        database.close();
        resolve({
          ...result,
          error: error?.message || "Unable to read IndexedDB database.",
          errors: [...result.errors, error?.message || "Unable to read IndexedDB database."],
        });
      }
    };
  });
}

function knownIndexedDbDatabaseInfos() {
  return Object.values(CLARA_BACKUP_REGISTRY.indexedDB.databases).map((definition) => ({
    name: definition.name,
    version: definition.version,
    known: true,
  }));
}

async function readIndexedDbExport() {
  if (!isBrowser() || !getIndexedDb()) {
    return {
      supported: false,
      databases: [],
      note: "IndexedDB export is not supported by this browser/webview.",
    };
  }

  const indexedDb = getIndexedDb();
  const databaseMap = new Map();
  const errors = [];
  let enumerationSupported = typeof indexedDb.databases === "function";

  if (enumerationSupported) {
    try {
      const databases = await indexedDb.databases();
      (databases || [])
        .filter((database) => shouldIncludeStorageKey(database?.name || ""))
        .forEach((database) => databaseMap.set(database.name, database));
    } catch (error) {
      errors.push(error?.message || "Unable to enumerate IndexedDB databases.");
      enumerationSupported = false;
    }
  }

  knownIndexedDbDatabaseInfos().forEach((databaseInfo) => {
    if (!databaseMap.has(databaseInfo.name)) databaseMap.set(databaseInfo.name, databaseInfo);
  });

  const exportedDatabases = [];
  for (const databaseInfo of databaseMap.values()) {
    const knownDefinition = CLARA_BACKUP_REGISTRY.indexedDB.databases[databaseInfo.name];
    const preferredStores = knownDefinition ? Object.keys(knownDefinition.stores) : null;
    const exported = await readIndexedDbDatabase(databaseInfo, preferredStores);
    if (exported) exportedDatabases.push(exported);
  }

  return {
    supported: true,
    enumerationSupported,
    databases: exportedDatabases,
    errors,
  };
}

function buildFileName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `clara-local-backup-${timestamp}.json`;
}

function toStorageValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function validateBackup(backup) {
  if (!backup || typeof backup !== "object") {
    throw new Error("This is not a valid CLARA backup file.");
  }

  if (backup.app !== "CLARA" || backup.type !== "local-device-transfer-backup") {
    throw new Error("This file is not a CLARA device transfer backup.");
  }

  if (Number(backup.version || 0) > EXPORT_VERSION) {
    throw new Error("This backup was created by a newer CLARA version. Please update the app first.");
  }
}

function getBackupStorageEntries(backup, storageKey) {
  const rawEntries = backup?.raw?.[storageKey];
  if (rawEntries && typeof rawEntries === "object") return rawEntries;

  const parsedEntries = backup?.data?.[storageKey];
  if (parsedEntries && typeof parsedEntries === "object") return parsedEntries;

  return {};
}

function sortRestoreEntries(entries = {}) {
  return Object.entries(entries).sort(([keyA], [keyB]) => {
    const aIsVaultKey = ACTIVE_LOCAL_VAULT_KEYS.has(keyA);
    const bIsVaultKey = ACTIVE_LOCAL_VAULT_KEYS.has(keyB);
    if (aIsVaultKey && !bIsVaultKey) return -1;
    if (!aIsVaultKey && bIsVaultKey) return 1;
    return keyA.localeCompare(keyB);
  });
}

function writeStorageEntries(storage, entries = {}, storageType) {
  const restored = [];
  const skipped = [];

  if (!storage) return { restored, skipped };

  sortRestoreEntries(entries).forEach(([key, value]) => {
    if (!shouldIncludeStorageKey(key, storageType)) {
      skipped.push({ key, reason: "Skipped because this key is outside CLARA backup scope." });
      return;
    }

    try {
      storage.setItem(key, toStorageValue(value));
      restored.push(key);
    } catch (error) {
      skipped.push({ key, reason: error?.message || "Unable to write storage value." });
    }
  });

  return { restored, skipped };
}

function getBackupIndexedDbDatabases(backup) {
  const databases = backup?.data?.indexedDB?.databases;
  return Array.isArray(databases) ? databases : [];
}

function getIndexedDbRestoreDatabases(backup) {
  const backupDatabases = getBackupIndexedDbDatabases(backup);
  const byName = new Map();
  backupDatabases.forEach((database) => {
    if (database?.name) byName.set(database.name, database);
  });

  return CLARA_BACKUP_REGISTRY.indexedDB.restoreOrder
    .map((name) => byName.get(name))
    .filter(Boolean);
}

async function restoreIndexedDbStore(database, databaseDefinition, storeName, storeBackup) {
  const storeDefinition = databaseDefinition.stores[storeName];
  if (!storeDefinition) {
    return { restored: 0, skipped: normalizeStoreBackup(storeBackup).length, errors: [], skippedStores: [storeName] };
  }

  if (!database.objectStoreNames.contains(storeName)) {
    return { restored: 0, skipped: normalizeStoreBackup(storeBackup).length, errors: [`${storeName} does not exist after schema open.`], skippedStores: [storeName] };
  }

  const records = normalizeStoreBackup(storeBackup);
  if (!records.length) return { restored: 0, skipped: 0, errors: [], skippedStores: [] };

  let restored = 0;
  let skipped = 0;
  const errors = [];
  const transaction = database.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);

  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      skipped += 1;
      errors.push(`${storeName}[${index}] skipped because it is not a record object.`);
      return;
    }

    const keyPath = storeDefinition.keyPath || "id";
    if (!record[keyPath]) {
      skipped += 1;
      errors.push(`${storeName}[${index}] skipped because it is missing ${keyPath}.`);
      return;
    }

    try {
      store.put(record);
      restored += 1;
    } catch (error) {
      skipped += 1;
      errors.push(`${storeName}[${index}]: ${error?.message || "Unable to queue record restore."}`);
    }
  });

  try {
    await transactionToPromise(transaction);
  } catch (error) {
    errors.push(error?.message || `Unable to restore ${storeName}.`);
  }

  return { restored, skipped, errors, skippedStores: [] };
}

async function restoreIndexedDbBackup(backup) {
  const summary = {
    supported: Boolean(getIndexedDb()),
    restoredDatabases: 0,
    restoredStores: 0,
    restoredRecords: 0,
    skippedStores: [],
    skippedRecords: 0,
    errors: [],
  };

  if (!summary.supported) {
    summary.errors.push("IndexedDB is not available in this browser/webview.");
    return summary;
  }

  const restoreDatabases = getIndexedDbRestoreDatabases(backup);

  for (const backupDatabase of restoreDatabases) {
    const databaseDefinition = CLARA_BACKUP_REGISTRY.indexedDB.databases[backupDatabase.name];
    if (!databaseDefinition) {
      summary.skippedStores.push(`${backupDatabase.name}: unknown database`);
      continue;
    }

    let database = null;
    try {
      database = await openKnownIndexedDbDatabase(databaseDefinition);
      summary.restoredDatabases += 1;

      for (const [storeName, storeBackup] of Object.entries(backupDatabase.stores || {})) {
        const storeResult = await restoreIndexedDbStore(database, databaseDefinition, storeName, storeBackup);
        if (storeResult.restored > 0) summary.restoredStores += 1;
        summary.restoredRecords += storeResult.restored;
        summary.skippedRecords += storeResult.skipped;
        summary.skippedStores.push(...storeResult.skippedStores.map((name) => `${backupDatabase.name}.${name}`));
        summary.errors.push(...storeResult.errors.map((message) => `${backupDatabase.name}.${message}`));
      }
    } catch (error) {
      summary.errors.push(`${backupDatabase.name}: ${error?.message || "Unable to restore database."}`);
    } finally {
      try {
        database?.close();
      } catch {
        // Ignore close failures.
      }
    }
  }

  return summary;
}

function dispatchRestoreEvents(detail = {}) {
  if (!isBrowser()) return;

  CLARA_RESTORE_EVENTS.forEach((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}

export async function buildClaraLocalDataExport({ user = null, profile = null } = {}) {
  if (!isBrowser()) {
    throw new Error("CLARA data export can only run inside the app.");
  }

  const localStorageExport = readParsedStorage(window.localStorage, "localStorage");
  const sessionStorageExport = readParsedStorage(window.sessionStorage, "sessionStorage");
  const indexedDbExport = await readIndexedDbExport();

  return {
    app: "CLARA",
    type: "local-device-transfer-backup",
    version: EXPORT_VERSION,
    created_at: new Date().toISOString(),
    source: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      user_agent: window.navigator?.userAgent || "",
    },
    account_hint: user
      ? {
          id: user.id || null,
          email: user.email || null,
        }
      : null,
    profile_hint: profile
      ? {
          id: profile.id || null,
          role: profile.role || null,
          plan: profile.plan || null,
          display_name: profile.display_name || profile.full_name || null,
        }
      : null,
    registry: CLARA_BACKUP_REGISTRY,
    data: {
      localStorage: localStorageExport.parsed,
      sessionStorage: sessionStorageExport.parsed,
      indexedDB: indexedDbExport,
    },
    raw: {
      localStorage: localStorageExport.items,
      sessionStorage: sessionStorageExport.items,
    },
    skipped: {
      localStorage: localStorageExport.skipped,
      sessionStorage: sessionStorageExport.skipped,
    },
    restore_status: "export-import-v1-indexeddb-restore-ready",
    restore_note:
      "This backup can restore CLARA localStorage, sessionStorage, and supported CLARA IndexedDB databases on another device.",
  };
}

export async function downloadClaraLocalDataExport(context = {}) {
  const backup = await buildClaraLocalDataExport(context);
  const fileName = buildFileName();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return {
    fileName,
    backup,
  };
}

export function countExportedItems(backup) {
  const localCount = Object.keys(backup?.data?.localStorage || {}).length;
  const sessionCount = Object.keys(backup?.data?.sessionStorage || {}).length;
  const indexedDbCount = (backup?.data?.indexedDB?.databases || []).reduce(
    (total, database) =>
      total +
      Object.values(database?.stores || {}).reduce(
        (storeTotal, storeBackup) => storeTotal + normalizeStoreBackup(storeBackup).length,
        0
      ),
    0
  );

  return {
    localStorage: localCount,
    sessionStorage: sessionCount,
    indexedDBRecords: indexedDbCount,
    total: localCount + sessionCount + indexedDbCount,
  };
}

export async function readClaraBackupFile(file) {
  if (!file) throw new Error("No backup file selected.");
  const text = await file.text();

  try {
    const backup = JSON.parse(text);
    validateBackup(backup);
    return backup;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("This backup file is not valid JSON.");
    }
    throw error;
  }
}

export async function restoreClaraLocalDataFromFile(file) {
  if (!isBrowser()) {
    throw new Error("CLARA backup upload can only run inside the app.");
  }

  const backup = await readClaraBackupFile(file);
  const localEntries = getBackupStorageEntries(backup, "localStorage");
  const sessionEntries = getBackupStorageEntries(backup, "sessionStorage");
  const localResult = writeStorageEntries(window.localStorage, localEntries, "localStorage");
  const sessionResult = writeStorageEntries(window.sessionStorage, sessionEntries, "sessionStorage");
  const indexedDbResult = await restoreIndexedDbBackup(backup);

  const restoreDetail = {
    backupCreatedAt: backup?.created_at || null,
    restoredLocalStorageKeys: localResult.restored,
    restoredSessionStorageKeys: sessionResult.restored,
    indexedDB: indexedDbResult,
  };

  dispatchRestoreEvents(restoreDetail);

  const restoredSummary = {
    localStorage: localResult.restored,
    sessionStorage: sessionResult.restored,
    indexedDBDatabases: indexedDbResult.restoredDatabases,
    indexedDBStores: indexedDbResult.restoredStores,
    indexedDBRecords: indexedDbResult.restoredRecords,
  };

  const totalApplied =
    restoredSummary.localStorage.length +
    restoredSummary.sessionStorage.length +
    restoredSummary.indexedDBRecords;

  return {
    backup,
    restored: restoredSummary,
    skipped: {
      localStorage: localResult.skipped,
      sessionStorage: sessionResult.skipped,
      indexedDBStores: indexedDbResult.skippedStores,
      indexedDBRecords: indexedDbResult.skippedRecords,
    },
    errors: indexedDbResult.errors,
    shouldReload: true,
    summary: {
      restoredLocalStorageKeys: localResult.restored.length,
      restoredSessionStorageKeys: sessionResult.restored.length,
      restoredIndexedDBDatabases: indexedDbResult.restoredDatabases,
      restoredIndexedDBObjectStores: indexedDbResult.restoredStores,
      restoredIndexedDBRecords: indexedDbResult.restoredRecords,
      skippedStores: indexedDbResult.skippedStores,
      skippedRecords: indexedDbResult.skippedRecords,
      restoreErrors: indexedDbResult.errors,
      totalApplied,
    },
    note:
      indexedDbResult.errors.length > 0
        ? `CLARA restored ${totalApplied} local item${totalApplied === 1 ? "" : "s"}, but some IndexedDB records need review.`
        : `CLARA restored ${totalApplied} local item${totalApplied === 1 ? "" : "s"}. Reload CLARA to read the restored local vault, finance records, settings, check-ins, and notifications.`,
  };
}
