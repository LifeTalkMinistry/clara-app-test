import {
  findAccountMappingByVaultId,
  getVaultMappingForAccount,
  saveVaultMappingForAccount,
} from "../account-vault-directory.js";
import { createLocalVaultId } from "../local-user-identity.js";
import {
  getActiveLocalVaultId,
  setActiveLocalVaultId,
} from "../localVaultIdentity.js";
import {
  findVaultMetadataByAccountId,
  getActiveVaultMetadata,
  initializeVaultMetadata,
} from "../localVaultMetadata.js";
import { linkLocalVaultToAccount } from "./linkLocalVaultToAccount.js";
import { resolveAccountLocalVaultWithAdapters } from "./resolveAccountLocalVaultCore.js";

const CLOUD_RECOVERY_PENDING_PREFIX = "clara_cloud_recovery_pending_v1:";

const defaultAdapters = {
  getMapping: getVaultMappingForAccount,
  saveMapping: saveVaultMappingForAccount,
  findMetadataByAccountId: findVaultMetadataByAccountId,
  getMetadata: getActiveVaultMetadata,
  getActiveVaultId: getActiveLocalVaultId,
  findMappingByVaultId: findAccountMappingByVaultId,
  createVaultId: createLocalVaultId,
  initializeMetadata: initializeVaultMetadata,
  activateVault: setActiveLocalVaultId,
  linkVault: linkLocalVaultToAccount,
};

export function getClaraCloudRecoveryPendingKey(accountId) {
  return `${CLOUD_RECOVERY_PENDING_PREFIX}${String(accountId || "").trim()}`;
}

export function isClaraCloudRecoveryPending(accountId, storage = globalThis?.localStorage) {
  const id = String(accountId || "").trim();
  if (!id) return false;
  try {
    return storage?.getItem(getClaraCloudRecoveryPendingKey(id)) === "1";
  } catch {
    return false;
  }
}

export function clearClaraCloudRecoveryPending(accountId, storage = globalThis?.localStorage) {
  const id = String(accountId || "").trim();
  if (!id) return;
  try {
    storage?.removeItem(getClaraCloudRecoveryPendingKey(id));
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function markClaraCloudRecoveryPending(accountId, storage = globalThis?.localStorage) {
  const id = String(accountId || "").trim();
  if (!id) return;
  try {
    storage?.setItem(getClaraCloudRecoveryPendingKey(id), "1");
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function dispatchAccountVaultSwitch(result) {
  if (!result?.switched || typeof window === "undefined" || typeof CustomEvent === "undefined") {
    return;
  }

  const detail = {
    vaultId: result.vaultId,
    accountUserId: result.accountUserId,
    accountEmail: result.accountEmail,
  };
  [
    "clara:account-vault-switched",
    "clara-finance-updated",
    "clara:finance-data-updated",
  ].forEach((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  });
}

export async function resolveAccountLocalVault(input = {}) {
  const result = await resolveAccountLocalVaultWithAdapters(input, defaultAdapters);
  if (result?.created || result?.adoptedUnlinkedVault) {
    markClaraCloudRecoveryPending(result.accountUserId);
  }
  dispatchAccountVaultSwitch(result);
  return result;
}

export { resolveAccountLocalVaultWithAdapters } from "./resolveAccountLocalVaultCore.js";
