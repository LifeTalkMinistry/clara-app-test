import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { queryClientInstance } from "./lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import useUserRole, { isRestrictedForFree } from "./hooks/useUserRole";
import {
  deriveAccessState,
  resolveAppFlow,
} from "@/lib/access-control";

// Layout
import Layout from "./components/Layout";

// Pages
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Expenses = lazy(() => import("./pages/Expenses"));
const AddFunds = lazy(() => import("./pages/AddFunds"));
const Wallets = lazy(() => import("./pages/Wallets"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Modules = lazy(() => import("./pages/Modules"));
const Community = lazy(() => import("./pages/Community"));
const Messages = lazy(() => import("./pages/Messages"));
const Coaching = lazy(() => import("./pages/Coaching"));
const Enroll = lazy(() => import("./pages/Enroll"));
const TierSelect = lazy(() => import("./pages/TierSelect"));
const News = lazy(() => import("./pages/News"));
const Referrals = lazy(() => import("./pages/Referrals"));
const SavingsGoals = lazy(() => import("./pages/SavingsGoals"));
const AdvertiserDashboard = lazy(() => import("./pages/AdvertiserDashboard"));

// Onboarding
const UniversalOnboarding = lazy(() =>
  import("./pages/onboarding/UniversalOnboarding")
);
const ProgramOnboarding = lazy(() =>
  import("./pages/onboarding/ProgramOnboarding")
);
const PendingScreen = lazy(() => import("./pages/onboarding/PendingScreen"));

// Admin
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const StudentProfile = lazy(() => import("./pages/admin/StudentProfile"));
const AdminReferralMaterials = lazy(() =>
  import("./pages/admin/AdminReferralMaterials")
);
const AdminDailyTips = lazy(() => import("./pages/admin/AdminDailyTips"));

// Fallback
const PageNotFound = lazy(() => import("./lib/PageNotFound"));

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

function getHomeRedirectPath({ isAdvertiser, flow, forceEnroll }) {
  if (isAdvertiser) return "/advertiser";
  if (flow === "universal_onboarding") return "/onboarding";
  if (flow === "payment_pending") return "/pending";
  if (flow === "program_onboarding") return "/program-onboarding";
  if (forceEnroll) return "/enroll";
  return "/dashboard";
}

function GuardedRoute({
  children,
  shouldForceEnroll = false,
  requiresPaid = false,
  isFree = false,
  path,
}) {
  if (shouldForceEnroll) {
    return <Navigate to="/enroll" replace state={{ from: path }} />;
  }

  if (requiresPaid && isFree && isRestrictedForFree(path)) {
    return <Navigate to="/enroll" replace state={{ from: path }} />;
  }

  return children;
}

function AdminRoute({ isAdmin, redirectTo = "/dashboard", children }) {
  if (!isAdmin) {
    return <Navigate to={redirectTo} replace />;
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

  const resolvedAccess = useMemo(() => {
    if (!profile) {
      return deriveAccessState({
        role: normalizedRole || "user",
      });
    }

    return deriveAccessState(
      {
        ...profile,
        role: profile?.role || normalizedRole || "user",
      },
      enrollment
    );
  }, [profile, normalizedRole, enrollment]);

  const isAdmin = resolvedAccess.isAdmin;
  const isAdvertiser = resolvedAccess.isAdvertiser;

  const flow = useMemo(() => {
    if (!user || !profileReady || enrollmentLoading) return "loading";
    return resolveAppFlow(
      {
        ...profile,
        role: profile?.role || normalizedRole || "user",
      },
      enrollment
    );
  }, [user, profileReady, enrollmentLoading, profile, normalizedRole, enrollment]);

  const forceEnroll = useMemo(() => {
    if (!user || !profileReady || enrollmentLoading || !profile) return false;
    return resolvedAccess.forceEnroll;
  }, [user, profileReady, enrollmentLoading, profile, resolvedAccess.forceEnroll]);

  const homeRedirectPath = useMemo(
    () => getHomeRedirectPath({ isAdvertiser, flow, forceEnroll }),
    [isAdvertiser, flow, forceEnroll]
  );

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
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={homeRedirectPath} replace /> : <Login />}
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
              <Navigate to={homeRedirectPath} replace />
            )
          }
        />

        <Route
          path="/program-onboarding"
          element={
            user && flow === "program_onboarding" ? (
              <ProgramOnboarding />
            ) : (
              <Navigate to={homeRedirectPath} replace />
            )
          }
        />

        <Route
          path="/*"
          element={
            user ? (
              <Layout>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to={homeRedirectPath} replace />}
                  />

                  <Route path="/advertiser" element={<AdvertiserDashboard />} />

                  {!isAdvertiser && (
                    <>
                      <Route
                        path="/dashboard"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/dashboard">
                            <Dashboard />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/expenses"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/expenses">
                            <Expenses />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/add-funds"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/add-funds">
                            <AddFunds />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/wallets"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/wallets">
                            <Wallets />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/budgets"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/budgets">
                            <Budgets />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/analytics"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/analytics">
                            <Analytics />
                          </GuardedRoute>
                        }
                      />
                      <Route path="/enroll" element={<Enroll />} />
                      <Route path="/tier-select" element={<TierSelect />} />
                      <Route
                        path="/news"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/news">
                            <News />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/tasks"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            requiresPaid={isFree}
                            isFree={isFree}
                            path="/tasks"
                          >
                            <Tasks />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/modules"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            requiresPaid={isFree}
                            isFree={isFree}
                            path="/modules"
                          >
                            <Modules />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/community"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            requiresPaid={isFree}
                            isFree={isFree}
                            path="/community"
                          >
                            <Community />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/messages"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            requiresPaid={isFree}
                            isFree={isFree}
                            path="/messages"
                          >
                            <Messages />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/coaching"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            requiresPaid={isFree}
                            isFree={isFree}
                            path="/coaching"
                          >
                            <Coaching />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/savings-goals"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            requiresPaid={isFree}
                            isFree={isFree}
                            path="/savings-goals"
                          >
                            <SavingsGoals />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/referrals"
                        element={
                          <GuardedRoute shouldForceEnroll={forceEnroll} path="/referrals">
                            <Referrals />
                          </GuardedRoute>
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          <AdminRoute isAdmin={isAdmin} redirectTo={homeRedirectPath}>
                            <AdminPanel />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/student/:id"
                        element={
                          <AdminRoute isAdmin={isAdmin} redirectTo={homeRedirectPath}>
                            <StudentProfile />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/referral-materials"
                        element={
                          <AdminRoute isAdmin={isAdmin} redirectTo={homeRedirectPath}>
                            <AdminReferralMaterials />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/daily-tips"
                        element={
                          <AdminRoute isAdmin={isAdmin} redirectTo={homeRedirectPath}>
                            <AdminDailyTips />
                          </AdminRoute>
                        }
                      />
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
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
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
