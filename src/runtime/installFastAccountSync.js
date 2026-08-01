import { getStoredBackendUser } from "../lib/clara-backend-client";
import { getBackendAccountId } from "../lib/clara-account-identity";
import {
  isOnlineSyncPaused,
  resumeOnlineSync,
} from "../lib/cloud-sync-policy";
import {
  LOCAL_FINANCE_PRIVATE_STORES,
  getLocalRecordsByUser,
  runLocalFinanceTransaction,
} from "../lib/localFinanceStore";
import {
  fetchServerFinanceStatus,
  syncServerFinance,
} from "../lib/server-finance-sync";

const INSTALL_FLAG = "__claraFastAccountSyncInstalled";
const VISIBLE_STATUS_INTERVAL_MS = 15_000;
const RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;
const SYNC_STATE_PREFIX = "clara_server_finance_sync_v1:";
let syncInFlight = false;
let pausedDataCheckPromise = null;
let rateLimitedUntil = 0;

function canReachAccount() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (document.visibilityState !== "visible") return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  return true;
}

function readLocalRevision(user) {
  const accountId = String(getBackendAccountId(user) || "").trim();
  if (!accountId) return 0;

  try {
    const raw = window.localStorage.getItem(`${SYNC_STATE_PREFIX}${accountId}`);
    const state = raw ? JSON.parse(raw) : null;
    const revision = Number(state?.revision || 0);
    return Number.isFinite(revision) ? revision : 0;
  } catch {
    return 0;
  }
}

function noteRateLimit(error) {
  if (Number(error?.status || 0) !== 429) return false;
  rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + RATE_LIMIT_BACKOFF_MS);
  return true;
}

async function captureMeaningfulLocalAccountData(localUserId) {
  const safeUserId = String(localUserId || "").trim();
  if (!safeUserId) return [];

  const snapshot = [];
  for (const storeName of LOCAL_FINANCE_PRIVATE_STORES) {
    try {
      const records = await getLocalRecordsByUser(storeName, {
        localUserId: safeUserId,
        includeDeleted: true,
      });
      if (Array.isArray(records) && records.length > 0) {
        snapshot.push({ storeName, records });
      }
    } catch {
      // Continue checking the remaining stores. A single unavailable store must
      // not keep an intentional post-reset change trapped on this device.
    }
  }

  return snapshot;
}

async function restoreCapturedAccountData(localUserId, snapshot = []) {
  const safeUserId = String(localUserId || "").trim();
  const storeNames = snapshot
    .filter((entry) => Array.isArray(entry?.records) && entry.records.length > 0)
    .map((entry) => entry.storeName);

  if (!safeUserId || storeNames.length === 0) return;

  await runLocalFinanceTransaction(storeNames, safeUserId, async (tx) => {
    for (const entry of snapshot) {
      for (const capturedRecord of entry.records || []) {
        if (!capturedRecord?.id) continue;

        const serverBackedRecord = await tx.getAny(entry.storeName, capturedRecord.id);
        await tx.putRaw(entry.storeName, {
          ...(serverBackedRecord || {}),
          ...capturedRecord,
          id: capturedRecord.id,
          localUserId: safeUserId,
          serverVersion:
            serverBackedRecord?.serverVersion ?? capturedRecord.serverVersion ?? null,
          serverRevision:
            serverBackedRecord?.serverRevision ?? capturedRecord.serverRevision ?? null,
          serverUpdatedAt:
            serverBackedRecord?.serverUpdatedAt ?? capturedRecord.serverUpdatedAt ?? null,
          syncStatus: capturedRecord.deletedAt ? "local_deleted" : "local_only",
          source: "local",
        });
      }
    }
  });
}

async function getPausedAccountSnapshot(localUserId) {
  if (!isOnlineSyncPaused()) return null;

  if (!pausedDataCheckPromise) {
    pausedDataCheckPromise = captureMeaningfulLocalAccountData(localUserId).finally(() => {
      pausedDataCheckPromise = null;
    });
  }

  const snapshot = await pausedDataCheckPromise;
  return snapshot.length > 0 ? snapshot : null;
}

async function synchronizePausedDevice(user, localUserId, pausedSnapshot) {
  if (Date.now() < rateLimitedUntil) return;

  try {
    await syncServerFinance({ user });
    await restoreCapturedAccountData(localUserId, pausedSnapshot);
    resumeOnlineSync();
    await syncServerFinance({ user });
  } catch (error) {
    noteRateLimit(error);
    throw error;
  }
}

async function refreshAccountState() {
  if (!canReachAccount() || syncInFlight) return;

  const user = getStoredBackendUser();
  const localUserId = String(user?.id || "").trim();
  if (!localUserId) return;

  syncInFlight = true;
  try {
    const pausedSnapshot = await getPausedAccountSnapshot(localUserId);

    if (isOnlineSyncPaused()) {
      if (!pausedSnapshot) return;
      await synchronizePausedDevice(user, localUserId, pausedSnapshot);
      return;
    }

    // Poll the read-only status endpoint instead of POSTing /finance/sync every
    // few seconds. A write sync is performed only when another device has moved
    // the authoritative account revision forward.
    const status = await fetchServerFinanceStatus(user);
    const remoteRevision = Number(status?.revision || 0);
    const localRevision = readLocalRevision(user);

    if (
      status?.initialized &&
      Number.isFinite(remoteRevision) &&
      remoteRevision !== localRevision &&
      Date.now() >= rateLimitedUntil
    ) {
      try {
        await syncServerFinance({ user });
      } catch (error) {
        noteRateLimit(error);
      }
    }
  } catch (error) {
    noteRateLimit(error);
    // The regular sync status UI handles network and authentication failures.
    // Captured records remain in IndexedDB and are retried later.
  } finally {
    syncInFlight = false;
  }
}

export function installFastAccountSync() {
  if (typeof window === "undefined" || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  const runSoon = () => window.setTimeout(refreshAccountState, 150);
  const handleVisibility = () => {
    if (document.visibilityState === "visible") runSoon();
  };

  window.addEventListener("focus", runSoon);
  window.addEventListener("online", runSoon);
  document.addEventListener("visibilitychange", handleVisibility);
  window.setInterval(refreshAccountState, VISIBLE_STATUS_INTERVAL_MS);
  runSoon();
}

installFastAccountSync();
