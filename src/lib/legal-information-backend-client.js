import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

export async function fetchBackendLegalInformation() {
  const payload = await backendRequest("/api/content/legal-information");
  return Array.isArray(payload?.rows) ? payload.rows : [];
}

export async function updateBackendLegalInformation(rows = []) {
  const token = getStoredBackendToken();
  if (!token) {
    const error = new Error("Your CLARA admin session is not available. Log in again.");
    error.code = "ADMIN_SESSION_REQUIRED";
    throw error;
  }

  const payload = await backendRequest("/api/admin/legal-information", {
    method: "PUT",
    token,
    body: { rows },
  });
  return Array.isArray(payload?.rows) ? payload.rows : [];
}
