import { useState, useEffect } from "react";
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

  const fetchUser = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        return;
      }

      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      // auto create profile
      if (!profile) {
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert([
            {
              id: authUser.id,
              email: authUser.email,
              full_name: "",
              plan: "free",
              role: "user",
            },
          ])
          .select()
          .single();

        profile = newProfile;
      }

      setUser(profile);
    } catch (err) {
      console.error("useUserRole error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  const role = (user?.role || "user").toLowerCase();
  const plan = (user?.plan || "free").toLowerCase();

  const isAdmin = role === "admin";
  const isPaid = PAID_TIERS.includes(plan) || isAdmin;
  const isFree = !isPaid;

  const planLabel = isAdmin ? "Admin" : TIER_LABELS[plan] || "Free";

  return {
    user,
    loading,
    role,
    plan,
    isAdmin,
    isPaid,
    isFree,
    planLabel,
  };
}