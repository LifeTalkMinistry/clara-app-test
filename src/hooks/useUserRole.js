import { useState, useEffect, useCallback } from "react";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enrollment, setEnrollment] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);

      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      const storedEnrollment = JSON.parse(localStorage.getItem("enrollment") || "null");

      const authed = !!storedUser;
      setIsAuthenticated(authed);

      if (!authed) {
        setUser(null);
        setEnrollment(null);
        return;
      }

      setUser(storedUser);
      setEnrollment(storedEnrollment);
    } catch (err) {
      console.error("Failed to load user:", err);
      setUser(null);
      setEnrollment(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const role = (user?.role || "free_user").toLowerCase();
  const rawPlan = user?.plan || "free";
  const plan =
    rawPlan === "standard"
      ? "basic"
      : rawPlan === "premium"
      ? "transformation"
      : rawPlan;

  const isAdmin = role === "admin";
  const isPaid =
    PAID_TIERS.includes(plan) ||
    role === "paid_user" ||
    role === "admin";
  const isFree = !isPaid && !isAdmin;

  const isPending =
    isFree &&
    !!enrollment &&
    (enrollment.status === "pending" ||
      enrollment.status === "under_review");

  const hasJourneyStarted = isPaid && !!user?.challenge_start_date;
  const planLabel = isAdmin ? "Admin" : TIER_LABELS[plan] || "Free";

  return {
    user,
    setUser,
    refreshUser: loadUser,
    loading,
    isAuthenticated,
    role,
    plan,
    isAdmin,
    isPaid,
    isFree,
    isPending,
    hasJourneyStarted,
    enrollment,
    planLabel,
  };
}