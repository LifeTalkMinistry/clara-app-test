import { useCallback, useMemo } from "react";
import { deriveAccessState } from "@/lib/access-control";
import { useAuth } from "@/context/AuthContext";
import usePlanAccess from "@/hooks/usePlanAccess";
import {
  FEATURE_DEFINITIONS,
  PLAN_LABELS,
  getFeatureMode,
  isFeatureEnabled,
  normalizePlanKey,
} from "@/lib/plan-config";

const buildResolvedUser = (authUser, profile, accessState, referralsEnabled) => {
  if (!authUser) return null;

  const fullName =
    profile?.full_name ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    "";

  return {
    ...(profile || {}),
    id: authUser.id,
    email: authUser.email,
    full_name: fullName,
    role: profile?.role || "user",
    plan: normalizePlanKey(profile?.plan || "free"),
    enrollment_status: profile?.enrollment_status || "none",
    status: profile?.status || "free",
    is_enrolled: profile?.is_enrolled || false,
    program_active: profile?.program_active || false,
    onboarding_completed: profile?.onboarding_completed || false,
    onboarding_step: profile?.onboarding_step || 0,
    has_referral_access:
      accessState.isAdmin ||
      accessState.isPaid ||
      referralsEnabled ||
      profile?.has_referral_access === true,
    profile: profile || null,
  };
};

export default function useUserRole() {
  const {
    user: authUser,
    profile,
    loading: authLoading,
    authReady,
    refreshProfile,
  } = useAuth();
  const { plansByKey, loading: plansLoading } = usePlanAccess();

  const loading =
    !authReady ||
    (Boolean(authUser) && profile === null) ||
    authLoading ||
    plansLoading;

  const accessState = useMemo(() => {
    if (!authUser || !profile) {
      return deriveAccessState({
        role: authUser?.user_metadata?.role || "user",
      });
    }

    return deriveAccessState(profile);
  }, [authUser, profile]);

  const role = accessState.role;
  const plan = accessState.plan;
  const isAdmin = accessState.isAdmin;
  const isAdvertiser = accessState.isAdvertiser;
  const isPaid = accessState.isPaid;
  const isPending = accessState.isPending;
  const isFree = accessState.isFree;
  const planConfig = plansByKey[plan] || null;

  const planLabel = isAdmin
    ? "Admin"
    : isAdvertiser
      ? "Advertiser"
      : PLAN_LABELS[plan] || "Free";

  const featureModes = useMemo(() => {
    return FEATURE_DEFINITIONS.reduce((acc, feature) => {
      acc[feature.key] = getFeatureMode(planConfig || { plan_key: plan }, feature.key);
      return acc;
    }, {});
  }, [plan, planConfig]);

  const isFeatureAvailable = useCallback(
    (featureKey) => {
      if (isAdmin || isAdvertiser) return true;
      return featureModes[featureKey] && featureModes[featureKey] !== "off";
    },
    [featureModes, isAdmin, isAdvertiser]
  );

  const hasFeatureAccess = useCallback(
    (featureKey, allowedModes = ["full"]) => {
      if (isAdmin || isAdvertiser) return true;
      const allowed = Array.isArray(allowedModes) ? allowedModes : [allowedModes];
      return allowed.includes(featureModes[featureKey]);
    },
    [featureModes, isAdmin, isAdvertiser]
  );

  const getFeatureAccessMode = useCallback(
    (featureKey) => {
      if (isAdmin || isAdvertiser) return "full";
      return featureModes[featureKey] || "off";
    },
    [featureModes, isAdmin, isAdvertiser]
  );

  const user = useMemo(
    () =>
      buildResolvedUser(
        authUser,
        profile,
        accessState,
        isFeatureEnabled(planConfig || { plan_key: plan }, "referrals")
      ),
    [accessState, authUser, plan, planConfig, profile]
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
      coaching: isFeatureAvailable("coaching"),
      coachingFull: hasFeatureAccess("coaching", ["full"]),
      coachingTeaser: hasFeatureAccess("coaching", ["teaser", "full"]),
      emergencyFund: isFeatureAvailable("savings_goals"),
      savingsGoals: isFeatureAvailable("savings_goals"),
      news: isFeatureAvailable("news"),
      referrals: isFeatureAvailable("referrals"),
    }),
    [hasFeatureAccess, isFeatureAvailable]
  );

  const refreshUser = useCallback(async () => {
    await refreshProfile?.();
  }, [refreshProfile]);

  return {
    user,
    loading,
    ready: !loading,
    role,
    plan,
    isAdmin,
    isAdvertiser,
    isPaid,
    isFree,
    isPending,
    planLabel,
    planConfig,
    featureModes,
    isFeatureAvailable,
    hasFeatureAccess,
    getFeatureAccessMode,
    access,
    refreshUser,
  };
}
