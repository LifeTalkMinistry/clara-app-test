import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { queryClientInstance } from "./lib/query-client";
import { supabase } from "./lib/supabaseClient";
import { getUserFlow } from "./lib/flowController";

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

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Session request timed out.")), ms)
    ),
  ]);

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;

    const forceReleaseTimer = setTimeout(() => {
      if (!alive) return;
      console.warn("[App] Force releasing boot screen after timeout.");
      setBooting(false);
    }, 6000);

    const fetchProfile = async (userId) => {
      if (!userId) return null;

      try {
        console.log("[App] Fetching profile for:", userId);

        const { data, error } = await withTimeout(
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          5000
        );

        if (error) {
          console.error("[App] Profile fetch error:", error);
          return null;
        }

        console.log("[App] Profile loaded:", data);
        return data ?? null;
      } catch (error) {
        console.error("[App] Profile fetch timeout/error:", error);
        return null;
      }
    };

    const init = async () => {
      try {
        console.log("[App] Starting init...");

        const {
          data: { session: currentSession },
          error,
        } = await withTimeout(supabase.auth.getSession(), 5000);

        if (!alive) return;

        if (error) {
          console.error("[App] getSession error:", error);
        }

        console.log("[App] Session loaded:", currentSession);

        setSession(currentSession ?? null);

        if (currentSession?.user?.id) {
          const profileData = await fetchProfile(currentSession.user.id);
          if (!alive) return;
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("[App] Init failed:", error);

        if (!alive) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (alive) {
          console.log("[App] Releasing boot screen.");
          setBooting(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!alive) return;

      try {
        console.log("[App] Auth state changed:", event, newSession);

        setSession(newSession ?? null);

        if (newSession?.user?.id) {
          const profileData = await fetchProfile(newSession.user.id);
          if (!alive) return;
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("[App] Auth state change error:", error);
        if (!alive) return;
        setProfile(null);
      } finally {
        if (alive) {
          setBooting(false);
        }
      }
    });

    return () => {
      alive = false;
      clearTimeout(forceReleaseTimer);
      subscription.unsubscribe();
    };
  }, []);

  const flow = useMemo(() => {
    if (!session) return "guest";

    try {
      return getUserFlow(profile);
    } catch (error) {
      console.error("[App] Flow error:", error);
      return "universal_onboarding";
    }
  }, [session, profile]);

  const role = String(profile?.role || "user").toLowerCase();
  const isAdvertiser = role === "advertiser";

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061018] text-white">
        Loading...
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />

        <Route
          path="/onboarding"
          element={
            session ? <UniversalOnboarding /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/pending"
          element={
            session && flow === "payment_pending" ? (
              <PendingScreen />
            ) : !session ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/program-onboarding"
          element={
            session && flow === "program_onboarding" ? (
              <ProgramOnboarding />
            ) : !session ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          element={
            <ProtectedRoute session={session}>
              <Layout />
            </ProtectedRoute>
          }
        >
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
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/modules" element={<Modules />} />
              <Route path="/community" element={<Community />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/coaching" element={<Coaching />} />
              <Route path="/enroll" element={<Enroll />} />
              <Route path="/tier-select" element={<TierSelect />} />
              <Route path="/news" element={<News />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/savings-goals" element={<SavingsGoals />} />
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
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>

      <Toaster />
    </QueryClientProvider>
  );
}

export default App;