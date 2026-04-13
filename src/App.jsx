import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import { queryClientInstance } from "./lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import useUserRole, { isRestrictedForFree } from "./hooks/useUserRole";

// Layout
import Layout from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import AddFunds from "./pages/AddFunds";
import Wallets from "./pages/Wallets";
import Budgets from "./pages/Budgets";
import Analytics from "./pages/Analytics";
import Tasks from "./pages/Tasks";
import Modules from "./pages/Modules";
import Community from "./pages/Community";
import Messages from "./pages/Messages";
import Coaching from "./pages/Coaching";
import Enroll from "./pages/Enroll";
import TierSelect from "./pages/TierSelect";
import News from "./pages/News";
import Referrals from "./pages/Referrals";
import SavingsGoals from "./pages/SavingsGoals";
import AdvertiserDashboard from "./pages/AdvertiserDashboard";

// Onboarding
import UniversalOnboarding from "./pages/onboarding/UniversalOnboarding";
import ProgramOnboarding from "./pages/onboarding/ProgramOnboarding";
import PendingScreen from "./pages/onboarding/PendingScreen";

// Admin
import AdminPanel from "./pages/admin/AdminPanel";
import StudentProfile from "./pages/admin/StudentProfile";
import AdminReferralMaterials from "./pages/admin/AdminReferralMaterials";
import AdminDailyTips from "./pages/admin/AdminDailyTips";

// Fallback
import PageNotFound from "./lib/PageNotFound";

const ENROLLMENT_PENDING_STATUSES = new Set([
  "pending",
  "under_review",
  "payment_pending",
]);

const ENROLLMENT_APPROVED_STATUSES = new Set(["approved", "active"]);
const ENROLLMENT_RETRY_STATUSES = new Set([
  "rejected",
  "resubmit_required",
  "none",
  "",
]);

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#061018] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
        <p className="text-sm text-white/75">Loading...</p>
      </div>
    </div>
  );
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getEnrollmentTimestamp(enrollment) {
  return new Date(
    enrollment?.updated_at ||
      enrollment?.created_at ||
      enrollment?.submitted_at ||
      0
  ).getTime();
}

function pickBestEnrollment(enrollments) {
  if (!Array.isArray(enrollments) || enrollments.length === 0) return null;

  const sorted = [...enrollments].sort((a, b) => {
    return getEnrollmentTimestamp(b) - getEnrollmentTimestamp(a);
  });

  return sorted[0] || null;
}

function getEnrollmentStatus(enrollment, profile) {
  return normalizeValue(
    enrollment?.status ||
      enrollment?.payment_status ||
      enrollment?.enrollment_status ||
      profile?.enrollment_status ||
      profile?.status ||
      ""
  );
}

function hasAnyPaidSignal(profile, enrollment) {
  const role = normalizeValue(profile?.role);
  const plan = normalizeValue(profile?.plan);
  const enrollmentStatus = getEnrollmentStatus(enrollment, profile);

  return (
    role === "paid_user" ||
    profile?.program_active === true ||
    profile?.is_enrolled === true ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus) ||
    (plan && plan !== "free")
  );
}

function shouldForceEnroll(profile, enrollment) {
  const role = normalizeValue(profile?.role);
  const plan = normalizeValue(profile?.plan);
  const enrollmentStatus = getEnrollmentStatus(enrollment, profile);

  const noEnrollmentRecord = !enrollment;
  const freeRole = !role || role === "free_user" || role === "user";
  const freePlan = !plan || plan === "free";
  const notPaid = !hasAnyPaidSignal(profile, enrollment);

  return (
    freeRole &&
    freePlan &&
    notPaid &&
    (noEnrollmentRecord || ENROLLMENT_RETRY_STATUSES.has(enrollmentStatus))
  );
}

function resolveFlow(profile, enrollment) {
  const hasCompletedOnboarding = Boolean(
    profile?.has_completed_onboarding || profile?.onboarding_completed
  );

  if (!hasCompletedOnboarding) return "universal_onboarding";
  if (!enrollment) return "normal";

  const enrollmentStatus = getEnrollmentStatus(enrollment, profile);

  if (ENROLLMENT_PENDING_STATUSES.has(enrollmentStatus)) {
    return "payment_pending";
  }

  if (ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus)) {
    return "program_onboarding";
  }

  return "normal";
}

function ProtectedPaidRoute({ isFree, children }) {
  const location = useLocation();

  if (isFree && isRestrictedForFree(location.pathname)) {
    return <Navigate to="/enroll" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function ForceEnrollRoute({ shouldForce, children }) {
  const location = useLocation();
  const blockedPaths = new Set([
    "/enroll",
    "/tier-select",
    "/login",
    "/onboarding",
    "/pending",
    "/program-onboarding",
  ]);

  if (shouldForce && !blockedPaths.has(location.pathname)) {
    return <Navigate to="/enroll" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function getLoginRedirectUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${normalizedBase}#/login`;
}

function AppRoutes() {
  const { user, profile, loading, authReady } = useAuth();
  const {
    isFree,
    role: normalizedRole,
    loading: roleLoading,
  } = useUserRole();

  const [enrollment, setEnrollment] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [forceLogoutProcessing, setForceLogoutProcessing] = useState(false);

  const profileReady = user ? profile !== null : true;

  useEffect(() => {
    let isMounted = true;

    const clearEnrollmentState = () => {
      if (!isMounted) return;
      setEnrollment(null);
      setEnrollmentLoading(false);
    };

    const fetchEnrollment = async () => {
      if (!user?.id) {
        clearEnrollmentState();
        return;
      }

      setEnrollmentLoading(true);

      try {
        const { data, error } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!isMounted) return;

        const latestEnrollment = pickBestEnrollment(data);
        setEnrollment(latestEnrollment || null);
      } catch (error) {
        console.error("App enrollment fetch error:", error);

        if (!isMounted) return;
        setEnrollment(null);
      } finally {
        if (isMounted) {
          setEnrollmentLoading(false);
        }
      }
    };

    fetchEnrollment();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const runForceReauth = async () => {
      if (!user?.id || !profile || forceLogoutProcessing) return;
      if (!profile?.force_reauth) return;

      try {
        if (isMounted) {
          setForceLogoutProcessing(true);
        }

        const { error: flagResetError } = await supabase
          .from("profiles")
          .update({ force_reauth: false })
          .eq("id", user.id);

        if (flagResetError) {
          console.error("Force reauth flag reset error:", flagResetError);
        }

        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          console.error("Force sign out error:", signOutError);
        }

        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (storageError) {
          console.error("Storage clear error:", storageError);
        }

        window.location.replace(getLoginRedirectUrl());
      } catch (error) {
        console.error("Force reauth process error:", error);

        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (storageError) {
          console.error("Storage clear fallback error:", storageError);
        }

        window.location.replace(getLoginRedirectUrl());
      } finally {
        if (isMounted) {
          setForceLogoutProcessing(false);
        }
      }
    };

    runForceReauth();

    return () => {
      isMounted = false;
    };
  }, [user?.id, profile, forceLogoutProcessing]);

  const role = useMemo(
    () => normalizeValue(profile?.role || normalizedRole || "user"),
    [profile?.role, normalizedRole]
  );

  const isAdvertiser = role === "advertiser";

  const flow = useMemo(() => {
    if (!user || !profileReady || enrollmentLoading) return "loading";
    return resolveFlow(profile, enrollment);
  }, [user, profileReady, enrollmentLoading, profile, enrollment]);

  const forceEnroll = useMemo(() => {
    if (!user || !profileReady || enrollmentLoading || !profile) return false;
    if (isAdvertiser) return false;

    const currentFlow = resolveFlow(profile, enrollment);

    if (
      currentFlow === "payment_pending" ||
      currentFlow === "program_onboarding"
    ) {
      return false;
    }

    if (
      !(
        profile?.has_completed_onboarding || profile?.onboarding_completed
      )
    ) {
      return false;
    }

    return shouldForceEnroll(profile, enrollment);
  }, [user, profileReady, enrollmentLoading, profile, enrollment, isAdvertiser]);

  if (
    forceLogoutProcessing ||
    !authReady ||
    loading ||
    roleLoading ||
    (user && !profileReady) ||
    (user && enrollmentLoading)
  ) {
    return <FullScreenLoader />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/onboarding"
        element={user ? <UniversalOnboarding /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/pending"
        element={
          user && flow === "payment_pending" ? (
            <PendingScreen />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/program-onboarding"
        element={
          user && flow === "program_onboarding" ? (
            <ProgramOnboarding />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/*"
        element={
          user ? (
            <ForceEnrollRoute shouldForce={forceEnroll}>
              <Layout>
                <Routes>
                  <Route
                    path="/"
                    element={
                      isAdvertiser ? (
                        <Navigate to="/advertiser" replace />
                      ) : flow === "universal_onboarding" ? (
                        <Navigate to="/onboarding" replace />
                      ) : flow === "payment_pending" ? (
                        <Navigate to="/pending" replace />
                      ) : flow === "program_onboarding" ? (
                        <Navigate to="/program-onboarding" replace />
                      ) : forceEnroll ? (
                        <Navigate to="/enroll" replace />
                      ) : (
                        <Navigate to="/dashboard" replace />
                      )
                    }
                  />

                  <Route path="/advertiser" element={<AdvertiserDashboard />} />

                  {!isAdvertiser && (
                    <>
                      <Route
                        path="/dashboard"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <Dashboard />
                          )
                        }
                      />
                      <Route
                        path="/expenses"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <Expenses />
                          )
                        }
                      />
                      <Route
                        path="/add-funds"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <AddFunds />
                          )
                        }
                      />
                      <Route
                        path="/wallets"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <Wallets />
                          )
                        }
                      />
                      <Route
                        path="/budgets"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <Budgets />
                          )
                        }
                      />
                      <Route
                        path="/analytics"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <Analytics />
                          )
                        }
                      />
                      <Route path="/enroll" element={<Enroll />} />
                      <Route path="/tier-select" element={<TierSelect />} />
                      <Route
                        path="/news"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <News />
                          )
                        }
                      />

                      <Route
                        path="/tasks"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <ProtectedPaidRoute isFree={isFree}>
                              <Tasks />
                            </ProtectedPaidRoute>
                          )
                        }
                      />
                      <Route
                        path="/modules"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <ProtectedPaidRoute isFree={isFree}>
                              <Modules />
                            </ProtectedPaidRoute>
                          )
                        }
                      />
                      <Route
                        path="/community"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <ProtectedPaidRoute isFree={isFree}>
                              <Community />
                            </ProtectedPaidRoute>
                          )
                        }
                      />
                      <Route
                        path="/messages"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <ProtectedPaidRoute isFree={isFree}>
                              <Messages />
                            </ProtectedPaidRoute>
                          )
                        }
                      />
                      <Route
                        path="/coaching"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <ProtectedPaidRoute isFree={isFree}>
                              <Coaching />
                            </ProtectedPaidRoute>
                          )
                        }
                      />
                      <Route
                        path="/savings-goals"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <ProtectedPaidRoute isFree={isFree}>
                              <SavingsGoals />
                            </ProtectedPaidRoute>
                          )
                        }
                      />

                      <Route
                        path="/referrals"
                        element={
                          forceEnroll ? (
                            <Navigate to="/enroll" replace />
                          ) : (
                            <Referrals />
                          )
                        }
                      />
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/admin/student/:id" element={<StudentProfile />} />
                      <Route
                        path="/admin/referral-materials"
                        element={<AdminReferralMaterials />}
                      />
                      <Route path="/admin/daily-tips" element={<AdminDailyTips />} />
                    </>
                  )}

                  <Route path="/profile" element={<Profile />} />

                  <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                  <Route path="/settings/:section" element={<Settings />} />

                  <Route path="/profile/edit" element={<Navigate to="/settings/account" replace />} />
                  <Route path="/change-password" element={<Navigate to="/settings/privacy" replace />} />
                  <Route path="/notifications" element={<Navigate to="/settings/notifications" replace />} />
                  <Route path="/billing" element={<Navigate to="/settings/account" replace />} />

                  <Route path="*" element={<PageNotFound />} />
                </Routes>
              </Layout>
            </ForceEnrollRoute>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppRoutes />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;