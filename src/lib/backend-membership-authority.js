export const BACKEND_FREE_PLAN = "free";
export const BACKEND_COMMITTED_PLAN = "committed";
export const FREE_PLAN_KEY = "free";
export const COMMITTED_PLAN_KEY = "committed_249";
export const BACKEND_ACCOUNT_STATUSES = Object.freeze(["active", "pending", "inactive"]);

export function normalizeBackendPlan(value) {
  return String(value || "").trim().toLowerCase() === BACKEND_COMMITTED_PLAN
    ? BACKEND_COMMITTED_PLAN
    : BACKEND_FREE_PLAN;
}

export function normalizeBackendStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return BACKEND_ACCOUNT_STATUSES.includes(normalized) ? normalized : "inactive";
}

export function isBackendCommittedActive(serverUser = {}) {
  return (
    normalizeBackendPlan(serverUser.plan) === BACKEND_COMMITTED_PLAN &&
    normalizeBackendStatus(serverUser.status) === "active"
  );
}

export function buildBackendMembershipProfile(serverUser = {}, baseProfile = {}) {
  const backendPlan = normalizeBackendPlan(serverUser.plan);
  const accountStatus = normalizeBackendStatus(serverUser.status);
  const planKey =
    backendPlan === BACKEND_COMMITTED_PLAN ? COMMITTED_PLAN_KEY : FREE_PLAN_KEY;
  const activeCommitted =
    backendPlan === BACKEND_COMMITTED_PLAN && accountStatus === "active";
  const committedStatus =
    backendPlan === BACKEND_COMMITTED_PLAN ? accountStatus : "free";

  return {
    ...baseProfile,
    plan: planKey,
    plan_key: planKey,
    subscription_plan: planKey,
    backend_plan: backendPlan,
    account_status: accountStatus,
    membership_source: "backend",
    access_level: activeCommitted ? "committed" : "free",
    subscription_status: committedStatus,
    entitlement_status: committedStatus,
    activation_status:
      backendPlan === BACKEND_COMMITTED_PLAN ? accountStatus : "not_required",
    enrollment_status:
      activeCommitted ? "approved" : backendPlan === BACKEND_COMMITTED_PLAN ? accountStatus : "none",
    status: accountStatus,
    is_activated: activeCommitted,
    is_enrolled: activeCommitted,
    program_active: activeCommitted,
    has_pro_access: activeCommitted,
    has_program_access: activeCommitted,
    isPro: activeCommitted,
    subscription_label:
      backendPlan === BACKEND_COMMITTED_PLAN ? "Committed" : "Free Version",
  };
}

export function buildBackendEnrollment(serverUser = {}) {
  const backendPlan = normalizeBackendPlan(serverUser.plan);
  const accountStatus = normalizeBackendStatus(serverUser.status);

  if (backendPlan !== BACKEND_COMMITTED_PLAN) return null;

  return {
    id: `backend_membership_${serverUser.id || "user"}`,
    user_id: serverUser.id || null,
    plan: COMMITTED_PLAN_KEY,
    plan_key: COMMITTED_PLAN_KEY,
    selected_plan: COMMITTED_PLAN_KEY,
    tier: COMMITTED_PLAN_KEY,
    status: accountStatus,
    source: "backend",
    created_at: serverUser.created_at || null,
    updated_at: serverUser.updated_at || null,
  };
}
