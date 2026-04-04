import { useState, useEffect, useCallback } from "react";

export const TIER_LABELS = {
  free: "Free",
  basic: "Basic",
  transformation: "Transformation",
  elite: "Elite",
  student: "Student",
};

export const PAID_TIERS = ["basic", "transformation", "elite", "student"];

const STORAGE_KEYS = {
  sessionUser: "clara_user",
  users: "clara_users",
  enrollments: "clara_enrollments",
};

const getStoredData = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export default function useUserRole() {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enrollment, setEnrollment] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);

      const sessionUser = getStoredData(STORAGE_KEYS.sessionUser, null);
      const storedUsers = getStoredData(STORAGE_KEYS.users, []);
      const storedEnrollments = getStoredData(STORAGE_KEYS.enrollments, []);

      const authed = !!sessionUser?.email;
      setIsAuthenticated(authed);

      if (!authed) {
        setUserState(null);
        setEnrollment(null);
        return;
      }

      const matchedUser =
        storedUsers.find((item) => item.email === sessionUser.email) ||
        sessionUser;

      setUserState(matchedUser || null);

      if (matchedUser?.email) {
        const latestEnrollment =
          storedEnrollments
            .filter((item) => item.created_by === matchedUser.email)
            .sort((a, b) => {
              const aDate = new Date(
                a.created_date || a.created_at || 0
              ).getTime();
              const bDate = new Date(
                b.created_date || b.created_at || 0
              ).getTime();
              return bDate - aDate;
            })[0] || null;

        setEnrollment(latestEnrollment);
      } else {
        setEnrollment(null);
      }
    } catch (err) {
      console.error(err);
      setUserState(null);
      setEnrollment(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);

    if (!nextUser) {
      localStorage.removeItem(STORAGE_KEYS.sessionUser);
      setIsAuthenticated(false);
      return;
    }

    setStoredData(STORAGE_KEYS.sessionUser, nextUser);
    setIsAuthenticated(true);

    const storedUsers = getStoredData(STORAGE_KEYS.users, []);
    const exists = storedUsers.some((item) => item.email === nextUser.email);

    const updatedUsers = exists
      ? storedUsers.map((item) =>
          item.email === nextUser.email ? { ...item, ...nextUser } : item
        )
      : [...storedUsers, nextUser];

    setStoredData(STORAGE_KEYS.users, updatedUsers);
  }, []);

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
    PAID_TIERS.includes(plan) || role === "paid_user" || role === "admin";
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