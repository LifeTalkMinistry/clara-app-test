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
  readDeveloperMembershipPreview,
  resolveMembership,
} from "@/lib/membership";
import { deriveEffectiveEntitlements } from "@/lib/clara-entitlements";

const buildModes = (planConfig) => FEATURE_DEFINITIONS.reduce((acc, feature) => {
  acc[feature.key] = getFeatureMode(planConfig, feature.key);
  return acc;
}, {});

function buildPreviewProfile(profile = {}, preview = null) {
  if (!preview) return profile;
  const active = preview.plan === COMMITTED_PLAN_KEY && preview.membershipStatus === "active";
  const pending = preview.plan === COMMITTED_PLAN_KEY && !active;
  return {
    ...profile,
    plan: preview.plan,
    plan_key: preview.plan,
    subscription_plan: preview.plan,
    access_level: preview.plan === COMMITTED_PLAN_KEY ? "committed" : "free",
    subscription_status: active ? "active" : pending ? "pending" : "free",
    subscription_label: preview.plan === COMMITTED_PLAN_KEY ? "CLARA Commitment" : "Free Version",
    status: active ? "active" : pending ? "pending" : "free",
    enrollment_status: active ? "approved" : pending ? "pending" : "none",
    entitlement_status: active ? "active" : pending ? "pending" : "free",
    activation_status: active ? "active" : pending ? "pending" : "not_required",
    is_activated: active,
    is_enrolled: active,
    program_active: active,
    dev_membership_preview: true,
  };
}

export default function useUserRole() {
  const { user: authUser, profile, loading: authLoading, authReady, refreshProfile } = useAuth();
  const { plansByKey = {} } = usePlanAccess();
  const loading = !authReady || authLoading;
  const ready = !loading;
  const developerMembershipPreview = readDeveloperMembershipPreview();
  const role = String(profile?.role || authUser?.user_metadata?.role || "user").trim().toLowerCase();
  const isAdmin = role === "admin";
  const isAdvertiser = role === "advertiser";
  const membership = useMemo(() => resolveMembership({
    profile: profile || {},
    user: authUser,
    preview: developerMembershipPreview,
    isAdmin,
    isAdvertiser,
    loading,
    ready,
  }), [authUser, developerMembershipPreview, isAdmin, isAdvertiser, loading, profile, ready]);
  const effectiveProfile = useMemo(
    () => buildPreviewProfile(profile || {}, developerMembershipPreview),
    [developerMembershipPreview, profile]
  );
  const plan = membership.planKey;
  const planConfig = plansByKey?.[plan] || getPlanDefaults(plan);
  const featureModes = useMemo(() => {
    if (membership.isActiveCommitted) return buildModes(plansByKey?.[COMMITTED_PLAN_KEY] || getPlanDefaults(COMMITTED_PLAN_KEY));
    return buildModes(plansByKey?.[FREE_PLAN_KEY] || getPlanDefaults(FREE_PLAN_KEY));
  }, [membership.isActiveCommitted, plansByKey]);
  const isFeatureAvailable = useCallback((featureKey) => {
    if (isAdmin || isAdvertiser) return true;
    return featureModes[featureKey] !== "off";
  }, [featureModes, isAdmin, isAdvertiser]);
  const hasFeatureAccess = useCallback((featureKey, allowedModes = ["full"]) => {
    if (isAdmin || isAdvertiser) return true;
    const allowed = Array.isArray(allowedModes) ? allowedModes : [allowedModes];
    return allowed.includes(featureModes[featureKey]);
  }, [featureModes, isAdmin, isAdvertiser]);
  const getFeatureAccessMode = useCallback((featureKey) => {
    if (isAdmin || isAdvertiser) return "full";
    return featureModes[featureKey] || "off";
  }, [featureModes, isAdmin, isAdvertiser]);
  const fullName = effectiveProfile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || "";
  const user = useMemo(() => authUser ? {
    ...effectiveProfile,
    id: authUser.id,
    email: authUser.email,
    full_name: fullName,
    role,
    plan,
    plan_key: plan,
    subscription_plan: plan,
    access_level: membership.accessLevel,
    subscription_status: membership.membershipStatus === "active" ? "active" : membership.membershipStatus === "pending" ? "pending" : "free",
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
  } : null, [authUser, effectiveProfile, fullName, membership, plan, profile, role]);
  const access = useMemo(() => ({
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
  }), [hasFeatureAccess, isFeatureAvailable]);
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
    developerMembershipPreview,
    developerPlanPreview: developerMembershipPreview?.plan || null,
    planLabel: isAdmin ? "Admin" : isAdvertiser ? "Advertiser" : membership.planLabel,
    planConfig,
    featureModes,
    isFeatureAvailable,
    hasFeatureAccess,
    getFeatureAccessMode,
    access,
    refreshUser,
  };
}