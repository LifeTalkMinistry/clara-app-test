import { Capacitor } from "@capacitor/core";

const API_URL = String(import.meta.env.VITE_CLARA_ACCOUNT_API_URL || "")
  .trim()
  .replace(/\/+$/, "");
const ADMIN_SESSION_KEY = "clara_account_admin_session_v1";
const DEVICE_ID_KEY = "clara_account_device_id_v1";

let accessToken = null;
let accessTokenExpiresAt = 0;

function browserStorage(name) {
  if (typeof window === "undefined") return null;
  try {
    return window[name] || null;
  } catch {
    return null;
  }
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getAccountDeviceId() {
  const storage = browserStorage("localStorage");
  const existing = storage?.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `clara-device-${randomId()}`;
  storage?.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function getAccountPlatform() {
  try {
    if (Capacitor?.isNativePlatform?.() && Capacitor.getPlatform?.() === "android") {
      return "android";
    }
  } catch {
    // Continue with browser detection.
  }

  if (typeof navigator !== "undefined" && typeof window !== "undefined") {
    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const ios =
      /iPad|iPhone|iPod/i.test(userAgent) ||
      (platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
      navigator.standalone === true;
    if (ios && standalone) return "ios_pwa";
  }

  return "web";
}

export function isAccountApiConfigured() {
  return Boolean(API_URL);
}

export function getAccountApiUrl() {
  return API_URL;
}

function configurationError() {
  const error = new Error(
    "CLARA account login is not configured yet. Set VITE_CLARA_ACCOUNT_API_URL to the deployed custom account API."
  );
  error.code = "account_api_not_configured";
  return error;
}

function saveAccessSession(session) {
  accessToken = session?.accessToken || null;
  accessTokenExpiresAt = Date.parse(session?.expiresAt || "") || 0;
}

export function clearAccountAccessSession() {
  accessToken = null;
  accessTokenExpiresAt = 0;
}

export function hasLiveAccountAccessToken() {
  return Boolean(accessToken && accessTokenExpiresAt > Date.now() + 5_000);
}

async function parseResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.message || "CLARA account service could not complete the request.");
    error.code = payload?.code || `http_${response.status}`;
    error.status = response.status;
    throw error;
  }

  return payload || { ok: true };
}

async function apiRequest(path, { method = "GET", body, token = null } = {}) {
  if (!API_URL) throw configurationError();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-CLARA-Device-ID": getAccountDeviceId(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse(response);
}

function applyAuthEnvelope(payload) {
  if (payload?.session) saveAccessSession(payload.session);
  return payload;
}

export async function signUpAccount({ displayName, email, password }) {
  return applyAuthEnvelope(
    await apiRequest("/auth/signup", {
      method: "POST",
      body: { displayName, email, password, platform: getAccountPlatform() },
    })
  );
}

export async function signInAccount({ email, password }) {
  return applyAuthEnvelope(
    await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password, platform: getAccountPlatform() },
    })
  );
}

export async function refreshAccountSession() {
  return applyAuthEnvelope(await apiRequest("/auth/refresh", { method: "POST" }));
}

export async function signOutAccount() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    clearAccountAccessSession();
  }
}

export async function signOutAllAccounts() {
  try {
    await authorizedRequest("/auth/logout-all", { method: "POST" });
  } finally {
    clearAccountAccessSession();
  }
}

export async function authorizedRequest(path, options = {}) {
  if (!hasLiveAccountAccessToken()) await refreshAccountSession();
  try {
    return await apiRequest(path, { ...options, token: accessToken });
  } catch (error) {
    if (error?.status !== 401) throw error;
    await refreshAccountSession();
    return apiRequest(path, { ...options, token: accessToken });
  }
}

export function fetchCurrentAccount() {
  return authorizedRequest("/auth/me");
}

export function fetchMembershipStatus() {
  return authorizedRequest("/membership/status");
}

export async function changeAccountPassword(newPassword) {
  return applyAuthEnvelope(
    await authorizedRequest("/auth/change-password", {
      method: "POST",
      body: { newPassword },
    })
  );
}

function readAdminSession() {
  const storage = browserStorage("sessionStorage");
  try {
    const value = JSON.parse(storage?.getItem(ADMIN_SESSION_KEY) || "null");
    if (!value?.accessToken || Date.parse(value.expiresAt || "") <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

function saveAdminSession(session) {
  const storage = browserStorage("sessionStorage");
  storage?.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({ accessToken: session?.accessToken, expiresAt: session?.expiresAt })
  );
}

export function clearHiddenAdminSession() {
  browserStorage("sessionStorage")?.removeItem(ADMIN_SESSION_KEY);
}

export function hasHiddenAdminSession() {
  return Boolean(readAdminSession());
}

export async function verifyHiddenAdminPassword(password) {
  const payload = await apiRequest("/admin/login", { method: "POST", body: { password } });
  saveAdminSession(payload.session);
  return payload;
}

async function refreshAdminSession() {
  const payload = await apiRequest("/admin/refresh", { method: "POST" });
  saveAdminSession(payload.session);
  return payload.session;
}

async function adminRequest(path, options = {}) {
  let session = readAdminSession();
  if (!session) session = await refreshAdminSession();
  try {
    return await apiRequest(path, { ...options, token: session.accessToken });
  } catch (error) {
    if (error?.status !== 401) throw error;
    session = await refreshAdminSession();
    return apiRequest(path, { ...options, token: session.accessToken });
  }
}

export async function signOutHiddenAdmin() {
  try {
    await adminRequest("/admin/logout", { method: "POST" });
  } finally {
    clearHiddenAdminSession();
  }
}

export function fetchAdminUsers(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return adminRequest(`/admin/users${query ? `?${query}` : ""}`);
}

export function fetchAdminUser(userId) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}`);
}

export function updateAdminUserProfile(userId, patch) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}/profile`, {
    method: "PATCH",
    body: patch,
  });
}

export function updateAdminAccountStatus(userId, accountStatus) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}/account-status`, {
    method: "PATCH",
    body: { accountStatus },
  });
}

export function updateAdminMembership(userId, patch) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}/membership`, {
    method: "PATCH",
    body: patch,
  });
}

export function setAdminTemporaryPassword(userId, temporaryPassword) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}/set-temporary-password`, {
    method: "POST",
    body: { temporaryPassword },
  });
}

export function revokeAdminUserSessions(userId) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}/revoke-sessions`, {
    method: "POST",
  });
}

export function addAdminUserNote(userId, note) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}/notes`, {
    method: "POST",
    body: { note },
  });
}

export function softDeleteAdminUser(userId) {
  return adminRequest(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    body: { confirmation: "DELETE" },
  });
}

export function fetchLegacyIosAccessRecords() {
  return adminRequest("/admin/legacy-ios-access");
}

export function linkLegacyIosAccessRecord(recordId, userId) {
  return adminRequest(`/admin/legacy-ios-access/${encodeURIComponent(recordId)}/link`, {
    method: "POST",
    body: { userId },
  });
}
