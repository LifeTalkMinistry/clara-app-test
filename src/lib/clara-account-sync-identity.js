import { getVaultMappingForAccount, findAccountMappingByVaultId } from "./account-vault-directory";
import { getBackendAccountId } from "./clara-account-identity";
import { getStoredBackendUser } from "./clara-backend-client";
import { getActiveLocalVaultId } from "./localVaultIdentity";

function text(value) {
  return String(value ?? "").trim();
}

export function resolveAccountSyncUser(inputUser = null) {
  const sourceUser = inputUser || getStoredBackendUser();
  const accountId = text(getBackendAccountId(sourceUser));
  if (!accountId) return null;

  let localVaultId = text(sourceUser?.local_vault_id);
  const mappedVault = getVaultMappingForAccount(accountId);
  if (mappedVault?.vaultId) {
    localVaultId = text(mappedVault.vaultId);
  }

  if (!localVaultId) {
    const activeVaultId = text(getActiveLocalVaultId());
    const activeOwner = activeVaultId
      ? findAccountMappingByVaultId(activeVaultId)
      : null;
    if (text(activeOwner?.accountId) === accountId) {
      localVaultId = activeVaultId;
    }
  }

  // AuthContext users already expose the local vault as `id`. A raw backend
  // session user exposes the server account as `id`, so only accept it when it
  // is different from the account ID.
  const candidateId = text(sourceUser?.id);
  if (!localVaultId && candidateId && candidateId !== accountId) {
    localVaultId = candidateId;
  }

  if (!localVaultId) return null;

  return {
    ...sourceUser,
    id: localVaultId,
    local_vault_id: localVaultId,
    account_id: accountId,
    server_user_id: accountId,
  };
}

export function requireAccountSyncUser(inputUser = null) {
  const user = resolveAccountSyncUser(inputUser);
  if (!user) {
    throw new Error(
      "CLARA could not resolve this account's active local vault for synchronization."
    );
  }
  return user;
}
