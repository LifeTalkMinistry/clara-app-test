const LOCAL_VAULT_ID_KEY = "clara_local_vault_id_v1";
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

export function getLocalVaultId() {
  const storage = getStorage();
  const value = storage?.getItem(LOCAL_VAULT_ID_KEY);
  return String(value || "").trim() || null;
}

export function setLocalVaultId(localVaultId) {
  const value = String(localVaultId || "").trim();
  if (!value) throw new Error("A non-empty CLARA local vault ID is required.");

  getStorage()?.setItem(LOCAL_VAULT_ID_KEY, value);
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
  return LEGACY_LOCAL_IDS.has(String(value || "").trim());
}

export function maskLocalIdentifier(value) {
  const text = String(value || "");
  if (text.length <= 12) return text;
  return `${text.slice(0, 8)}…${text.slice(-4)}`;
}

export { LOCAL_VAULT_ID_KEY };
