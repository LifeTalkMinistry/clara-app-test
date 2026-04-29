import { useCallback, useMemo } from "react";
import { deriveAccessState } from "@/lib/access-control";
import { useAuth } from "@/context/AuthContext";
import usePlanAccess from "@/hooks/usePlanAccess";
import {
  FEATURE_DEFINITIONS,
  PLAN_LABELS,
  getAccessLevelForPlan,
  getFeatureMode,
  isFeatureEnabled,
  normalizeAccessLevel,
  normalizePlanKey,
} from "@/lib/plan-config";
import { deriveEffectiveEntitlements } from "@/lib/clara-entitlements";

const buildFallbackPlanConfig = (plan) => ({
  plan_key: normalizePlanKey(plan || "free"),
});

const buildResolvedUser = (authUser, profile, accessState, referralsEnabled) => {
  if (!authUser) return null;

  const safeProfile = profile || {};

  const fullName =
    safeProfile?.full_name ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    "";

  const plan = normalizePlanKey(
    accessState?.plan || safeProfile?.plan || "free"
  );

  const subscriptionStatus =
    plan === "free"
      ? "free"
      : plan === "pro_99"
        ? "pro"
        : plan === "core_599"
          ? "core"
          : "life_os";

  const accessLevel = normalizeAccessLevel(
    safeProfile?.access_level ||
      subscriptionStatus ||
      getAccessLevelForPlan(plan)
  );

  return {
    ...safeProfile,
    id: authUser.id,
    email: authUser.email,
    full_name: fullName,
    role: safeProfile?.role || accessState?.role || "user",
    plan,
    subscription_status: subscriptionStatus,
    access_level: accessLevel,
    subscription_label: PLAN_LABELS[plan] || "Free",
    subscription: {
      plan,
      access_level: accessLevel,
      status: subscriptionStatus,
      label: PLAN_LABELS[plan] || "Free",
      isPaid: Boolean(accessState?.isPaid),
      isPro: Boolean(accessState?.isPaid) || plan === "pro_99",
      isCore: plan === "core_599",
      isLifeOS: plan === "coaching_1299",
    },
    enrollment_status: safeProfile?.enrollment_status || "none",
    status: safeProfile?.status || "free",
    is_enrolled: safeProfile?.is_enrolled || false,
    program_active: safeProfile?.program_active || false,
    entitlement_status: safeProfile?.entitlement_status || "free",
    challenge_started: safeProfile?.challenge_started || false,
    active_day_number: Number(safeProfile?.active_day_number || 0),
    current_day_status: safeProfile?.current_day_status || "not_started",
    coaching_credits_total: Number(safeProfile?.coaching_credits_total || 0),
    coaching_credits_used: Number(safeProfile?.coaching_credits_used || 0),
    coaching_credits_remaining: Number(
      safeProfile?.coaching_credits_remaining || 0
    ),
    entitlements: deriveEffectiveEntitlements(safeProfile || {}),
    onboarding_completed: safeProfile?.onboarding_completed || false,
    onboarding_step: safeProfile?.onboarding_step || 0,
    program_onboarding_completed:
      safeProfile?.program_onboarding_completed || false,
    has_completed_program_onboarding:
      safeProfile?.has_completed_program_onboarding || false,
    activation_status: safeProfile?.activation_status || "not_required",
    is_activated: Boolean(accessState?.isActivated),
    is_pre_activation: Boolean(accessState?.isPreActivation),
    activated_at: safeProfile?.activated_at || null,
    has_referral_access:
      accessState?.isAdmin ||
      accessState?.isPaid ||
      referralsEnabled ||
      safeProfile?.has_referral_access === true,
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

  const { plansByKey = {} } = usePlanAccess();

  const loading = !authReady || authLoading;
  const ready = !loading;

  const accessState = useMemo(() => {
    if (!authUser) {
      return deriveAccessState({
        role: "user",
        plan: "free",
        access_level: "free",
      });
    }

    return deriveAccessState({
      ...(profile || {}),
      role: profile?.role || authUser?.user_metadata?.role || "user",
      plan: profile?.plan || profile?.subscription_plan || "free",
      access_level:
        profile?.access_level ||
        profile?.subscription_status ||
        getAccessLevelForPlan(profile?.plan || "free"),
    });
  }, [authUser, profile]);

  const role = accessState.role;
  const plan = normalizePlanKey(accessState.plan || "free");
  const isAdmin = accessState.isAdmin;
  const isAdvertiser = accessState.isAdvertiser;
  const isPaid = accessState.isPaid;
  const isPending = accessState.isPending;
  const isFree = accessState.isFree;
  const isPreActivation = accessState.isPreActivation;
  const isActivated = accessState.isActivated;

  const planConfig = useMemo(
    () => plansByKey?.[plan] || buildFallbackPlanConfig(plan),
    [plansByKey, plan]
  );

  const planLabel = isAdmin
    ? "Admin"
    : isAdvertiser
      ? "Advertiser"
      : PLAN_LABELS[plan] || "Free";

  const featureModes = useMemo(() => {
    const safePlanConfig = planConfig || buildFallbackPlanConfig(plan);

    const baseModes = FEATURE_DEFINITIONS.reduce((acc, feature) => {
      acc[feature.key] = getFeatureMode(safePlanConfig, feature.key);
      return acc;
    }, {});

    if (!isPreActivation) return baseModes;

    return {
      ...baseModes,
      tasks: "preview",
      modules: "preview",
      community: "view",
      messages: "admin_only",
      ai:
        plan === "coaching_1299"
          ? "life_os"
          : plan === "core_599"
            ? "advanced"
            : "off",
    };
  }, [isPreActivation, plan, planConfig]);

  const isFeatureAvailable = useCallback(
    (featureKey) => {
      if (isAdmin || isAdvertiser) return true;
      return Boolean(featureModes[featureKey] && featureModes[featureKey] !== "off");
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
        isFeatureEnabled(planConfig || buildFallbackPlanConfig(plan), "referrals")
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
      emergencyFund: isFeatureAvailable("savings_goals"),
      savingsGoals: isFeatureAvailable("savings_goals"),
      news: isFeatureAvailable("news"),
      referrals: isFeatureAvailable("referrals"),
      ai: isFeatureAvailable("ai"),
      aiBasic: hasFeatureAccess("ai", ["basic", "advanced", "life_os"]),
      aiAdvanced: hasFeatureAccess("ai", ["advanced", "life_os"]),
      aiLifeOS: hasFeatureAccess("ai", ["life_os"]),
      customization: isFeatureAvailable("customization"),
    }),
    [hasFeatureAccess, isFeatureAvailable]
  );

  const refreshUser = useCallback(async () => {
    await refreshProfile?.();
  }, [refreshProfile]);

  return {
    user,
    loading,
    ready,
    role,
    plan,
    isAdmin,
    isAdvertiser,
    isPaid,
    isFree,
    isPending,
    isPreActivation,
    isActivated,
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
