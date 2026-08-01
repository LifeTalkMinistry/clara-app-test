import { getStoredBackendUser } from "../lib/clara-backend-client";
import {
  isOnlineSyncPaused,
  resumeOnlineSync,
} from "../lib/cloud-sync-policy";
import {
  LOCAL_FINANCE_PRIVATE_STORES,
  getLocalRecordsByUser,
  runLocalFinanceTransaction,
} from "../lib/localFinanceStore";
import { syncServerFinance } from "../lib/server-finance-sync";

const INSTALL_FLAG = "__claraFastAccountSyncInstalled";
const VISIBLE_SYNC_INTERVAL_MS = 5_000;
let syncInFlight = false;
let pausedDataCheckPromise = null;

function canReachAccount() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (document.visibilityState !== "visible") return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
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

      // Device Reset intentionally starts with sync paused. Once the user creates
      // meaningful account data, first pull the authoritative server state while
      // preserving that local work, then restore it with the server versions and
      // upload it as a valid two-way account mutation.
      await syncServerFinance({ user });
      await restoreCapturedAccountData(localUserId, pausedSnapshot);
      resumeOnlineSync();
      await syncServerFinance({ user });
      return;
    }

    await syncServerFinance({ user });
  } catch {
    // The normal sync status UI handles network and authentication failures.
    // Captured records remain in IndexedDB and are retried on the next interval.
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
  window.setInterval(refreshAccountState, VISIBLE_SYNC_INTERVAL_MS);
  runSoon();
}

installFastAccountSync();
