const ACCESS_CACHE_VERSION = 1;
const ACCESS_CACHE_PREFIX = "clara_access_snapshot_v1";
const ACCESS_CACHE_LAST_KEY = `${ACCESS_CACHE_PREFIX}:last`;
const ACCESS_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 120;

const DASHBOARD_ROUTE = "/dashboard";
const LIMITED_OFFLINE_FLOW = "limited_offline";
const ACTIVE_OFFLINE_FLOW = "active";

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

const getSnapshotIdentity = (snapshot = {}) => {
  const userId = safeText(
    snapshot.userId ||
      snapshot.user_id ||
      snapshot.id ||
      snapshot.profile?.id ||
      snapshot.user?.id
  );

  const email = safeLower(
    snapshot.email ||
      snapshot.userEmail ||
      snapshot.user_email ||
      snapshot.profile?.email ||
      snapshot.user?.email
  );

  return { userId, email };
};

const getStorageKey = (userIdOrEmail) => {
  const identity = safeLower(userIdOrEmail || "guest");
  return `${ACCESS_CACHE_PREFIX}:${identity || "guest"}`;
};

const readSnapshotByKey = (key) => {
  if (!isBrowser() || !key) return null;
  return safeJsonParse(window.localStorage.getItem(key));
};

const writeSnapshotByKey = (key, snapshot) => {
  if (!isBrowser() || !key || !snapshot) return;
  window.localStorage.setItem(key, JSON.stringify(snapshot));
};

const removeSnapshotByKey = (key) => {
  if (!isBrowser() || !key) return;
  window.localStorage.removeItem(key);
};

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

export function normalizeAccessSnapshot(snapshot = {}) {
  const source = snapshot || {};
  const profile = source.profileBasic || source.profile || source.user || {};
  const identity = getSnapshotIdentity({ ...source, profile });
  const savedAt = source.savedAt || source.saved_at || source.timestamp || nowIso();
  const role = safeLower(source.role || profile.role || "user") || "user";
  const plan = safeLower(source.plan || profile.plan || "free") || "free";
  const subscriptionStatus = safeLower(
    source.subscriptionStatus ||
      source.subscription_status ||
      profile.subscription_status ||
      profile.status ||
      "free"
  );

  const onboardingCompleted = Boolean(
    source.onboardingCompleted ??
      source.onboarding_completed ??
      source.hasCompletedOnboarding ??
      profile.onboarding_completed ??
      profile.has_completed_universal_onboarding ??
      profile.has_seen_universal_onboarding ??
      false
  );

  const programOnboardingCompleted = Boolean(
    source.programOnboardingCompleted ??
      source.program_onboarding_completed ??
      source.hasCompletedProgramOnboarding ??
      profile.program_onboarding_completed ??
      profile.has_completed_program_onboarding ??
      false
  );

  const lastResolvedAppFlow = safeText(
    source.lastResolvedAppFlow || source.last_resolved_app_flow || source.flow || "normal"
  );

  const lastValidRoute = safeText(
    source.lastValidRoute || source.last_valid_route || source.route || DASHBOARD_ROUTE
  );

  return {
    version: ACCESS_CACHE_VERSION,
    userId: identity.userId || null,
    email: identity.email || null,
    profileBasic: {
      id: identity.userId || profile.id || null,
      email: identity.email || profile.email || null,
      full_name: profile.full_name || profile.name || source.fullName || "",
      role,
      plan,
      subscription_status: subscriptionStatus || "free",
      subscription_label:
        source.planLabel ||
        source.plan_label ||
        profile.subscription_label ||
        profile.subscription?.label ||
        (plan === "free" ? "Free" : "CLARA"),
      access_level: source.accessLevel || source.access_level || profile.access_level || null,
      enrollment_status:
        source.enrollmentStatus ||
        source.enrollment_status ||
        profile.enrollment_status ||
        profile.status ||
        "none",
      status: profile.status || source.status || subscriptionStatus || "free",
      onboarding_completed: onboardingCompleted,
      has_completed_universal_onboarding: onboardingCompleted,
      has_seen_universal_onboarding: onboardingCompleted,
      program_onboarding_completed: programOnboardingCompleted,
      has_completed_program_onboarding: programOnboardingCompleted,
      activation_status: profile.activation_status || source.activationStatus || "not_required",
      is_activated: Boolean(profile.is_activated ?? source.isActivated ?? true),
      is_enrolled: Boolean(profile.is_enrolled ?? source.isEnrolled ?? plan !== "free"),
      program_active: Boolean(profile.program_active ?? source.programActive ?? plan !== "free"),
      offline_access_cached: true,
    },
    role,
    plan,
    planLabel:
      source.planLabel ||
      source.plan_label ||
      profile.subscription_label ||
      profile.subscription?.label ||
      (plan === "free" ? "Free" : "CLARA"),
    subscriptionStatus,
    accessStatus: source.accessStatus || source.access_status || subscriptionStatus || "free",
    onboardingCompleted,
    programOnboardingCompleted,
    lastResolvedAppFlow,
    lastValidRoute: lastValidRoute || DASHBOARD_ROUTE,
    enrollment: source.enrollment ? clonePlain(source.enrollment) : null,
    accessState: source.accessState ? clonePlain(source.accessState) : null,
    savedAt,
  };
}

export function saveAccessSnapshot(snapshot) {
  if (!isBrowser()) return null;

  const normalized = normalizeAccessSnapshot({
    ...snapshot,
    savedAt: snapshot?.savedAt || nowIso(),
  });

  const keys = [];
  if (normalized.userId) keys.push(getStorageKey(normalized.userId));
  if (normalized.email) keys.push(getStorageKey(normalized.email));

  if (!keys.length) keys.push(getStorageKey("guest"));

  keys.forEach((key) => writeSnapshotByKey(key, normalized));
  writeSnapshotByKey(ACCESS_CACHE_LAST_KEY, normalized);

  return normalized;
}

export function getAccessSnapshot(userIdOrEmail = null) {
  if (!isBrowser()) return null;

  const directKey = userIdOrEmail ? getStorageKey(userIdOrEmail) : null;
  const direct = directKey ? readSnapshotByKey(directKey) : null;
  const last = readSnapshotByKey(ACCESS_CACHE_LAST_KEY);

  const snapshot = direct || last;
  return snapshot ? normalizeAccessSnapshot(snapshot) : null;
}

export function clearAccessSnapshot(userIdOrEmail = null) {
  if (!isBrowser()) return;

  if (userIdOrEmail) {
    removeSnapshotByKey(getStorageKey(userIdOrEmail));
    const last = readSnapshotByKey(ACCESS_CACHE_LAST_KEY);
    const identity = getSnapshotIdentity(last || {});
    const value = safeLower(userIdOrEmail);

    if (safeLower(identity.userId) === value || safeLower(identity.email) === value) {
      removeSnapshotByKey(ACCESS_CACHE_LAST_KEY);
    }

    return;
  }

  removeSnapshotByKey(ACCESS_CACHE_LAST_KEY);
}

export function isAccessSnapshotUsable(snapshot) {
  if (!snapshot) return false;

  const normalized = normalizeAccessSnapshot(snapshot);
  const savedAtMs = parseDateMs(normalized.savedAt);
  const freshEnough = savedAtMs > 0 && Date.now() - savedAtMs <= ACCESS_CACHE_MAX_AGE_MS;
  const hasIdentity = Boolean(normalized.userId || normalized.email);
  const hasRouteOrFlow = Boolean(normalized.lastValidRoute || normalized.lastResolvedAppFlow);

  return Boolean(freshEnough && hasIdentity && hasRouteOrFlow);
}

export function getOfflineFallbackFlow(snapshot = null) {
  if (!isAccessSnapshotUsable(snapshot)) {
    return {
      flow: LIMITED_OFFLINE_FLOW,
      route: DASHBOARD_ROUTE,
      limited: true,
      reason: "no_cached_access_snapshot",
    };
  }

  const normalized = normalizeAccessSnapshot(snapshot);
  const flow = safeText(normalized.lastResolvedAppFlow || "normal");
  const route = safeText(normalized.lastValidRoute || DASHBOARD_ROUTE);
  const dashboardWasValid =
    route === DASHBOARD_ROUTE ||
    normalized.onboardingCompleted ||
    ["active", "normal", "dashboard", "payment_pending", "program_onboarding"].includes(flow);

  return {
    flow: dashboardWasValid ? ACTIVE_OFFLINE_FLOW : LIMITED_OFFLINE_FLOW,
    route: dashboardWasValid ? DASHBOARD_ROUTE : DASHBOARD_ROUTE,
    limited: !dashboardWasValid,
    reason: dashboardWasValid ? "cached_access_snapshot" : "cached_snapshot_not_dashboard_ready",
    snapshot: normalized,
  };
}

export function buildAccessSnapshot({
  user = null,
  profile = null,
  enrollment = null,
  accessState = null,
  flow = "normal",
  homeRedirectPath = DASHBOARD_ROUTE,
  currentPath = DASHBOARD_ROUTE,
} = {}) {
  const safeCurrentPath = safeText(currentPath || "");
  const safeHomeRedirectPath = safeText(homeRedirectPath || "");
  const routeIsAppRoute = Boolean(
    safeCurrentPath &&
      !["/", "/login", "/onboarding", "/pending", "/program-onboarding", "/enroll", "/tier-select"].includes(
        safeCurrentPath
      )
  );

  const lastValidRoute = routeIsAppRoute
    ? safeCurrentPath
    : safeHomeRedirectPath === "/dashboard"
      ? DASHBOARD_ROUTE
      : DASHBOARD_ROUTE;

  return normalizeAccessSnapshot({
    userId: user?.id || profile?.id || null,
    email: user?.email || profile?.email || null,
    profileBasic: profile || {},
    role: accessState?.role || profile?.role || "user",
    plan: accessState?.plan || profile?.plan || "free",
    planLabel:
      profile?.subscription_label ||
      profile?.subscription?.label ||
      accessState?.planLabel ||
      "Free",
    subscriptionStatus:
      profile?.subscription_status ||
      profile?.subscription?.status ||
      accessState?.enrollmentStatus ||
      profile?.status ||
      "free",
    accessStatus: accessState?.enrollmentStatus || profile?.status || "free",
    onboardingCompleted:
      profile?.onboarding_completed ||
      profile?.has_completed_universal_onboarding ||
      profile?.has_seen_universal_onboarding ||
      flow !== "universal_onboarding",
    programOnboardingCompleted:
      profile?.program_onboarding_completed ||
      profile?.has_completed_program_onboarding ||
      flow !== "program_onboarding",
    lastResolvedAppFlow: flow || "normal",
    lastValidRoute,
    enrollment,
    accessState,
    savedAt: nowIso(),
  });
}
