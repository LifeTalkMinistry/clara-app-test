import { getBackendAccountId } from "./clara-account-identity";
import {
  fetchCloudVaultStatus,
  setCloudVaultStorageMode,
} from "./cloud-vault-client";
import {
  CLARA_STORAGE_MODES,
  getClaraStorageMode,
  saveClaraStorageMode,
} from "./clara-storage-mode";
import {
  bootstrapServerFinanceFromThisDevice,
  syncServerFinance,
} from "./server-finance-sync";

function requireAccountId(user) {
  const accountId = String(getBackendAccountId(user) || "").trim();
  if (!accountId) {
    throw new Error("Sign in before changing CLARA data mode.");
  }
  return accountId;
}

function requireInternet() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const error = new Error("Reconnect to the internet to use Online Sync.");
    error.code = "ONLINE_SYNC_REQUIRES_INTERNET";
    throw error;
  }
}

export function getActiveClaraStorageMode(user) {
  const accountId = getBackendAccountId(user);
  return accountId
    ? getClaraStorageMode(accountId)
    : CLARA_STORAGE_MODES.LOCAL_ONLY;
}

export async function refreshClaraStorageModeFromServer(user) {
  const accountId = requireAccountId(user);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return getClaraStorageMode(accountId);
  }

  const status = await fetchCloudVaultStatus();
  return saveClaraStorageMode(accountId, status?.storageMode);
}

export async function enableStrictOnlineSyncMode(user) {
  const accountId = requireAccountId(user);
  requireInternet();

  await setCloudVaultStorageMode(CLARA_STORAGE_MODES.ONLINE_SYNC);
  return saveClaraStorageMode(accountId, CLARA_STORAGE_MODES.ONLINE_SYNC);
}

export async function enableStrictDeviceOnlyMode(user) {
  const accountId = requireAccountId(user);
  requireInternet();

  // The protected online copy is intentionally preserved. Only the account mode
  // changes here. The caller must create a fresh device-only workspace before
  // allowing local use so synced records are never silently converted or merged.
  await setCloudVaultStorageMode(CLARA_STORAGE_MODES.LOCAL_ONLY);
  return saveClaraStorageMode(accountId, CLARA_STORAGE_MODES.LOCAL_ONLY);
}

export async function syncFinanceForActiveMode({ user, forcePull = false } = {}) {
  const accountId = requireAccountId(user);
  const storageMode = getClaraStorageMode(accountId);

  if (storageMode !== CLARA_STORAGE_MODES.ONLINE_SYNC) {
    return {
      accountId,
      storageMode,
      state: "local_only",
      skipped: true,
    };
  }

  requireInternet();
  return syncServerFinance({ user, forcePull });
}

export async function bootstrapFinanceForOnlineMode({ user } = {}) {
  const accountId = requireAccountId(user);
  const storageMode = getClaraStorageMode(accountId);

  if (storageMode !== CLARA_STORAGE_MODES.ONLINE_SYNC) {
    const error = new Error("Choose Online Sync before saving device data online.");
    error.code = "ONLINE_SYNC_DISABLED";
    throw error;
  }

  requireInternet();
  return bootstrapServerFinanceFromThisDevice({ user });
}
