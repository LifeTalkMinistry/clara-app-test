import {
  COMMITTED_ACCESS_LEVEL,
  COMMITTED_PLAN_KEY,
  COMMITTED_PRODUCT_ID,
  FREE_PLAN_KEY,
  normalizePlanKey,
  resolveMembership,
} from "@/lib/membership";

export const CLARA_PRODUCTS = {
  committed: {
    planKey: COMMITTED_PLAN_KEY,
    accessLevel: COMMITTED_ACCESS_LEVEL,
    tierType: "clara_commitment",
    productId: COMMITTED_PRODUCT_ID,
    productType: "subscription",
    price: 249,
    continuationMonths: 0,
    coachingCredits: 0,
    completedTier: 1,
  },
};
export const CLARA_PRODUCT_IDS = { [COMMITTED_PLAN_KEY]: COMMITTED_PRODUCT_ID };
const PRODUCT_BY_ID = { [COMMITTED_PRODUCT_ID]: CLARA_PRODUCTS.committed };
const PRODUCT_BY_PLAN = { [COMMITTED_PLAN_KEY]: CLARA_PRODUCTS.committed };

export function getClaraProductByPlan(planKey) {
  return PRODUCT_BY_PLAN[normalizePlanKey(planKey)] || null;
}
export function getClaraProductById(productId) {
  return PRODUCT_BY_ID[String(productId ?? "").trim()] || null;
}
export function isProgramPlan(planKey) {
  return normalizePlanKey(planKey) === COMMITTED_PLAN_KEY;
}
export function getProgramWindowEnd(startedAt) {
  const date = startedAt ? new Date(startedAt) : null;
  return date && !Number.isNaN(date.getTime()) ? new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
}
export function getHighestCompletedTier(profile = {}) {
  return Number(profile.highest_completed_tier || 0);
}
export function getEligiblePlanKeys() {
  return [COMMITTED_PLAN_KEY];
}
export function canOfferPlan(_profile = {}, planKey) {
  return normalizePlanKey(planKey) === COMMITTED_PLAN_KEY;
}
export function getCoachingCredits(profile = {}) {
  const total = Number(profile.coaching_credits_total || 0);
  const used = Number(profile.coaching_credits_used || 0);
  return { total, used, remaining: Math.max(0, Number(profile.coaching_credits_remaining ?? total - used)) };
}
export function deriveEffectiveEntitlements(profile = {}) {
  const membership = resolveMembership({ profile });
  const programStart = profile.program_started_at || profile.challenge_started_at || null;
  const programEnd = profile.program_ends_at || getProgramWindowEnd(programStart);
  return {
    effectivePlan: membership.planKey,
    hasProAccess: membership.isActiveCommitted,
    hasProgramAccess: membership.isActiveCommitted,
    committedActive: membership.isActiveCommitted,
    programActive: Boolean(profile.program_active),
    programCompleted: Boolean(profile.program_completed_at),
    programStarted: Boolean(profile.challenge_started || profile.program_started_at),
    programStart: programStart ? new Date(programStart) : null,
    programEnd: programEnd ? new Date(programEnd) : null,
    continuationActive: false,
    highestCompletedTier: getHighestCompletedTier(profile),
    coachingCredits: getCoachingCredits(profile),
  };
}
export function buildProgramCompletionPatch(profile = {}, completedAt = new Date()) {
  const membership = resolveMembership({ profile });
  const active = membership.isActiveCommitted;
  return {
    program_completed_at: new Date(completedAt).toISOString(),
    entitlement_status: active ? "active" : "completed",
    highest_completed_tier: Math.max(getHighestCompletedTier(profile), 1),
    plan: membership.planKey || FREE_PLAN_KEY,
    plan_key: membership.planKey || FREE_PLAN_KEY,
    access_level: membership.accessLevel,
    status: active ? "active" : profile.status || "free",
    enrollment_status: active ? "approved" : profile.enrollment_status || "completed",
    is_enrolled: active,
    program_active: false,
  };
}
