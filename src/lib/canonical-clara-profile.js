import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";
import { getActiveLocalVaultId } from "@/lib/localVaultIdentity";

export function resolveCanonicalDisplayName(profile) {
  return String(profile?.display_name || "").trim();
}

export function resolveCanonicalFirstName(profile) {
  const displayName = resolveCanonicalDisplayName(profile);
  if (!displayName || displayName.toLowerCase() === "clara user") return "";
  return displayName.split(/\s+/)[0] || "";
}

function getLocalFinanceIdentity() {
  return String(getActiveLocalVaultId() || "").trim();
}

function createLocalProfileFallback() {
  const localVaultId = getLocalFinanceIdentity();

  // Display/account identity may be unavailable while CLARA's finance vault is
  // still fully usable on this device. Returning a finance-only compatibility
  // profile lets local financial readers keep working without pretending that
  // the user has an authenticated Community/account profile.
  return {
    display_name: "",
    account_id: null,
    backend_profile_id: null,
    id: localVaultId || "local-user",
    local_vault_id: localVaultId || null,
    finance_identity_only: true,
  };
}

function bindCanonicalProfileToActiveLocalVault(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return createLocalProfileFallback();
  }

  const backendProfileId =
    profile.account_id ||
    profile.backend_profile_id ||
    profile.id ||
    profile.user_id ||
    profile.userId ||
    null;

  const nextProfile = {
    ...profile,
    account_id: profile.account_id || backendProfileId,
    backend_profile_id: profile.backend_profile_id || backendProfileId,
    finance_identity_only: false,
  };

  const resolveActiveVaultId = () => getLocalFinanceIdentity();

  // The canonical Community profile owns display identity, but local finance
  // records are owned by the active device vault. The Orb historically reads
  // profile.id as its finance owner, so expose the active vault through that
  // compatibility field while preserving the backend identity separately.
  Object.defineProperty(nextProfile, "id", {
    configurable: true,
    enumerable: true,
    get() {
      return resolveActiveVaultId() || backendProfileId;
    },
  });

  Object.defineProperty(nextProfile, "local_vault_id", {
    configurable: true,
    enumerable: true,
    get() {
      return resolveActiveVaultId() || null;
    },
  });

  return nextProfile;
}

export async function fetchCanonicalClaraProfile({ token = getStoredBackendToken() } = {}) {
  // Local finance must never depend on the account server being reachable.
  // The Orb uses this compatibility profile to resolve its local vault owner,
  // while authenticated Community/display identity remains backend-owned.
  if (!token) return createLocalProfileFallback();

  try {
    const profile = await backendRequest("/api/community/profile/me", { token });
    return bindCanonicalProfileToActiveLocalVault(profile);
  } catch (error) {
    console.warn("CLARA account profile unavailable; continuing with local finance identity.", error);
    return createLocalProfileFallback();
  }
}

export async function updateCanonicalClaraDisplayName(displayName, { token = getStoredBackendToken() } = {}) {
  if (!token) {
    const error = new Error("Your CLARA account session is not available. Log in again.");
    error.code = "ACCOUNT_SESSION_REQUIRED";
    throw error;
  }
  const cleanName = String(displayName || "").trim();
  if (!cleanName) throw new Error("Name is required.");
  return backendRequest("/api/community/profile/me", {
    method: "PATCH",
    token,
    body: { display_name: cleanName },
  });
}