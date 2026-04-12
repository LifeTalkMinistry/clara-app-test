import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

export const TIER_LABELS = {
  free: "Free",
  basic: "Basic",
  transformation: "Transformation",
  elite: "Elite",
  student: "Student",
};

export const PAID_TIERS = ["basic", "transformation", "elite", "student"];

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
              monthly_survival_expense: 0,
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

      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name:
          profile?.full_name || authUser.user_metadata?.full_name || "",
        role: profile?.role || "user",
        plan: profile?.plan || "free",

        // 🔥 CRITICAL FIELDS
        enrollment_status: profile?.enrollment_status || "none",
        status: profile?.status || "free",
        is_enrolled: profile?.is_enrolled || false,
        program_active: profile?.program_active || false,
        onboarding_completed: profile?.onboarding_completed || false,
        onboarding_step: profile?.onboarding_step || 0,

        referral_enabled: profile?.referral_enabled || false,
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

  const role = useMemo(
    () => String(user?.role || "user").toLowerCase(),
    [user?.role]
  );

  const plan = useMemo(
    () => String(user?.plan || "free").toLowerCase(),
    [user?.plan]
  );

  const enrollmentStatus = useMemo(
    () => String(user?.enrollment_status || "none").toLowerCase(),
    [user?.enrollment_status]
  );

  // 🔥 FIXED LOGIC
  const isApproved =
    enrollmentStatus === "approved" ||
    user?.status === "approved" ||
    user?.is_enrolled === true ||
    user?.program_active === true;

  const isAdmin = role === "admin";
  const isAdvertiser = role === "advertiser";

  const isPaid = isAdmin || (PAID_TIERS.includes(plan) && isApproved);

  const isPending = enrollmentStatus === "pending";
  const isFree = !isAdvertiser && !isPaid && !isPending;

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