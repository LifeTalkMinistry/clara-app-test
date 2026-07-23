import useUserRole from "@/hooks/useUserRole";
import { COMMITTED_PLAN_KEY, resolveMembership } from "@/lib/membership";
import { COMMITTED_MONTHLY_PURCHASE_INTENT } from "@/lib/clara-commitment-framework";

export const CLARA_COMMITTED_PLAN_KEY = COMMITTED_PLAN_KEY;
export const OPEN_COMMITMENT_BOOKLET_EVENT = "clara:open-commitment-booklet";

export function resolveCommittedMembershipState(options = {}) {
  const membership = resolveMembership({
    profile:
      options.accountProfile ||
      options.user?.account_profile ||
      options.user?.profile ||
      options.user ||
      {},
    user: options.user,
    plan: options.plan,
    loading: options.loading,
    ready: options.ready,
  });

  return {
    ...membership,
    resolvedPlan: membership.planKey,
    hasBillingRecord: Boolean(options.billingRecord),
    isPaid: membership.isActiveCommitted,
    billingSyncKey: [
      options.user?.id || "guest",
      membership.planKey,
      membership.membershipStatus,
      "backend",
    ].join(":"),
  };
}

export function canAccessCommittedFeatures(options = {}) {
  return resolveCommittedMembershipState(options).hasCommittedAccess;
}

export function useCommittedMembershipState({ billingRecord = null } = {}) {
  const state = useUserRole();
  if (state.membership) {
    return {
      ...state.membership,
      resolvedPlan: state.membership.planKey,
      hasBillingRecord: Boolean(billingRecord),
      isPaid: state.membership.isActiveCommitted,
      billingSyncKey: [
        state.user?.id || "guest",
        state.membership.planKey,
        state.membership.membershipStatus,
        "backend",
      ].join(":"),
    };
  }
  return resolveCommittedMembershipState({
    ...state,
    accountProfile: state.accountProfile,
    billingRecord,
  });
}

export function useCommittedFeatureAccess() {
  return useCommittedMembershipState().hasCommittedAccess;
}

export function openCommittedVersionModal(
  purchaseIntent = COMMITTED_MONTHLY_PURCHASE_INTENT
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_COMMITMENT_BOOKLET_EVENT, {
      detail: { purchaseIntent, informationalOnly: true },
    })
  );
}
