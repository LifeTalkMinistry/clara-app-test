import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { deriveAccessState } from "@/lib/access-control";

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

export default function useUserRole() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setUser(null);
        return;
      }

      let profile = null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!error) profile = data;

      if (!profile) {
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert([
            {
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || "",
              plan: "free",
              role: "user",
              enrollment_status: "none",
              status: "free",
              is_enrolled: false,
              program_active: false,
              onboarding_completed: false,
              onboarding_step: 0,
            },
          ])
          .select()
          .maybeSingle();

        profile = newProfile || null;
      }

      const accessState = deriveAccessState(profile);
      const hasReferralAccess = accessState.isAdmin || accessState.isPaid;

      setUser({
        ...(profile || {}),
        id: authUser.id,
        email: authUser.email,
        full_name:
          profile?.full_name || authUser.user_metadata?.full_name || "",
        role: profile?.role || "user",
        plan: profile?.plan || "free",
        enrollment_status: profile?.enrollment_status || "none",
        status: profile?.status || "free",
        is_enrolled: profile?.is_enrolled || false,
        program_active: profile?.program_active || false,
        onboarding_completed: profile?.onboarding_completed || false,
        onboarding_step: profile?.onboarding_step || 0,
        has_referral_access: hasReferralAccess,
        profile: profile || null,
      });
    } catch (err) {
      console.error("useUserRole error:", err?.message || err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const accessState = useMemo(() => deriveAccessState(user), [user]);

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

  return {
    user,
    loading,
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
