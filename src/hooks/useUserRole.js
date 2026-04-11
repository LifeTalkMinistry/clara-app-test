import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export const TIER_LABELS = {
  free: "Free",
  basic: "Basic",
  transformation: "Transformation",
  elite: "Elite",
  student: "Student",
};

export const PAID_TIERS = ["basic", "transformation", "elite", "student"];

export default function useUserRole() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);

      // 🔥 timeout protection (VERY IMPORTANT)
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 8000)
      );

      const {
        data: { user: authUser },
        error: authError,
      } = await Promise.race([
        supabase.auth.getUser(),
        timeout,
      ]);

      if (authError || !authUser) {
        setUser(null);
        return;
      }

      let profile = null;

      // 🔥 try fetch profile (NON-BLOCKING)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!error) {
        profile = data;
      }

      // 🔥 try create profile IF missing (but don't block app)
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
            },
          ])
          .select()
          .maybeSingle();

        profile = newProfile || null;
      }

      // 🔥 ALWAYS SET USER (NO MATTER WHAT)
      setUser({
        id: authUser.id,
        email: authUser.email,
        role: profile?.role || "user",
        plan: profile?.plan || "free",
        enrollment_status: profile?.enrollment_status || "",
        profile: profile || null,
      });
    } catch (err) {
      console.error("useUserRole error:", err.message);

      // fallback (prevents infinite loading)
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
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const role = (user?.role || "user").toLowerCase();
  const plan = (user?.plan || "free").toLowerCase();
  const enrollmentStatus = (user?.enrollment_status || "").toLowerCase();

  const isAdmin = role === "admin";

  const isPaid =
    isAdmin ||
    (PAID_TIERS.includes(plan) && enrollmentStatus === "active");

  const isPending = enrollmentStatus === "pending";
  const isFree = !isPaid && !isPending;

  const planLabel = isAdmin ? "Admin" : TIER_LABELS[plan] || "Free";

  return {
    user,
    loading,
    role,
    plan,
    isAdmin,
    isPaid,
    isFree,
    isPending,
    planLabel,
    refreshUser,
  };
}