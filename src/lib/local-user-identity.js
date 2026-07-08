const LOCAL_VAULT_ID_KEY = "clara_local_vault_id_v1";
const LEGACY_ACTIVE_LOCAL_VAULT_KEY = "clara_active_local_vault_v1";
const LEGACY_LOCAL_IDS = new Set(["local-dev-user", "local-user"]);

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function createUuid() {
  if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function normalizeId(value) {
  return String(value || "").trim();
}

export function getLocalVaultId() {
  const storage = getStorage();
  if (!storage) return null;

  const current = normalizeId(storage.getItem(LOCAL_VAULT_ID_KEY));
  if (current) return current;

  // Adopt the previous persisted vault ID when it is a real stable ID. Temporary
  // compatibility identities are intentionally not promoted to canonical status.
  const legacy = normalizeId(storage.getItem(LEGACY_ACTIVE_LOCAL_VAULT_KEY));
  if (legacy && !LEGACY_LOCAL_IDS.has(legacy)) {
    storage.setItem(LOCAL_VAULT_ID_KEY, legacy);
    storage.removeItem(LEGACY_ACTIVE_LOCAL_VAULT_KEY);
    return legacy;
  }

  return null;
}

export function setLocalVaultId(localVaultId) {
  const value = normalizeId(localVaultId);
  if (!value) throw new Error("A non-empty CLARA local vault ID is required.");
  if (LEGACY_LOCAL_IDS.has(value)) {
    throw new Error("A temporary CLARA identity cannot become the canonical local vault ID.");
  }

  const storage = getStorage();
  storage?.setItem(LOCAL_VAULT_ID_KEY, value);
  storage?.removeItem(LEGACY_ACTIVE_LOCAL_VAULT_KEY);
  return value;
}

export function getOrCreateLocalVaultId() {
  const existing = getLocalVaultId();
  if (existing) return existing;

  const created = `clara_local_${createUuid()}`;
  setLocalVaultId(created);
  console.info("[CLARA Local Identity] created stable local vault", {
    localVaultId: maskLocalIdentifier(created),
  });
  return created;
}

export function buildLocalAuthUser(localVaultId = getOrCreateLocalVaultId(), profile = {}) {
  const displayName =
    String(profile?.display_name || profile?.full_name || "CLARA User").trim() ||
    "CLARA User";

  return {
    id: localVaultId,
    email: null,
    display_name: displayName,
    full_name: displayName,
    role: "user",
    is_local_user: true,
    app_metadata: {},
    user_metadata: {
      full_name: displayName,
      name: displayName,
      display_name: displayName,
      role: "user",
    },
  };
}

export function isLegacyLocalUserId(value) {
  return LEGACY_LOCAL_IDS.has(normalizeId(value));
}

export function maskLocalIdentifier(value) {
  const text = String(value || "");
  if (text.length <= 12) return text;
  return `${text.slice(0, 8)}…${text.slice(-4)}`;
}

export { LOCAL_VAULT_ID_KEY, LEGACY_ACTIVE_LOCAL_VAULT_KEY };
