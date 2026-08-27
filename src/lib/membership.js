export const FREE_PLAN_KEY = "free";
export const SUPPORTER_PLAN_KEY = "supporter";
export const BUILDER_PLAN_KEY = "builder";
export const CHAMPION_PLAN_KEY = "champion";

// The backend still stores the historical supporter/builder/champion keys.
// Product-facing CLARA now treats the highest historical key as the
// "Don't Do It Alone" tier, which is the only tier that includes Monthly Coaching.
export const MONTHLY_COACHING_PLAN_KEY = CHAMPION_PLAN_KEY;

// Retained only for compatibility with older imports. The Committed plan is no
// longer a canonical account plan and normalizes to Free.
export const COMMITTED_PLAN_KEY = "committed_249";
export const FREE_ACCESS_LEVEL = "free";
export const COMMITTED_ACCESS_LEVEL = "committed";
export const COMMITTED_PRODUCT_ID = "clara_commitment_249";

export const SUPPORTER_PLAN_KEYS = Object.freeze([
  SUPPORTER_PLAN_KEY,
  BUILDER_PLAN_KEY,
  CHAMPION_PLAN_KEY,
]);
export const CUSTOMER_PLAN_KEYS = Object.freeze([
  FREE_PLAN_KEY,
  ...SUPPORTER_PLAN_KEYS,
]);
export const CUSTOMER_ACCESS_LEVEL_KEYS = [FREE_ACCESS_LEVEL, COMMITTED_ACCESS_LEVEL];

export const LEGACY_PAID_PLAN_ALIASES = Object.freeze({
  committed: FREE_PLAN_KEY,
  committed_249: FREE_PLAN_KEY,
});

export const LEGACY_PAID_ACCESS_ALIASES = Object.freeze({
  committed: COMMITTED_ACCESS_LEVEL,
});

export const ACTIVE_MEMBERSHIP_STATUSES = new Set(["active"]);
export const PENDING_MEMBERSHIP_STATUSES = new Set(["pending", "inactive"]);

const PLAN_LABELS = Object.freeze({
  free: "Free Version",
  supporter: "CLARA Supporter",
  builder: "CLARA Builder",
  champion: "CLARA Champion",
});

const PLAN_PRICE_LABELS = Object.freeze({
  free: "₱0",
  supporter: "₱99/month",
  builder: "₱249/month",
  champion: "₱499/month",
});

export function normalizeMembershipToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizePlanKey(value) {
  const normalized = normalizeMembershipToken(value);
  if (CUSTOMER_PLAN_KEYS.includes(normalized)) return normalized;
  return FREE_PLAN_KEY;
}

export function normalizeAccessLevel(value, fallback = FREE_ACCESS_LEVEL) {
  const normalized = normalizeMembershipToken(value);
  if (normalized === COMMITTED_ACCESS_LEVEL) return COMMITTED_ACCESS_LEVEL;
  if (SUPPORTER_PLAN_KEYS.includes(normalizePlanKey(normalized))) {
    return COMMITTED_ACCESS_LEVEL;
  }
  return fallback === COMMITTED_ACCESS_LEVEL
    ? COMMITTED_ACCESS_LEVEL
    : FREE_ACCESS_LEVEL;
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
  return SUPPORTER_PLAN_KEYS.includes(planKey) && statuses.includes("active");
}

export function resolveMembership({
  profile = {},
  user = null,
  plan,
  loading = false,
  ready = true,
} = {}) {
  const profileLike =
    profile || user?.account_profile || user?.profile || user || {};
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
  const isSupporterPlan = SUPPORTER_PLAN_KEYS.includes(planKey);
  const accountStatus =
    statusCandidates.find((status) =>
      ["active", "pending", "inactive"].includes(status)
    ) || (isSupporterPlan ? "inactive" : "free");
  const isActiveSupporter = Boolean(
    membershipReady && isSupporterPlan && accountStatus === "active"
  );
  const hasMonthlyCoachingAccess = Boolean(
    membershipReady &&
      planKey === MONTHLY_COACHING_PLAN_KEY &&
      accountStatus === "active"
  );
  const membershipStatus = !membershipReady
    ? "loading"
    : !isSupporterPlan
      ? "not_committed"
      : accountStatus;

  return {
    planKey,
    supportTier: isSupporterPlan ? planKey : null,
    accessLevel: isActiveSupporter
      ? COMMITTED_ACCESS_LEVEL
      : FREE_ACCESS_LEVEL,
    membershipType: isSupporterPlan ? "supporter" : "free",
    membershipStatus,
    accountStatus,
    isSupporterPlan,
    isActiveSupporter,
    hasSupporterAccess: isActiveSupporter,
    hasMonthlyCoachingAccess,

    // Legacy aliases remain so older components continue to operate while the
    // product vocabulary migrates away from Committed.
    isCommittedPlan: isSupporterPlan,
    isPendingActivation: membershipStatus === "pending",
    isActiveCommitted: isActiveSupporter,
    hasCommittedAccess: isActiveSupporter,

    planLabel:
      membershipStatus === "loading"
        ? "Syncing membership…"
        : PLAN_LABELS[planKey],
    priceLabel:
      membershipStatus === "loading"
        ? "—"
        : PLAN_PRICE_LABELS[planKey],
    statusLabel:
      membershipStatus === "loading"
        ? "SYNCING"
        : membershipStatus === "active"
          ? "ACTIVE"
          : membershipStatus === "pending"
            ? "PENDING ACTIVATION"
            : membershipStatus === "inactive"
              ? "INACTIVE"
              : "FREE",
    description:
      membershipStatus === "loading"
        ? "Syncing your CLARA account tier."
        : membershipStatus === "active"
          ? `${PLAN_LABELS[planKey]} is active.`
          : membershipStatus === "pending"
            ? `${PLAN_LABELS[planKey]} is pending activation.`
            : membershipStatus === "inactive"
              ? `${PLAN_LABELS[planKey]} is inactive.`
              : "You are using CLARA's free core app.",
    featureDescription:
      isActiveSupporter
        ? `${PLAN_LABELS[planKey]} benefits are active.`
        : isSupporterPlan
          ? `${PLAN_LABELS[planKey]} benefits remain inactive until the backend account is active.`
          : "CLARA's core financial accountability features remain free.",
  };
}
