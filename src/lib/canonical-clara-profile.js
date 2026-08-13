import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";

export function resolveCanonicalDisplayName(profile) {
  return String(profile?.display_name || profile?.full_name || "").trim();
}

export function resolveCanonicalFirstName(profile) {
  const displayName = resolveCanonicalDisplayName(profile);
  if (!displayName || displayName.toLowerCase() === "clara user") return "";
  return displayName.split(/\s+/)[0] || "";
}

export async function fetchCanonicalClaraProfile({ token = getStoredBackendToken() } = {}) {
  if (!token) return null;
  return backendRequest("/api/community/profile/me", { token });
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
