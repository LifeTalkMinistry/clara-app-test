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
export const ENROLLMENT_RETRY_STATUSES = new Set(["rejected", "resubmit_required", "none", ""]);
export const PAID_TIERS = [COMMITTED_PLAN_KEY];
export function normalizeAccessValue(value) { return normalizeMembershipToken(value); }
export function getEnrollmentStatus(enrollment, profileLike) {
  return normalizeAccessValue(profileLike?.enrollment_status || profileLike?.status || enrollment?.status || enrollment?.payment_status || "");
}
export function hasCompletedOnboarding(profileLike = {}) {
  const role = normalizeAccessValue(profileLike?.role || "user");
  if (role === "admin" || role === "advertiser") return true;
  return hasCompletedLocalSetup();
}
export function hasCompletedProgramOnboarding(_profileLike) {
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
export function shouldForceEnrollment(profileLike, enrollment) {
  const membership = resolveMembership({ profile: profileLike });
  const enrollmentStatus = getEnrollmentStatus(enrollment, profileLike);
  if (!enrollment) return false;
  return membership.planKey === FREE_PLAN_KEY && !membership.isActiveCommitted && ENROLLMENT_RETRY_STATUSES.has(enrollmentStatus);
}
export function resolveAppFlow(profileLike, _enrollment) {
  if (!hasCompletedOnboarding(profileLike)) return "universal_onboarding";
  return "normal";
}
export function deriveAccessState(profileLike = {}, enrollment = null) {
  const role = normalizeAccessValue(profileLike?.role || "user");
  const isAdmin = role === "admin";
  const isAdvertiser = role === "advertiser";
  const membership = resolveMembership({ profile: profileLike, isAdmin, isAdvertiser });
  const flow = resolveAppFlow(profileLike, enrollment);
  return {
    role,
    plan: membership.planKey,
    accessLevel: membership.accessLevel,
    entitlements: membership,
    enrollmentStatus: getEnrollmentStatus(enrollment, profileLike),
    isAdmin,
    isAdvertiser,
    isApproved: membership.isActiveCommitted,
    isPaid: membership.isActiveCommitted,
    isPending: membership.isPendingActivation,
    isFree: membership.planKey === FREE_PLAN_KEY,
    activationRequired: membership.isCommittedPlan,
    isActivated: membership.isActiveCommitted,
    isPreActivation: membership.isPendingActivation,
    flow,
    forceEnroll: !isAdmin && !isAdvertiser && shouldForceEnrollment(profileLike, enrollment),
  };
}
