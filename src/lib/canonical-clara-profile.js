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

function bindCanonicalProfileToActiveLocalVault(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return profile;

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
  };

  const resolveActiveVaultId = () => String(getActiveLocalVaultId() || "").trim();

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
  if (!token) return null;
  const profile = await backendRequest("/api/community/profile/me", { token });
  return bindCanonicalProfileToActiveLocalVault(profile);
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
