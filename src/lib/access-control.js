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

export const PAID_TIERS = ["basic", "transformation", "elite", "student"];

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

export function hasAnyPaidSignal(profileLike, enrollment) {
  const role = normalizeAccessValue(profileLike?.role);
  const plan = normalizeAccessValue(profileLike?.plan);
  const enrollmentStatus = getEnrollmentStatus(enrollment, profileLike);

  return (
    role === "paid_user" ||
    profileLike?.program_active === true ||
    profileLike?.is_enrolled === true ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus) ||
    (plan && plan !== "free")
  );
}

export function shouldForceEnrollment(profileLike, enrollment) {
  const role = normalizeAccessValue(profileLike?.role);
  const plan = normalizeAccessValue(profileLike?.plan);
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

  if (ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus)) {
    return "program_onboarding";
  }

  return "normal";
}

export function deriveAccessState(profileLike, enrollment = null) {
  const role = normalizeAccessValue(profileLike?.role || "user");
  const plan = normalizeAccessValue(profileLike?.plan || "free");
  const enrollmentStatus = getEnrollmentStatus(enrollment, profileLike);
  const isAdmin = role === "admin";
  const isAdvertiser = role === "advertiser";

  const isApproved =
    enrollmentStatus === "approved" ||
    normalizeAccessValue(profileLike?.status) === "approved" ||
    profileLike?.is_enrolled === true ||
    profileLike?.program_active === true;

  const isPaid = isAdmin || (PAID_TIERS.includes(plan) && isApproved);
  const isPending = ENROLLMENT_PENDING_STATUSES.has(enrollmentStatus);
  const isFree = !isAdvertiser && !isPaid && !isPending;

  const flow = resolveAppFlow(profileLike, enrollment);
  const forceEnroll =
    !isAdvertiser &&
    hasCompletedOnboarding(profileLike) &&
    flow !== "payment_pending" &&
    flow !== "program_onboarding" &&
    shouldForceEnrollment(profileLike, enrollment);

  return {
    role,
    plan,
    enrollmentStatus,
    isAdmin,
    isAdvertiser,
    isApproved,
    isPaid,
    isPending,
    isFree,
    flow,
    forceEnroll,
  };
}
