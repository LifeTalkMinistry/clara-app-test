import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const LEGAL_INFORMATION_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedRows = null;
let cachedAt = 0;
let inFlightRequest = null;

export async function fetchBackendLegalInformation({ force = false } = {}) {
  const now = Date.now();
  if (
    !force &&
    Array.isArray(cachedRows) &&
    now - cachedAt < LEGAL_INFORMATION_CACHE_TTL_MS
  ) {
    return cachedRows;
  }

  if (!force && inFlightRequest) return inFlightRequest;

  const request = backendRequest("/api/content/legal-information")
    .then((payload) => {
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      cachedRows = rows;
      cachedAt = Date.now();
      return rows;
    })
    .finally(() => {
      if (inFlightRequest === request) inFlightRequest = null;
    });

  inFlightRequest = request;
  return request;
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
  const nextRows = Array.isArray(payload?.rows) ? payload.rows : [];
  cachedRows = nextRows;
  cachedAt = Date.now();
  return nextRows;
}

export function clearBackendLegalInformationCache() {
  cachedRows = null;
  cachedAt = 0;
  inFlightRequest = null;
}
