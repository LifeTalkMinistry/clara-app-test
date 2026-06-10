import useUserRole from "@/hooks/useUserRole";
import { COMMITTED_PLAN_KEY, resolveMembership } from "@/lib/membership";

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
    preview: options.preview || options.previewPlan || null,
    isAdmin: options.isAdmin,
    isAdvertiser: options.isAdvertiser,
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
      membership.isDeveloperPreview ? "preview" : "real",
    ].join(":"),
  };
}

export function canAccessCommittedFeatures(options = {}) {
  return resolveCommittedMembershipState(options).hasCommittedAccess;
}

export function useCommittedMembershipState({
  preview = null,
  previewPlan = "",
  billingRecord = null,
} = {}) {
  const state = useUserRole();

  if (state.membership && !preview && !previewPlan) {
    return {
      ...state.membership,
      resolvedPlan: state.membership.planKey,
      hasBillingRecord: Boolean(billingRecord),
      isPaid: state.membership.isActiveCommitted,
      billingSyncKey: [
        state.user?.id || "guest",
        state.membership.planKey,
        state.membership.membershipStatus,
        state.membership.isDeveloperPreview ? "preview" : "real",
      ].join(":"),
    };
  }

  return resolveCommittedMembershipState({
    ...state,
    accountProfile: state.accountProfile,
    preview: preview || previewPlan || state.developerMembershipPreview,
    billingRecord,
  });
}

export function useCommittedFeatureAccess({ preview = null, previewPlan = "" } = {}) {
  return useCommittedMembershipState({ preview, previewPlan }).hasCommittedAccess;
}

export function openCommittedVersionModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COMMITMENT_BOOKLET_EVENT));
}
