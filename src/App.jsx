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

function resolveFlow(profile, enrollment) {
  const hasCompletedOnboarding = Boolean(profile?.has_completed_onboarding);

  if (!hasCompletedOnboarding) return "universal_onboarding";
  if (!enrollment) return "normal";

  const enrollmentStatus = normalizeValue(
    enrollment?.status ||
      enrollment?.payment_status ||
      enrollment?.enrollment_status
  );

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

function AppRoutes() {
  const { user, profile, loading, authReady } = useAuth();
  const {
    isFree,
    role: normalizedRole,
    loading: roleLoading,
  } = useUserRole();

  const [enrollment, setEnrollment] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);

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

  const role = useMemo(
    () => normalizeValue(profile?.role || normalizedRole || "user"),
    [profile?.role, normalizedRole]
  );

  const isAdvertiser = role === "advertiser";

  const flow = useMemo(() => {
    if (!user || !profileReady || enrollmentLoading) return "loading";
    return resolveFlow(profile, enrollment);
  }, [user, profileReady, enrollmentLoading, profile, enrollment]);

  if (
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
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />

                <Route path="/advertiser" element={<AdvertiserDashboard />} />

                {!isAdvertiser && (
                  <>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/add-funds" element={<AddFunds />} />
                    <Route path="/wallets" element={<Wallets />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/enroll" element={<Enroll />} />
                    <Route path="/tier-select" element={<TierSelect />} />
                    <Route path="/news" element={<News />} />

                    <Route
                      path="/tasks"
                      element={
                        <ProtectedPaidRoute isFree={isFree}>
                          <Tasks />
                        </ProtectedPaidRoute>
                      }
                    />
                    <Route
                      path="/modules"
                      element={
                        <ProtectedPaidRoute isFree={isFree}>
                          <Modules />
                        </ProtectedPaidRoute>
                      }
                    />
                    <Route
                      path="/community"
                      element={
                        <ProtectedPaidRoute isFree={isFree}>
                          <Community />
                        </ProtectedPaidRoute>
                      }
                    />
                    <Route
                      path="/messages"
                      element={
                        <ProtectedPaidRoute isFree={isFree}>
                          <Messages />
                        </ProtectedPaidRoute>
                      }
                    />
                    <Route
                      path="/coaching"
                      element={
                        <ProtectedPaidRoute isFree={isFree}>
                          <Coaching />
                        </ProtectedPaidRoute>
                      }
                    />
                    <Route
                      path="/savings-goals"
                      element={
                        <ProtectedPaidRoute isFree={isFree}>
                          <SavingsGoals />
                        </ProtectedPaidRoute>
                      }
                    />

                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/admin/student/:id" element={<StudentProfile />} />
                    <Route
                      path="/admin/referral-materials"
                      element={<AdminReferralMaterials />}
                    />
                    <Route path="/admin/daily-tips" element={<AdminDailyTips />} />
                  </>
                )}

                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
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