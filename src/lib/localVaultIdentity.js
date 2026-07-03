import { LOCAL_FINANCE_PRIVATE_STORES, openLocalFinanceDb } from "./localFinanceStore.js";

export const ACTIVE_LOCAL_VAULT_KEY = "clara_active_local_vault_v1";
export const LEGACY_LOCAL_VAULT_ID = "local-dev-user";
export const TEMPORARY_LOCAL_EMAIL = "local@clara.app";
export const LOCAL_VAULT_VERSION = 1;

let memoryVaultId = "";
const normalize = (value) => String(value ?? "").trim();

function readStoredVaultId() {
  if (typeof window === "undefined") return memoryVaultId;
  try {
    return normalize(window.localStorage?.getItem(ACTIVE_LOCAL_VAULT_KEY)) || memoryVaultId;
  } catch {
    return memoryVaultId;
  }
}

function writeStoredVaultId(vaultId) {
  memoryVaultId = normalize(vaultId);
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(ACTIVE_LOCAL_VAULT_KEY, memoryVaultId);
  } catch {
    // Keep the session value when browser storage is unavailable.
  }
}

function createVaultId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `vault_${globalThis.crypto.randomUUID()}`;
  }
  return `vault_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

export function isTemporaryLocalAuthUser(user = {}) {
  return Boolean(
    normalize(user?.id) === LEGACY_LOCAL_VAULT_ID ||
      normalize(user?.email).toLowerCase() === TEMPORARY_LOCAL_EMAIL
  );
}

export function resolveLocalVaultId({
  persistedVaultId = "",
  ownerCounts = {},
  candidateOwnerIds = [],
  createId = createVaultId,
} = {}) {
  const persisted = normalize(persistedVaultId);
  if (persisted) return persisted;

  const counts = Object.entries(ownerCounts || {}).reduce((acc, [ownerId, count]) => {
    const cleanOwnerId = normalize(ownerId);
    const safeCount = Number(count);
    if (cleanOwnerId && Number.isFinite(safeCount) && safeCount > 0) {
      acc[cleanOwnerId] = safeCount;
    }
    return acc;
  }, {});

  if (counts[LEGACY_LOCAL_VAULT_ID] > 0) return LEGACY_LOCAL_VAULT_ID;

  for (const candidate of candidateOwnerIds || []) {
    const cleanCandidate = normalize(candidate);
    if (cleanCandidate && counts[cleanCandidate] > 0) return cleanCandidate;
  }

  const existingOwners = Object.entries(counts).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });

  return existingOwners[0]?.[0] || normalize(createId()) || createVaultId();
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
  return (counts[LEGACY_LOCAL_VAULT_ID] || 0) > 0;
}

export function getActiveLocalVaultId() {
  return readStoredVaultId();
}

export function setActiveLocalVaultId(vaultId) {
  const cleanVaultId = normalize(vaultId);
  if (!cleanVaultId) throw new Error("A valid local vault ID is required.");

  writeStoredVaultId(cleanVaultId);

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
  return getActiveLocalVaultId() || setActiveLocalVaultId(createVaultId());
}

export async function initializeLocalVaultIdentity({ candidateOwnerIds = [] } = {}) {
  const persistedVaultId = getActiveLocalVaultId();
  if (persistedVaultId) return persistedVaultId;

  let ownerCounts = {};
  try {
    ownerCounts = await getLocalVaultOwnerCounts();
  } catch (error) {
    console.warn("[CLARA Vault] Existing owner scan failed.", {
      code: error?.name || "VAULT_SCAN_FAILED",
    });
  }

  const vaultId = resolveLocalVaultId({ ownerCounts, candidateOwnerIds });
  setActiveLocalVaultId(vaultId);
  console.info("[CLARA Vault] Active local vault resolved.", {
    vaultId,
    preservedLegacyVault: vaultId === LEGACY_LOCAL_VAULT_ID,
  });
  return vaultId;
}

export function getLocalVaultState() {
  const vaultId = getActiveLocalVaultId();
  return {
    vaultId: vaultId || null,
    vaultVersion: LOCAL_VAULT_VERSION,
    initialized: Boolean(vaultId),
    legacy: vaultId === LEGACY_LOCAL_VAULT_ID,
  };
}
