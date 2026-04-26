import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import EmptyState from "../../components/EmptyState";
import FeaturePageLoader from "../../components/FeaturePageLoader";

import AdminUsers from "./AdminUsers";
import AdminEnrollments from "./AdminEnrollments";
import AdminModules from "./AdminModules";
import AdminSettings from "./AdminSettings";
import AdminPlans from "./AdminPlans";
import AdminBillboard from "./AdminBillboard";
import AdminReferrals from "./AdminReferrals";
import AdminDailyTips from "./AdminDailyTips";
import AdminActivation from "./AdminActivation";
import AdminOverview from "./AdminOverview";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return <FeaturePageLoader label="Preparing admin panel..." />;
  }

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <EmptyState
          icon={Shield}
          title="Admin Only"
          description="You don't have permission to access this page."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <PageHeader title="Admin Panel" subtitle="Manage CLARA platform" />

      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto mb-5 -mx-1 px-1">
          <TabsList className="flex w-max gap-0.5">
            <TabsTrigger value="overview" className="text-xs px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs px-3">
              Users
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="text-xs px-3">
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs px-3">
              Plans
            </TabsTrigger>
            <TabsTrigger value="activation" className="text-xs px-3">
              Activation
            </TabsTrigger>
            <TabsTrigger value="billboard" className="text-xs px-3">
              Billboard
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-xs px-3">
              Modules
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs px-3">
              Referrals
            </TabsTrigger>
            <TabsTrigger value="daily-tips" className="text-xs px-3">
              Daily Tips
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs px-3">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="enrollments">
          <AdminEnrollments />
        </TabsContent>

        <TabsContent value="plans">
          <AdminPlans />
        </TabsContent>

        <TabsContent value="activation">
          <AdminActivation />
        </TabsContent>

        <TabsContent value="billboard">
          <AdminBillboard />
        </TabsContent>

        <TabsContent value="modules">
          <AdminModules />
        </TabsContent>

        <TabsContent value="referrals">
          <AdminReferrals />
        </TabsContent>

        <TabsContent value="daily-tips">
          <AdminDailyTips />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
