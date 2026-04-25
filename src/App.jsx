import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import { FEATURE_ROUTE_MAP } from "./lib/plan-config";

import DashboardMetricCarouselEnhancer from "./components/DashboardMetricCarouselEnhancer";

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
const AiInsights = lazy(() => import("./pages/AiInsights"));
const Tasks = lazy(() => import("./pages/Tasks"));
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

// (rest of file unchanged)

function App() {
  return (
    <>
      <DashboardMetricCarouselEnhancer />
      <AppRoutes />
      <ThemePicker />
      <Toaster />
    </>
  );
}

export default App;
