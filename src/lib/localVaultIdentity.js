import {
  LOCAL_FINANCE_PRIVATE_STORES,
  openLocalFinanceDb,
} from "./localFinanceStore.js";
import {
  LOCAL_VAULT_ID_KEY,
  getLocalVaultId,
  getOrCreateLocalVaultId,
  isLegacyLocalUserId,
  setLocalVaultId,
} from "./local-user-identity.js";

export const ACTIVE_LOCAL_VAULT_KEY = LOCAL_VAULT_ID_KEY;
export const LEGACY_LOCAL_VAULT_ID = "local-dev-user";
export const TEMPORARY_LOCAL_EMAIL = "local@clara.app";
export const LOCAL_VAULT_VERSION = 2;

const normalize = (value) => String(value ?? "").trim();

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

export function isTemporaryLocalAuthUser(user = {}) {
  return Boolean(
    isLegacyLocalUserId(user?.id) ||
      normalize(user?.email).toLowerCase() === TEMPORARY_LOCAL_EMAIL
  );
}

export function resolveLocalVaultId({
  persistedVaultId = "",
  ownerCounts = {},
  candidateOwnerIds = [],
  createId = () => getOrCreateLocalVaultId(),
} = {}) {
  const persisted = normalize(persistedVaultId);
  if (persisted && !isLegacyLocalUserId(persisted)) return persisted;

  const counts = Object.entries(ownerCounts || {}).reduce((acc, [ownerId, count]) => {
    const cleanOwnerId = normalize(ownerId);
    const safeCount = Number(count);
    if (cleanOwnerId && Number.isFinite(safeCount) && safeCount > 0) {
      acc[cleanOwnerId] = safeCount;
    }
    return acc;
  }, {});

  for (const candidate of candidateOwnerIds || []) {
    const cleanCandidate = normalize(candidate);
    if (
      cleanCandidate &&
      !isLegacyLocalUserId(cleanCandidate) &&
      counts[cleanCandidate] > 0
    ) {
      return cleanCandidate;
    }
  }

  const existingOwner = Object.entries(counts)
    .filter(([ownerId]) => !isLegacyLocalUserId(ownerId))
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })[0]?.[0];

  const created = normalize(createId());
  return existingOwner || (created && !isLegacyLocalUserId(created) ? created : getOrCreateLocalVaultId());
}

export async function getLocalVaultOwnerCounts() {
  if (typeof globalThis === "undefined" || !globalThis.indexedDB) return {};

  const db = await openLocalFinanceDb();
  const stores = [...LOCAL_FINANCE_PRIVATE_STORES];
  const transaction = db.transaction(stores, "readonly");
  const rows = await Promise.all(
    stores.map((storeName) => requestToPromise(transaction.objectStore(storeName).getAll()))
  );

  return rows.flat().reduce((counts, record) => {
    const ownerId = normalize(record?.localUserId);
    if (ownerId) counts[ownerId] = (counts[ownerId] || 0) + 1;
    return counts;
  }, {});
}

export async function detectLegacyLocalVault() {
  const counts = await getLocalVaultOwnerCounts();
  return (counts[LEGACY_LOCAL_VAULT_ID] || 0) > 0 || (counts["local-user"] || 0) > 0;
}

export function getActiveLocalVaultId() {
  return getLocalVaultId();
}

export function setActiveLocalVaultId(vaultId) {
  const cleanVaultId = setLocalVaultId(vaultId);

  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("clara:active-local-vault-updated", {
        detail: { vaultId: cleanVaultId },
      })
    );
  }

  return cleanVaultId;
}

export function ensureActiveLocalVaultId() {
  return getOrCreateLocalVaultId();
}

export async function initializeLocalVaultIdentity() {
  return getOrCreateLocalVaultId();
}

export function getLocalVaultState() {
  const vaultId = getOrCreateLocalVaultId();
  return {
    vaultId,
    vaultVersion: LOCAL_VAULT_VERSION,
    initialized: true,
    legacy: false,
  };
}
