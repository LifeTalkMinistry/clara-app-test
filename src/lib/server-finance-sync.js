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
import {
  buildClaraCloudVaultSnapshot,
  getClaraSyncDeviceId,
  isDeviceOnlyStorageKey,
} from "./cloud-vault-snapshot";

export const CLARA_SERVER_FINANCE_SYNC_EVENT = "clara:server-finance-sync-status";
export const CLARA_SERVER_FINANCE_EVENT_SOURCE = "server_authority";

const SYNC_STATE_PREFIX = "clara_server_finance_sync_v1:";
const SHADOW_PREFIX = "clara_server_finance_shadow_v1:";
const LOCAL_STATE_ENTITY = "local_state";
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

function isServerSyncMetadataKey(key) {
  const value = String(key || "");
  return value.startsWith(SYNC_STATE_PREFIX) || value.startsWith(SHADOW_PREFIX);
}

function dispatchStatus(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLARA_SERVER_FINANCE_SYNC_EVENT, { detail }));
}

function dispatchServerAppliedEvents() {
  if (typeof window === "undefined") return;
  const detail = { source: CLARA_SERVER_FINANCE_EVENT_SOURCE };
  [
    "clara-finance-updated",
    "clara:finance-data-updated",
    "clara-local-finance-updated",
    "clara-local-profile-updated",
  ].forEach((eventName) => window.dispatchEvent(new CustomEvent(eventName, { detail })));
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

function sanitizePayload(entityType, record = {}) {
  if (entityType === LOCAL_STATE_ENTITY) {
    return { value: record.value };
  }

  const payload = { ...record };
  [
    "id",
    "localUserId",
    "syncStatus",
    "serverVersion",
    "serverRevision",
    "serverUpdatedAt",
    "deletedAt",
  ].forEach((key) => delete payload[key]);
  return payload;
}

function recordFingerprint(entityType, record) {
  return fingerprint({
    payload: sanitizePayload(entityType, record),
    deletedAt: record?.deletedAt || null,
  });
}

function shadowFingerprint(entry) {
  return typeof entry === "string" ? entry : entry?.fingerprint || "";
}

function shadowVersion(entry) {
  const version = Number(entry?.serverVersion || 0);
  return Number.isInteger(version) && version > 0 ? version : null;
}

function wireRecord(entityType, record = {}, baseVersionOverride = undefined) {
  const recordVersion = Number(record.serverVersion || 0);
  const baseVersion =
    baseVersionOverride !== undefined
      ? baseVersionOverride
      : Number.isInteger(recordVersion) && recordVersion > 0
        ? recordVersion
        : null;

  return {
    entityType,
    id: String(record.id || "").trim(),
    payload: sanitizePayload(entityType, record),
    deletedAt: record.deletedAt || null,
    clientUpdatedAt:
      entityType === LOCAL_STATE_ENTITY
        ? new Date().toISOString()
        : record.updatedAt || record.updated_at || record.deletedAt || record.createdAt || null,
    baseVersion,
  };
}

async function readSafeLocalState(user) {
  const snapshot = await buildClaraCloudVaultSnapshot({ user });
  const state = snapshot?.data?.localStorage || {};
  return Object.entries(state)
    .filter(([key]) => !isServerSyncMetadataKey(key))
    .map(([key, value]) => ({
      entityType: LOCAL_STATE_ENTITY,
      record: { id: key, value, deletedAt: null },
    }));
}

async function readAllLocalRecords(localUserId, user) {
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
        throw new Error("CLARA has too many local records to sync in one pass.");
      }
    }
  }

  const localState = await readSafeLocalState(user);
  records.push(...localState);
  if (records.length > MAX_SYNC_RECORDS) {
    throw new Error("CLARA has too many local records to sync in one pass.");
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

function toStorageValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function replaceLocalStateFromServer(serverRecords, user) {
  const targetStorage = storage();
  if (!targetStorage) return;

  const currentState = await readSafeLocalState(user);
  currentState.forEach(({ record }) => {
    if (record?.id && !isServerSyncMetadataKey(record.id)) {
      targetStorage.removeItem(record.id);
    }
  });

  (serverRecords || [])
    .filter(
      (record) =>
        record?.entityType === LOCAL_STATE_ENTITY &&
        record?.id &&
        !record.deletedAt &&
        !isServerSyncMetadataKey(record.id) &&
        !isDeviceOnlyStorageKey(record.id)
    )
    .forEach((record) => {
      targetStorage.setItem(record.id, toStorageValue(record.payload?.value));
    });
}

async function replaceLocalCacheFromServer(serverRecords, localUserId, user) {
  const allowedStores = new Set(LOCAL_FINANCE_PRIVATE_STORES);
  const financeRecords = (serverRecords || []).filter(
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
        for (const record of financeRecords) {
          await putRaw(record.entityType, toLocalRecord(record, localUserId));
        }
      }
    );
    await replaceLocalStateFromServer(serverRecords, user);

    // Notify UI readers while the server-application guard is still active.
    // The sync bridge can refresh cards from IndexedDB without mistaking this
    // authoritative download for a new local mutation that needs uploading.
    dispatchServerAppliedEvents();
  } finally {
    applyingServerState = false;
  }
}

function serverRecordFingerprint(serverRecord, localUserId) {
  if (serverRecord.entityType === LOCAL_STATE_ENTITY) {
    return recordFingerprint(LOCAL_STATE_ENTITY, {
      id: serverRecord.id,
      value: serverRecord.payload?.value,
      deletedAt: serverRecord.deletedAt || null,
    });
  }
  return recordFingerprint(serverRecord.entityType, toLocalRecord(serverRecord, localUserId));
}

function buildShadowFromServer(serverRecords, localUserId) {
  const shadow = {};
  (serverRecords || []).forEach((serverRecord) => {
    if (!serverRecord?.entityType || !serverRecord?.id) return;
    shadow[`${serverRecord.entityType}:${serverRecord.id}`] = {
      fingerprint: serverRecordFingerprint(serverRecord, localUserId),
      serverVersion: Number(serverRecord.serverVersion || 0) || null,
      deletedAt: serverRecord.deletedAt || null,
    };
  });
  return shadow;
}

async function applyServerResponse(accountId, localUserId, user, response) {
  const records = Array.isArray(response?.records) ? response.records : [];
  await replaceLocalCacheFromServer(records, localUserId, user);
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
  const localRecords = await readAllLocalRecords(localUserId, user);
  const records = localRecords.map(({ entityType, record }) => {
    const wire = wireRecord(entityType, record, null);
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
    await applyServerResponse(accountId, localUserId, user, response);
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

function parseShadowKey(key) {
  const separator = String(key || "").indexOf(":");
  if (separator < 1) return null;
  return {
    entityType: key.slice(0, separator),
    id: key.slice(separator + 1),
  };
}

async function performServerFinanceSync({ user, forcePull = false } = {}) {
  const { accountId, localUserId, token } = requireAccount(user);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { accountId, state: "offline", offline: true };
  }

  const localState = readSyncState(accountId);
  const shadow = readShadow(accountId);
  const localRecords = await readAllLocalRecords(localUserId, user);
  const firstServerPull = !localState.initializedLocally;
  const changes = [];

  if (!firstServerPull && !forcePull) {
    const currentKeys = new Set();
    for (const { entityType, record } of localRecords) {
      const key = `${entityType}:${record.id}`;
      currentKeys.add(key);
      const shadowEntry = shadow[key];
      if (shadowFingerprint(shadowEntry) !== recordFingerprint(entityType, record)) {
        const baseVersion =
          Number(record.serverVersion || 0) > 0
            ? Number(record.serverVersion)
            : shadowVersion(shadowEntry);
        changes.push(wireRecord(entityType, record, baseVersion));
      }
    }

    for (const [key, shadowEntry] of Object.entries(shadow)) {
      if (currentKeys.has(key) || shadowEntry?.deletedAt) continue;
      const parsed = parseShadowKey(key);
      if (!parsed?.entityType || !parsed.id) continue;
      changes.push({
        entityType: parsed.entityType,
        id: parsed.id,
        payload: {},
        deletedAt: new Date().toISOString(),
        clientUpdatedAt: new Date().toISOString(),
        baseVersion: shadowVersion(shadowEntry),
      });
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

    const localRevision = Number(localState.revision || 0);
    const serverRevision = Number(response?.revision || 0);
    const conflicts = Array.isArray(response?.conflicts) ? response.conflicts : [];
    const shouldApplyServerState = Boolean(
      firstServerPull ||
        forcePull ||
        changes.length > 0 ||
        conflicts.length > 0 ||
        serverRevision !== localRevision
    );

    if (shouldApplyServerState) {
      await applyServerResponse(accountId, localUserId, user, response);
    } else {
      // The device already has the exact authoritative revision and submitted no
      // mutations. Do not clear/rewrite IndexedDB or re-render every money card.
      saveSyncState(accountId, {
        initializedLocally: true,
        revision: serverRevision,
        lastSyncedAt: new Date().toISOString(),
      });
    }

    const result = {
      ...response,
      accountId,
      state: "synced",
      direction: firstServerPull || forcePull ? "server_to_device" : "two_way",
      pendingChanges: changes.length,
      cacheApplied: shouldApplyServerState,
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
