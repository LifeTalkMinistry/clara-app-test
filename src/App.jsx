import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { useAuth } from "@/context/AuthContext";
import ThemePicker from "@/components/ThemePicker";
import SupportClaraBubble from "@/components/support/SupportClaraBubble";
import useUserRole from "./hooks/useUserRole";
import { deriveAccessState, resolveAppFlow } from "./lib/access-control";
import {
  getAccessSnapshot,
  getOfflineFallbackFlow,
  isAccessNetworkOffline,
  isAccessSnapshotUsable,
} from "./lib/offline-access-cache";
import { FEATURE_ROUTE_MAP } from "./lib/plan-config";
import Layout from "./components/Layout";
import { applyVisualPerformanceMode } from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";

const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const DataExport = lazy(() => import("./pages/DataExport"));
const AppPreview = lazy(() => import("./pages/AppPreview"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InvestmentPlan = lazy(() => import("./pages/InvestmentPlan"));
const MonthlyBudgetPlan = lazy(() => import("./pages/MonthlyBudgetPlan"));
const TransactionHub = lazy(() => import("./pages/TransactionHub"));
const AddFunds = lazy(() => import("./pages/AddFunds"));
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
const WelcomeSession = lazy(() => import("./pages/WelcomeSession"));
const AdvertiserDashboard = lazy(() => import("./pages/AdvertiserDashboard"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Activation = lazy(() => import("./pages/Activation"));
const FoundingBetaWelcome = lazy(() =>
  import("./pages/onboarding/FoundingBetaWelcome")
);
const UniversalOnboarding = lazy(() =>
  import("./pages/onboarding/UniversalOnboarding")
);
const ProgramOnboarding = lazy(() =>
  import("./pages/onboarding/ProgramOnboarding")
);
const PageNotFound = lazy(() => import("./lib/PageNotFound"));

const CLARA_ORB_PATH = "/community?view=orb";
const CLARA_HOME_PATH = "/community?view=home";
const LEGACY_DASHBOARD_PATH = "/legacy-dashboard";
const OPEN_SUPPORT_AFTER_ONBOARDING_KEY = "clara_open_support_after_onboarding_v1";

function FullScreenLoader({ message = "Loading CLARA..." }) {
  return (
    <div className="theme-page-shell min-h-screen flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
        <p className="text-sm text-white/75">{message}</p>
      </div>
    </div>
  );
}

function getHomeRedirectPath({
  isAdvertiser,
  flow,
  forceEnroll,
  offlineAccessActive,
}) {
  if (offlineAccessActive) return CLARA_ORB_PATH;
  if (isAdvertiser) return "/advertiser";
  if (flow === "program_onboarding") return "/program-onboarding";
  if (forceEnroll) return "/enroll";
  return CLARA_ORB_PATH;
}

function GuardedRoute({
  children,
  shouldForceEnroll = false,
  featureKey = "",
  isFeatureAvailable = () => true,
  path,
  offlineAccessActive = false,
}) {
  if (
    offlineAccessActive &&
    (path === "/dashboard" || path === "/community" || path === LEGACY_DASHBOARD_PATH)
  ) {
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

function AppRoutes() {
  const location = useLocation();
  const { user, profile, loading, authReady } = useAuth();
  const {
    role: normalizedRole,
    isFeatureAvailable,
    loading: roleLoading,
  } = useUserRole();
  const [isOffline, setIsOffline] = useState(() => isAccessNetworkOffline());
  const [cachedAccessSnapshot, setCachedAccessSnapshot] = useState(() =>
    getAccessSnapshot()
  );

  const profileReady = user ? profile !== null : true;

  useEffect(() => {
    applyVisualPerformanceMode();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncNetworkState = () => {
      setIsOffline(isAccessNetworkOffline());
      setCachedAccessSnapshot(
        getAccessSnapshot(user?.id || user?.email || null)
      );
    };

    window.addEventListener("online", syncNetworkState);
    window.addEventListener("offline", syncNetworkState);
    syncNetworkState();

    return () => {
      window.removeEventListener("online", syncNetworkState);
      window.removeEventListener("offline", syncNetworkState);
    };
  }, [user?.email, user?.id]);

  useEffect(() => {
    setCachedAccessSnapshot(
      getAccessSnapshot(user?.id || user?.email || null)
    );
  }, [user?.email, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || location.pathname !== "/community") {
      return undefined;
    }

    let shouldOpenSupport = false;
    try {
      shouldOpenSupport =
        window.sessionStorage.getItem(OPEN_SUPPORT_AFTER_ONBOARDING_KEY) === "1";
      if (shouldOpenSupport) {
        window.sessionStorage.removeItem(OPEN_SUPPORT_AFTER_ONBOARDING_KEY);
      }
    } catch {
      shouldOpenSupport = false;
    }

    if (!shouldOpenSupport) return undefined;

    let attempts = 0;
    let timer = null;
    const openSupport = () => {
      const supportButton = document.querySelector("[data-clara-support-bubble]");
      if (supportButton instanceof HTMLElement) {
        supportButton.click();
        if (timer) window.clearInterval(timer);
        return;
      }

      attempts += 1;
      if (attempts >= 18 && timer) window.clearInterval(timer);
    };

    window.setTimeout(openSupport, 80);
    timer = window.setInterval(openSupport, 120);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [location.pathname, location.search]);

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

  const resolvedAccess = useMemo(() => {
    if (!profile) return deriveAccessState({ role: normalizedRole || "user" });
    return deriveAccessState({
      ...profile,
      role: profile?.role || normalizedRole || "user",
    });
  }, [profile, normalizedRole]);

  const isAdvertiser = resolvedAccess.isAdvertiser;

  const flow = useMemo(() => {
    if (!user || !profileReady) return "loading";
    if (offlineAccessActive) {
      return offlineFallback.flow === "limited_offline" ? "normal" : "active";
    }
    return resolveAppFlow({
      ...profile,
      role: profile?.role || normalizedRole || "user",
    });
  }, [
    user,
    profileReady,
    offlineAccessActive,
    offlineFallback.flow,
    profile,
    normalizedRole,
  ]);

  const forceEnroll = useMemo(() => {
    if (offlineAccessActive || !user || !profileReady || !profile) return false;
    return resolvedAccess.forceEnroll;
  }, [
    offlineAccessActive,
    user,
    profileReady,
    profile,
    resolvedAccess.forceEnroll,
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

  const isPublicAuthRoute =
    location.pathname === "/login" || location.pathname === "/reset-password";
  const shouldRenderSupportBubble = location.pathname !== "/onboarding";
  const canOpenPublicLanding =
    !user ||
    String(normalizedRole || user?.role || "").toLowerCase() === "admin";

  if (!authReady || roleLoading || (loading && !isPublicAuthRoute)) {
    return <FullScreenLoader message="Restoring your CLARA account..." />;
  }

  const guard = (
    children,
    path,
    shouldForceEnroll = forceEnroll,
    featurePath = path
  ) => (
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

  return (
    <Suspense fallback={<FullScreenLoader message="Opening CLARA..." />}>
      <Routes>
        <Route
          path="/login"
          element={
            canOpenPublicLanding ? (
              <Login />
            ) : (
              <Navigate to={homeRedirectPath} replace />
            )
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/link-local-vault"
          element={<Navigate to={user ? CLARA_ORB_PATH : "/login"} replace />}
        />
        <Route path="/app-preview" element={<AppPreview />} />
        <Route
          path="/*"
          element={
            user ? (
              <>
                <Layout>
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to={homeRedirectPath} replace />}
                    />
                    <Route
                      path="/beta-welcome"
                      element={<FoundingBetaWelcome />}
                    />
                    <Route
                      path="/onboarding"
                      element={<UniversalOnboarding />}
                    />
                    <Route
                      path="/program-onboarding"
                      element={<ProgramOnboarding />}
                    />
                    <Route
                      path="/pending"
                      element={<Navigate to={CLARA_ORB_PATH} replace />}
                    />
                    <Route path="/enroll" element={<Enroll />} />
                    <Route path="/tier-select" element={<TierSelect />} />
                    <Route path="/activation" element={<Activation />} />
                    <Route
                      path="/advertiser"
                      element={<AdvertiserDashboard />}
                    />
                    <Route
                      path="/dashboard"
                      element={<Navigate to={CLARA_HOME_PATH} replace />}
                    />
                    <Route
                      path={LEGACY_DASHBOARD_PATH}
                      element={guard(
                        <Dashboard />,
                        LEGACY_DASHBOARD_PATH,
                        forceEnroll,
                        "/dashboard"
                      )}
                    />
                    <Route
                      path="/welcome-session"
                      element={<WelcomeSession />}
                    />
                    <Route
                      path="/coaching-mock-preview"
                      element={<Navigate to={CLARA_ORB_PATH} replace />}
                    />
                    <Route
                      path="/lifeos"
                      element={<Navigate to={CLARA_ORB_PATH} replace />}
                    />
                    <Route
                      path="/investment-plan"
                      element={guard(<InvestmentPlan />, "/investment-plan")}
                    />
                    <Route
                      path="/budget-plan"
                      element={<MonthlyBudgetPlan />}
                    />
                    <Route
                      path="/expenses"
                      element={guard(<TransactionHub />, "/expenses")}
                    />
                    <Route
                      path="/transactions"
                      element={guard(
                        <TransactionHub />,
                        "/transactions",
                        forceEnroll,
                        "/expenses"
                      )}
                    />
                    <Route
                      path="/add-funds"
                      element={guard(<AddFunds />, "/add-funds")}
                    />
                    <Route
                      path="/wallets"
                      element={<Navigate to={CLARA_HOME_PATH} replace />}
                    />
                    <Route
                      path="/budgets"
                      element={guard(<Budgets />, "/budgets")}
                    />
                    <Route
                      path="/analytics"
                      element={guard(<Analytics />, "/analytics")}
                    />
                    <Route
                      path="/ai"
                      element={guard(<AiInsights />, "/ai")}
                    />
                    <Route
                      path="/modules"
                      element={guard(<Modules />, "/modules")}
                    />
                    <Route
                      path="/feed"
                      element={guard(<Feed />, "/feed")}
                    />
                    <Route
                      path="/people"
                      element={guard(
                        <ClaraPeople />,
                        "/people",
                        forceEnroll,
                        "/community"
                      )}
                    />
                    <Route
                      path="/users/:userId"
                      element={guard(
                        <UserProfile />,
                        "/users/:userId",
                        forceEnroll,
                        "/community"
                      )}
                    />
                    <Route
                      path="/community"
                      element={guard(<Community />, "/community")}
                    />
                    <Route
                      path="/messages"
                      element={guard(<Messages />, "/messages")}
                    />
                    <Route
                      path="/news"
                      element={guard(<News />, "/news")}
                    />
                    <Route
                      path="/referrals"
                      element={guard(<Referrals />, "/referrals")}
                    />
                    <Route
                      path="/savings-goals"
                      element={guard(<SavingsGoals />, "/savings-goals")}
                    />
                    <Route
                      path="/settings"
                      element={<Navigate to="/community?view=profile" replace />}
                    />
                    <Route
                      path="/settings/:section"
                      element={<Navigate to="/community?view=profile" replace />}
                    />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/data-export" element={<DataExport />} />
                    <Route path="/admin/*" element={<AdminPanel />} />
                    <Route path="*" element={<PageNotFound />} />
                  </Routes>
                </Layout>
                {shouldRenderSupportBubble ? <SupportClaraBubble user={user} /> : null}
              </>
            ) : (
              <Navigate
                to="/login"
                replace
                state={location.pathname === "/" ? undefined : { from: location }}
              />
            )
          }
        />
      </Routes>
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