import { useCallback, useMemo } from "react";
import { deriveAccessState } from "@/lib/access-control";
import { useAuth } from "@/context/AuthContext";

export const TIER_LABELS = {
  free: "Free",
  basic: "Basic",
  transformation: "Transformation",
  elite: "Elite",
  student: "Student",
};

export const FREE_RESTRICTED_PATHS = [
  "/tasks",
  "/modules",
  "/community",
  "/messages",
  "/coaching",
  "/savings-goals",
];

export function isRestrictedForFree(pathname = "") {
  const path = String(pathname || "").trim().toLowerCase();
  return FREE_RESTRICTED_PATHS.some(
    (restricted) => path === restricted || path.startsWith(`${restricted}/`)
  );
}

const buildResolvedUser = (authUser, profile, accessState) => {
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
    plan: profile?.plan || "free",
    enrollment_status: profile?.enrollment_status || "none",
    status: profile?.status || "free",
    is_enrolled: profile?.is_enrolled || false,
    program_active: profile?.program_active || false,
    onboarding_completed: profile?.onboarding_completed || false,
    onboarding_step: profile?.onboarding_step || 0,
    has_referral_access: accessState.isAdmin || accessState.isPaid,
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

  const loading = !authReady || (Boolean(authUser) && profile === null) || authLoading;

  const accessState = useMemo(() => {
    if (!authUser || !profile) {
      return deriveAccessState({
        role: authUser?.user_metadata?.role || "user",
      });
    }

    return deriveAccessState(profile);
  }, [authUser, profile]);

  const user = useMemo(
    () => buildResolvedUser(authUser, profile, accessState),
    [authUser, profile, accessState]
  );

  const role = accessState.role;
  const plan = accessState.plan;
  const isAdmin = accessState.isAdmin;
  const isAdvertiser = accessState.isAdvertiser;
  const isPaid = accessState.isPaid;
  const isPending = accessState.isPending;
  const isFree = accessState.isFree;

  const planLabel = isAdmin
    ? "Admin"
    : isAdvertiser
      ? "Advertiser"
      : TIER_LABELS[plan] || "Free";

  const access = useMemo(
    () => ({
      tracking: true,
      analyticsExtended: isPaid,
      tasks: isPaid,
      modules: isPaid,
      community: isPaid,
      messaging: isPaid,
      coaching: isPaid,
      emergencyFund: isPaid,
      savingsGoals: isPaid,
    }),
    [isPaid]
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
    access,
    refreshUser,
  };
}
