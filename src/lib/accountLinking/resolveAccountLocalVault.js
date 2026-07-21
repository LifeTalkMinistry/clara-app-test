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
  dispatchAccountVaultSwitch(result);
  return result;
}

export { resolveAccountLocalVaultWithAdapters } from "./resolveAccountLocalVaultCore.js";
