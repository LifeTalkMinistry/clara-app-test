import {
  LOCAL_FINANCE_STORES,
  getLocalMetadata,
  openLocalFinanceDb,
  setLocalMetadata,
} from "./localFinanceStore.js";
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

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function normalizeMetadata(vaultId, stored = {}) {
  return {
    ...makeDefaultMetadata(vaultId),
    ...stored,
    vaultId,
    vaultVersion: Number(stored?.vaultVersion || LOCAL_VAULT_VERSION),
    linkStatus: normalizeLinkStatus(stored?.linkStatus),
  };
}

export async function getActiveVaultMetadata(vaultId = "") {
  const activeVaultId =
    normalize(vaultId) || getActiveLocalVaultId() || ensureActiveLocalVaultId();
  const metadataRecord = await getLocalMetadata(activeVaultId);
  return normalizeMetadata(activeVaultId, metadataRecord?.metadata || {});
}

export async function listLocalVaultMetadata() {
  if (typeof globalThis === "undefined" || !globalThis.indexedDB) return [];
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_STORES.metadata, "readonly");
  const records = await requestToPromise(
    transaction.objectStore(LOCAL_FINANCE_STORES.metadata).getAll()
  );
  return (records || [])
    .map((record) => {
      const vaultId = normalize(record?.localUserId || record?.metadata?.vaultId);
      return vaultId ? normalizeMetadata(vaultId, record?.metadata || {}) : null;
    })
    .filter(Boolean);
}

export async function findVaultMetadataByAccountId(accountUserId) {
  const accountId = normalize(accountUserId);
  if (!accountId) return null;
  const allMetadata = await listLocalVaultMetadata();
  const matches = allMetadata.filter(
    (metadata) => normalize(metadata?.accountUserId) === accountId
  );
  if (matches.length > 1) {
    const error = new Error("Multiple local vaults claim the same CLARA account.");
    error.code = "ACCOUNT_VAULT_DIRECTORY_CONFLICT";
    throw error;
  }
  return matches[0] || null;
}

export async function initializeVaultMetadata(vaultId) {
  const id = normalize(vaultId);
  if (!id) throw new Error("A local vault ID is required.");
  const existing = await getLocalMetadata(id);
  if (existing?.metadata) return normalizeMetadata(id, existing.metadata);
  const metadata = makeDefaultMetadata(id);
  await setLocalMetadata(id, metadata);
  return metadata;
}

export async function updateActiveVaultMetadata(patch = {}, vaultId = "") {
  const activeVaultId =
    normalize(vaultId) || getActiveLocalVaultId() || ensureActiveLocalVaultId();
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

export function markVaultLinked(
  { accountUserId, accountEmail, linkedAt = nowIso() } = {},
  vaultId = ""
) {
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

export function markVaultLinkFailed(
  { accountUserId, accountEmail, errorCode, message } = {},
  vaultId = ""
) {
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
