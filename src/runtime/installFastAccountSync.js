import { getStoredBackendUser } from "../lib/clara-backend-client";
import {
  isOnlineSyncPaused,
  resumeOnlineSync,
} from "../lib/cloud-sync-policy";
import {
  LOCAL_FINANCE_PRIVATE_STORES,
  getLocalRecordsByUser,
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

async function hasMeaningfulLocalAccountData(localUserId) {
  const safeUserId = String(localUserId || "").trim();
  if (!safeUserId) return false;

  for (const storeName of LOCAL_FINANCE_PRIVATE_STORES) {
    try {
      const records = await getLocalRecordsByUser(storeName, {
        localUserId: safeUserId,
        includeDeleted: true,
      });
      if (Array.isArray(records) && records.length > 0) return true;
    } catch {
      // Continue checking the remaining stores. A single unavailable store must
      // not keep an intentional post-reset change trapped on this device.
    }
  }

  return false;
}

async function ensureOnlineSyncIsAvailable(localUserId) {
  if (!isOnlineSyncPaused()) return true;

  if (!pausedDataCheckPromise) {
    pausedDataCheckPromise = hasMeaningfulLocalAccountData(localUserId).finally(() => {
      pausedDataCheckPromise = null;
    });
  }

  const hasLocalData = await pausedDataCheckPromise;
  if (!hasLocalData) return false;

  // A completely empty device remains protected after Device Reset. Creating a
  // budget, wallet, expense, goal, or account streak is an intentional account
  // action, so synchronization can safely resume and upload that change.
  resumeOnlineSync();
  return true;
}

async function refreshAccountState() {
  if (!canReachAccount() || syncInFlight) return;

  const user = getStoredBackendUser();
  const localUserId = String(user?.id || "").trim();
  if (!localUserId) return;
  if (!(await ensureOnlineSyncIsAvailable(localUserId))) return;

  syncInFlight = true;
  try {
    await syncServerFinance({ user });
  } catch {
    // The normal sync status UI handles network and authentication failures.
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
