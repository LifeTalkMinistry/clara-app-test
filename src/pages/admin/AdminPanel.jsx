import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import useUserRole from "../../hooks/useUserRole";
import EmptyState from "../../components/EmptyState";

import AdminUsers from "./AdminUsers";
import AdminEnrollments from "./AdminEnrollments";
import AdminTasks from "./AdminTasks";
import AdminModules from "./AdminModules";
import AdminCoaching from "./AdminCoaching";
import AdminSettings from "./AdminSettings";
import AdminPlans from "./AdminPlans";
import AdminBillboard from "./AdminBillboard";
import AdminReferrals from "./AdminReferrals";
import AdminDailyTips from "./AdminDailyTips";

export default function AdminPanel() {
  const { isAdmin, loading } = useUserRole();

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  if (!isAdmin)
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={Shield}
          title="Admin Only"
          description="You don't have permission to access this page."
        />
      </div>
    );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Admin Panel" subtitle="Manage CLARA platform" />

      <Tabs defaultValue="users" className="w-full">
        <div className="overflow-x-auto mb-5 -mx-1 px-1">
          <TabsList className="flex w-max gap-0.5">
            <TabsTrigger value="users" className="text-xs px-3">Users</TabsTrigger>
            <TabsTrigger value="enrollments" className="text-xs px-3">Enrollments</TabsTrigger>
            <TabsTrigger value="plans" className="text-xs px-3">Plans</TabsTrigger>
            <TabsTrigger value="billboard" className="text-xs px-3">Billboard</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs px-3">Tasks</TabsTrigger>
            <TabsTrigger value="modules" className="text-xs px-3">Modules</TabsTrigger>
            <TabsTrigger value="coaching" className="text-xs px-3">Coaching</TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs px-3">Referrals</TabsTrigger>
            <TabsTrigger value="daily-tips" className="text-xs px-3">Daily Tips</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs px-3">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users"><AdminUsers /></TabsContent>
        <TabsContent value="enrollments"><AdminEnrollments /></TabsContent>
        <TabsContent value="plans"><AdminPlans /></TabsContent>
        <TabsContent value="billboard"><AdminBillboard /></TabsContent>
        <TabsContent value="tasks"><AdminTasks /></TabsContent>
        <TabsContent value="modules"><AdminModules /></TabsContent>
        <TabsContent value="coaching"><AdminCoaching /></TabsContent>
        <TabsContent value="referrals"><AdminReferrals /></TabsContent>
        <TabsContent value="daily-tips"><AdminDailyTips /></TabsContent>
        <TabsContent value="settings"><AdminSettings /></TabsContent>
      </Tabs>
    </div>
  );
}