import { Capacitor } from "@capacitor/core";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateLocalVaultId } from "@/lib/local-user-identity";
import {
  getLocalGooglePlayEntitlement,
  saveLocalGooglePlayEntitlement,
} from "@/lib/local-google-play-entitlement";

const IOS_ACCESS_FUNCTION = "clara-ios-access";
const IOS_ACCESS_SESSION_KEY = "clara_ios_access_session_v1";
const IOS_ACCESS_OFFLINE_KEY = "clara_ios_access_offline_v1";
const HIDDEN_ADMIN_SESSION_KEY = "clara_hidden_admin_session_v1";
const COMMITTED_PLAN_KEY = "committed_249";

// Supabase publishable credentials are intentionally public client identifiers,
// not secrets. All sensitive operations remain protected inside the Edge Function.
const IOS_ACCESS_SUPABASE_URL = "https://aydgnziueszxxhusatsv.supabase.co";
const IOS_ACCESS_PUBLISHABLE_KEY = "sb_publishable_mp0vfLH556XEuNEvLllcrw_JfPJgTWk";

const iosAccessSupabase = createClient(
  IOS_ACCESS_SUPABASE_URL,
  IOS_ACCESS_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

function readStorage(storage, key) {
  try {
    const value = storage?.getItem?.(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    storage?.setItem?.(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private mode. The server remains authoritative.
  }
}

function removeStorage(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // Ignore unavailable storage.
  }
}

function normalizeAccessPlanKey(value) {
  return String(value || "").trim() === COMMITTED_PLAN_KEY
    ? COMMITTED_PLAN_KEY
    : "free";
}

function applyAccessCodeMembership({ planKey, userId, expiresAt, verifiedAt }) {
  if (typeof window === "undefined") return;

  const localUserId = String(userId || getOrCreateLocalVaultId() || "").trim();
  if (!localUserId) return;

  const normalizedPlanKey = normalizeAccessPlanKey(planKey);
  const timestamp = verifiedAt || new Date().toISOString();
  const current = getLocalGooglePlayEntitlement(localUserId);

  if (normalizedPlanKey === COMMITTED_PLAN_KEY) {
    saveLocalGooglePlayEntitlement(localUserId, {
      state: "active",
      purchaseState: "ACCESS_CODE",
      acknowledged: true,
      lastVerifiedAt: timestamp,
      lastSuccessfulQueryAt: timestamp,
      previousConfirmedState: "active",
      grantSource: "access_code",
      accessCodeExpiresAt: expiresAt || null,
      purchaseTokenMasked: null,
      orderIdMasked: null,
      errorCode: null,
    });
    return;
  }

  if (current?.grantSource === "access_code") {
    saveLocalGooglePlayEntitlement(localUserId, {
      state: "inactive",
      purchaseState: "UNSPECIFIED",
      acknowledged: null,
      lastVerifiedAt: timestamp,
      lastSuccessfulQueryAt: timestamp,
      previousConfirmedState: null,
      grantSource: null,
      accessCodeExpiresAt: null,
      purchaseTokenMasked: null,
      orderIdMasked: null,
      errorCode: null,
    });
  }
}

function getRuntimePlatform() {
  try {
    if (Capacitor?.isNativePlatform?.()) {
      return Capacitor.getPlatform?.() || "native";
    }
  } catch {
    // Fall through to the window bridge check.
  }

  try {
    if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
      return window.Capacitor.getPlatform?.() || "native";
    }
  } catch {
    // Treat as a normal browser when the bridge is not available.
  }

  return "web";
}

export function isNativeAndroidApp() {
  return getRuntimePlatform() === "android";
}

export function isIosStandalonePwa() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (getRuntimePlatform() !== "web") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    navigator.standalone === true;

  return isIosDevice && isStandalone;
}

async function readFunctionErrorPayload(error) {
  const context = error?.context;

  try {
    if (typeof Response !== "undefined" && context instanceof Response) {
      return await context.clone().json();
    }
  } catch {
    // Fall through to other supported Functions error shapes.
  }

  if (context?.body && typeof context.body === "object") return context.body;
  if (context?.data && typeof context.data === "object") return context.data;
  return null;
}

async function invokeIosAccess(body) {
  let result;

  try {
    result = await iosAccessSupabase.functions.invoke(IOS_ACCESS_FUNCTION, { body });
  } catch (error) {
    const networkError = new Error("CLARA could not reach the access service. Check your connection and try again.");
    networkError.code = "network_error";
    networkError.cause = error;
    throw networkError;
  }

  const { data, error } = result || {};

  if (error) {
    const payload = await readFunctionErrorPayload(error);
    const accessError = new Error(
      payload?.message ||
        (error?.name === "FunctionsFetchError"
          ? "CLARA could not reach the access service. Check your connection and try again."
          : "CLARA access service is unavailable.")
    );
    accessError.code =
      payload?.code ||
      (error?.name === "FunctionsFetchError" ? "network_error" : "ios_access_error");
    throw accessError;
  }

  if (!data?.ok) {
    const accessError = new Error(data?.message || "Unable to complete this request.");
    accessError.code = data?.code || "ios_access_error";
    throw accessError;
  }

  return data;
}

export function readIosAccessSession() {
  if (typeof window === "undefined") return null;
  return readStorage(window.localStorage, IOS_ACCESS_SESSION_KEY);
}

export function clearIosAccessSession() {
  if (typeof window === "undefined") return;

  const session = readIosAccessSession();
  applyAccessCodeMembership({
    planKey: "free",
    userId: session?.userId,
    verifiedAt: new Date().toISOString(),
  });

  removeStorage(window.localStorage, IOS_ACCESS_SESSION_KEY);
  removeStorage(window.localStorage, IOS_ACCESS_OFFLINE_KEY);
}

export async function redeemIosAccessCode({ code, userId, name, email }) {
  const data = await invokeIosAccess({
    action: "redeem",
    code,
    userId,
    name,
    email,
  });

  const verifiedAt = new Date().toISOString();
  const session = {
    token: data.accessToken,
    codeLabel: data.codeLabel,
    planKey: normalizeAccessPlanKey(data.planKey),
    userId,
    expiresAt: data.expiresAt,
    activatedAt: data.activatedAt,
    verifiedAt,
  };

  writeStorage(window.localStorage, IOS_ACCESS_SESSION_KEY, session);
  writeStorage(window.localStorage, IOS_ACCESS_OFFLINE_KEY, {
    verifiedAt,
    expiresAt: data.expiresAt,
  });
  applyAccessCodeMembership(session);

  return data;
}

export async function validateIosAccessSession() {
  const session = readIosAccessSession();
  if (!session?.token) return { valid: false, code: "missing_session" };

  try {
    const data = await invokeIosAccess({
      action: "validate",
      accessToken: session.token,
    });

    const verifiedAt = new Date().toISOString();
    const nextSession = {
      ...session,
      codeLabel: data.codeLabel || session.codeLabel,
      planKey: normalizeAccessPlanKey(data.planKey),
      userId: session.userId || getOrCreateLocalVaultId(),
      activatedAt: data.activatedAt || session.activatedAt,
      expiresAt: data.expiresAt,
      verifiedAt,
    };

    writeStorage(window.localStorage, IOS_ACCESS_SESSION_KEY, nextSession);
    writeStorage(window.localStorage, IOS_ACCESS_OFFLINE_KEY, {
      verifiedAt,
      expiresAt: data.expiresAt,
    });
    applyAccessCodeMembership(nextSession);

    return { valid: true, ...data };
  } catch (error) {
    if (error?.code && error.code !== "network_error") {
      clearIosAccessSession();
    }
    throw error;
  }
}

export function canUseTemporaryIosOfflineAccess() {
  if (typeof window === "undefined") return false;
  const snapshot = readStorage(window.localStorage, IOS_ACCESS_OFFLINE_KEY);
  if (!snapshot?.verifiedAt || !snapshot?.expiresAt) return false;

  const now = Date.now();
  const verifiedAt = Date.parse(snapshot.verifiedAt);
  const expiresAt = Date.parse(snapshot.expiresAt);
  const maxOfflineAgeMs = 24 * 60 * 60 * 1000;

  return (
    Number.isFinite(verifiedAt) &&
    Number.isFinite(expiresAt) &&
    now < expiresAt &&
    now - verifiedAt <= maxOfflineAgeMs
  );
}

export function readHiddenAdminSession() {
  if (typeof window === "undefined") return null;
  const session = readStorage(window.sessionStorage, HIDDEN_ADMIN_SESSION_KEY);
  if (!session?.token || !session?.expiresAt) return null;

  if (Date.now() >= Date.parse(session.expiresAt)) {
    clearHiddenAdminSession();
    return null;
  }

  return session;
}

export function hasHiddenAdminSession() {
  return Boolean(readHiddenAdminSession()?.token);
}

export function clearHiddenAdminSession() {
  if (typeof window === "undefined") return;
  removeStorage(window.sessionStorage, HIDDEN_ADMIN_SESSION_KEY);
}

export async function verifyHiddenAdminPassword(password) {
  const data = await invokeIosAccess({
    action: "verify_admin",
    password,
  });

  writeStorage(window.sessionStorage, HIDDEN_ADMIN_SESSION_KEY, {
    token: data.adminToken,
    expiresAt: data.expiresAt,
  });

  return data;
}

export async function fetchIosAccessCodes() {
  const session = readHiddenAdminSession();
  if (!session?.token) {
    const error = new Error("Admin authorization has expired.");
    error.code = "unauthorized";
    throw error;
  }

  return invokeIosAccess({
    action: "admin_list",
    adminToken: session.token,
  });
}

export async function updateIosAccessCode(payload) {
  const session = readHiddenAdminSession();
  if (!session?.token) {
    const error = new Error("Admin authorization has expired.");
    error.code = "unauthorized";
    throw error;
  }

  return invokeIosAccess({
    action: "admin_update",
    adminToken: session.token,
    ...payload,
  });
}
