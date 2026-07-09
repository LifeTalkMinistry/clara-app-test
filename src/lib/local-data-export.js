const EXPORT_VERSION = 1;
const ACTIVE_LOCAL_VAULT_KEYS = new Set([
  "clara_local_vault_id_v1",
  "clara_active_local_vault_v1",
]);
const CLARA_RESTORE_EVENTS = [
  "clara-local-profile-updated",
  "clara-local-setup-profile-updated",
  "clara:active-local-vault-updated",
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
  /^local_vault/i,
  /^beta/i,
];

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function shouldIncludeStorageKey(key) {
  const normalized = String(key || "").trim();
  if (!normalized) return false;
  return CLARA_KEY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function readStorage(storage) {
  const items = {};
  const skipped = [];

  if (!storage) {
    return { items, skipped };
  }

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!shouldIncludeStorageKey(key)) continue;

    try {
      items[key] = storage.getItem(key);
    } catch (error) {
      skipped.push({ key, reason: error?.message || "Unable to read storage value." });
    }
  }

  return { items, skipped };
}

function readParsedStorage(storage) {
  const { items, skipped } = readStorage(storage);
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

async function readIndexedDbDatabase(databaseInfo) {
  return new Promise((resolve) => {
    const databaseName = databaseInfo?.name;
    if (!databaseName || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(databaseName);

    request.onerror = () => {
      resolve({
        name: databaseName,
        version: databaseInfo?.version || null,
        stores: {},
        error: request.error?.message || "Unable to open IndexedDB database.",
      });
    };

    request.onsuccess = () => {
      const database = request.result;
      const storeNames = Array.from(database.objectStoreNames || []);
      const result = {
        name: database.name,
        version: database.version,
        stores: {},
      };

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
              result.stores[storeName] = getAllRequest.result || [];
              finish();
            };

            getAllRequest.onerror = () => {
              result.stores[storeName] = {
                error: getAllRequest.error?.message || "Unable to read object store.",
              };
              finish();
            };
          } catch (error) {
            result.stores[storeName] = { error: error?.message || "Unable to read object store." };
            finish();
          }
        });
      } catch (error) {
        database.close();
        resolve({
          ...result,
          error: error?.message || "Unable to read IndexedDB database.",
        });
      }
    };
  });
}

async function readIndexedDbExport() {
  if (!isBrowser() || !window.indexedDB || typeof window.indexedDB.databases !== "function") {
    return {
      supported: false,
      databases: [],
      note: "IndexedDB export is not supported by this browser/webview.",
    };
  }

  try {
    const databases = await window.indexedDB.databases();
    const claraDatabases = (databases || []).filter((database) =>
      shouldIncludeStorageKey(database?.name || "")
    );

    const exportedDatabases = await Promise.all(claraDatabases.map(readIndexedDbDatabase));

    return {
      supported: true,
      databases: exportedDatabases.filter(Boolean),
    };
  } catch (error) {
    return {
      supported: true,
      databases: [],
      error: error?.message || "Unable to enumerate IndexedDB databases.",
    };
  }
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

function writeStorageEntries(storage, entries = {}) {
  const restored = [];
  const skipped = [];

  if (!storage) return { restored, skipped };

  sortRestoreEntries(entries).forEach(([key, value]) => {
    if (!shouldIncludeStorageKey(key)) {
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

  const localStorageExport = readParsedStorage(window.localStorage);
  const sessionStorageExport = readParsedStorage(window.sessionStorage);
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
    restore_status: "export-import-v1",
    restore_note:
      "This backup can restore CLARA localStorage and sessionStorage on another device. IndexedDB contents are exported for review and future compatibility.",
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
    (total, database) => total + Object.keys(database?.stores || {}).length,
    0
  );

  return {
    localStorage: localCount,
    sessionStorage: sessionCount,
    indexedDBStores: indexedDbCount,
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
  const localResult = writeStorageEntries(window.localStorage, localEntries);
  const sessionResult = writeStorageEntries(window.sessionStorage, sessionEntries);
  const indexedDbStoreCount = (backup?.data?.indexedDB?.databases || []).reduce(
    (total, database) => total + Object.keys(database?.stores || {}).length,
    0
  );
  const restoreDetail = {
    backupCreatedAt: backup?.created_at || null,
    restoredLocalStorageKeys: localResult.restored,
    restoredSessionStorageKeys: sessionResult.restored,
    indexedDbStoreCount,
  };

  dispatchRestoreEvents(restoreDetail);

  return {
    backup,
    restored: {
      localStorage: localResult.restored,
      sessionStorage: sessionResult.restored,
      indexedDBStores: indexedDbStoreCount,
    },
    skipped: {
      localStorage: localResult.skipped,
      sessionStorage: sessionResult.skipped,
    },
    shouldReload: true,
    note:
      indexedDbStoreCount > 0
        ? "IndexedDB data was detected in the backup but is not written automatically in this version. CLARA local storage was restored and the app should reload to read the transferred vault."
        : "CLARA local storage was restored. Reload the app to read the transferred vault.",
  };
}
