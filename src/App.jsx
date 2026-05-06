import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { useAuth } from "@/context/AuthContext";
import ThemePicker from "@/components/ThemePicker";
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
import Layout from "./components/Layout";
import { applyVisualPerformanceMode } from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";

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
const UniversalOnboarding = lazy(() => import("./pages/onboarding/UniversalOnboarding"));
const ProgramOnboarding = lazy(() => import("./pages/onboarding/ProgramOnboarding"));
const PendingScreen = lazy(() => import("./pages/onboarding/PendingScreen"));
const WelcomeBackTransition = lazy(() => import("./components/WelcomeBackTransition"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const StudentProfile = lazy(() => import("./pages/admin/StudentProfile"));
const AdminReferralMaterials = lazy(() => import("./pages/admin/AdminReferralMaterials"));
const AdminDailyTips = lazy(() => import("./pages/admin/AdminDailyTips"));
const PageNotFound = lazy(() => import("./lib/PageNotFound"));

const ADMIN_RECOVERY_EMAILS = new Set([
  "jeromemirabuenos62@gmail.com",
  "lifetalkministry@gmail.com",
]);

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

function getHomeRedirectPath({ isAdvertiser, flow, forceEnroll, offlineAccessActive }) {
  if (offlineAccessActive) return "/dashboard";
  if (isAdvertiser) return "/advertiser";
  if (flow === "universal_onboarding") return "/onboarding";
  if (flow === "payment_pending") return "/pending";
  if (flow === "program_onboarding") return "/program-onboarding";
  if (forceEnroll) return "/enroll";
  return "/dashboard";
}

function GuardedRoute({ children, shouldForceEnroll = false, featureKey = "", isFeatureAvailable = () => true, path, offlineAccessActive = false }) {
  if (offlineAccessActive && path === "/dashboard") return children;
  if (featureKey && !isFeatureAvailable(featureKey)) return <Navigate to="/enroll" replace state={{ from: path }} />;
  if (shouldForceEnroll && !featureKey) return <Navigate to="/enroll" replace state={{ from: path }} />;
  return children;
}

function AdminRoute({ isAdmin, redirectTo = "/dashboard", children }) {
  return isAdmin ? children : <Navigate to={redirectTo} replace />;
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
  const isLoginRoute = location.pathname === "/login";
  const { user, profile, loading, authReady, refreshProfile } = useAuth();
  const { role: normalizedRole, isFeatureAvailable, loading: roleLoading } = useUserRole();
  const [forceLogoutProcessing, setForceLogoutProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(() => isAccessNetworkOffline());
  const [cachedAccessSnapshot, setCachedAccessSnapshot] = useState(() => getAccessSnapshot());

  const profileReady = user ? profile !== null : true;

  useEffect(() => {
    applyVisualPerformanceMode();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshOnlineState = () => {
      const nextOffline = isAccessNetworkOffline();
      setIsOffline(nextOffline);
      if (!nextOffline) {
        refreshProfile?.().catch((error) => console.error("CLARA access refresh failed:", error));
        return;
      }
      setCachedAccessSnapshot(getAccessSnapshot(user?.id || user?.email || null));
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
    setCachedAccessSnapshot(getAccessSnapshot(user?.id || user?.email || null));
  }, [user?.email, user?.id]);

  const offlineFallback = useMemo(
    () => getOfflineFallbackFlow(cachedAccessSnapshot || profile?.offline_access_snapshot || null),
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

    const runForceReauth = async () => {
      if (!user?.id || !profile || forceLogoutProcessing) return;
      if (offlineAccessActive || profile?.offline_access || profile?.offline_limited_access) return;
      if (!profile?.force_reauth) return;

      try {
        if (isMounted) setForceLogoutProcessing(true);
        const { error: flagResetError } = await supabase
          .from("profiles")
          .update({ force_reauth: false })
          .eq("id", user.id);
        if (flagResetError) console.error("Force reauth flag reset error:", flagResetError);

        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error("Force sign out error:", signOutError);

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
        if (isMounted) setForceLogoutProcessing(false);
      }
    };

    runForceReauth();
    return () => {
      isMounted = false;
    };
  }, [user?.id, profile, forceLogoutProcessing, offlineAccessActive]);

  const resolvedAccess = useMemo(() => {
    if (!profile) return deriveAccessState({ role: normalizedRole || "user" });
    return deriveAccessState({ ...profile, role: profile?.role || normalizedRole || "user" });
  }, [profile, normalizedRole]);

  const isAdmin = resolvedAccess.isAdmin || isRecoveryAdminEmail(user?.email || profile?.email);
  const isAdvertiser = resolvedAccess.isAdvertiser;

  const flow = useMemo(() => {
    if (!user || !profileReady) return "loading";
    if (offlineAccessActive) return offlineFallback.flow === "limited_offline" ? "normal" : "active";
    return resolveAppFlow({ ...profile, role: isAdmin ? "admin" : profile?.role || normalizedRole || "user" });
  }, [user, profileReady, offlineAccessActive, offlineFallback.flow, profile, normalizedRole, isAdmin]);

  const forceEnroll = useMemo(() => {
    if (offlineAccessActive) return false;
    if (!user || !profileReady) return false;
    if (isAdmin) return false;
    if (!profile) return false;
    return resolvedAccess.forceEnroll;
  }, [offlineAccessActive, user, profileReady, isAdmin, profile, resolvedAccess.forceEnroll]);

  const homeRedirectPath = useMemo(
    () => getHomeRedirectPath({ isAdvertiser, flow, forceEnroll, offlineAccessActive }),
    [isAdvertiser, flow, forceEnroll, offlineAccessActive]
  );

  const welcomeRedirectPath = useMemo(() => {
    if (offlineAccessActive) return "/dashboard";
    if (flow === "program_onboarding" && hasCompletedProgramOnboarding(profile || {})) return "/dashboard";
    return homeRedirectPath;
  }, [flow, homeRedirectPath, profile, offlineAccessActive]);

  useEffect(() => {
    if (!user?.id || !profile || isOffline) return;
    if (flow === "loading") return;
    const snapshot = buildAccessSnapshot({ user, profile, accessState: resolvedAccess, flow, homeRedirectPath, currentPath: location.pathname });
    setCachedAccessSnapshot(saveAccessSnapshot(snapshot));
  }, [flow, homeRedirectPath, isOffline, location.pathname, profile, resolvedAccess, user]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "";

  if (!isLoginRoute && (forceLogoutProcessing || !authReady || loading || roleLoading || (user && !profileReady))) return <FullScreenLoader />;

  const guard = (children, path, shouldForceEnroll = forceEnroll, featurePath = path) => (
    <GuardedRoute
      shouldForceEnroll={shouldForceEnroll}
      featureKey={FEATURE_ROUTE_MAP[featurePath]}
      isFeatureAvailable={isFeatureAvailable}
      path={path}
      offlineAccessActive={offlineAccessActive}
    >
      {children}
    </GuardedRoute>
  );

  const admin = (children) => (
    <AdminRoute isAdmin={isAdmin} redirectTo={homeRedirectPath}>
      {children}
    </AdminRoute>
  );

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/welcome-back"
          element={
            user ? <WelcomeBackTransition redirectTo={welcomeRedirectPath} userName={displayName} /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/onboarding"
          element={user ? (offlineAccessActive ? <Navigate to="/dashboard" replace /> : <UniversalOnboarding />) : <Navigate to="/login" replace />}
        />
        <Route
          path="/pending"
          element={
            offlineAccessActive ? <Navigate to="/dashboard" replace /> : user && flow === "payment_pending" ? <PendingScreen /> : <Navigate to={homeRedirectPath} replace />
          }
        />
        <Route
          path="/program-onboarding"
          element={
            offlineAccessActive ? <Navigate to="/dashboard" replace /> : user && flow === "program_onboarding" ? <ProgramOnboarding /> : <Navigate to={homeRedirectPath} replace />
          }
        />
        <Route
          path="/*"
          element={
            user ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to={homeRedirectPath} replace />} />
                  <Route path="/advertiser" element={<AdvertiserDashboard />} />
                  {!isAdvertiser && (
                    <>
                      <Route path="/dashboard" element={guard(<Dashboard />, "/dashboard")} />
                      <Route path="/feed" element={guard(<Feed />, "/feed", false)} />
                      <Route path="/people" element={guard(<ClaraPeople />, "/people", false, "/feed")} />
                      <Route path="/user/:id" element={guard(<UserProfile />, "/user/:id", false, "/feed")} />
                      <Route path="/expenses" element={guard(<TransactionHub />, "/expenses")} />
                      <Route path="/transactions-hub" element={guard(<TransactionHub />, "/transactions-hub", forceEnroll, "/expenses")} />
                      <Route path="/add-funds" element={guard(<AddFunds />, "/add-funds")} />
                      <Route path="/wallets" element={guard(<Wallets />, "/wallets")} />
                      <Route path="/budgets" element={guard(<Budgets />, "/budgets")} />
                      <Route path="/analytics" element={guard(<Analytics />, "/analytics")} />
                      <Route path="/ai" element={guard(<AiInsights />, "/ai")} />
                      <Route path="/activation" element={<Activation />} />
                      <Route path="/enroll" element={offlineAccessActive ? <Navigate to="/dashboard" replace /> : <Enroll />} />
                      <Route path="/tier-select" element={offlineAccessActive ? <Navigate to="/dashboard" replace /> : <TierSelect />} />
                      <Route path="/news" element={guard(<News />, "/news")} />
                      <Route path="/tasks" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/modules" element={guard(<Modules />, "/modules")} />
                      <Route path="/community" element={guard(<Community />, "/community")} />
                      <Route path="/messages" element={guard(<Messages />, "/messages")} />
                      <Route path="/savings-goals" element={guard(<SavingsGoals />, "/savings-goals")} />
                      <Route path="/referrals" element={guard(<Referrals />, "/referrals")} />
                      <Route path="/admin" element={admin(<AdminPanel />)} />
                      <Route path="/admin/student/:id" element={admin(<StudentProfile />)} />
                      <Route path="/admin/referral-materials" element={admin(<AdminReferralMaterials />)} />
                      <Route path="/admin/daily-tips" element={admin(<AdminDailyTips />)} />
                    </>
                  )}
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                  <Route path="/settings/:section" element={<Settings />} />
                  <Route path="/profile/edit" element={<Navigate to="/settings/account" replace />} />
                  <Route path="/change-password" element={<Navigate to="/settings/security" replace />} />
                  <Route path="/notifications" element={<Navigate to="/settings/notifications" replace />} />
                  <Route path="/billing" element={<Navigate to="/settings/billing" replace />} />
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
