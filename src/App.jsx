import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { useAuth } from "@/context/AuthContext";
import ThemePicker from "@/components/ThemePicker";
import { POST_LOGIN_WELCOME_KEY } from "@/components/WelcomeBackTransition";
import { supabase } from "@/lib/supabaseClient";
import useUserRole from "./hooks/useUserRole";
import {
  deriveAccessState,
  hasCompletedProgramOnboarding,
  resolveAppFlow,
} from "./lib/access-control";
import {
  buildAccessSnapshot,
  getAccessSnapshot,
  getOfflineFallbackFlow,
  isAccessNetworkOffline,
  isAccessSnapshotUsable,
  saveAccessSnapshot,
} from "./lib/offline-access-cache";
import { FEATURE_ROUTE_MAP } from "./lib/plan-config";

// Layout
import Layout from "./components/Layout";

// Pages
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TransactionHub = lazy(() => import("./pages/TransactionHub"));
const AddFunds = lazy(() => import("./pages/AddFunds"));
const Wallets = lazy(() => import("./pages/Wallets"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AiInsights = lazy(() => import("./pages/AiInsights"));
const Modules = lazy(() => import("./pages/Modules"));
const Feed = lazy(() => import("./pages/Feed"));
const ClaraPeople = lazy(() => import("./pages/ClaraPeople"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Community = lazy(() => import("./pages/Community"));
const Messages = lazy(() => import("./pages/Messages"));
const Enroll = lazy(() => import("./pages/Enroll"));
const TierSelect = lazy(() => import("./pages/TierSelect"));
const News = lazy(() => import("./pages/News"));
const Referrals = lazy(() => import("./pages/Referrals"));
const SavingsGoals = lazy(() => import("./pages/SavingsGoals"));
const AdvertiserDashboard = lazy(() => import("./pages/AdvertiserDashboard"));
const Activation = lazy(() => import("./pages/Activation"));

// Onboarding
const UniversalOnboarding = lazy(() =>
  import("./pages/onboarding/UniversalOnboarding")
);
const ProgramOnboarding = lazy(() =>
  import("./pages/onboarding/ProgramOnboarding")
);
const PendingScreen = lazy(() => import("./pages/onboarding/PendingScreen"));
const WelcomeBackTransition = lazy(() =>
  import("./components/WelcomeBackTransition")
);

// Admin
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const StudentProfile = lazy(() => import("./pages/admin/StudentProfile"));
const AdminReferralMaterials = lazy(() =>
  import("./pages/admin/AdminReferralMaterials")
);
const AdminDailyTips = lazy(() => import("./pages/admin/AdminDailyTips"));

// Fallback
const PageNotFound = lazy(() => import("./lib/PageNotFound"));

const SUPPORTED_PAID_PLAN_KEYS = new Set(["pro_99", "core_199", "life_os_499"]);

const PAID_STATUSES = new Set([
  "approved",
  "active",
  "completed",
  "complete",
  "paid",
  "success",
  "succeeded",
  "confirmed",
  "verified",
  "processing_complete",
  "purchase_completed",
  "entitled",
  "unlocked",
]);

const PENDING_STATUSES = new Set([
  "pending",
  "processing",
  "under_review",
  "submitted",
  "awaiting_review",
  "awaiting_payment",
  "payment_pending",
  "google_play_pending",
  "google_play_processing",
  "purchase_pending",
  "purchase_processing",
]);

const ADMIN_RECOVERY_EMAILS = new Set([
  "jeromemirabuenos62@gmail.com",
  "lifetalkministry@gmail.com",
]);

function hasPendingPostLoginWelcome() {
  try {
    return Boolean(sessionStorage.getItem(POST_LOGIN_WELCOME_KEY));
  } catch (error) {
    console.error("Failed to check post-login welcome state:", error);
    return false;
  }
}

function FullScreenLoader() {
  return (
    <div className="theme-page-shell min-h-screen flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
        <p className="text-sm text-white/75">Loading...</p>
      </div>
    </div>
  );
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizePlanKey(value) {
  const normalized = normalizeValue(value);

  const aliases = {
    free: "free",

    pro: "pro_99",
    pro99: "pro_99",
    pro_99: "pro_99",
    pro_tools: "pro_99",
    protools: "pro_99",
    clara_pro_99: "pro_99",

    core: "core_199",
    core199: "core_199",
    core_199: "core_199",
    core_599: "core_199",
    program: "core_199",
    clara_core_199: "core_199",

    coach: "life_os_499",
    coaching: "life_os_499",
    coaching_1299: "life_os_499",
    lifeos: "life_os_499",
    life_os: "life_os_499",
    life_os_499: "life_os_499",
    lifeos_499: "life_os_499",
    clara_lifeos_499: "life_os_499",
  };

  return aliases[normalized] || normalized;
}

function getEnrollmentTimestamp(enrollment) {
  return new Date(
    enrollment?.updated_at ||
      enrollment?.created_at ||
      enrollment?.submitted_at ||
      0
  ).getTime();
}

function getEnrollmentPlanKey(enrollment) {
  return normalizePlanKey(
    enrollment?.plan_key ||
      enrollment?.plan ||
      enrollment?.tier ||
      enrollment?.selected_plan ||
      enrollment?.product_id ||
      enrollment?.productId
  );
}

function isSupportedPaidPlanKey(planKey) {
  return SUPPORTED_PAID_PLAN_KEYS.has(normalizePlanKey(planKey));
}

function isGooglePlayEnrollment(enrollment) {
  if (!enrollment) return false;

  const source = normalizeValue(
    enrollment?.source ||
      enrollment?.enrollment_source ||
      enrollment?.payment_source ||
      enrollment?.provider ||
      enrollment?.platform ||
      enrollment?.purchase_source
  );

  return [
    "google_play",
    "googleplay",
    "play_store",
    "playstore",
    "google-play",
    "google play",
  ].includes(source);
}

function isPaidEnrollment(enrollment) {
  if (!enrollment) return false;

  const status = normalizeValue(
    enrollment?.status ||
      enrollment?.enrollment_status ||
      enrollment?.payment_status ||
      enrollment?.purchase_status
  );

  const hasGooglePlaySource = isGooglePlayEnrollment(enrollment);

  if (PAID_STATUSES.has(status)) return true;

  if (hasGooglePlaySource && !PENDING_STATUSES.has(status) && status !== "") {
    return true;
  }

  if (
    hasGooglePlaySource &&
    (enrollment?.purchase_token ||
      enrollment?.purchaseToken ||
      enrollment?.order_id ||
      enrollment?.orderId ||
      enrollment?.product_id ||
      enrollment?.productId)
  ) {
    return true;
  }

  return false;
}

function isPendingEnrollment(enrollment) {
  if (!enrollment) return false;

  const status = normalizeValue(
    enrollment?.status ||
      enrollment?.enrollment_status ||
      enrollment?.payment_status ||
      enrollment?.purchase_status
  );

  return PENDING_STATUSES.has(status);
}

function getEnrollmentPriorityScore(enrollment) {
  if (!enrollment) return -1;

  const planKey = getEnrollmentPlanKey(enrollment);
  const supportedPaidPlan = isSupportedPaidPlanKey(planKey);
  const paid = isPaidEnrollment(enrollment);
  const pending = isPendingEnrollment(enrollment);
  const timestamp = getEnrollmentTimestamp(enrollment);

  let score = 0;

  if (supportedPaidPlan) score += 1000;
  if (paid) score += 10000;
  if (pending) score += 2000;
  if (isGooglePlayEnrollment(enrollment)) score += 500;
  if (
    enrollment?.purchase_token ||
    enrollment?.purchaseToken ||
    enrollment?.order_id ||
    enrollment?.orderId
  ) {
    score += 750;
  }

  return score * 10000000000000 + timestamp;
}

function pickBestEnrollment(enrollments) {
  if (!Array.isArray(enrollments) || enrollments.length === 0) return null;

  return (
    [...enrollments].sort(
      (a, b) => getEnrollmentPriorityScore(b) - getEnrollmentPriorityScore(a)
    )[0] || null
  );
}

function getSafeFlow(resolvedFlow, enrollment) {
  if (
    isPaidEnrollment(enrollment) &&
    isSupportedPaidPlanKey(getEnrollmentPlanKey(enrollment))
  ) {
    return "active";
  }

  return resolvedFlow;
}

function getHomeRedirectPath({
  isAdvertiser,
  flow,
  forceEnroll,
  offlineAccessActive,
}) {
  if (offlineAccessActive) return "/dashboard";
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
  featureKey = "",
  isFeatureAvailable = () => true,
  path,
  offlineAccessActive = false,
}) {
  if (offlineAccessActive && path === "/dashboard") {
    return children;
  }

  if (featureKey && !isFeatureAvailable(featureKey)) {
    return <Navigate to="/enroll" replace state={{ from: path }} />;
  }

  if (shouldForceEnroll && !featureKey) {
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

function isRecoveryAdminEmail(email) {
  return ADMIN_RECOVERY_EMAILS.has(String(email || "").trim().toLowerCase());
}

function AdminRescueButton({ show }) {
  if (!show) return null;

  return (
    <a
      href="#/admin"
      className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[9999] rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100 shadow-[0_12px_36px_rgba(16,185,129,0.25)] backdrop-blur-2xl transition hover:bg-emerald-400/25"
      aria-label="Open admin panel"
    >
      Admin
    </a>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { user, profile, loading, authReady, refreshProfile } = useAuth();
  const {
    role: normalizedRole,
    isFeatureAvailable,
    loading: roleLoading,
  } = useUserRole();

  const [enrollment, setEnrollment] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [forceLogoutProcessing, setForceLogoutProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(() => isAccessNetworkOffline());
  const [onlineRefreshTick, setOnlineRefreshTick] = useState(0);
  const [cachedAccessSnapshot, setCachedAccessSnapshot] = useState(() =>
    getAccessSnapshot()
  );

  const profileReady = user ? profile !== null : true;

  const enrollmentPlanKey = useMemo(
    () => getEnrollmentPlanKey(enrollment),
    [enrollment]
  );

  const enrollmentPaid = useMemo(
    () =>
      isPaidEnrollment(enrollment) && isSupportedPaidPlanKey(enrollmentPlanKey),
    [enrollment, enrollmentPlanKey]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshOnlineState = () => {
      const nextOffline = isAccessNetworkOffline();
      setIsOffline(nextOffline);

      if (!nextOffline) {
        setOnlineRefreshTick((value) => value + 1);
        refreshProfile?.().catch((error) => {
          console.error("CLARA access refresh failed:", error);
        });
        return;
      }

      const snapshot = getAccessSnapshot(user?.id || user?.email || null);
      setCachedAccessSnapshot(snapshot);
    };

    window.addEventListener("online", refreshOnlineState);
    window.addEventListener("offline", refreshOnlineState);

    refreshOnlineState();

    return () => {
      window.removeEventListener("online", refreshOnlineState);
      window.removeEventListener("offline", refreshOnlineState);
    };
  }, [refreshProfile, user?.email, user?.id]);

  useEffect(() => {
    const snapshot = getAccessSnapshot(user?.id || user?.email || null);
    setCachedAccessSnapshot(snapshot);
  }, [user?.email, user?.id]);

  const offlineFallback = useMemo(
    () =>
      getOfflineFallbackFlow(
        cachedAccessSnapshot || profile?.offline_access_snapshot || null
      ),
    [cachedAccessSnapshot, profile?.offline_access_snapshot]
  );

  const offlineAccessActive = Boolean(
    isOffline &&
      user &&
      (isAccessSnapshotUsable(cachedAccessSnapshot) ||
        profile?.offline_access ||
        profile?.offline_limited_access ||
        offlineFallback.flow === "limited_offline")
  );

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

      if (isOffline && offlineAccessActive) {
        setEnrollment(cachedAccessSnapshot?.enrollment || null);
        setEnrollmentLoading(false);
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

        const bestEnrollment = pickBestEnrollment(data);
        setEnrollment(bestEnrollment);
      } catch (error) {
        console.error("App enrollment fetch error:", error);

        if (!isMounted) return;

        const snapshot =
          getAccessSnapshot(user.id) || getAccessSnapshot(user.email);
        setCachedAccessSnapshot(snapshot);
        setEnrollment(snapshot?.enrollment || null);
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
  }, [
    cachedAccessSnapshot?.enrollment,
    isOffline,
    offlineAccessActive,
    onlineRefreshTick,
    user?.email,
    user?.id,
  ]);

  useEffect(() => {
    let isMounted = true;

    const runForceReauth = async () => {
      if (!user?.id || !profile || forceLogoutProcessing) return;
      if (
        offlineAccessActive ||
        profile?.offline_access ||
        profile?.offline_limited_access
      )
        return;
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
  }, [user?.id, profile, forceLogoutProcessing, offlineAccessActive]);

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

  const isAdmin =
    resolvedAccess.isAdmin || isRecoveryAdminEmail(user?.email || profile?.email);
  const isAdvertiser = resolvedAccess.isAdvertiser;

  const flow = useMemo(() => {
    if (!user || !profileReady || enrollmentLoading) return "loading";

    if (offlineAccessActive) {
      return offlineFallback.flow === "limited_offline" ? "normal" : "active";
    }

    const resolvedFlow = resolveAppFlow(
      {
        ...profile,
        role: isAdmin ? "admin" : profile?.role || normalizedRole || "user",
      },
      enrollment
    );

    return getSafeFlow(resolvedFlow, enrollment);
  }, [
    user,
    profileReady,
    enrollmentLoading,
    offlineAccessActive,
    offlineFallback.flow,
    profile,
    normalizedRole,
    enrollment,
    isAdmin,
  ]);

  const forceEnroll = useMemo(() => {
    if (offlineAccessActive) return false;
    if (!user || !profileReady || enrollmentLoading) return false;
    if (isAdmin) return false;
    if (enrollmentPaid) return false;
    if (!profile) return false;
    return resolvedAccess.forceEnroll;
  }, [
    offlineAccessActive,
    user,
    profileReady,
    enrollmentLoading,
    profile,
    enrollmentPaid,
    resolvedAccess.forceEnroll,
    isAdmin,
  ]);

  const homeRedirectPath = useMemo(
    () =>
      getHomeRedirectPath({
        isAdvertiser,
        flow,
        forceEnroll,
        offlineAccessActive,
      }),
    [isAdvertiser, flow, forceEnroll, offlineAccessActive]
  );

  const welcomeRedirectPath = useMemo(() => {
    if (offlineAccessActive) return "/dashboard";

    if (
      flow === "program_onboarding" &&
      hasCompletedProgramOnboarding(profile || {})
    ) {
      return "/dashboard";
    }
    return homeRedirectPath;
  }, [flow, homeRedirectPath, profile, offlineAccessActive]);

  useEffect(() => {
    if (!user?.id || !profile || isOffline) return;
    if (flow === "loading") return;

    const snapshot = buildAccessSnapshot({
      user,
      profile,
      enrollment,
      accessState: resolvedAccess,
      flow,
      homeRedirectPath,
      currentPath: location.pathname,
    });

    const saved = saveAccessSnapshot(snapshot);
    setCachedAccessSnapshot(saved);
  }, [
    enrollment,
    flow,
    homeRedirectPath,
    isOffline,
    location.pathname,
    profile,
    resolvedAccess,
    user,
  ]);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "";

  if (
    forceLogoutProcessing ||
    !authReady ||
    loading ||
    roleLoading ||
    (user && !profileReady) ||
    (user && enrollmentLoading && !offlineAccessActive)
  ) {
    return <FullScreenLoader />;
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              hasPendingPostLoginWelcome() ? (
                <Navigate to="/welcome-back" replace />
              ) : (
                <Navigate to={homeRedirectPath} replace />
              )
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/welcome-back"
          element={
            user ? (
              <WelcomeBackTransition
                redirectTo={welcomeRedirectPath}
                userName={displayName}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/onboarding"
          element={
            user ? (
              offlineAccessActive ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <UniversalOnboarding />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/pending"
          element={
            offlineAccessActive ? (
              <Navigate to="/dashboard" replace />
            ) : user && flow === "payment_pending" ? (
              <PendingScreen />
            ) : (
              <Navigate to={homeRedirectPath} replace />
            )
          }
        />

        <Route
          path="/program-onboarding"
          element={
            offlineAccessActive ? (
              <Navigate to="/dashboard" replace />
            ) : user && flow === "program_onboarding" ? (
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
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/dashboard"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/dashboard"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <Dashboard />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/feed"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={false}
                            featureKey={FEATURE_ROUTE_MAP["/feed"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/feed"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <Feed />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/people"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={false}
                            featureKey={FEATURE_ROUTE_MAP["/feed"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/people"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <ClaraPeople />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/user/:id"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={false}
                            featureKey={FEATURE_ROUTE_MAP["/feed"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/user/:id"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <UserProfile />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/expenses"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/expenses"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/expenses"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <TransactionHub />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/transactions-hub"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/expenses"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/transactions-hub"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <TransactionHub />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/add-funds"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/add-funds"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/add-funds"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <AddFunds />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/wallets"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/wallets"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/wallets"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <Wallets />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/budgets"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/budgets"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/budgets"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <Budgets />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/analytics"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/analytics"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/analytics"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <Analytics />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/ai"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/ai"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/ai"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <AiInsights />
                          </GuardedRoute>
                        }
                      />

                      <Route path="/activation" element={<Activation />} />

                      <Route
                        path="/enroll"
                        element={
                          offlineAccessActive ? (
                            <Navigate to="/dashboard" replace />
                          ) : (
                            <Enroll />
                          )
                        }
                      />
                      <Route
                        path="/tier-select"
                        element={
                          offlineAccessActive ? (
                            <Navigate to="/dashboard" replace />
                          ) : (
                            <TierSelect />
                          )
                        }
                      />

                      <Route
                        path="/news"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/news"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/news"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <News />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/tasks"
                        element={<Navigate to="/dashboard" replace />}
                      />

                      <Route
                        path="/modules"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/modules"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/modules"
                            offlineAccessActive={offlineAccessActive}
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
                            featureKey={FEATURE_ROUTE_MAP["/community"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/community"
                            offlineAccessActive={offlineAccessActive}
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
                            featureKey={FEATURE_ROUTE_MAP["/messages"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/messages"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <Messages />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/savings-goals"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/savings-goals"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/savings-goals"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <SavingsGoals />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/referrals"
                        element={
                          <GuardedRoute
                            shouldForceEnroll={forceEnroll}
                            featureKey={FEATURE_ROUTE_MAP["/referrals"]}
                            isFeatureAvailable={isFeatureAvailable}
                            path="/referrals"
                            offlineAccessActive={offlineAccessActive}
                          >
                            <Referrals />
                          </GuardedRoute>
                        }
                      />

                      <Route
                        path="/admin"
                        element={
                          <AdminRoute
                            isAdmin={isAdmin}
                            redirectTo={homeRedirectPath}
                          >
                            <AdminPanel />
                          </AdminRoute>
                        }
                      />

                      <Route
                        path="/admin/student/:id"
                        element={
                          <AdminRoute
                            isAdmin={isAdmin}
                            redirectTo={homeRedirectPath}
                          >
                            <StudentProfile />
                          </AdminRoute>
                        }
                      />

                      <Route
                        path="/admin/referral-materials"
                        element={
                          <AdminRoute
                            isAdmin={isAdmin}
                            redirectTo={homeRedirectPath}
                          >
                            <AdminReferralMaterials />
                          </AdminRoute>
                        }
                      />

                      <Route
                        path="/admin/daily-tips"
                        element={
                          <AdminRoute
                            isAdmin={isAdmin}
                            redirectTo={homeRedirectPath}
                          >
                            <AdminDailyTips />
                          </AdminRoute>
                        }
                      />
                    </>
                  )}

                  <Route path="/profile" element={<Profile />} />

                  <Route
                    path="/settings"
                    element={<Navigate to="/settings/account" replace />}
                  />
                  <Route path="/settings/:section" element={<Settings />} />

                  <Route
                    path="/profile/edit"
                    element={<Navigate to="/settings/account" replace />}
                  />
                  <Route
                    path="/change-password"
                    element={<Navigate to="/settings/security" replace />}
                  />
                  <Route
                    path="/notifications"
                    element={<Navigate to="/settings/notifications" replace />}
                  />
                  <Route
                    path="/billing"
                    element={<Navigate to="/settings/billing" replace />}
                  />

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
      <AdminRescueButton show={Boolean(user && isAdmin)} />
    </Suspense>
  );
}

function App() {
  return (
    <>
      <AppRoutes />
      <ThemePicker />
      <Toaster />
    </>
  );
}

export default App;
