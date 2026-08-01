import { getStoredBackendUser } from "../lib/clara-backend-client";
import { isOnlineSyncPaused } from "../lib/cloud-sync-policy";
import { syncServerFinance } from "../lib/server-finance-sync";

const INSTALL_FLAG = "__claraFastAccountSyncInstalled";
const VISIBLE_SYNC_INTERVAL_MS = 5_000;
let syncInFlight = false;

function canSyncNow() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (document.visibilityState !== "visible") return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (isOnlineSyncPaused()) return false;
  return true;
}

async function refreshAccountState() {
  if (!canSyncNow() || syncInFlight) return;

  const user = getStoredBackendUser();
  if (!String(user?.id || "").trim()) return;

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
