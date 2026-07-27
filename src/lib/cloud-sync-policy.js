export const CLARA_ONLINE_SYNC_PAUSED_KEY = "clara_online_sync_paused_after_reset_v1";
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

export function pauseOnlineSyncAfterDeviceReset() {
  getStorage()?.setItem(CLARA_ONLINE_SYNC_PAUSED_KEY, "1");
  dispatchPolicyState();
}

export function resumeOnlineSync() {
  getStorage()?.removeItem(CLARA_ONLINE_SYNC_PAUSED_KEY);
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
