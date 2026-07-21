const DEFAULT_API_URL = "https://groin-mothproof-sixties.ngrok-free.dev";
const TOKEN_KEY = "clara_backend_access_token_v1";
const USER_KEY = "clara_backend_user_v1";

function getBuildEnvironment() {
  try {
    return import.meta.env || {};
  } catch {
    return {};
  }
}

const API_URL = String(getBuildEnvironment().VITE_CLARA_API_URL || DEFAULT_API_URL)
  .trim()
  .replace(/\/+$/, "");

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
  if (error?.code === "NETWORK_ERROR") return true;
  const message = String(error?.message || "").toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed")
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

export async function backendRequest(path, { method = "GET", body, token } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    const error = new Error("CLARA could not reach the account server.");
    error.code = "NETWORK_ERROR";
    error.cause = cause;
    throw error;
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

export async function fetchCurrentBackendUser(token = getStoredBackendToken()) {
  if (!token) return null;
  const user = normalizeUser(
    await backendRequest("/api/users/me", {
      token,
    })
  );

  if (!user) {
    throw new Error("CLARA returned an incomplete user profile.");
  }

  getStorage()?.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function restoreClaraBackendSession() {
  const token = getStoredBackendToken();
  if (!isStoredTokenLive(token)) {
    clearBackendSession();
    return null;
  }

  try {
    const user = await fetchCurrentBackendUser(token);
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

export { DEFAULT_API_URL, TOKEN_KEY, USER_KEY };
