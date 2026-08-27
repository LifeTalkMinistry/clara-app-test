export const BACKEND_FREE_PLAN = "free";
export const BACKEND_SUPPORTER_PLAN = "supporter";
export const BACKEND_BUILDER_PLAN = "builder";
export const BACKEND_CHAMPION_PLAN = "champion";
export const BACKEND_COMMITTED_PLAN = "committed";
export const FREE_PLAN_KEY = "free";
export const SUPPORTER_PLAN_KEY = "supporter";
export const BUILDER_PLAN_KEY = "builder";
export const CHAMPION_PLAN_KEY = "champion";
export const COMMITTED_PLAN_KEY = "committed_249";
export const BACKEND_ACCOUNT_PLANS = Object.freeze([
  BACKEND_FREE_PLAN,
  BACKEND_SUPPORTER_PLAN,
  BACKEND_BUILDER_PLAN,
  BACKEND_CHAMPION_PLAN,
]);
export const BACKEND_ACCOUNT_STATUSES = Object.freeze(["active", "pending", "inactive"]);

// The backend keys remain unchanged for compatibility with the existing payment
// and admin infrastructure. Only the product-facing labels have changed.
const SUPPORT_PLAN_LABELS = Object.freeze({
  supporter: "Take Control",
  builder: "Stay Consistent",
  champion: "Don't Do It Alone",
});

export function normalizeBackendPlan(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return BACKEND_ACCOUNT_PLANS.includes(normalized) ? normalized : BACKEND_FREE_PLAN;
}

export function normalizeBackendStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return BACKEND_ACCOUNT_STATUSES.includes(normalized) ? normalized : "inactive";
}

export function isBackendSupportPlanActive(serverUser = {}) {
  const plan = normalizeBackendPlan(serverUser.plan);
  return plan !== BACKEND_FREE_PLAN && normalizeBackendStatus(serverUser.status) === "active";
}

// Legacy compatibility alias. The old Committed plan is retired; callers that
// still use this helper now receive the canonical paid-membership answer.
export function isBackendCommittedActive(serverUser = {}) {
  return isBackendSupportPlanActive(serverUser);
}

export function buildBackendMembershipProfile(serverUser = {}, baseProfile = {}) {
  const backendPlan = normalizeBackendPlan(serverUser.plan);
  const accountStatus = normalizeBackendStatus(serverUser.status);
  const activeSupportPlan =
    backendPlan !== BACKEND_FREE_PLAN && accountStatus === "active";
  const membershipStatus =
    backendPlan !== BACKEND_FREE_PLAN ? accountStatus : "free";

  return {
    ...baseProfile,
    plan: backendPlan,
    plan_key: backendPlan,
    subscription_plan: backendPlan,
    backend_plan: backendPlan,
    account_status: accountStatus,
    membership_source: "backend",
    access_level: activeSupportPlan ? "committed" : "free",
    subscription_status: membershipStatus,
    entitlement_status: membershipStatus,
    activation_status:
      backendPlan !== BACKEND_FREE_PLAN ? accountStatus : "not_required",
    enrollment_status:
      activeSupportPlan ? "approved" : backendPlan !== BACKEND_FREE_PLAN ? accountStatus : "none",
    status: accountStatus,
    is_activated: activeSupportPlan,
    is_enrolled: activeSupportPlan,
    program_active: activeSupportPlan,
    has_pro_access: activeSupportPlan,
    has_program_access: activeSupportPlan,
    isPro: activeSupportPlan,
    support_tier: backendPlan === BACKEND_FREE_PLAN ? null : backendPlan,
    subscription_label:
      backendPlan === BACKEND_FREE_PLAN
        ? "No Active Membership"
        : SUPPORT_PLAN_LABELS[backendPlan],
  };
}

export function buildBackendEnrollment(serverUser = {}) {
  const backendPlan = normalizeBackendPlan(serverUser.plan);
  const accountStatus = normalizeBackendStatus(serverUser.status);

  if (backendPlan === BACKEND_FREE_PLAN) return null;

  return {
    id: `backend_membership_${serverUser.id || "user"}`,
    user_id: serverUser.id || null,
    plan: backendPlan,
    plan_key: backendPlan,
    selected_plan: backendPlan,
    tier: backendPlan,
    status: accountStatus,
    source: "backend",
    created_at: serverUser.created_at || null,
    updated_at: serverUser.updated_at || null,
  };
}
