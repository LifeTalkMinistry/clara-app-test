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

const COMMITTED_PLAN_KEY = "life_os_499";
const COMMITTED_ACCESS_LEVEL = "life_os";

const buildFallbackPlanConfig = (plan) => ({
  plan_key: normalizePlanKey(plan || "free"),
});

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function isActiveCommittedProfile(profileLike = {}, previewPlan = null) {
  const plan = normalizePlanKey(
    previewPlan ||
      profileLike?.plan ||
      profileLike?.plan_key ||
      profileLike?.subscription_plan ||
      "free"
  );

  if (plan !== COMMITTED_PLAN_KEY) return false;
  if (previewPlan === COMMITTED_PLAN_KEY) return true;

  const activeStatuses = new Set([
    "active",
    "activated",
    "approved",
    "committed",
    "paid",
    "completed",
    "confirmed",
    "verified",
    "current",
  ]);
  const pendingStatuses = new Set([
    "pending",
    "processing",
    "submitted",
    "under_review",
    "awaiting_approval",
    "awaiting_review",
    "payment_pending",
    "google_play_pending",
    "google_play_processing",
    "purchase_pending",
    "purchase_processing",
    "pre_activation",
  ]);
  const statuses = [
    profileLike?.subscription_status,
    profileLike?.entitlement_status,
    profileLike?.enrollment_status,
    profileLike?.activation_status,
    profileLike?.status,
  ].map(normalizeStatus);

  if (statuses.some((status) => pendingStatuses.has(status))) return false;

  return Boolean(
    normalizeStatus(profileLike?.role) === "paid_user" ||
      profileLike?.is_enrolled === true ||
      profileLike?.program_active === true ||
      profileLike?.is_activated === true ||
      profileLike?.has_pro_access === true ||
      profileLike?.has_program_access === true ||
      statuses.some((status) => activeStatuses.has(status)) ||
      profileLike?.activated_at
  );
}

function buildCommittedFeatureModes() {
  return FEATURE_DEFINITIONS.reduce((acc, feature) => {
    if (feature.key === "ai" && feature.modes.includes("life_os")) {
      acc[feature.key] = "life_os";
      return acc;
    }

    if (feature.modes.includes("full")) {
      acc[feature.key] = "full";
      return acc;
    }

    acc[feature.key] = feature.modes.find((mode) => mode !== "off") || "off";
    return acc;
  }, {});
}

function getDeveloperPlanPreview() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("clara_dev_plan_preview");
    if (!raw) return null;

    if (raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw);
      return normalizePlanKey(parsed?.plan || "free");
    }

    return normalizePlanKey(raw);
  } catch (error) {
    console.warn("Unable to read CLARA developer plan preview", error);
    return null;
  }
}

function applyDeveloperPlanPreview(profileLike = {}, previewPlan = null) {
  if (!previewPlan) return profileLike;

  const plan = normalizePlanKey(previewPlan);
  const paid = plan !== "free";
  const accessLevel = paid ? getAccessLevelForPlan(plan) : "free";

  return {
    ...(profileLike || {}),
    role: paid ? "paid_user" : "user",
    plan,
    subscription_plan: plan,
    access_level: accessLevel,
    subscription_status: paid ? "active" : "free",
    subscription_label: paid ? "CLARA Commitment" : "Explorer",
    status: paid ? "approved" : "free",
    enrollment_status: paid ? "approved" : "none",
    is_enrolled: paid,
    program_active: paid,
    entitlement_status: paid ? "active" : "free",
    activation_status: paid ? "active" : "not_required",
    is_activated: true,
    has_pro_access: paid,
    has_program_access: paid,
    dev_plan_preview: true,
  };
}

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

  const isCommitted = plan === COMMITTED_PLAN_KEY;

  const subscriptionStatus =
    plan === "free"
      ? "free"
      : isCommitted
        ? accessState?.isActivated && !accessState?.isPending
          ? "active"
          : "pending"
        : plan === "pro_99"
          ? "pro"
          : plan === "core_199"
            ? "core"
            : "elite";

  const accessLevel = normalizeAccessLevel(
    safeProfile?.access_level ||
      accessState?.accessLevel ||
      subscriptionStatus ||
      getAccessLevelForPlan(plan)
  );

  const displayLabel = isCommitted ? "Committed" : PLAN_LABELS[plan] || "Free";

  return {
    ...safeProfile,
    id: authUser.id,
    email: authUser.email,
    full_name: fullName,
    role: safeProfile?.role || accessState?.role || "user",
    plan,
    subscription_status: subscriptionStatus,
    access_level: accessLevel,
    subscription_label: displayLabel,
    subscription: {
      plan,
      access_level: accessLevel,
      status: subscriptionStatus,
      label: displayLabel,
      isPaid: Boolean(accessState?.isPaid),
      isPro: Boolean(accessState?.isPaid) || plan === "pro_99",
      isCore: plan === "core_199",
      isElite: isCommitted,
      isCommitted,
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
  const developerPlanPreview = getDeveloperPlanPreview();
  const effectiveProfile = useMemo(
    () => applyDeveloperPlanPreview(profile || {}, developerPlanPreview),
    [profile, developerPlanPreview]
  );

  const accessState = useMemo(() => {
    if (!authUser) {
      return deriveAccessState({
        role: "user",
        plan: "free",
        access_level: "free",
      });
    }

    const baseAccessState = deriveAccessState({
      ...(effectiveProfile || {}),
      role: effectiveProfile?.role || authUser?.user_metadata?.role || "user",
      plan:
        effectiveProfile?.plan ||
        effectiveProfile?.plan_key ||
        effectiveProfile?.subscription_plan ||
        "free",
      access_level:
        effectiveProfile?.access_level ||
        effectiveProfile?.subscription_status ||
        getAccessLevelForPlan(effectiveProfile?.plan || "free"),
    });

    const committedPlanSelected =
      normalizePlanKey(
        developerPlanPreview ||
          effectiveProfile?.plan ||
          effectiveProfile?.plan_key ||
          effectiveProfile?.subscription_plan ||
          baseAccessState.plan ||
          "free"
      ) === COMMITTED_PLAN_KEY;

    if (isActiveCommittedProfile(effectiveProfile, developerPlanPreview)) {
      return {
        ...baseAccessState,
        plan: COMMITTED_PLAN_KEY,
        accessLevel: COMMITTED_ACCESS_LEVEL,
        isPaid: true,
        isFree: false,
        isPending: false,
        isActivated: true,
        isPreActivation: false,
        activationRequired: false,
      };
    }

    if (committedPlanSelected) {
      return {
        ...baseAccessState,
        plan: COMMITTED_PLAN_KEY,
        accessLevel: COMMITTED_ACCESS_LEVEL,
        isPaid: false,
        isFree: false,
        isPending: true,
        isActivated: false,
        isPreActivation: true,
        activationRequired: true,
      };
    }

    return baseAccessState;
  }, [authUser, effectiveProfile, developerPlanPreview]);

  const role = accessState.role;
  const plan = normalizePlanKey(accessState.plan || "free");
  const isAdmin = accessState.isAdmin;
  const isAdvertiser = accessState.isAdvertiser;
  const isPaid = accessState.isPaid;
  const isPending = accessState.isPending;
  const isFree = accessState.isFree;
  const isPreActivation = accessState.isPreActivation;
  const isActivated = accessState.isActivated;
  const isCommitted = plan === COMMITTED_PLAN_KEY;
  const hasActiveCommittedAccess = Boolean(
    isCommitted && isActivated && !isPending && !isPreActivation
  );

  const planConfig = useMemo(
    () => plansByKey?.[plan] || buildFallbackPlanConfig(plan),
    [plansByKey, plan]
  );

  const planLabel = isAdmin
    ? "Admin"
    : isAdvertiser
      ? "Advertiser"
      : isCommitted
        ? "Committed"
        : PLAN_LABELS[plan] || "Free";

  const featureModes = useMemo(() => {
    if (hasActiveCommittedAccess) {
      return buildCommittedFeatureModes();
    }

    const safePlanConfig =
      isCommitted && !hasActiveCommittedAccess
        ? buildFallbackPlanConfig("free")
        : planConfig || buildFallbackPlanConfig(plan);

    const baseModes = FEATURE_DEFINITIONS.reduce((acc, feature) => {
      acc[feature.key] = getFeatureMode(safePlanConfig, feature.key);
      return acc;
    }, {});

    const officialModes =
      plan === "free" || (isCommitted && !hasActiveCommittedAccess)
        ? {
            ...baseModes,
            expenses: "full",
            wallets: "full",
            budgets: "full",
            ai: "off",
            analytics: "off",
            savings_goals: "off",
            modules: "off",
            community: "off",
            messages: "off",
            customization: "off",
          }
        : baseModes;

    if (isCommitted && !hasActiveCommittedAccess) return officialModes;
    if (!isPreActivation) return officialModes;

    return {
      ...officialModes,
      tasks: "preview",
      modules: plan === "free" ? "off" : "preview",
      community: plan === "free" ? "off" : "view",
      messages: plan === "free" ? "off" : "admin_only",
      ai:
        plan === "life_os_499"
          ? "life_os"
          : plan === "core_199"
            ? "advanced"
            : plan === "pro_99"
              ? "basic"
              : "off",
    };
  }, [
    hasActiveCommittedAccess,
    isCommitted,
    isPreActivation,
    plan,
    planConfig,
  ]);

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
        effectiveProfile,
        accessState,
        isFeatureEnabled(planConfig || buildFallbackPlanConfig(plan), "referrals")
      ),
    [accessState, authUser, plan, planConfig, effectiveProfile]
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
      aiElite: hasFeatureAccess("ai", ["life_os"]),
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
    isCommitted,
    hasActiveCommittedAccess,
    accountProfile: profile || null,
    developerPlanPreview,
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
