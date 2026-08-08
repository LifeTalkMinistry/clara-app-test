import {
  COMMITTED_PLAN_KEY,
  FREE_PLAN_KEY,
  PENDING_MEMBERSHIP_STATUSES,
  normalizeMembershipToken,
  normalizePlanKey,
  resolveMembership,
} from "@/lib/membership";
import { hasCompletedLocalSetup } from "@/lib/claraLocalProfile";

export const ENROLLMENT_PENDING_STATUSES = PENDING_MEMBERSHIP_STATUSES;
export const ENROLLMENT_APPROVED_STATUSES = new Set(["approved", "active"]);
export const ENROLLMENT_RETRY_STATUSES = new Set([
  "rejected",
  "resubmit_required",
  "none",
  "",
]);
// Legacy billing compatibility only. Paid state no longer controls core app access.
export const PAID_TIERS = [COMMITTED_PLAN_KEY];

export function normalizeAccessValue(value) {
  return normalizeMembershipToken(value);
}

export function getEnrollmentStatus(enrollment, profileLike) {
  return normalizeAccessValue(
    profileLike?.enrollment_status ||
      profileLike?.account_status ||
      profileLike?.status ||
      enrollment?.status ||
      enrollment?.payment_status ||
      ""
  );
}

export function hasCompletedOnboarding(profileLike = {}) {
  return hasCompletedLocalSetup(profileLike);
}

export function hasCompletedProgramOnboarding() {
  return true;
}

export function isActivationRequiredPlan(planKey) {
  return normalizePlanKey(planKey) === COMMITTED_PLAN_KEY;
}

export function hasActivatedPlan(profileLike = {}) {
  return resolveMembership({ profile: profileLike }).isActiveCommitted;
}

export function hasAnyPaidSignal(profileLike = {}) {
  return resolveMembership({ profile: profileLike }).isActiveCommitted;
}

// Enrollment/payment state must never block entry into CLARA's normal app.
export function shouldForceEnrollment() {
  return false;
}

export function resolveAppFlow() {
  return "normal";
}

export function deriveAccessState(profileLike = {}, enrollment = null) {
  const role = normalizeAccessValue(profileLike?.role || "user");
  const isAdmin = role === "admin";
  const isAdvertiser = role === "advertiser";
  const membership = resolveMembership({ profile: profileLike });
  const flow = resolveAppFlow(profileLike, enrollment);

  return {
    role,
    plan: membership.planKey,
    accessLevel: membership.accessLevel,
    entitlements: membership,
    enrollmentStatus: getEnrollmentStatus(enrollment, profileLike),
    isAdmin,
    isAdvertiser,
    isApproved: true,
    isPaid: membership.isActiveCommitted,
    isPending: membership.isPendingActivation,
    isFree: membership.planKey === FREE_PLAN_KEY,
    activationRequired: false,
    isActivated: true,
    isPreActivation: false,
    flow,
    forceEnroll: false,
  };
}
