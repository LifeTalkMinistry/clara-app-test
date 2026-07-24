import {
  ensureActiveLocalVaultId,
  getActiveLocalVaultId,
} from "@/lib/localVaultIdentity";

const LEGACY_MEMORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const SCOPED_MEMORY_PREFIX = "CLARA_USER_CONTEXT_STORY_V2:";
const LEGACY_BEHAVIORAL_MEMORY_KEY = "clara_behavioral_memory_v1";
const SCOPED_BEHAVIORAL_MEMORY_PREFIX = "clara_behavioral_memory_v2:";
const LIVE_USER_MESSAGE_HISTORY_KEY = "CLARA_LIVE_USER_MESSAGE_HISTORY";
const VAULT_UPDATED_EVENT = "clara:active-local-vault-updated";
const ACCOUNT_SWITCHED_EVENT = "clara:account-vault-switched";
const MEMORY_UPDATED_EVENT = "clara-user-context-story-updated";
const BEHAVIORAL_MEMORY_UPDATED_EVENT = "clara-behavioral-memory-updated";

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

function sessionStorageSafe() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function normalizeId(value) {
  return String(value || "").trim();
}

function canonicalVaultId() {
  return normalizeId(getActiveLocalVaultId() || ensureActiveLocalVaultId());
}

function scopedMemoryKey(vaultId) {
  const cleanId = normalizeId(vaultId);
  return cleanId ? `${SCOPED_MEMORY_PREFIX}${cleanId}` : "";
}

function scopedBehavioralMemoryKey(vaultId) {
  const cleanId = normalizeId(vaultId);
  return cleanId ? `${SCOPED_BEHAVIORAL_MEMORY_PREFIX}${cleanId}` : "";
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

function clearLiveSessionMemory() {
  try {
    sessionStorageSafe()?.removeItem(LIVE_USER_MESSAGE_HISTORY_KEY);
    if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("clara-live-user-message-history-updated", { detail: [] })
      );
    }
  } catch {
    // Live overlay history is optional and must never block an account switch.
  }
}

function archiveActiveStoryAlias(vaultId = activeVaultId) {
  const cleanId = normalizeId(vaultId);
  if (!cleanId) return;
  const raw = safeGet(LEGACY_MEMORY_KEY);
  if (raw === null) return;
  safeSet(scopedMemoryKey(cleanId), raw);
}

function archiveActiveBehavioralAlias(vaultId = activeVaultId) {
  const cleanId = normalizeId(vaultId);
  if (!cleanId) return;
  const raw = safeGet(LEGACY_BEHAVIORAL_MEMORY_KEY);
  if (raw === null) return;
  safeSet(scopedBehavioralMemoryKey(cleanId), raw);
}

function parseObject(raw) {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function emptyBehavioralSnapshot() {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    items: {},
  };
}

function broadcastLoadedStory(raw) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  const story = parseObject(raw);
  window.dispatchEvent(
    new CustomEvent(MEMORY_UPDATED_EVENT, {
      detail: story || { sections: [], source: "account_memory_switch" },
    })
  );
}

function broadcastLoadedBehavioralMemory(snapshot) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  const normalized =
    snapshot && typeof snapshot === "object" ? snapshot : emptyBehavioralSnapshot();
  window.dispatchEvent(
    new CustomEvent(BEHAVIORAL_MEMORY_UPDATED_EVENT, {
      detail: { ...normalized, reason: "account_memory_switch" },
    })
  );
}

function loadStoryForVault(nextId, { allowLegacyMigration = false, previousId = "" } = {}) {
  const nextKey = scopedMemoryKey(nextId);
  const scopedRaw = safeGet(nextKey);
  if (scopedRaw !== null) {
    safeSet(LEGACY_MEMORY_KEY, scopedRaw);
    broadcastLoadedStory(scopedRaw);
    return;
  }

  const legacyRaw = safeGet(LEGACY_MEMORY_KEY);
  if (allowLegacyMigration && !previousId && legacyRaw !== null) {
    safeSet(nextKey, legacyRaw);
    broadcastLoadedStory(legacyRaw);
    return;
  }

  // A new account must start with no inherited story from the previous vault.
  safeRemove(LEGACY_MEMORY_KEY);
  broadcastLoadedStory(null);
}

function loadBehavioralMemoryForVault(
  nextId,
  { allowLegacyMigration = false, previousId = "" } = {}
) {
  const nextKey = scopedBehavioralMemoryKey(nextId);
  const scopedRaw = safeGet(nextKey);
  if (scopedRaw !== null) {
    const parsed = parseObject(scopedRaw) || emptyBehavioralSnapshot();
    safeSet(LEGACY_BEHAVIORAL_MEMORY_KEY, JSON.stringify(parsed));
    broadcastLoadedBehavioralMemory(parsed);
    return;
  }

  const legacyRaw = safeGet(LEGACY_BEHAVIORAL_MEMORY_KEY);
  if (allowLegacyMigration && !previousId && legacyRaw !== null) {
    const parsed = parseObject(legacyRaw) || emptyBehavioralSnapshot();
    const normalizedRaw = JSON.stringify(parsed);
    safeSet(nextKey, normalizedRaw);
    safeSet(LEGACY_BEHAVIORAL_MEMORY_KEY, normalizedRaw);
    broadcastLoadedBehavioralMemory(parsed);
    return;
  }

  // Keep an explicit empty alias for a brand-new account. clara-memory-bridge
  // checks this legacy alias before hydrating its historical global IndexedDB
  // record, so the empty snapshot prevents another account's old active_profile
  // record from being resurrected into this vault.
  const emptySnapshot = emptyBehavioralSnapshot();
  const emptyRaw = JSON.stringify(emptySnapshot);
  safeSet(nextKey, emptyRaw);
  safeSet(LEGACY_BEHAVIORAL_MEMORY_KEY, emptyRaw);
  broadcastLoadedBehavioralMemory(emptySnapshot);
}

function switchMemoryOwner(nextVaultId, { allowLegacyMigration = false } = {}) {
  const nextId = normalizeId(nextVaultId);
  const previousId = activeVaultId;

  if (previousId && previousId !== nextId) {
    archiveActiveStoryAlias(previousId);
    archiveActiveBehavioralAlias(previousId);
    clearLiveSessionMemory();
  }

  activeVaultId = nextId;

  if (!nextId) {
    safeRemove(LEGACY_MEMORY_KEY);
    safeSet(
      LEGACY_BEHAVIORAL_MEMORY_KEY,
      JSON.stringify(emptyBehavioralSnapshot())
    );
    clearLiveSessionMemory();
    return;
  }

  loadStoryForVault(nextId, { allowLegacyMigration, previousId });
  loadBehavioralMemoryForVault(nextId, { allowLegacyMigration, previousId });
}

function syncFromCanonicalVault() {
  const nextId = canonicalVaultId();
  if (nextId === activeVaultId) return;
  switchMemoryOwner(nextId);
}

function persistStoryMemoryUpdate() {
  const canonicalId = canonicalVaultId();
  if (canonicalId && canonicalId !== activeVaultId) {
    switchMemoryOwner(canonicalId);
  }
  archiveActiveStoryAlias();
}

function persistBehavioralMemoryUpdate() {
  const canonicalId = canonicalVaultId();
  if (canonicalId && canonicalId !== activeVaultId) {
    switchMemoryOwner(canonicalId);
  }
  archiveActiveBehavioralAlias();
}

function handleStorageEvent(event) {
  const canonicalId = canonicalVaultId();
  const ownerId = canonicalId || activeVaultId;
  const activeStoryKey = scopedMemoryKey(ownerId);
  const activeBehavioralKey = scopedBehavioralMemoryKey(ownerId);

  if (event?.key === LEGACY_MEMORY_KEY) {
    persistStoryMemoryUpdate();
    return;
  }
  if (event?.key === LEGACY_BEHAVIORAL_MEMORY_KEY) {
    persistBehavioralMemoryUpdate();
    return;
  }

  if (activeStoryKey && event?.key === activeStoryKey) {
    const raw = event.newValue;
    if (raw === null) safeRemove(LEGACY_MEMORY_KEY);
    else safeSet(LEGACY_MEMORY_KEY, raw);
    broadcastLoadedStory(raw);
    return;
  }

  if (activeBehavioralKey && event?.key === activeBehavioralKey) {
    const parsed = parseObject(event.newValue) || emptyBehavioralSnapshot();
    safeSet(LEGACY_BEHAVIORAL_MEMORY_KEY, JSON.stringify(parsed));
    broadcastLoadedBehavioralMemory(parsed);
  }
}

function archiveAllActiveMemory() {
  archiveActiveStoryAlias();
  archiveActiveBehavioralAlias();
}

function handleVisibilityChange() {
  if (document.hidden) archiveAllActiveMemory();
  else syncFromCanonicalVault();
}

export function installScopedClaraMemoryStorage() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const initialVaultId = canonicalVaultId();
  switchMemoryOwner(initialVaultId, { allowLegacyMigration: true });

  window.addEventListener(VAULT_UPDATED_EVENT, syncFromCanonicalVault);
  window.addEventListener(ACCOUNT_SWITCHED_EVENT, syncFromCanonicalVault);
  window.addEventListener(MEMORY_UPDATED_EVENT, persistStoryMemoryUpdate);
  window.addEventListener(
    BEHAVIORAL_MEMORY_UPDATED_EVENT,
    persistBehavioralMemoryUpdate
  );
  window.addEventListener("storage", handleStorageEvent);
  window.addEventListener("pagehide", archiveAllActiveMemory);
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

installScopedClaraMemoryStorage();

export {
  LEGACY_MEMORY_KEY,
  SCOPED_MEMORY_PREFIX,
  LEGACY_BEHAVIORAL_MEMORY_KEY,
  SCOPED_BEHAVIORAL_MEMORY_PREFIX,
  scopedMemoryKey,
  scopedBehavioralMemoryKey,
};
