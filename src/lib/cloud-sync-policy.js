export const CLARA_ONLINE_SYNC_PAUSED_KEY = "clara_online_sync_paused_after_reset_v1";
export const CLARA_RESET_FRESH_VAULT_KEY = "clara_reset_fresh_local_vault_v1";
export const CLARA_ONLINE_SYNC_POLICY_EVENT = "clara:online-sync-policy-changed";
export const CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT = "clara:manual-online-sync-request";

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch {
    return null;
  }
}

function dispatchPolicyState() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CLARA_ONLINE_SYNC_POLICY_EVENT, {
      detail: { paused: isOnlineSyncPaused() },
    })
  );
}

export function isOnlineSyncPaused() {
  return getStorage()?.getItem(CLARA_ONLINE_SYNC_PAUSED_KEY) === "1";
}

export function getResetFreshLocalVaultId() {
  return String(getStorage()?.getItem(CLARA_RESET_FRESH_VAULT_KEY) || "").trim() || null;
}

export function pauseOnlineSyncAfterDeviceReset({ freshVaultId = "" } = {}) {
  const storage = getStorage();
  storage?.setItem(CLARA_ONLINE_SYNC_PAUSED_KEY, "1");

  const cleanFreshVaultId = String(freshVaultId || "").trim();
  if (cleanFreshVaultId) {
    storage?.setItem(CLARA_RESET_FRESH_VAULT_KEY, cleanFreshVaultId);
  }

  dispatchPolicyState();
}

export function resumeOnlineSync() {
  const storage = getStorage();
  storage?.removeItem(CLARA_ONLINE_SYNC_PAUSED_KEY);
  storage?.removeItem(CLARA_RESET_FRESH_VAULT_KEY);
  dispatchPolicyState();
}

export function requestManualOnlineSync({ forcePull = false } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT, {
      detail: { forcePull: Boolean(forcePull) },
    })
  );
}
