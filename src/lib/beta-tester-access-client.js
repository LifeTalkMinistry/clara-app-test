import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

export function normalizeBetaTesterCodeInput(value) {
  const compact = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const suffix = compact.startsWith("CLARA") ? compact.slice(5) : compact;
  return suffix.slice(0, 6);
}

export async function redeemBetaTesterCode(code) {
  const token = getStoredBackendToken();
  if (!token) {
    const error = new Error("Sign in to your CLARA account before activating beta access.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }

  const normalizedCode = normalizeBetaTesterCodeInput(code);
  if (normalizedCode.length !== 6) {
    const error = new Error("Enter your complete 6-character beta tester code.");
    error.code = "INVALID_BETA_CODE_FORMAT";
    throw error;
  }

  return backendRequest("/api/users/me/redeem-beta-code", {
    method: "POST",
    token,
    body: { code: normalizedCode },
  });
}
