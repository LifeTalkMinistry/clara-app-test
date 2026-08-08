import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import usePlanAccess from "@/hooks/usePlanAccess";
import {
  FEATURE_DEFINITIONS,
  getFeatureMode,
  getPlanDefaults,
} from "@/lib/plan-config";
import {
  COMMITTED_PLAN_KEY,
  FREE_PLAN_KEY,
  resolveMembership,
} from "@/lib/membership";
import { deriveEffectiveEntitlements } from "@/lib/clara-entitlements";

const buildModes = (planConfig) =>
  FEATURE_DEFINITIONS.reduce((acc, feature) => {
    acc[feature.key] = getFeatureMode(planConfig, feature.key);
    return acc;
  }, {});

const buildFreeCoreModes = (plansByKey = {}) => {
  // CLARA's financial/accountability app is free. Reuse the complete legacy
  // feature map for compatibility, then keep personal coaching independent.
  const modes = buildModes(
    plansByKey?.[COMMITTED_PLAN_KEY] || getPlanDefaults(COMMITTED_PLAN_KEY)
  );
  modes.coaching = "teaser";
  return modes;
};

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
  const featureModes = useMemo(
    () => buildFreeCoreModes(plansByKey),
    [plansByKey]
  );

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
      messagingAdminOnly: hasFeatureAccess("messages", ["admin_only", "full"]),
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
    [getFeatureAccessMode, hasFeatureAccess, isFeatureAvailable]
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