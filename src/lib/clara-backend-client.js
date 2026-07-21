const DEFAULT_API_URL = "https://groin-mothproof-sixties.ngrok-free.dev";
const VERCEL_API_PROXY_PATH = "/clara-api";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_KEY = "clara_backend_access_token_v1";
const USER_KEY = "clara_backend_user_v1";

function getBuildEnvironment() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

function isVercelWebRuntime() {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location?.hostname || "").trim().toLowerCase();
  return hostname === "clara-app-test.vercel.app" || hostname.endsWith(".vercel.app");
}

function resolveApiUrl() {
  const configuredUrl = String(getBuildEnvironment().VITE_CLARA_API_URL || "").trim();
  if (configuredUrl) return configuredUrl;
  return isVercelWebRuntime() ? VERCEL_API_PROXY_PATH : DEFAULT_API_URL;
}

const API_URL = resolveApiUrl().replace(/\/+$/, "");

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function normalizeUser(user = {}) {
  if (!user?.id) return null;
  return {
    id: user.id,
    name: String(user.name || "CLARA User").trim() || "CLARA User",
    email: String(user.email || "").trim().toLowerCase(),
    role: String(user.role || "user").trim().toLowerCase() || "user",
    created_at: user.created_at || null,
  };
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  return "";
}

function createRequestTimeoutError(timeoutMs) {
  const error = new Error(`CLARA account server did not respond within ${timeoutMs}ms.`);
  error.code = "REQUEST_TIMEOUT";
  error.timeoutMs = timeoutMs;
  return error;
}

export function readJwtPayload(token) {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

export function isStoredTokenLive(token, now = Date.now()) {
  const payload = readJwtPayload(token);
  const expiresAt = Number(payload?.exp || 0) * 1000;
  return Boolean(token && Number.isFinite(expiresAt) && expiresAt > now + 5_000);
}

export function isBackendNetworkError(error) {
  if (error?.code === "NETWORK_ERROR" || error?.code === "REQUEST_TIMEOUT") return true;
  const message = String(error?.message || "").toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("timed out") ||
    message.includes("did not respond")
  );
}

export function getClaraBackendUrl() {
  return API_URL;
}

export function getStoredBackendToken() {
  return getStorage()?.getItem(TOKEN_KEY) || null;
}

export function getStoredBackendUser() {
  try {
    const parsed = JSON.parse(getStorage()?.getItem(USER_KEY) || "null");
    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

function saveBackendSession({ token, user }) {
  const storage = getStorage();
  const normalizedUser = normalizeUser(user);
  if (!token || !normalizedUser) {
    throw new Error("CLARA returned an incomplete authentication response.");
  }
  storage?.setItem(TOKEN_KEY, token);
  storage?.setItem(USER_KEY, JSON.stringify(normalizedUser));
  return { token, user: normalizedUser };
}

export function clearBackendSession() {
  const storage = getStorage();
  storage?.removeItem(TOKEN_KEY);
  storage?.removeItem(USER_KEY);
}

async function parseResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `CLARA request failed with status ${response.status}.`);
    error.status = response.status;
    error.code = `HTTP_${response.status}`;
    throw error;
  }

  return payload;
}

export async function backendRequest(
  path,
  { method = "GET", body, token, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}
) {
  const numericTimeout = Number(timeoutMs);
  const effectiveTimeoutMs = Number.isFinite(numericTimeout)
    ? Math.max(0, numericTimeout)
    : DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  let timeoutId = null;
  let timedOut = false;
  let response;

  try {
    const requestPromise = fetch(`${API_URL}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...(controller ? { signal: controller.signal } : {}),
    });

    if (effectiveTimeoutMs > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          controller?.abort();
          reject(createRequestTimeoutError(effectiveTimeoutMs));
        }, effectiveTimeoutMs);
      });
      response = await Promise.race([requestPromise, timeoutPromise]);
    } else {
      response = await requestPromise;
    }
  } catch (cause) {
    if (cause?.code === "REQUEST_TIMEOUT" || timedOut) {
      throw createRequestTimeoutError(effectiveTimeoutMs);
    }

    const error = new Error("CLARA could not reach the account server.");
    error.code = "NETWORK_ERROR";
    error.cause = cause;
    throw error;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }

  return parseResponse(response);
}

export async function signInWithClaraBackend({ email, password }) {
  const payload = await backendRequest("/api/login", {
    method: "POST",
    body: { email: String(email || "").trim(), password: String(password || "") },
  });
  return saveBackendSession(payload || {});
}

export async function createClaraBackendAccount({ name, email, password }) {
  await backendRequest("/api/users", {
    method: "POST",
    body: {
      name: String(name || "").trim(),
      email: String(email || "").trim(),
      password: String(password || ""),
    },
  });

  return signInWithClaraBackend({ email, password });
}

export async function fetchCurrentBackendUser(
  token = getStoredBackendToken(),
  { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}
) {
  if (!token) return null;
  const user = normalizeUser(
    await backendRequest("/api/users/me", {
      token,
      timeoutMs,
    })
  );

  if (!user) {
    throw new Error("CLARA returned an incomplete user profile.");
  }

  getStorage()?.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function restoreClaraBackendSession({ timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}) {
  const token = getStoredBackendToken();
  if (!isStoredTokenLive(token)) {
    clearBackendSession();
    return null;
  }

  try {
    const user = await fetchCurrentBackendUser(token, { timeoutMs });
    return { token, user, offline: false };
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearBackendSession();
      return null;
    }

    const cachedUser = getStoredBackendUser();
    if (cachedUser && isBackendNetworkError(error)) {
      return { token, user: cachedUser, offline: true };
    }

    throw error;
  }
}

export function signOutFromClaraBackend() {
  clearBackendSession();
}

export {
  DEFAULT_API_URL,
  DEFAULT_REQUEST_TIMEOUT_MS,
  TOKEN_KEY,
  USER_KEY,
  VERCEL_API_PROXY_PATH,
};