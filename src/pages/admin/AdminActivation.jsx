import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, PackageCheck, Printer, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { createActivationCode, formatActivationCode } from "@/lib/activation";
import { PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";

const PLAN_OPTIONS = ["committed_249"];

export default function AdminActivation() {
  const [codes, setCodes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [plan, setPlan] = useState("committed_249");
  const [assignedUserId, setAssignedUserId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [codesRes, profilesRes] = await Promise.all([
        supabase.from("activation_codes").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,email,full_name,plan,activation_status").order("email", { ascending: true }),
      ]);

      if (codesRes.error) throw codesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setCodes(codesRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error("Failed to load activation admin:", error);
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-activation")
      .on("postgres_changes", { event: "*", schema: "public", table: "activation_codes" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [loadData]);

  const eligibleProfiles = useMemo(() => {
    return profiles.filter((profile) =>
      normalizePlanKey(profile.plan) === "committed_249"
    );
  }, [profiles]);

  const createCode = async () => {
    try {
      setCreating(true);
      const selectedProfile = profiles.find((item) => item.id === assignedUserId);
      const code = createActivationCode(plan);
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from("activation_codes").insert([
        {
          code,
          code_normalized: code.replace(/[^A-Z0-9]/g, ""),
          plan_key: plan,
          user_id: assignedUserId || null,
          user_email: selectedProfile?.email || null,
          status: "available",
          created_at: nowIso,
          updated_at: nowIso,
        },
      ]);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Failed to create activation code:", error);
      alert(error?.message || "Failed to create activation code.");
    } finally {
      setCreating(false);
    }
  };

  const updateCode = async (id, updates) => {
    const { error } = await supabase
      .from("activation_codes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("Activation code update failed:", error);
      alert(error.message || "Failed to update activation code.");
      return;
    }
    await loadData();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-300" />
          <h2 className="text-lg font-bold text-white">Kit & Activation Codes</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {PLAN_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assignedUserId || "unassigned"} onValueChange={(value) => setAssignedUserId(value === "unassigned" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Assign user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned code</SelectItem>
              {eligibleProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.email || profile.full_name || profile.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={createCode} disabled={creating}>
            {creating ? "Creating..." : "Generate Code"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {codes.length === 0 ? (
        <div className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
          No activation codes yet.
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => (
            <div key={code.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {PLAN_LABELS[normalizePlanKey(code.plan_key)] || code.plan_key}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold">
                    {formatActivationCode(code.code)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {code.user_email || "Unassigned"} - {code.status || "available"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(formatActivationCode(code.code))}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateCode(code.id, { printed_at: new Date().toISOString(), status: code.status === "used" ? "used" : "printed" })}>
                    <Printer className="mr-1 h-3.5 w-3.5" />
                    Printed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateCode(code.id, { shipped_at: new Date().toISOString(), status: code.status === "used" ? "used" : "shipped" })}>
                    <Truck className="mr-1 h-3.5 w-3.5" />
                    Shipped
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateCode(code.id, { delivered_at: new Date().toISOString(), status: code.status === "used" ? "used" : "delivered" })}>
                    <PackageCheck className="mr-1 h-3.5 w-3.5" />
                    Delivered
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <Input readOnly value={code.printed_at ? "Printed" : "Not printed"} />
                <Input readOnly value={code.shipped_at ? "Shipped" : "Not shipped"} />
                <Input readOnly value={code.used_at ? "Activated" : "Not activated"} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
