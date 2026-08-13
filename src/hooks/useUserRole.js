import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import usePlanAccess from "@/hooks/usePlanAccess";
import {
  getFreeCoreFeatureModes,
  getPlanDefaults,
} from "@/lib/plan-config";
import {
  FREE_PLAN_KEY,
  resolveMembership,
} from "@/lib/membership";
import { deriveEffectiveEntitlements } from "@/lib/clara-entitlements";

export default function useUserRole() {
  const {
    user: authUser,
    profile,
    loading: authLoading,
    authReady,
    refreshProfile,
  } = useAuth();
  const { plansByKey = {} } = usePlanAccess();
  const loading = !authReady || authLoading;
  const ready = !loading;
  const role = String(
    profile?.role || authUser?.user_metadata?.role || "user"
  )
    .trim()
    .toLowerCase();
  const isAdmin = role === "admin";
  const isAdvertiser = role === "advertiser";
  const membership = useMemo(
    () =>
      resolveMembership({
        profile: profile || {},
        user: authUser,
        loading,
        ready,
      }),
    [authUser, loading, profile, ready]
  );
  const effectiveProfile = profile || {};
  const plan = membership.planKey;
  const planConfig = plansByKey?.[plan] || getPlanDefaults(plan);

  // P0-F14: normal product access comes only from the immutable CLARA Free
  // policy. Billing, support, beta, and future paid-service state can still be
  // displayed on the account, but they cannot add or remove free-core access.
  const featureModes = useMemo(() => getFreeCoreFeatureModes(), []);

  const isFeatureAvailable = useCallback(
    (featureKey) => featureModes[featureKey] !== "off",
    [featureModes]
  );
  const hasFeatureAccess = useCallback(
    (featureKey, allowedModes = ["full"]) => {
      const allowed = Array.isArray(allowedModes)
        ? allowedModes
        : [allowedModes];
      return allowed.includes(featureModes[featureKey]);
    },
    [featureModes]
  );
  const getFeatureAccessMode = useCallback(
    (featureKey) => featureModes[featureKey] || "off",
    [featureModes]
  );
  const fullName =
    effectiveProfile?.full_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    "";
  const user = useMemo(
    () =>
      authUser
        ? {
            ...effectiveProfile,
            id: authUser.id,
            email: authUser.email,
            full_name: fullName,
            role,
            plan,
            plan_key: plan,
            subscription_plan: plan,
            access_level: membership.accessLevel,
            subscription_status:
              membership.membershipStatus === "not_committed"
                ? "free"
                : membership.membershipStatus,
            subscription_label: membership.planLabel,
            subscription: {
              plan,
              access_level: membership.accessLevel,
              status: membership.membershipStatus,
              label: membership.planLabel,
              isPaid: membership.isActiveCommitted,
              isCommitted: membership.isCommittedPlan,
              isActiveCommitted: membership.isActiveCommitted,
            },
            entitlements: deriveEffectiveEntitlements(effectiveProfile),
            profile: profile || null,
            account_profile: profile || null,
          }
        : null,
    [authUser, effectiveProfile, fullName, membership, plan, profile, role]
  );
  const access = useMemo(
    () => ({
      dashboard: isFeatureAvailable("dashboard"),
      expenses: isFeatureAvailable("expenses"),
      wallets: isFeatureAvailable("wallets"),
      budgets: isFeatureAvailable("budgets"),
      analytics: isFeatureAvailable("analytics"),
      analyticsExtended: hasFeatureAccess("analytics", ["full"]),
      tasks: isFeatureAvailable("tasks"),
      tasksFull: hasFeatureAccess("tasks", ["full"]),
      tasksPreview: hasFeatureAccess("tasks", ["preview", "full"]),
      modules: isFeatureAvailable("modules"),
      modulesFull: hasFeatureAccess("modules", ["full"]),
      modulesPreview: hasFeatureAccess("modules", ["preview", "full"]),
      community: isFeatureAvailable("community"),
      communityPosting: hasFeatureAccess("community", ["full"]),
      messaging: isFeatureAvailable("messages"),
      messagingFull: hasFeatureAccess("messages", ["full"]),
      // Preserve the legacy Support/admin conversation allowance explicitly while
      // keeping normal messaging fully available to free users.
      messagingAdminOnly:
        hasFeatureAccess("messages", ["admin_only", "full"]) ||
        plan === FREE_PLAN_KEY,
      emergencyFund: isFeatureAvailable("savings_goals"),
      savingsGoals: isFeatureAvailable("savings_goals"),
      news: isFeatureAvailable("news"),
      referrals: isFeatureAvailable("referrals"),
      ai: isFeatureAvailable("ai"),
      aiBasic: isFeatureAvailable("ai"),
      aiAdvanced: isFeatureAvailable("ai"),
      aiElite: isFeatureAvailable("ai"),
      customization: isFeatureAvailable("customization"),
      coaching: getFeatureAccessMode("coaching"),
    }),
    [getFeatureAccessMode, hasFeatureAccess, isFeatureAvailable, plan]
  );
  const refreshUser = useCallback(
    async (options) => refreshProfile?.(options),
    [refreshProfile]
  );

  return {
    user,
    loading,
    ready,
    role,
    plan,
    isAdmin,
    isAdvertiser,
    // Legacy billing state is retained for account compatibility only. It does
    // not determine access to CLARA's normal financial/accountability features.
    isPaid: membership.isActiveCommitted,
    isFree: plan === FREE_PLAN_KEY,
    isPending: membership.isPendingActivation,
    isPreActivation: membership.isPendingActivation,
    isActivated: membership.isActiveCommitted,
    isCommitted: membership.isCommittedPlan,
    hasActiveCommittedAccess: membership.isActiveCommitted,
    hasCommittedAccess: membership.hasCommittedAccess,
    membership,
    accountProfile: profile || null,
    developerMembershipPreview: null,
    developerPlanPreview: null,
    planLabel: membership.planLabel,
    planConfig,
    featureModes,
    isFeatureAvailable,
    hasFeatureAccess,
    getFeatureAccessMode,
    access,
    refreshUser,
  };
}
