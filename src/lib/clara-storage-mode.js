export const CLARA_STORAGE_MODES = Object.freeze({
  LOCAL_ONLY: "local_only",
  ONLINE_SYNC: "online_sync",
});

export const CLARA_STORAGE_MODE_EVENT = "clara:storage-mode-updated";

const storageKey = (accountId) =>
  `clara_storage_mode_v1:${String(accountId || "guest").trim() || "guest"}`;

export function normalizeClaraStorageMode(value) {
  return value === CLARA_STORAGE_MODES.ONLINE_SYNC
    ? CLARA_STORAGE_MODES.ONLINE_SYNC
    : CLARA_STORAGE_MODES.LOCAL_ONLY;
}

export function hasClaraStorageModeChoice(
  accountId,
  storage = globalThis?.localStorage
) {
  try {
    return storage?.getItem(storageKey(accountId)) !== null;
  } catch {
    return false;
  }
}

export function getClaraStorageMode(accountId, storage = globalThis?.localStorage) {
  try {
    return normalizeClaraStorageMode(storage?.getItem(storageKey(accountId)));
  } catch {
    return CLARA_STORAGE_MODES.LOCAL_ONLY;
  }
}

export function saveClaraStorageMode(
  accountId,
  mode,
  storage = globalThis?.localStorage
) {
  const normalized = normalizeClaraStorageMode(mode);
  storage?.setItem(storageKey(accountId), normalized);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CLARA_STORAGE_MODE_EVENT, {
        detail: {
          accountId: String(accountId || ""),
          mode: normalized,
          requiresInternet: normalized === CLARA_STORAGE_MODES.ONLINE_SYNC,
        },
      })
    );
  }

  return normalized;
}

export function isClaraOnlineSyncMode(
  accountId,
  storage = globalThis?.localStorage
) {
  return getClaraStorageMode(accountId, storage) === CLARA_STORAGE_MODES.ONLINE_SYNC;
}

export function isClaraDeviceOnlyMode(
  accountId,
  storage = globalThis?.localStorage
) {
  return !isClaraOnlineSyncMode(accountId, storage);
}

export function getClaraStorageModeKey(accountId) {
  return storageKey(accountId);
}
