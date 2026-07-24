import { getActiveLocalVaultId } from "@/lib/localVaultIdentity";

const LEGACY_MEMORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const SCOPED_MEMORY_PREFIX = "CLARA_USER_CONTEXT_STORY_V2:";
const VAULT_UPDATED_EVENT = "clara:active-local-vault-updated";
const ACCOUNT_SWITCHED_EVENT = "clara:account-vault-switched";
const MEMORY_UPDATED_EVENT = "clara-user-context-story-updated";

let activeVaultId = "";
let installed = false;

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function normalizeId(value) {
  return String(value || "").trim();
}

function scopedMemoryKey(vaultId) {
  const cleanId = normalizeId(vaultId);
  return cleanId ? `${SCOPED_MEMORY_PREFIX}${cleanId}` : "";
}

function safeGet(key) {
  if (!key) return null;
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  if (!key) return false;
  try {
    const target = storage();
    if (!target) return false;
    target.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  if (!key) return;
  try {
    storage()?.removeItem(key);
  } catch {
    // Storage can be unavailable in private/restricted browser modes.
  }
}

function archiveActiveLegacyAlias(vaultId = activeVaultId) {
  const cleanId = normalizeId(vaultId);
  if (!cleanId) return;
  const raw = safeGet(LEGACY_MEMORY_KEY);
  if (raw === null) return;
  safeSet(scopedMemoryKey(cleanId), raw);
}

function parseStory(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function broadcastLoadedMemory(raw) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  const story = parseStory(raw);
  window.dispatchEvent(
    new CustomEvent(MEMORY_UPDATED_EVENT, {
      detail: story || { sections: [], source: "account_memory_switch" },
    })
  );
}

function switchMemoryOwner(nextVaultId, { allowLegacyMigration = false } = {}) {
  const nextId = normalizeId(nextVaultId);
  const previousId = activeVaultId;

  if (previousId && previousId !== nextId) {
    archiveActiveLegacyAlias(previousId);
  }

  activeVaultId = nextId;

  if (!nextId) {
    safeRemove(LEGACY_MEMORY_KEY);
    return;
  }

  const nextKey = scopedMemoryKey(nextId);
  const scopedRaw = safeGet(nextKey);
  if (scopedRaw !== null) {
    safeSet(LEGACY_MEMORY_KEY, scopedRaw);
    broadcastLoadedMemory(scopedRaw);
    return;
  }

  const legacyRaw = safeGet(LEGACY_MEMORY_KEY);
  if (allowLegacyMigration && !previousId && legacyRaw !== null) {
    // One-time migration for the account that owns the pre-scoping memory.
    safeSet(nextKey, legacyRaw);
    broadcastLoadedMemory(legacyRaw);
    return;
  }

  // A new account must start with no inherited memory from the previous vault.
  safeRemove(LEGACY_MEMORY_KEY);
  broadcastLoadedMemory(null);
}

function syncFromCanonicalVault() {
  const nextId = normalizeId(getActiveLocalVaultId());
  if (nextId === activeVaultId) return;
  switchMemoryOwner(nextId);
}

function persistMemoryUpdate() {
  const canonicalId = normalizeId(getActiveLocalVaultId());
  if (canonicalId && canonicalId !== activeVaultId) {
    switchMemoryOwner(canonicalId);
  }
  archiveActiveLegacyAlias();
}

function handleStorageEvent(event) {
  const canonicalId = normalizeId(getActiveLocalVaultId());
  const activeKey = scopedMemoryKey(canonicalId || activeVaultId);

  if (event?.key === LEGACY_MEMORY_KEY) {
    persistMemoryUpdate();
    return;
  }

  if (activeKey && event?.key === activeKey) {
    const raw = event.newValue;
    if (raw === null) safeRemove(LEGACY_MEMORY_KEY);
    else safeSet(LEGACY_MEMORY_KEY, raw);
    broadcastLoadedMemory(raw);
  }
}

function handleVisibilityChange() {
  if (document.hidden) archiveActiveLegacyAlias();
  else syncFromCanonicalVault();
}

export function installScopedClaraMemoryStorage() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const initialVaultId = normalizeId(getActiveLocalVaultId());
  if (initialVaultId) {
    switchMemoryOwner(initialVaultId, { allowLegacyMigration: true });
  }

  window.addEventListener(VAULT_UPDATED_EVENT, syncFromCanonicalVault);
  window.addEventListener(ACCOUNT_SWITCHED_EVENT, syncFromCanonicalVault);
  window.addEventListener(MEMORY_UPDATED_EVENT, persistMemoryUpdate);
  window.addEventListener("storage", handleStorageEvent);
  window.addEventListener("pagehide", () => archiveActiveLegacyAlias());
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

installScopedClaraMemoryStorage();

export {
  LEGACY_MEMORY_KEY,
  SCOPED_MEMORY_PREFIX,
  scopedMemoryKey,
};
