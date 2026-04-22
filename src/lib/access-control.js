import { isPaidPlan, normalizePlanKey } from "@/lib/plan-config";
import { deriveEffectiveEntitlements } from "@/lib/clara-entitlements";

export const ENROLLMENT_PENDING_STATUSES = new Set([
  "pending",
  "under_review",
  "payment_pending",
  "google_play_pending",
  "google_play_processing",
  "purchase_pending",
  "purchase_processing",
]);

export const ENROLLMENT_APPROVED_STATUSES = new Set(["approved", "active"]);

export const ENROLLMENT_RETRY_STATUSES = new Set([
  "rejected",
  "resubmit_required",
  "none",
  "",
]);

export const PAID_TIERS = ["pro_99", "core_599", "coaching_1299"];

export function normalizeAccessValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function getEnrollmentStatus(enrollment, profileLike) {
  return normalizeAccessValue(
    enrollment?.status ||
      enrollment?.payment_status ||
      enrollment?.enrollment_status ||
      profileLike?.enrollment_status ||
      profileLike?.status ||
      ""
  );
}

export function hasCompletedOnboarding(profileLike) {
  return Boolean(
    profileLike?.has_completed_onboarding || profileLike?.onboarding_completed
  );
}

export function hasCompletedProgramOnboarding(profileLike) {
  return Boolean(
    profileLike?.has_completed_program_onboarding ||
      profileLike?.program_onboarding_completed
  );
}

export function isActivationRequiredPlan(planKey) {
  const normalized = normalizePlanKey(planKey);
  return normalized === "core_599" || normalized === "coaching_1299";
}

export function hasActivatedPlan(profileLike = {}) {
  const status = normalizeAccessValue(
    profileLike?.activation_status ||
      profileLike?.kit_activation_status ||
      profileLike?.system_activation_status
  );

  return (
    status === "active" ||
    status === "activated" ||
    profileLike?.is_activated === true ||
    profileLike?.core_activated === true ||
    profileLike?.life_os_activated === true ||
    Boolean(profileLike?.activated_at)
  );
}

export function hasAnyPaidSignal(profileLike, enrollment) {
  const role = normalizeAccessValue(profileLike?.role);
  const effective = deriveEffectiveEntitlements(profileLike || {});
  const plan = normalizePlanKey(effective.effectivePlan || profileLike?.plan);
  const enrollmentStatus = getEnrollmentStatus(enrollment, profileLike);

  return (
    role === "paid_user" ||
    effective.hasProAccess ||
    effective.hasProgramAccess ||
    profileLike?.program_active === true ||
    profileLike?.is_enrolled === true ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus) ||
    isPaidPlan(plan)
  );
}

export function shouldForceEnrollment(profileLike, enrollment) {
  const role = normalizeAccessValue(profileLike?.role);
  const plan = normalizePlanKey(profileLike?.plan);
  const enrollmentStatus = getEnrollmentStatus(enrollment, profileLike);
  const freeRole = !role || role === "free_user" || role === "user";
  const freePlan = !plan || plan === "free";
  const notPaid = !hasAnyPaidSignal(profileLike, enrollment);

  if (!enrollment) return false;

  return freeRole && freePlan && notPaid && ENROLLMENT_RETRY_STATUSES.has(enrollmentStatus);
}

export function resolveAppFlow(profileLike, enrollment) {
  if (!hasCompletedOnboarding(profileLike)) return "universal_onboarding";
  if (!enrollment) return "normal";

  const enrollmentStatus = getEnrollmentStatus(enrollment, profileLike);

  if (ENROLLMENT_PENDING_STATUSES.has(enrollmentStatus)) {
    return "payment_pending";
  }

  if (
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus) &&
    ["core_599", "coaching_1299"].includes(
      normalizePlanKey(profileLike?.plan || enrollment?.plan_key || enrollment?.plan)
    ) &&
    !hasCompletedProgramOnboarding(profileLike)
  ) {
    return "program_onboarding";
  }

  return "normal";
}

export function deriveAccessState(profileLike, enrollment = null) {
  const role = normalizeAccessValue(profileLike?.role || "user");
  const effective = deriveEffectiveEntitlements(profileLike || {});
  const plan = normalizePlanKey(
    effective.effectivePlan || profileLike?.plan || "free"
  );
  const enrollmentStatus = getEnrollmentStatus(enrollment, profileLike);

  const isAdmin = role === "admin";
  const isAdvertiser = role === "advertiser";

  const isApproved =
    effective.hasProAccess ||
    effective.hasProgramAccess ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus) ||
    normalizeAccessValue(profileLike?.status) === "approved" ||
    profileLike?.is_enrolled === true ||
    profileLike?.program_active === true;

  // 🔥 FIXED LOGIC (CRITICAL CHANGE)
  const hasPaidSignal = hasAnyPaidSignal(profileLike, enrollment);

  const isPaid =
    isAdmin ||
    hasPaidSignal ||
    (PAID_TIERS.includes(plan) && isApproved);

  const isPending = ENROLLMENT_PENDING_STATUSES.has(enrollmentStatus);
  const isFree = !isAdvertiser && !isPaid && !isPending;
  const activationRequired = isActivationRequiredPlan(plan);
  const isActivated = !activationRequired || hasActivatedPlan(profileLike);

  const flow = resolveAppFlow(profileLike, enrollment);

  const forceEnroll =
    !isAdvertiser &&
    hasCompletedOnboarding(profileLike) &&
    flow !== "payment_pending" &&
    flow !== "program_onboarding" &&
    !hasPaidSignal && // 🔥 FIXED: use real paid signal instead
    shouldForceEnrollment(profileLike, enrollment);

  return {
    role,
    plan,
    entitlements: effective,
    enrollmentStatus,
    isAdmin,
    isAdvertiser,
    isApproved,
    isPaid,
    isPending,
    isFree,
    activationRequired,
    isActivated,
    isPreActivation: activationRequired && !isActivated,
    flow,
    forceEnroll,
  };
}
