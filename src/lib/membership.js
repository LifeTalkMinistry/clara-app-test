export const FREE_PLAN_KEY = "free";
export const COMMITTED_PLAN_KEY = "committed_249";
export const FREE_ACCESS_LEVEL = "free";
export const COMMITTED_ACCESS_LEVEL = "committed";
export const COMMITTED_PRODUCT_ID = "clara_commitment_249";
export const CUSTOMER_PLAN_KEYS = [FREE_PLAN_KEY, COMMITTED_PLAN_KEY];
export const CUSTOMER_ACCESS_LEVEL_KEYS = [FREE_ACCESS_LEVEL, COMMITTED_ACCESS_LEVEL];
export const DEVELOPER_MEMBERSHIP_PREVIEW_KEY = "clara_dev_membership_preview";
export const LEGACY_DEVELOPER_PLAN_PREVIEW_KEY = "clara_dev_plan_preview";

export const LEGACY_PAID_PLAN_ALIASES = Object.freeze({
  committed: COMMITTED_PLAN_KEY,
  committed_249: COMMITTED_PLAN_KEY,
  clara_commitment_249: COMMITTED_PLAN_KEY,
  pro: COMMITTED_PLAN_KEY,
  pro99: COMMITTED_PLAN_KEY,
  pro_99: COMMITTED_PLAN_KEY,
  pro_tools: COMMITTED_PLAN_KEY,
  protools: COMMITTED_PLAN_KEY,
  clara_pro_99: COMMITTED_PLAN_KEY,
  core: COMMITTED_PLAN_KEY,
  core199: COMMITTED_PLAN_KEY,
  core_199: COMMITTED_PLAN_KEY,
  core_599: COMMITTED_PLAN_KEY,
  program: COMMITTED_PLAN_KEY,
  clara_core_199: COMMITTED_PLAN_KEY,
  life_os: COMMITTED_PLAN_KEY,
  lifeos: COMMITTED_PLAN_KEY,
  life_os_499: COMMITTED_PLAN_KEY,
  lifeos_499: COMMITTED_PLAN_KEY,
  clara_lifeos_499: COMMITTED_PLAN_KEY,
  coach: COMMITTED_PLAN_KEY,
  coaching: COMMITTED_PLAN_KEY,
  coaching_1299: COMMITTED_PLAN_KEY,
  paid: COMMITTED_PLAN_KEY,
  premium: COMMITTED_PLAN_KEY,
});

export const LEGACY_PAID_ACCESS_ALIASES = Object.freeze({
  committed: COMMITTED_ACCESS_LEVEL,
  pro: COMMITTED_ACCESS_LEVEL,
  core: COMMITTED_ACCESS_LEVEL,
  life_os: COMMITTED_ACCESS_LEVEL,
  lifeos: COMMITTED_ACCESS_LEVEL,
  coach: COMMITTED_ACCESS_LEVEL,
  coaching: COMMITTED_ACCESS_LEVEL,
  paid: COMMITTED_ACCESS_LEVEL,
  premium: COMMITTED_ACCESS_LEVEL,
});

export const ACTIVE_MEMBERSHIP_STATUSES = new Set([
  "active",
  "activated",
  "approved",
  "trialing",
  "committed",
  "paid",
  "completed",
  "confirmed",
  "verified",
  "current",
]);

export const PENDING_MEMBERSHIP_STATUSES = new Set([
  "pending",
  "processing",
  "submitted",
  "under_review",
  "awaiting_approval",
  "awaiting_review",
  "payment_pending",
  "google_play_pending",
  "google_play_processing",
  "purchase_pending",
  "purchase_processing",
  "pre_activation",
  "inactive",
  "cancelled",
  "canceled",
  "expired",
  "revoked",
]);

export function normalizeMembershipToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizePlanKey(value) {
  const normalized = normalizeMembershipToken(value);
  if (!normalized || normalized === FREE_PLAN_KEY || normalized === "free_version") {
    return FREE_PLAN_KEY;
  }
  return LEGACY_PAID_PLAN_ALIASES[normalized] || FREE_PLAN_KEY;
}

export function normalizeAccessLevel(value, fallback = FREE_ACCESS_LEVEL) {
  const normalized = normalizeMembershipToken(value);
  if (!normalized || normalized === FREE_ACCESS_LEVEL) return FREE_ACCESS_LEVEL;
  if (LEGACY_PAID_ACCESS_ALIASES[normalized]) return COMMITTED_ACCESS_LEVEL;
  const plan = normalizePlanKey(normalized);
  if (plan === COMMITTED_PLAN_KEY) return COMMITTED_ACCESS_LEVEL;
  return fallback === COMMITTED_ACCESS_LEVEL ? COMMITTED_ACCESS_LEVEL : FREE_ACCESS_LEVEL;
}

export function readMembershipStatuses(profileLike = {}) {
  return [
    profileLike?.subscription_status,
    profileLike?.entitlement_status,
    profileLike?.enrollment_status,
    profileLike?.activation_status,
    profileLike?.status,
  ].map(normalizeMembershipToken).filter(Boolean);
}

export function hasCanonicalActivationSignal(profileLike = {}) {
  const statuses = readMembershipStatuses(profileLike);
  if (statuses.some((status) => PENDING_MEMBERSHIP_STATUSES.has(status))) return false;

  return Boolean(
    profileLike?.is_activated === true ||
      profileLike?.program_active === true ||
      profileLike?.is_enrolled === true ||
      profileLike?.has_pro_access === true ||
      profileLike?.has_program_access === true ||
      normalizeMembershipToken(profileLike?.role) === "paid_user" ||
      statuses.some((status) => ACTIVE_MEMBERSHIP_STATUSES.has(status)) ||
      profileLike?.activated_at
  );
}

export function normalizePreviewStatus(value, planKey = FREE_PLAN_KEY) {
  const normalized = normalizeMembershipToken(value);
  if (planKey === FREE_PLAN_KEY) return "not_committed";
  return normalized === "active" ? "active" : "pending";
}

export function normalizeDeveloperMembershipPreview(value) {
  if (!value) return null;
  const source = typeof value === "string" ? { plan: value } : value;
  const planKey = normalizePlanKey(source?.plan || source?.plan_key || source?.planKey);
  const legacyRaw = normalizeMembershipToken(source?.plan || source?.plan_key || source?.planKey);
  const inferredStatus =
    source?.membershipStatus ||
    source?.membership_status ||
    (planKey === COMMITTED_PLAN_KEY && legacyRaw && legacyRaw !== COMMITTED_PLAN_KEY ? "active" : "not_committed");
  return {
    plan: planKey,
    membershipStatus: normalizePreviewStatus(inferredStatus, planKey),
  };
}

export function readDeveloperMembershipPreview() {
  if (typeof window === "undefined") return null;
  try {
    const currentRaw = window.localStorage.getItem(DEVELOPER_MEMBERSHIP_PREVIEW_KEY);
    if (currentRaw) {
      return normalizeDeveloperMembershipPreview(JSON.parse(currentRaw));
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_DEVELOPER_PLAN_PREVIEW_KEY);
    if (!legacyRaw) return null;
    const parsedLegacy = legacyRaw.trim().startsWith("{") ? JSON.parse(legacyRaw) : legacyRaw;
    const normalized = normalizeDeveloperMembershipPreview(parsedLegacy);
    if (normalized) {
      window.localStorage.setItem(DEVELOPER_MEMBERSHIP_PREVIEW_KEY, JSON.stringify(normalized));
      window.localStorage.removeItem(LEGACY_DEVELOPER_PLAN_PREVIEW_KEY);
    }
    return normalized;
  } catch (error) {
    console.warn("Unable to read CLARA developer membership preview", error);
    return null;
  }
}

export function writeDeveloperMembershipPreview(preview) {
  if (typeof window === "undefined") return null;
  const normalized = normalizeDeveloperMembershipPreview(preview);
  if (!normalized) return null;
  window.localStorage.setItem(DEVELOPER_MEMBERSHIP_PREVIEW_KEY, JSON.stringify(normalized));
  window.localStorage.removeItem(LEGACY_DEVELOPER_PLAN_PREVIEW_KEY);
  window.dispatchEvent(new CustomEvent("clara-membership-preview-updated", { detail: normalized }));
  return normalized;
}

export function clearDeveloperMembershipPreview() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEVELOPER_MEMBERSHIP_PREVIEW_KEY);
  window.localStorage.removeItem(LEGACY_DEVELOPER_PLAN_PREVIEW_KEY);
  window.dispatchEvent(new CustomEvent("clara-membership-preview-updated", { detail: null }));
}

export function resolveMembership({
  profile = {},
  user = null,
  plan,
  preview = null,
  isAdmin = false,
  isAdvertiser = false,
  loading = false,
  ready = true,
} = {}) {
  const profileLike = profile || user?.account_profile || user?.profile || user || {};
  const normalizedPreview = normalizeDeveloperMembershipPreview(preview);
  const planKey = normalizedPreview
    ? normalizedPreview.plan
    : normalizePlanKey(
        plan ||
          profileLike?.plan ||
          profileLike?.plan_key ||
          profileLike?.subscription_plan ||
          user?.plan ||
          user?.subscription?.plan ||
          FREE_PLAN_KEY
      );
  const isCommittedPlan = planKey === COMMITTED_PLAN_KEY;
  const membershipReady = Boolean(ready && !loading);
  const previewStatus = normalizedPreview?.membershipStatus || null;
  const isActiveCommitted = Boolean(
    isCommittedPlan &&
      (previewStatus ? previewStatus === "active" : hasCanonicalActivationSignal(profileLike))
  );
  const membershipStatus = !membershipReady
    ? "loading"
    : !isCommittedPlan
      ? "not_committed"
      : isActiveCommitted
        ? "active"
        : "pending";
  const hasRoleBypass = Boolean(isAdmin || isAdvertiser);
  const hasCommittedAccess = Boolean(isActiveCommitted || hasRoleBypass);

  return {
    planKey,
    accessLevel: isCommittedPlan ? COMMITTED_ACCESS_LEVEL : FREE_ACCESS_LEVEL,
    membershipType: isCommittedPlan ? "committed" : "free",
    membershipStatus,
    isCommittedPlan,
    isPendingActivation: membershipStatus === "pending",
    isActiveCommitted,
    hasCommittedAccess,
    hasRoleBypass,
    isDeveloperPreview: Boolean(normalizedPreview),
    developerPreview: normalizedPreview,
    planLabel: membershipStatus === "loading" ? "Syncing membership…" : isCommittedPlan ? "Committed" : "Free Version",
    priceLabel: membershipStatus === "loading" ? "—" : isCommittedPlan ? "₱249/month" : "₱0",
    statusLabel:
      membershipStatus === "loading"
        ? "SYNCING"
        : membershipStatus === "active"
          ? "ACTIVE"
          : membershipStatus === "pending"
            ? "PENDING ACTIVATION"
            : "NOT COMMITTED",
    description:
      membershipStatus === "loading"
        ? "Syncing your CLARA membership state."
        : membershipStatus === "active"
          ? "Your Committed membership is active."
          : membershipStatus === "pending"
            ? "Your commitment has been selected, but your access is not active yet."
            : "You are currently using CLARA’s free version.",
    featureDescription:
      membershipStatus === "loading"
        ? "Your access will appear as soon as your profile is ready."
        : membershipStatus === "active"
          ? "Your Committed Version features are unlocked."
          : membershipStatus === "pending"
            ? "Committed Version features will unlock after activation is confirmed."
            : "Committed features remain locked until you start your commitment.",
  };
}
