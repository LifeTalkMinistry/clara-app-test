import { ACCOUNT_VAULT_DIRECTORY_KEY } from "./account-vault-directory";
import {
  buildClaraLocalDataExport,
  restoreClaraLocalDataFromFile,
} from "./local-data-export";
import { getActiveLocalVaultId } from "./localVaultIdentity";

export const CLOUD_VAULT_SNAPSHOT_VERSION = 2;
export const CLOUD_VAULT_SNAPSHOT_TYPE = "account-cloud-vault-snapshot";

const DEVICE_ID_KEY = "clara_sync_device_id_v1";
const FORBIDDEN_STORAGE_KEYS = new Set([
  "clara_backend_access_token_v1",
  "clara_backend_user_v1",
  "clara_local_vault_id_v1",
  "clara_active_local_vault_v1",
  ACCOUNT_VAULT_DIRECTORY_KEY,
]);
const SECRET_KEY_PATTERN = /(access[_-]?token|refresh[_-]?token|password|jwt|auth[_-]?session|admin[_-]?session)/i;

const text = (value) => String(value ?? "").trim();

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `clara-device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getClaraSyncDeviceId(storage = globalThis?.localStorage) {
  try {
    const existing = text(storage?.getItem(DEVICE_ID_KEY));
    if (existing) return existing;
    const created = randomId();
    storage?.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}

function getDirectoryMappings(localStorageData = {}) {
  const directory = localStorageData?.[ACCOUNT_VAULT_DIRECTORY_KEY];
  if (!directory || typeof directory !== "object") return [];
  return Object.values(directory.accounts || {}).filter(Boolean);
}

function storageKeyBelongsToAnotherAccount(key, mappings, accountId, sourceVaultId) {
  return mappings.some((entry) => {
    const mappedAccountId = text(entry?.accountId);
    const mappedVaultId = text(entry?.vaultId);
    if (mappedAccountId === accountId && mappedVaultId === sourceVaultId) return false;
    return Boolean(
      (mappedAccountId && key.includes(mappedAccountId)) ||
      (mappedVaultId && key.includes(mappedVaultId))
    );
  });
}

export function sanitizeCloudLocalStorage(
  localStorageData = {},
  { accountId, sourceVaultId } = {}
) {
  const normalizedAccountId = text(accountId);
  const normalizedVaultId = text(sourceVaultId);
  const mappings = getDirectoryMappings(localStorageData);
  const safe = {};

  Object.entries(localStorageData || {}).forEach(([key, value]) => {
    if (!key || FORBIDDEN_STORAGE_KEYS.has(key) || SECRET_KEY_PATTERN.test(key)) return;
    if (
      storageKeyBelongsToAnotherAccount(
        key,
        mappings,
        normalizedAccountId,
        normalizedVaultId
      )
    ) {
      return;
    }
    safe[key] = value;
  });

  return safe;
}

function normalizeStoreRecords(storeBackup) {
  if (Array.isArray(storeBackup)) return storeBackup;
  if (Array.isArray(storeBackup?.records)) return storeBackup.records;
  return [];
}

function filterDatabase(database, { accountId, sourceVaultId }) {
  const stores = {};

  Object.entries(database?.stores || {}).forEach(([storeName, storeBackup]) => {
    if (database.name === "clara_local_finance" && storeName === "metadata") return;

    const records = normalizeStoreRecords(storeBackup).filter((record) => {
      if (!record || typeof record !== "object") return false;
      if (database.name === "clara_local_finance") {
        return text(record.localUserId) === sourceVaultId;
      }
      if (database.name === "clara_local_notifications") {
        return (
          text(record.userId) === accountId ||
          text(record.scopeKey).startsWith(`${accountId}:`)
        );
      }
      return false;
    });

    stores[storeName] = { records, count: records.length };
  });

  return {
    name: database.name,
    version: database.version,
    stores,
    recordCounts: Object.fromEntries(
      Object.entries(stores).map(([storeName, store]) => [storeName, store.count])
    ),
  };
}

export function sanitizeCloudIndexedDb(indexedDbExport = {}, context = {}) {
  const supportedNames = new Set([
    "clara_local_finance",
    "clara_local_notifications",
  ]);
  const databases = (indexedDbExport?.databases || [])
    .filter((database) => supportedNames.has(database?.name))
    .map((database) => filterDatabase(database, context));

  return { supported: true, databases, errors: [] };
}

export async function buildClaraCloudVaultSnapshot({ user, profile } = {}) {
  const accountId = text(user?.id);
  const sourceVaultId = text(getActiveLocalVaultId());
  if (!accountId) throw new Error("A signed-in CLARA account is required.");
  if (!sourceVaultId) throw new Error("The active CLARA local vault is unavailable.");

  const fullExport = await buildClaraLocalDataExport({ user, profile });
  return {
    app: "CLARA",
    type: CLOUD_VAULT_SNAPSHOT_TYPE,
    version: CLOUD_VAULT_SNAPSHOT_VERSION,
    account_id: accountId,
    created_at: new Date().toISOString(),
    source_vault_id: sourceVaultId,
    source_device_id: getClaraSyncDeviceId(),
    data: {
      localStorage: sanitizeCloudLocalStorage(fullExport?.data?.localStorage || {}, {
        accountId,
        sourceVaultId,
      }),
      indexedDB: sanitizeCloudIndexedDb(fullExport?.data?.indexedDB || {}, {
        accountId,
        sourceVaultId,
      }),
    },
  };
}

export function validateClaraCloudSnapshot(snapshot, accountId = "") {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("This is not a valid CLARA backup.");
  }
  if (
    snapshot.app !== "CLARA" ||
    snapshot.type !== CLOUD_VAULT_SNAPSHOT_TYPE ||
    Number(snapshot.version) !== CLOUD_VAULT_SNAPSHOT_VERSION
  ) {
    throw new Error("This CLARA backup format is not supported.");
  }
  const expectedAccountId = text(accountId);
  if (expectedAccountId && text(snapshot.account_id) !== expectedAccountId) {
    const error = new Error("This backup belongs to a different CLARA account.");
    error.code = "CLOUD_SNAPSHOT_ACCOUNT_MISMATCH";
    throw error;
  }
  return snapshot;
}

function recordTimestamp(record) {
  const candidates = [
    record?.updatedAt,
    record?.updated_at,
    record?.deletedAt,
    record?.deleted_at,
    record?.createdAt,
    record?.created_at,
  ];
  for (const value of candidates) {
    const timestamp = Date.parse(value || "");
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

function mergeRecordLists(first = [], second = []) {
  const merged = new Map();
  [...first, ...second].forEach((record, index) => {
    if (!record || typeof record !== "object") return;
    const key = text(record.id) || `record-${index}-${JSON.stringify(record)}`;
    const existing = merged.get(key);
    if (!existing || recordTimestamp(record) >= recordTimestamp(existing)) {
      merged.set(key, record);
    }
  });
  return [...merged.values()];
}

function databaseMap(snapshot) {
  return new Map(
    (snapshot?.data?.indexedDB?.databases || []).map((database) => [
      database.name,
      database,
    ])
  );
}

export function mergeClaraCloudSnapshots(localSnapshot, remoteSnapshot) {
  const local = validateClaraCloudSnapshot(localSnapshot);
  const remote = validateClaraCloudSnapshot(remoteSnapshot, local.account_id);
  const localTime = Date.parse(local.created_at || "") || 0;
  const remoteTime = Date.parse(remote.created_at || "") || 0;
  const older = localTime <= remoteTime ? local : remote;
  const newer = localTime <= remoteTime ? remote : local;
  const firstDatabases = databaseMap(older);
  const secondDatabases = databaseMap(newer);
  const names = new Set([...firstDatabases.keys(), ...secondDatabases.keys()]);
  const databases = [];

  names.forEach((name) => {
    const first = firstDatabases.get(name) || { name, version: 1, stores: {} };
    const second = secondDatabases.get(name) || { name, version: first.version, stores: {} };
    const storeNames = new Set([
      ...Object.keys(first.stores || {}),
      ...Object.keys(second.stores || {}),
    ]);
    const stores = {};
    storeNames.forEach((storeName) => {
      const records = mergeRecordLists(
        normalizeStoreRecords(first.stores?.[storeName]),
        normalizeStoreRecords(second.stores?.[storeName])
      );
      stores[storeName] = { records, count: records.length };
    });
    databases.push({
      name,
      version: Math.max(Number(first.version || 1), Number(second.version || 1)),
      stores,
      recordCounts: Object.fromEntries(
        Object.entries(stores).map(([storeName, store]) => [storeName, store.count])
      ),
    });
  });

  return {
    ...newer,
    created_at: new Date().toISOString(),
    source_vault_id: local.source_vault_id,
    source_device_id: getClaraSyncDeviceId(),
    data: {
      localStorage: {
        ...(older.data?.localStorage || {}),
        ...(newer.data?.localStorage || {}),
      },
      indexedDB: { supported: true, databases, errors: [] },
    },
  };
}

function replaceVaultText(value, sourceVaultId, targetVaultId) {
  if (!sourceVaultId || sourceVaultId === targetVaultId) return value;
  if (typeof value === "string") return value.split(sourceVaultId).join(targetVaultId);
  if (Array.isArray(value)) {
    return value.map((item) => replaceVaultText(item, sourceVaultId, targetVaultId));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceVaultText(item, sourceVaultId, targetVaultId),
      ])
    );
  }
  return value;
}

export function prepareCloudSnapshotForRestore(snapshot, { accountId, targetVaultId }) {
  const validated = validateClaraCloudSnapshot(snapshot, accountId);
  const sourceVaultId = text(validated.source_vault_id);
  const target = text(targetVaultId);
  if (!target) throw new Error("The destination CLARA vault is unavailable.");

  const localStorageEntries = {};
  Object.entries(validated.data?.localStorage || {}).forEach(([key, value]) => {
    const rewrittenKey = sourceVaultId
      ? key.split(sourceVaultId).join(target)
      : key;
    if (FORBIDDEN_STORAGE_KEYS.has(rewrittenKey) || SECRET_KEY_PATTERN.test(rewrittenKey)) return;
    localStorageEntries[rewrittenKey] = replaceVaultText(value, sourceVaultId, target);
  });

  const databases = (validated.data?.indexedDB?.databases || []).map((database) => ({
    ...database,
    stores: Object.fromEntries(
      Object.entries(database.stores || {}).map(([storeName, storeBackup]) => {
        const records = normalizeStoreRecords(storeBackup).map((record) => ({
          ...replaceVaultText(record, sourceVaultId, target),
          ...(database.name === "clara_local_finance" ? { localUserId: target } : {}),
        }));
        return [storeName, { records, count: records.length }];
      })
    ),
  }));

  return {
    app: "CLARA",
    type: "local-device-transfer-backup",
    version: 1,
    created_at: validated.created_at,
    raw: { localStorage: localStorageEntries, sessionStorage: {} },
    data: {
      localStorage: localStorageEntries,
      sessionStorage: {},
      indexedDB: { supported: true, databases, errors: [] },
    },
  };
}

export async function restoreClaraCloudSnapshot(snapshot, { user } = {}) {
  const accountId = text(user?.id);
  const targetVaultId = text(getActiveLocalVaultId());
  const prepared = prepareCloudSnapshotForRestore(snapshot, {
    accountId,
    targetVaultId,
  });
  const fileLike = { text: async () => JSON.stringify(prepared) };
  return restoreClaraLocalDataFromFile(fileLike);
}

export function countCloudSnapshotItems(snapshot) {
  const localStorageCount = Object.keys(snapshot?.data?.localStorage || {}).length;
  const indexedDBRecords = (snapshot?.data?.indexedDB?.databases || []).reduce(
    (databaseTotal, database) =>
      databaseTotal +
      Object.values(database?.stores || {}).reduce(
        (storeTotal, store) => storeTotal + normalizeStoreRecords(store).length,
        0
      ),
    0
  );
  return {
    localStorage: localStorageCount,
    indexedDBRecords,
    total: localStorageCount + indexedDBRecords,
  };
}

export async function downloadClaraPrivateBackup(context = {}) {
  const snapshot = await buildClaraCloudVaultSnapshot(context);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `clara-private-backup-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
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
  return { fileName, snapshot };
}

export async function restoreClaraPrivateBackupFile(file, { user } = {}) {
  if (!file) throw new Error("No CLARA backup file was selected.");
  let snapshot;
  try {
    snapshot = JSON.parse(await file.text());
  } catch {
    throw new Error("This CLARA backup file is not valid JSON.");
  }
  return restoreClaraCloudSnapshot(snapshot, { user });
}
