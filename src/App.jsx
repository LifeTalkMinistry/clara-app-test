import Settings from "./pages/Settings";
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

const withTimeout = (promise, ms = 6000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("App request timed out.")), ms)
    ),
  ]);
};

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;

    const fetchProfile = async (userId) => {
      if (!userId) return null;

      try {
        const { data, error } = await withTimeout(
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          6000
        );

        if (error) {
          console.error("Profile fetch error:", error);
          return null;
        }

        return data ?? null;
      } catch (error) {
        console.error("Profile fetch timeout/error:", error);
        return null;
      }
    };

    const init = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await withTimeout(supabase.auth.getSession(), 6000);

        if (!alive) return;

        if (error) {
          console.error("getSession error:", error);
        }

        setSession(currentSession ?? null);

        if (currentSession?.user?.id) {
          const profileData = await fetchProfile(currentSession.user.id);
          if (!alive) return;
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Init error:", err);
        if (!alive) return;
        setSession(null);
        setProfile(null);
      } finally {
        if (alive) setBooting(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!alive) return;

      setSession(newSession ?? null);
      setBooting(false);

      if (newSession?.user?.id) {
        fetchProfile(newSession.user.id).then((profileData) => {
          if (!alive) return;
          setProfile(profileData);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const flow = useMemo(() => {
    if (!session) return "guest";

    try {
      return getUserFlow(profile);
    } catch (error) {
      console.error("Flow error:", error);
      return "universal_onboarding";
    }
  }, [session, profile]);

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
              flow === "universal_onboarding" ? (
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
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminPanel />} />

          {/* ✅ FIXED ROUTE */}
          <Route path="/admin/student/:id" element={<StudentProfile />} />

          <Route
            path="/admin/referral-materials"
            element={<AdminReferralMaterials />}
          />
          <Route path="/admin/daily-tips" element={<AdminDailyTips />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>

      <Toaster />
    </QueryClientProvider>
  );
}

export default App;