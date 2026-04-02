import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { queryClientInstance } from "./lib/query-client";

// Layout
import Layout from "./components/Layout";

// Pages
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

// Admin
import AdminPanel from "./pages/admin/AdminPanel";
import StudentProfile from "./pages/admin/StudentProfile";
import AdminReferralMaterials from "./pages/admin/AdminReferralMaterials";
import AdminDailyTips from "./pages/admin/AdminDailyTips";

// Fallback
import PageNotFound from "./lib/PageNotFound";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tier-select" element={<TierSelect />} />
            <Route path="/enroll" element={<Enroll />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/add-funds" element={<AddFunds />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/savings-goals" element={<SavingsGoals />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/community" element={<Community />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/coaching" element={<Coaching />} />
            <Route path="/news" element={<News />} />
            <Route path="/referrals" element={<Referrals />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/student/:userId" element={<StudentProfile />} />
            <Route path="/admin/referral-materials" element={<AdminReferralMaterials />} />
            <Route path="/admin/daily-tips" element={<AdminDailyTips />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>

      <Toaster />
    </QueryClientProvider>
  );
}

export default App;