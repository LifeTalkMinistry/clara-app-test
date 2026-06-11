// ================================
// ACCESS CACHE CORE
// ================================
const ACCESS_CACHE_VERSION = 2; // upgraded version
const ACCESS_CACHE_PREFIX = "clara_access_snapshot_v2";
const ACCESS_CACHE_LAST_KEY = `${ACCESS_CACHE_PREFIX}:last`;
const ACCESS_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 120;

// NEW: global offline queue key
const OFFLINE_QUEUE_KEY = "clara_offline_queue_v1";

const DASHBOARD_ROUTE = "/dashboard";
const LIMITED_OFFLINE_FLOW = "limited_offline";
const ACTIVE_OFFLINE_FLOW = "active";

let lastStableSnapshot = null;
let lastStableSnapshotSignature = "";

// ================================
// SAFE HELPERS
// ================================
const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const safeText = (value) => String(value ?? "").trim();
const safeLower = (value) => safeText(value).toLowerCase();
const nowIso = () => new Date().toISOString();

const parseDateMs = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const clonePlain = (value) => {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return value;
  }
};

const hasCompletedUniversalOnboarding = (profile = {}) =>
  Boolean(
    profile?.onboarding_completed ||
      profile?.has_completed_onboarding ||
      profile?.has_completed_universal_onboarding ||
      profile?.has_seen_universal_onboarding
  );

// ================================
// OFFLINE QUEUE SYSTEM (NEW)
// ================================

export function getOfflineQueue() {
  if (!isBrowser()) return [];
  return safeJsonParse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
}

export function addToOfflineQueue(action) {
  if (!isBrowser() || !action) return;

  const queue = getOfflineQueue();

  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: nowIso(),
    ...action,
  });

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  if (!isBrowser()) return;
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// ================================
// NETWORK DETECTION (ENHANCED)
// ================================

export function isAccessNetworkOffline(error = null) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  const message = safeLower(error?.message || error?.name || error || "");

  return Boolean(
    message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("offline") ||
      message.includes("timed out") ||
      message.includes("timeout") ||
      message.includes("load failed") ||
      message.includes("internet")
  );
}

// ================================
// SNAPSHOT NORMALIZATION
// ================================

export function normalizeAccessSnapshot(snapshot = {}) {
  const source = snapshot || {};
  const profile = source.profileBasic || source.profile || source.user || {};

  return {
    version: ACCESS_CACHE_VERSION,
    userId: source.userId || profile.id || null,
    email: source.email || profile.email || null,
    profileBasic: clonePlain(profile),
    role: safeLower(source.role || profile.role || "user"),
    plan: safeLower(source.plan || profile.plan || "free"),
    subscriptionStatus: safeLower(
      source.subscriptionStatus || profile.subscription_status || "free"
    ),
    onboardingCompleted: Boolean(
      source.onboardingCompleted ?? hasCompletedUniversalOnboarding(profile)
    ),
    lastResolvedAppFlow: safeText(source.lastResolvedAppFlow || "normal"),
    lastValidRoute: safeText(source.lastValidRoute || DASHBOARD_ROUTE),
    enrollment: clonePlain(source.enrollment),
    accessState: clonePlain(source.accessState),
    savedAt: source.savedAt || nowIso(),
  };
}

// ================================
// SIGNATURE
// ================================

export function getAccessSnapshotSignature(snapshot = null) {
  if (!snapshot) return "none";

  const s = normalizeAccessSnapshot(snapshot);

  return [
    s.userId,
    s.email,
    s.role,
    s.plan,
    s.subscriptionStatus,
    s.onboardingCompleted ? "onboarding-complete" : "onboarding-incomplete",
    s.lastResolvedAppFlow,
    s.lastValidRoute,
  ]
    .map(safeLower)
    .join("|");
}

// ================================
// STORAGE
// ================================

const getStorageKey = (userIdOrEmail) =>
  `${ACCESS_CACHE_PREFIX}:${safeLower(userIdOrEmail || "guest")}`;

export function saveAccessSnapshot(snapshot) {
  if (!isBrowser()) return null;

  const normalized = normalizeAccessSnapshot(snapshot);
  const signature = getAccessSnapshotSignature(normalized);

  if (signature === lastStableSnapshotSignature) {
    return lastStableSnapshot;
  }

  lastStableSnapshotSignature = signature;
  lastStableSnapshot = normalized;

  const key = getStorageKey(normalized.userId || normalized.email);

  localStorage.setItem(key, JSON.stringify(normalized));
  localStorage.setItem(ACCESS_CACHE_LAST_KEY, JSON.stringify(normalized));

  return normalized;
}

export function getAccessSnapshot(userIdOrEmail = null) {
  if (!isBrowser()) return null;

  const key = getStorageKey(userIdOrEmail);
  const direct = safeJsonParse(localStorage.getItem(key));
  const last = safeJsonParse(localStorage.getItem(ACCESS_CACHE_LAST_KEY));

  return direct || last;
}

export function clearAccessSnapshot(userIdOrEmail = null) {
  if (!isBrowser()) return;

  if (userIdOrEmail) {
    localStorage.removeItem(getStorageKey(userIdOrEmail));
  }

  localStorage.removeItem(ACCESS_CACHE_LAST_KEY);
}

// ================================
// VALIDATION
// ================================

export function isAccessSnapshotUsable(snapshot) {
  if (!snapshot) return false;

  const normalized = normalizeAccessSnapshot(snapshot);
  const savedAtMs = parseDateMs(normalized.savedAt);

  return (
    savedAtMs > 0 &&
    Date.now() - savedAtMs <= ACCESS_CACHE_MAX_AGE_MS &&
    (normalized.userId || normalized.email)
  );
}

// ================================
// OFFLINE FLOW
// ================================

export function getOfflineFallbackFlow(snapshot = null) {
  if (!isAccessSnapshotUsable(snapshot)) {
    return {
      flow: LIMITED_OFFLINE_FLOW,
      route: DASHBOARD_ROUTE,
      limited: true,
    };
  }

  return {
    flow: ACTIVE_OFFLINE_FLOW,
    route: DASHBOARD_ROUTE,
    limited: false,
    snapshot: normalizeAccessSnapshot(snapshot),
  };
}

// ================================
// SNAPSHOT BUILDER
// ================================

export function buildAccessSnapshot({
  user = null,
  profile = null,
  enrollment = null,
  accessState = null,
  flow = "normal",
  currentPath = DASHBOARD_ROUTE,
} = {}) {
  return normalizeAccessSnapshot({
    userId: user?.id,
    email: user?.email,
    profileBasic: profile,
    role: accessState?.role,
    plan: accessState?.plan,
    subscriptionStatus: profile?.subscription_status,
    onboardingCompleted: hasCompletedUniversalOnboarding(profile),
    lastResolvedAppFlow: flow,
    lastValidRoute: currentPath,
    enrollment,
    accessState,
    savedAt: nowIso(),
  });
}
