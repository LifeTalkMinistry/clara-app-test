import useUserRole from "@/hooks/useUserRole";

export const CLARA_COMMITTED_PLAN_KEY = "life_os_499";
export const OPEN_COMMITMENT_BOOKLET_EVENT = "clara:open-commitment-booklet";

const ACTIVE_MEMBERSHIP_STATUSES = new Set([
  "active",
  "activated",
  "approved",
  "committed",
  "paid",
  "completed",
  "confirmed",
  "verified",
  "current",
]);

const PENDING_MEMBERSHIP_STATUSES = new Set([
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
]);

function normalizePlan(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function readStatuses(profileLike = {}) {
  return [
    profileLike?.subscription_status,
    profileLike?.enrollment_status,
    profileLike?.entitlement_status,
    profileLike?.activation_status,
    profileLike?.status,
  ].map(normalizeStatus);
}

function hasCanonicalActivationSignal(profileLike = {}) {
  const statuses = readStatuses(profileLike);

  if (statuses.some((status) => PENDING_MEMBERSHIP_STATUSES.has(status))) {
    return false;
  }

  return Boolean(
    profileLike?.is_activated === true ||
      profileLike?.program_active === true ||
      profileLike?.is_enrolled === true ||
      profileLike?.has_pro_access === true ||
      profileLike?.has_program_access === true ||
      normalizeStatus(profileLike?.role) === "paid_user" ||
      statuses.some((status) => ACTIVE_MEMBERSHIP_STATUSES.has(status)) ||
      profileLike?.activated_at
  );
}

function resolveAccountProfile({ accountProfile, user } = {}) {
  return accountProfile || user?.account_profile || user?.profile || user || {};
}

export function resolveCommittedMembershipState({
  plan = "free",
  user = null,
  accountProfile = null,
  isPaid = false,
  isPending = false,
  isPreActivation = false,
  isActivated = false,
  isAdmin = false,
  isAdvertiser = false,
  previewPlan = "",
  billingRecord = null,
  loading = false,
  ready = true,
} = {}) {
  const profileLike = resolveAccountProfile({ accountProfile, user });
  const normalizedPreviewPlan = normalizePlan(previewPlan);
  const resolvedPlan = normalizePlan(
    plan || user?.plan || user?.subscription?.plan || "free"
  );
  const actualPlan = normalizePlan(
    profileLike?.plan ||
      profileLike?.plan_key ||
      profileLike?.subscription_plan ||
      (profileLike?.dev_plan_preview ? "free" : resolvedPlan) ||
      "free"
  );
  const isCommittedPlan = actualPlan === CLARA_COMMITTED_PLAN_KEY;
  const hasAuthorizedPreviewAccess =
    normalizedPreviewPlan === CLARA_COMMITTED_PLAN_KEY;
  const pendingFromProfile = readStatuses(profileLike).some((status) =>
    PENDING_MEMBERSHIP_STATUSES.has(status)
  );
  const hasPendingSignal = Boolean(
    isPending || isPreActivation || pendingFromProfile
  );
  const activationConfirmed = Boolean(
    isActivated && hasCanonicalActivationSignal(profileLike)
  );
  const isActiveCommitted = Boolean(
    isCommittedPlan && activationConfirmed && !hasPendingSignal
  );
  const isPendingActivation = Boolean(
    isCommittedPlan && !isActiveCommitted
  );
  const hasCommittedAccess = Boolean(
    isAdmin ||
      isAdvertiser ||
      hasAuthorizedPreviewAccess ||
      isActiveCommitted
  );
  const membershipReady = Boolean(ready && !loading);

  if (!membershipReady) {
    return {
      membershipType: "unknown",
      membershipStatus: "loading",
      hasCommittedAccess,
      isCommittedPlan,
      isPendingActivation: false,
      isActiveCommitted: false,
      hasAuthorizedPreviewAccess,
      planLabel: "Syncing membership…",
      priceLabel: "—",
      statusLabel: "SYNCING",
      description: "Syncing your CLARA membership state.",
      featureDescription:
        "Your access will appear as soon as your profile is ready.",
      resolvedPlan: actualPlan || resolvedPlan || "free",
      hasBillingRecord: Boolean(billingRecord),
      isPaid: Boolean(isPaid),
      billingSyncKey: `${user?.id || "guest"}:loading`,
    };
  }

  if (isActiveCommitted) {
    return {
      membershipType: "committed",
      membershipStatus: "active",
      hasCommittedAccess,
      isCommittedPlan: true,
      isPendingActivation: false,
      isActiveCommitted: true,
      hasAuthorizedPreviewAccess,
      planLabel: "Committed",
      priceLabel: "₱249/month",
      statusLabel: "ACTIVE",
      description: "Your Committed membership is active.",
      featureDescription: "Your Committed Version features are unlocked.",
      resolvedPlan: actualPlan,
      hasBillingRecord: Boolean(billingRecord),
      isPaid: Boolean(isPaid),
      billingSyncKey: `${user?.id || "guest"}:${actualPlan}:active`,
    };
  }

  if (isPendingActivation) {
    return {
      membershipType: "committed",
      membershipStatus: "pending",
      hasCommittedAccess,
      isCommittedPlan: true,
      isPendingActivation: true,
      isActiveCommitted: false,
      hasAuthorizedPreviewAccess,
      planLabel: "Committed",
      priceLabel: "₱249/month",
      statusLabel: "PENDING ACTIVATION",
      description:
        "Your commitment has been selected, but your access is not active yet.",
      featureDescription:
        "Committed Version features will unlock after activation is confirmed.",
      resolvedPlan: actualPlan,
      hasBillingRecord: Boolean(billingRecord),
      isPaid: Boolean(isPaid),
      billingSyncKey: `${user?.id || "guest"}:${actualPlan}:pending`,
    };
  }

  return {
    membershipType: "free",
    membershipStatus: "not_committed",
    hasCommittedAccess,
    isCommittedPlan: false,
    isPendingActivation: false,
    isActiveCommitted: false,
    hasAuthorizedPreviewAccess,
    planLabel: "Free Version",
    priceLabel: "₱0",
    statusLabel: "NOT COMMITTED",
    description: "You are currently using CLARA’s free version.",
    featureDescription:
      "Committed features remain locked until you start your commitment.",
    resolvedPlan: actualPlan || "free",
    hasBillingRecord: Boolean(billingRecord),
    isPaid: Boolean(isPaid),
    billingSyncKey: `${user?.id || "guest"}:${actualPlan || "free"}:free`,
  };
}

export function canAccessCommittedFeatures(options = {}) {
  return resolveCommittedMembershipState(options).hasCommittedAccess;
}

export function useCommittedMembershipState({
  previewPlan = "",
  billingRecord = null,
} = {}) {
  const {
    user,
    accountProfile,
    developerPlanPreview,
    plan,
    isAdmin,
    isAdvertiser,
    isPaid,
    isPending,
    isPreActivation,
    isActivated,
    loading,
    ready,
  } = useUserRole();

  return resolveCommittedMembershipState({
    plan,
    user,
    accountProfile,
    isPaid,
    isPending,
    isPreActivation,
    isActivated,
    isAdmin,
    isAdvertiser,
    previewPlan: previewPlan || developerPlanPreview || "",
    billingRecord,
    loading,
    ready,
  });
}

export function useCommittedFeatureAccess({ previewPlan = "" } = {}) {
  return useCommittedMembershipState({ previewPlan }).hasCommittedAccess;
}

export function openCommittedVersionModal() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(OPEN_COMMITMENT_BOOKLET_EVENT));
}
