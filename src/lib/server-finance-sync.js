import {
  backendRequest,
  getStoredBackendToken,
  isBackendNetworkError,
} from "./clara-backend-client";
import {
  LOCAL_FINANCE_PRIVATE_STORES,
  getLocalRecordsByUser,
  runLocalFinanceTransaction,
} from "./localFinanceStore";
import { getBackendAccountId } from "./clara-account-identity";
import { getClaraSyncDeviceId } from "./cloud-vault-snapshot";

export const CLARA_SERVER_FINANCE_SYNC_EVENT = "clara:server-finance-sync-status";

const SYNC_STATE_PREFIX = "clara_server_finance_sync_v1:";
const SHADOW_PREFIX = "clara_server_finance_shadow_v1:";
const MAX_SYNC_RECORDS = 5000;
let activeSyncPromise = null;
let applyingServerState = false;

function storage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function stateKey(accountId) {
  return `${SYNC_STATE_PREFIX}${String(accountId || "").trim()}`;
}

function shadowKey(accountId) {
  return `${SHADOW_PREFIX}${String(accountId || "").trim()}`;
}

function dispatchStatus(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLARA_SERVER_FINANCE_SYNC_EVENT, { detail }));
}

function readJson(key, fallback) {
  try {
    return JSON.parse(storage()?.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  storage()?.setItem(key, JSON.stringify(value));
}

function readSyncState(accountId) {
  return readJson(stateKey(accountId), {
    initializedLocally: false,
    revision: 0,
    lastSyncedAt: null,
  });
}

function saveSyncState(accountId, patch = {}) {
  const next = { ...readSyncState(accountId), ...patch };
  writeJson(stateKey(accountId), next);
  return next;
}

function readShadow(accountId) {
  return readJson(shadowKey(accountId), {});
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
}

function fingerprint(value) {
  return JSON.stringify(stableValue(value));
}

function sanitizePayload(record = {}) {
  const payload = { ...record };
  [
    "localUserId",
    "syncStatus",
    "serverVersion",
    "serverRevision",
    "serverUpdatedAt",
    "deletedAt",
  ].forEach((key) => delete payload[key]);
  return payload;
}

function shadowRecord(record) {
  return fingerprint({
    payload: sanitizePayload(record),
    deletedAt: record?.deletedAt || null,
  });
}

function wireRecord(entityType, record = {}) {
  return {
    entityType,
    id: String(record.id || "").trim(),
    payload: sanitizePayload(record),
    deletedAt: record.deletedAt || null,
    clientUpdatedAt:
      record.updatedAt || record.updated_at || record.deletedAt || record.createdAt || null,
    baseVersion:
      Number.isInteger(Number(record.serverVersion)) && Number(record.serverVersion) > 0
        ? Number(record.serverVersion)
        : null,
  };
}

async function readAllLocalRecords(localUserId) {
  const records = [];
  for (const entityType of LOCAL_FINANCE_PRIVATE_STORES) {
    const storeRecords = await getLocalRecordsByUser(entityType, {
      localUserId,
      includeDeleted: true,
    });
    for (const record of storeRecords || []) {
      if (!record?.id) continue;
      records.push({ entityType, record });
      if (records.length > MAX_SYNC_RECORDS) {
        throw new Error("CLARA has too many local finance records to sync in one pass.");
      }
    }
  }
  return records;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

async function clearStoreForUser(store, localUserId) {
  const records = await requestToPromise(store.index("localUserId").getAll(localUserId));
  (records || []).forEach((record) => {
    if (record?.id) store.delete(record.id);
  });
}

function toLocalRecord(serverRecord, localUserId) {
  const payload =
    serverRecord?.payload && typeof serverRecord.payload === "object"
      ? serverRecord.payload
      : {};
  return {
    ...payload,
    id: serverRecord.id,
    localUserId,
    deletedAt: serverRecord.deletedAt || null,
    serverVersion: Number(serverRecord.serverVersion || 0) || null,
    serverRevision: Number(serverRecord.serverRevision || 0) || null,
    serverUpdatedAt: serverRecord.serverUpdatedAt || null,
    syncStatus: "synced",
    source: payload.source || "server",
  };
}

async function replaceLocalCacheFromServer(serverRecords, localUserId) {
  const allowedStores = new Set(LOCAL_FINANCE_PRIVATE_STORES);
  const normalized = (serverRecords || []).filter(
    (record) => allowedStores.has(record?.entityType) && record?.id
  );

  applyingServerState = true;
  try {
    await runLocalFinanceTransaction(
      LOCAL_FINANCE_PRIVATE_STORES,
      localUserId,
      async ({ store, putRaw }) => {
        for (const storeName of LOCAL_FINANCE_PRIVATE_STORES) {
          await clearStoreForUser(store(storeName), localUserId);
        }
        for (const record of normalized) {
          await putRaw(record.entityType, toLocalRecord(record, localUserId));
        }
      }
    );
  } finally {
    applyingServerState = false;
  }

  if (typeof window !== "undefined") {
    [
      "clara-finance-updated",
      "clara:finance-data-updated",
      "clara-local-finance-updated",
    ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
  }
}

function buildShadowFromServer(serverRecords, localUserId) {
  const shadow = {};
  (serverRecords || []).forEach((serverRecord) => {
    if (!serverRecord?.entityType || !serverRecord?.id) return;
    const localRecord = toLocalRecord(serverRecord, localUserId);
    shadow[`${serverRecord.entityType}:${serverRecord.id}`] = shadowRecord(localRecord);
  });
  return shadow;
}

async function applyServerResponse(accountId, localUserId, response) {
  const records = Array.isArray(response?.records) ? response.records : [];
  await replaceLocalCacheFromServer(records, localUserId);
  writeJson(shadowKey(accountId), buildShadowFromServer(records, localUserId));
  saveSyncState(accountId, {
    initializedLocally: Boolean(response?.initialized),
    revision: Number(response?.revision || 0),
    lastSyncedAt: new Date().toISOString(),
  });
}

function requireAccount(user) {
  const accountId = getBackendAccountId(user);
  const localUserId = String(user?.id || "").trim();
  const token = getStoredBackendToken();
  if (!accountId || !localUserId || !token) {
    throw new Error("Sign in to your CLARA account before syncing financial data.");
  }
  return { accountId: String(accountId), localUserId, token };
}

export async function fetchServerFinanceStatus(user) {
  const { token } = requireAccount(user);
  return backendRequest("/api/finance/status", { token });
}

export async function bootstrapServerFinanceFromThisDevice({ user } = {}) {
  const { accountId, localUserId, token } = requireAccount(user);
  const localRecords = await readAllLocalRecords(localUserId);
  const records = localRecords.map(({ entityType, record }) => {
    const wire = wireRecord(entityType, record);
    delete wire.baseVersion;
    return wire;
  });

  dispatchStatus({ accountId, state: "syncing", operation: "bootstrap" });
  try {
    const response = await backendRequest("/api/finance/bootstrap", {
      method: "POST",
      token,
      timeoutMs: 30_000,
      body: {
        deviceId: getClaraSyncDeviceId(),
        records,
      },
    });
    await applyServerResponse(accountId, localUserId, response);
    const result = { ...response, state: "synced", direction: "device_to_server" };
    dispatchStatus({ accountId, ...result });
    return result;
  } catch (error) {
    dispatchStatus({
      accountId,
      state: "error",
      error: error?.message || "Unable to initialize account finance data.",
    });
    throw error;
  }
}

async function performServerFinanceSync({ user, forcePull = false } = {}) {
  const { accountId, localUserId, token } = requireAccount(user);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { accountId, state: "offline", offline: true };
  }

  const localState = readSyncState(accountId);
  const shadow = readShadow(accountId);
  const localRecords = await readAllLocalRecords(localUserId);
  const firstServerPull = !localState.initializedLocally;
  const changes = [];

  if (!firstServerPull && !forcePull) {
    for (const { entityType, record } of localRecords) {
      const key = `${entityType}:${record.id}`;
      if (shadow[key] !== shadowRecord(record)) {
        changes.push(wireRecord(entityType, record));
      }
    }
  }

  dispatchStatus({ accountId, state: "syncing", pendingChanges: changes.length });
  try {
    const response = await backendRequest("/api/finance/sync", {
      method: "POST",
      token,
      timeoutMs: 30_000,
      body: {
        deviceId: getClaraSyncDeviceId(),
        lastRevision: Number(localState.revision || 0),
        changes,
      },
    });

    if (!response?.initialized) {
      const result = {
        ...response,
        accountId,
        state: "needs_bootstrap",
        needsBootstrap: true,
      };
      dispatchStatus(result);
      return result;
    }

    await applyServerResponse(accountId, localUserId, response);
    const result = {
      ...response,
      accountId,
      state: "synced",
      direction: firstServerPull || forcePull ? "server_to_device" : "two_way",
      pendingChanges: changes.length,
    };
    dispatchStatus(result);
    return result;
  } catch (error) {
    if (isBackendNetworkError(error)) {
      const result = { accountId, state: "offline", offline: true };
      dispatchStatus(result);
      return result;
    }
    dispatchStatus({
      accountId,
      state: "error",
      error: error?.message || "Financial data sync failed.",
    });
    throw error;
  }
}

export function syncServerFinance(context = {}) {
  if (applyingServerState) return Promise.resolve({ suppressed: true });
  if (activeSyncPromise) return activeSyncPromise;
  activeSyncPromise = performServerFinanceSync(context).finally(() => {
    activeSyncPromise = null;
  });
  return activeSyncPromise;
}

export function pullServerFinanceToThisDevice({ user } = {}) {
  return syncServerFinance({ user, forcePull: true });
}

export function isApplyingServerFinanceState() {
  return applyingServerState;
}
