export const FREE_PLAN_KEY = "free";
export const COMMITTED_PLAN_KEY = "committed_249";
export const FREE_ACCESS_LEVEL = "free";
export const COMMITTED_ACCESS_LEVEL = "committed";
export const COMMITTED_PRODUCT_ID = "clara_commitment_249";
export const CUSTOMER_PLAN_KEYS = [FREE_PLAN_KEY, COMMITTED_PLAN_KEY];
export const CUSTOMER_ACCESS_LEVEL_KEYS = [FREE_ACCESS_LEVEL, COMMITTED_ACCESS_LEVEL];

export const LEGACY_PAID_PLAN_ALIASES = Object.freeze({
  committed: COMMITTED_PLAN_KEY,
  committed_249: COMMITTED_PLAN_KEY,
});

export const LEGACY_PAID_ACCESS_ALIASES = Object.freeze({
  committed: COMMITTED_ACCESS_LEVEL,
});

export const ACTIVE_MEMBERSHIP_STATUSES = new Set(["active"]);
export const PENDING_MEMBERSHIP_STATUSES = new Set(["pending", "inactive"]);

export function normalizeMembershipToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizePlanKey(value) {
  const normalized = normalizeMembershipToken(value);
  if (normalized === "committed" || normalized === COMMITTED_PLAN_KEY) {
    return COMMITTED_PLAN_KEY;
  }
  return FREE_PLAN_KEY;
}

export function normalizeAccessLevel(value, fallback = FREE_ACCESS_LEVEL) {
  const normalized = normalizeMembershipToken(value);
  if (normalized === COMMITTED_ACCESS_LEVEL) return COMMITTED_ACCESS_LEVEL;
  if (normalizePlanKey(normalized) === COMMITTED_PLAN_KEY) return COMMITTED_ACCESS_LEVEL;
  return fallback === COMMITTED_ACCESS_LEVEL ? COMMITTED_ACCESS_LEVEL : FREE_ACCESS_LEVEL;
}

export function readMembershipStatuses(profileLike = {}) {
  return [
    profileLike?.account_status,
    profileLike?.subscription_status,
    profileLike?.entitlement_status,
    profileLike?.enrollment_status,
    profileLike?.activation_status,
    profileLike?.status,
  ]
    .map(normalizeMembershipToken)
    .filter(Boolean);
}

export function hasCanonicalActivationSignal(profileLike = {}) {
  const planKey = normalizePlanKey(
    profileLike?.plan || profileLike?.plan_key || profileLike?.subscription_plan
  );
  const statuses = readMembershipStatuses(profileLike);
  return planKey === COMMITTED_PLAN_KEY && statuses.includes("active");
}

// Inert compatibility exports while old UI modules are removed.
// These functions never read, write, or grant membership.
export function normalizeDeveloperMembershipPreview() {
  return null;
}

export function readDeveloperMembershipPreview() {
  return null;
}

export function writeDeveloperMembershipPreview() {
  return null;
}

export function clearDeveloperMembershipPreview() {}

export function resolveMembership({
  profile = {},
  user = null,
  plan,
  loading = false,
  ready = true,
} = {}) {
  const profileLike = profile || user?.account_profile || user?.profile || user || {};
  const planKey = normalizePlanKey(
    plan ||
      profileLike?.plan ||
      profileLike?.plan_key ||
      profileLike?.subscription_plan ||
      user?.plan ||
      FREE_PLAN_KEY
  );
  const membershipReady = Boolean(ready && !loading);
  const statusCandidates = readMembershipStatuses(profileLike);
  const accountStatus =
    statusCandidates.find((status) => ["active", "pending", "inactive"].includes(status)) ||
    (planKey === COMMITTED_PLAN_KEY ? "inactive" : "free");
  const isCommittedPlan = planKey === COMMITTED_PLAN_KEY;
  const isActiveCommitted = Boolean(
    membershipReady && isCommittedPlan && accountStatus === "active"
  );
  const membershipStatus = !membershipReady
    ? "loading"
    : !isCommittedPlan
      ? "not_committed"
      : accountStatus;
  const hasCommittedAccess = isActiveCommitted;

  return {
    planKey,
    accessLevel: hasCommittedAccess ? COMMITTED_ACCESS_LEVEL : FREE_ACCESS_LEVEL,
    membershipType: isCommittedPlan ? "committed" : "free",
    membershipStatus,
    accountStatus,
    isCommittedPlan,
    isPendingActivation: membershipStatus === "pending",
    isActiveCommitted,
    hasCommittedAccess,
    hasRoleBypass: false,
    isDeveloperPreview: false,
    developerPreview: null,
    planLabel:
      membershipStatus === "loading"
        ? "Syncing membership…"
        : isCommittedPlan
          ? "Committed"
          : "Free Version",
    priceLabel:
      membershipStatus === "loading" ? "—" : isCommittedPlan ? "₱249/month" : "₱0",
    statusLabel:
      membershipStatus === "loading"
        ? "SYNCING"
        : membershipStatus === "active"
          ? "ACTIVE"
          : membershipStatus === "pending"
            ? "PENDING ACTIVATION"
            : membershipStatus === "inactive"
              ? "INACTIVE"
              : "NOT COMMITTED",
    description:
      membershipStatus === "loading"
        ? "Syncing your CLARA membership state."
        : membershipStatus === "active"
          ? "Your Committed membership is active."
          : membershipStatus === "pending"
            ? "Your Committed membership is pending activation."
            : membershipStatus === "inactive"
              ? "Your Committed membership is inactive."
              : "You are currently using CLARA’s free version.",
    featureDescription:
      hasCommittedAccess
        ? "Your Committed Version features are unlocked."
        : isCommittedPlan
          ? "Committed Version features remain locked until your backend account is active."
          : "Committed features are managed through your CLARA account.",
  };
}
