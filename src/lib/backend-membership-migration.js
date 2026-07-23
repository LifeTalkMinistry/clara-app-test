export const BACKEND_MEMBERSHIP_MIGRATION_MARKER =
  "clara_backend_membership_authority_migration_v1";

export const LEGACY_MEMBERSHIP_KEYS = Object.freeze([
  "clara_hidden_admin_session_v1",
  "clara_ios_access_session_v1",
  "clara_ios_access_offline_v1",
  "clara_dev_membership_preview",
  "clara_dev_plan_preview",
]);

const LOCAL_ENTITLEMENT_PREFIX = "clara_google_play_entitlement_v1:";
const LEGACY_PURCHASE_STATES = new Set(["ACCESS_CODE", "DEVELOPER_ACCESS"]);

function getStorage(name) {
  if (typeof window === "undefined") return null;
  try {
    return window[name] || null;
  } catch {
    return null;
  }
}

function parseJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function shouldNeutralizeEntitlement(record = {}) {
  return (
    String(record.grantSource || "").trim().toLowerCase() === "access_code" ||
    LEGACY_PURCHASE_STATES.has(String(record.purchaseState || "").trim().toUpperCase()) ||
    record.developerAccess === true
  );
}

function neutralizeLegacyEntitlements(storage) {
  if (!storage) return 0;
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(LOCAL_ENTITLEMENT_PREFIX)) keys.push(key);
  }

  let changed = 0;
  keys.forEach((key) => {
    const current = parseJson(storage.getItem(key));
    if (!current || !shouldNeutralizeEntitlement(current)) return;

    const next = {
      ...current,
      state: "inactive",
      previousConfirmedState: "inactive",
      purchaseState: "UNSPECIFIED",
      developerAccess: false,
      lastVerifiedAt: null,
      errorCode: "LEGACY_LOCAL_MEMBERSHIP_GRANT_REMOVED",
    };
    delete next.grantSource;
    delete next.accessCode;
    delete next.code;

    storage.setItem(key, JSON.stringify(next));
    changed += 1;
  });

  return changed;
}

export function runBackendMembershipAuthorityMigration() {
  const local = getStorage("localStorage");
  const session = getStorage("sessionStorage");

  LEGACY_MEMBERSHIP_KEYS.forEach((key) => {
    local?.removeItem(key);
    session?.removeItem(key);
  });

  const neutralizedEntitlements = neutralizeLegacyEntitlements(local);
  local?.setItem(BACKEND_MEMBERSHIP_MIGRATION_MARKER, "complete");

  return {
    marker: BACKEND_MEMBERSHIP_MIGRATION_MARKER,
    neutralizedEntitlements,
  };
}
