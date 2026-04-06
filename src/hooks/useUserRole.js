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

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("getUser error:", authError);
        setUser(null);
        return;
      }

      if (!authUser) {
        setUser(null);
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error("fetch profile error:", profileError);
      }

      // auto create profile if missing
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
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
          .single();

        if (insertError) {
          console.error("create profile error:", insertError);
          setUser(null);
          return;
        }

        profile = newProfile;
      }

      setUser(profile);
    } catch (err) {
      console.error("useUserRole error:", err);
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
  const isPaid = PAID_TIERS.includes(plan) || isAdmin;
  const isPending = enrollmentStatus === "pending" || plan === "pending";
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