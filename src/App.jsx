import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { useAuth } from "@/context/AuthContext";
import ThemePicker from "@/components/ThemePicker";
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

const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InvestmentPlan = lazy(() => import("./pages/InvestmentPlan"));
const MonthlyBudgetPlan = lazy(() => import("./pages/MonthlyBudgetPlan"));
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
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const StudentProfile = lazy(() => import("./pages/admin/StudentProfile"));
const AdminReferralMaterials = lazy(() => import("./pages/admin/AdminReferralMaterials"));
const AdminDailyTips = lazy(() => import("./pages/admin/AdminDailyTips"));
const PageNotFound = lazy(() => import("./lib/PageNotFound"));

export default function App(){return null}
