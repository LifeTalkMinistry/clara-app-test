import {
  getClaraBackendUrl,
  getStoredBackendToken,
} from "./clara-backend-client";

const REQUEST_TIMEOUT_MS = 20_000;

async function cloudVaultRequest(path, options = {}) {
  const token = getStoredBackendToken();
  if (!token) {
    const error = new Error("Sign in to your CLARA account before using Online Sync.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getClaraBackendUrl()}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload?.message || `Cloud vault request failed (${response.status}).`);
      error.status = response.status;
      error.code = payload?.code || `HTTP_${response.status}`;
      error.details = payload?.details || null;
      throw error;
    }

    return payload || {};
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Online Sync did not respond in time.");
      timeoutError.code = "CLOUD_SYNC_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function fetchCloudVaultStatus({ includeSnapshot = false } = {}) {
  const query = includeSnapshot ? "?includeSnapshot=true" : "";
  return cloudVaultRequest(`/api/cloud-vault${query}`);
}

export function setCloudVaultStorageMode(mode) {
  return cloudVaultRequest("/api/cloud-vault/mode", {
    method: "PUT",
    body: { mode },
  });
}

export function uploadCloudVaultSnapshot({ snapshot, baseRevision, deviceId }) {
  return cloudVaultRequest("/api/cloud-vault", {
    method: "PUT",
    body: { snapshot, baseRevision, deviceId },
  });
}

export function deleteCloudVaultSnapshot() {
  return cloudVaultRequest("/api/cloud-vault", { method: "DELETE" });
}
