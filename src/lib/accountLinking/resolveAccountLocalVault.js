import {
  findAccountMappingByVaultId,
  getVaultMappingForAccount,
  removeVaultMappingForAccount,
  saveVaultMappingForAccount,
} from "../account-vault-directory.js";
import {
  getResetFreshLocalVaultId,
  isOnlineSyncPaused,
} from "../cloud-sync-policy.js";
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

async function resolveResetFreshLocalVault(input = {}) {
  if (!isOnlineSyncPaused()) return null;

  const vaultId = String(getResetFreshLocalVaultId() || "").trim();
  if (!vaultId) return null;

  const accountUserId = String(input.accountUserId || "").trim();
  const accountEmail = String(input.accountEmail || "").trim().toLowerCase();
  if (!accountUserId || accountUserId === "local-dev-user" || accountUserId === "local-user") {
    return null;
  }

  const previousVaultId = String(getActiveLocalVaultId() || "").trim();
  const existingOwner = findAccountMappingByVaultId(vaultId);
  const mappedOwnerId = String(existingOwner?.accountId || "").trim();

  // The post-reset fresh vault belongs only to the account that claimed it.
  // If another legitimate account signs in on the same device, ignore this
  // account-specific reset vault and let the normal multi-account resolver open
  // that account's own mapped vault (or create a new isolated one). Blocking the
  // entire login here caused one account's Clear Data state to lock out every
  // other account on the browser.
  if (mappedOwnerId && mappedOwnerId !== accountUserId) {
    return null;
  }

  const metadata = await initializeVaultMetadata(vaultId);
  const metadataOwner = String(metadata?.accountUserId || "").trim();
  if (metadataOwner && metadataOwner !== accountUserId) {
    return null;
  }

  // A reset is an explicit request to sever this phone from the old local vault.
  // Never recover account-linked metadata from a surviving old IndexedDB here.
  // The freshly generated reset vault is the only local vault that may be used
  // for the account that owns this reset state until online sync is resumed.
  removeVaultMappingForAccount(accountUserId);
  setActiveLocalVaultId(vaultId);
  await linkLocalVaultToAccount({
    expectedVaultId: vaultId,
    accountUserId,
    accountEmail,
  });
  saveVaultMappingForAccount({
    accountId: accountUserId,
    accountEmail,
    vaultId,
  });

  return {
    vaultId,
    accountUserId,
    accountEmail: accountEmail || null,
    reused: true,
    created: false,
    adoptedUnlinkedVault: false,
    resetFreshVault: true,
    switched: previousVaultId !== vaultId,
  };
}

export async function resolveAccountLocalVault(input = {}) {
  // Clear This Device intentionally creates a new local vault and pauses Online
  // Sync. That fresh vault is account-specific: another account signing in on
  // the same browser must still be allowed to resolve its own isolated vault.
  const resetResult = await resolveResetFreshLocalVault(input);
  const result = resetResult || (await resolveAccountLocalVaultWithAdapters(input, defaultAdapters));

  if (!result?.resetFreshVault && (result?.created || result?.adoptedUnlinkedVault)) {
    markClaraCloudRecoveryPending(result.accountUserId);
  }
  dispatchAccountVaultSwitch(result);
  return result;
}

export { resolveAccountLocalVaultWithAdapters } from "./resolveAccountLocalVaultCore.js";
