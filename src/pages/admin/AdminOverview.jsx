import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Package, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";

export default function AdminOverview() {
  const [profiles, setProfiles] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [activationCodes, setActivationCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, enrollmentsRes, codesRes] = await Promise.all([
        supabase.from("profiles").select("id,email,plan,role,created_at,activation_status").order("created_at", { ascending: false }),
        supabase.from("enrollments").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("activation_codes").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      if (!profilesRes.error) setProfiles(profilesRes.data || []);
      if (!enrollmentsRes.error) setEnrollments(enrollmentsRes.data || []);
      if (!codesRes.error) setActivationCodes(codesRes.data || []);
    } catch (error) {
      console.error("Admin overview load failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tierCounts = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      const key = normalizePlanKey(profile.plan);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [profiles]);

  const kitRequests = activationCodes.filter((code) =>
    ["available", "printed", "shipped", "delivered"].includes(String(code.status || "available"))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold">{profiles.length}</p>
        </div>
        {["free", "pro_99", "core_599", "coaching_1299"].map((key) => (
          <div key={key} className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{PLAN_LABELS[key]}</p>
            <p className="mt-2 text-2xl font-bold">{tierCounts[key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-bold">Recent Activity</h3>
          <div className="mt-3 space-y-2">
            {enrollments.slice(0, 5).map((item) => (
              <div key={item.id || item.created_at} className="rounded-xl bg-muted/40 p-2 text-xs">
                {item.email || item.user_email || item.user_id} - {item.status || "submitted"}
              </div>
            ))}
            {enrollments.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-bold">New Kit Requests</h3>
          <p className="mt-2 text-2xl font-bold">{kitRequests.length}</p>
          <p className="text-xs text-muted-foreground">Activation codes not yet used.</p>
        </section>
      </div>
    </div>
  );
}
