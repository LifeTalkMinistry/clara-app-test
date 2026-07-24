import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const BILLING_CACHE_TTL_MS = 15_000;

let cachedToken = "";
let cachedBilling = null;
let cachedAt = 0;
let inFlightToken = "";
let inFlightRequest = null;

export async function fetchCurrentBackendBilling({ force = false } = {}) {
  const token = getStoredBackendToken();
  if (!token) {
    cachedToken = "";
    cachedBilling = null;
    cachedAt = 0;
    inFlightToken = "";
    inFlightRequest = null;
    return null;
  }

  const now = Date.now();
  if (
    !force &&
    cachedToken === token &&
    now - cachedAt < BILLING_CACHE_TTL_MS
  ) {
    return cachedBilling;
  }

  if (!force && inFlightRequest && inFlightToken === token) {
    return inFlightRequest;
  }

  inFlightToken = token;
  const request = backendRequest("/api/users/me/billing", { token })
    .then((payload) => {
      const billing = payload?.billing || null;
      cachedToken = token;
      cachedBilling = billing;
      cachedAt = Date.now();
      return billing;
    })
    .finally(() => {
      if (inFlightRequest === request) {
        inFlightRequest = null;
        inFlightToken = "";
      }
    });

  inFlightRequest = request;
  return request;
}

export function clearCurrentBackendBillingCache() {
  cachedToken = "";
  cachedBilling = null;
  cachedAt = 0;
  inFlightToken = "";
  inFlightRequest = null;
}
