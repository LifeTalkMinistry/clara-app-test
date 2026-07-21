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
        detail: { accountId: String(accountId || ""), mode: normalized },
      })
    );
  }

  return normalized;
}

export function getClaraStorageModeKey(accountId) {
  return storageKey(accountId);
}
