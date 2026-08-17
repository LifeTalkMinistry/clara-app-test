import useUserRole from "@/hooks/useUserRole";
import { isFreeCoreRoute } from "@/lib/plan-config";
import { COMMITTED_PLAN_KEY, resolveMembership } from "@/lib/membership";
import { COMMITTED_MONTHLY_PURCHASE_INTENT } from "@/lib/clara-commitment-framework";

export const CLARA_COMMITTED_PLAN_KEY = COMMITTED_PLAN_KEY;
export const OPEN_COMMITMENT_BOOKLET_EVENT = "clara:open-commitment-booklet";

function getCurrentAppPath() {
  if (typeof window === "undefined") return "";

  const rawHash = String(window.location.hash || "").replace(/^#/, "");
  const [hashPath = ""] = rawHash.split("?");
  if (hashPath.startsWith("/")) return hashPath;

  return String(window.location.pathname || "");
}

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

// Special-service compatibility only. This function continues to answer the
// historical Committed membership question for coaching/legacy surfaces. It is
// not the authority for CLARA's ordinary free core.
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
  const hasCommittedAccess = useCommittedMembershipState().hasCommittedAccess;
  const currentPath = getCurrentAppPath();

  // Monthly Coaching is intentionally discoverable by Free users. The route
  // itself stays open so the live calendar can act as a real preview; the
  // scheduler components separately enforce active supporter access before any
  // date/time can be selected or booked.
  if (currentPath === "/welcome-session") return true;

  // P0-F14 compatibility boundary: old component-level Committed guards are
  // never allowed to deny a route whose product feature is defined as free
  // core. Paid coaching, masterclasses, organization programs, and future
  // special services must authorize themselves outside those core routes.
  if (isFreeCoreRoute(currentPath)) return true;

  return hasCommittedAccess;
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
