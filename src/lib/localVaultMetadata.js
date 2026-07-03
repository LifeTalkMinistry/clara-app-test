import { getLocalMetadata, setLocalMetadata } from "./localFinanceStore.js";
import {
  LOCAL_VAULT_VERSION,
  ensureActiveLocalVaultId,
  getActiveLocalVaultId,
} from "./localVaultIdentity.js";

const LINK_STATUSES = new Set(["local_only", "linking", "linked", "link_failed"]);
const normalize = (value) => String(value ?? "").trim();
const nowIso = () => new Date().toISOString();

function normalizeLinkStatus(value) {
  const status = normalize(value).toLowerCase();
  return LINK_STATUSES.has(status) ? status : "local_only";
}

function makeDefaultMetadata(vaultId) {
  const now = nowIso();
  return {
    vaultId,
    vaultVersion: LOCAL_VAULT_VERSION,
    createdAt: now,
    updatedAt: now,
    linkStatus: "local_only",
    accountUserId: null,
    accountEmail: null,
    linkedAt: null,
    lastAuthenticatedAt: null,
    linkError: null,
  };
}

export async function getActiveVaultMetadata(vaultId = "") {
  const activeVaultId = normalize(vaultId) || getActiveLocalVaultId() || ensureActiveLocalVaultId();
  const metadataRecord = await getLocalMetadata(activeVaultId);
  const stored = metadataRecord?.metadata || {};
  return {
    ...makeDefaultMetadata(activeVaultId),
    ...stored,
    vaultId: activeVaultId,
    vaultVersion: Number(stored?.vaultVersion || LOCAL_VAULT_VERSION),
    linkStatus: normalizeLinkStatus(stored?.linkStatus),
  };
}

export async function updateActiveVaultMetadata(patch = {}, vaultId = "") {
  const activeVaultId = normalize(vaultId) || getActiveLocalVaultId() || ensureActiveLocalVaultId();
  const current = await getActiveVaultMetadata(activeVaultId);
  const next = {
    ...current,
    ...(patch || {}),
    vaultId: activeVaultId,
    vaultVersion: LOCAL_VAULT_VERSION,
    linkStatus: normalizeLinkStatus(patch?.linkStatus ?? current.linkStatus),
    createdAt: current.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  await setLocalMetadata(activeVaultId, next);
  return next;
}

export function markVaultLinking({ accountUserId, accountEmail } = {}, vaultId = "") {
  return updateActiveVaultMetadata(
    {
      linkStatus: "linking",
      accountUserId: normalize(accountUserId) || null,
      accountEmail: normalize(accountEmail).toLowerCase() || null,
      lastAuthenticatedAt: nowIso(),
      linkError: null,
    },
    vaultId
  );
}

export function markVaultLinked({ accountUserId, accountEmail, linkedAt = nowIso() } = {}, vaultId = "") {
  return updateActiveVaultMetadata(
    {
      linkStatus: "linked",
      accountUserId: normalize(accountUserId) || null,
      accountEmail: normalize(accountEmail).toLowerCase() || null,
      linkedAt,
      lastAuthenticatedAt: nowIso(),
      linkError: null,
    },
    vaultId
  );
}

export function markVaultLinkFailed({ accountUserId, accountEmail, errorCode, message } = {}, vaultId = "") {
  return updateActiveVaultMetadata(
    {
      linkStatus: "link_failed",
      accountUserId: normalize(accountUserId) || null,
      accountEmail: normalize(accountEmail).toLowerCase() || null,
      lastAuthenticatedAt: nowIso(),
      linkError: {
        code: normalize(errorCode) || "ACCOUNT_LINK_FAILED",
        message: normalize(message) || "Unable to link this account.",
        failedAt: nowIso(),
      },
    },
    vaultId
  );
}
