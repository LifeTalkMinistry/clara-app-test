import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

export async function fetchCurrentBackendBilling() {
  const token = getStoredBackendToken();
  if (!token) return null;

  const payload = await backendRequest("/api/users/me/billing", { token });
  return payload?.billing || null;
}
