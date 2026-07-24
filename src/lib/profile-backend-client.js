import {
  backendRequest,
  getStoredBackendToken,
  normalizeUser,
} from "@/lib/clara-backend-client";

export async function updateCurrentBackendProfile({ name } = {}) {
  const token = getStoredBackendToken();
  if (!token) {
    const error = new Error("Your CLARA account session is not available. Log in again.");
    error.code = "ACCOUNT_SESSION_REQUIRED";
    throw error;
  }

  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Name is required.");

  const payload = await backendRequest("/api/users/me", {
    method: "PATCH",
    token,
    body: { name: cleanName },
  });

  const user = normalizeUser(payload);
  if (!user) {
    const error = new Error("CLARA returned an incomplete profile update.");
    error.code = "INVALID_USER_PROFILE";
    throw error;
  }

  return user;
}
