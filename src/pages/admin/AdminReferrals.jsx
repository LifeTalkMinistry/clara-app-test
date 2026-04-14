import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, X, DollarSign, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import useUserRole from "../../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError, loadKeyValueSettings, saveKeyValueSettings } from "@/lib/admin-panel-utils";

const REFERRAL_COMMISSION_KEY = "referral_commission_percent";

export default function AdminReferrals() {
  const { isAdmin } = useUserRole();

  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(50);
  const [errorText, setErrorText] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");

      const refRes = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (refRes.error) throw refRes.error;

      setReferrals(refRes.data || []);

      try {
        const settings = await loadKeyValueSettings([REFERRAL_COMMISSION_KEY]);
        if (settings[REFERRAL_COMMISSION_KEY]) {
          setCommissionPercent(Number(settings[REFERRAL_COMMISSION_KEY]) || 50);
        }
      } catch (settingsError) {
        console.warn("Referral commission setting is unavailable:", settingsError);
      }
    } catch (error) {
      console.error("Failed to load referrals:", error);
      setReferrals([]);
      setErrorText(formatSupabaseError(error, "Failed to load referrals."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadData();
  }, [isAdmin, loadData]);

  async function updateReferral(id, updates) {
    const { data, error } = await supabase
      .from("referrals")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    setReferrals((prev) => prev.map((referral) => (referral.id === id ? data : referral)));
    return data;
  }

  async function handleApprove(referral) {
    try {
      const amountPaid = Number(referral.amount_paid || 0);
      const commission = amountPaid * (commissionPercent / 100);

      await updateReferral(referral.id, {
        status: "approved",
        commission_amount: commission,
        approval_date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Failed to approve referral:", error);
      alert(formatSupabaseError(error, "Failed to approve referral."));
    }
  }

  async function handleReject(referral) {
    try {
      await updateReferral(referral.id, { status: "rejected" });
    } catch (error) {
      console.error("Failed to reject referral:", error);
      alert(formatSupabaseError(error, "Failed to reject referral."));
    }
  }

  async function handleMarkPaid(referral) {
    try {
      await updateReferral(referral.id, { status: "paid" });
    } catch (error) {
      console.error("Failed to mark referral as paid:", error);
      alert(formatSupabaseError(error, "Failed to mark referral as paid."));
    }
  }

  async function handleUpdateCommission() {
    try {
      setSavingCommission(true);
      await saveKeyValueSettings({
        [REFERRAL_COMMISSION_KEY]: commissionPercent,
      });
    } catch (error) {
      console.error("Failed to update referral commission:", error);
      alert(formatSupabaseError(error, "Failed to update referral commission."));
    } finally {
      setSavingCommission(false);
    }
  }

  const stats = useMemo(
    () => ({
      pending: referrals.filter((item) => item.status === "pending").length,
      approved: referrals.filter((item) => item.status === "approved").length,
      paid: referrals.filter((item) => item.status === "paid").length,
      totalCommission: referrals
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0),
    }),
    [referrals]
  );

  if (!isAdmin) {
    return <div className="p-6 text-center text-muted-foreground">Admin only.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          {errorText ? <p className="text-sm text-red-400">{errorText}</p> : null}
        </div>
        <Button size="sm" variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Paid" value={stats.paid} />
        <Stat label="Total Paid" value={`PHP ${stats.totalCommission.toLocaleString("en-PH")}`} />
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <div className="flex justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> Commission
          </h3>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Edit</Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Commission %</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <Input
                  type="number"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(Number(e.target.value))}
                />
                <Button onClick={handleUpdateCommission} disabled={savingCommission}>
                  {savingCommission ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-sm text-muted-foreground">Current: {commissionPercent}%</p>
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {referrals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No referrals found.</div>
          ) : (
            referrals.map((referral) => (
              <div key={referral.id} className="p-3 border rounded-xl text-sm">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {referral.referrer_name || referral.referrer_email || "Unknown Referrer"} →
                      {" "}
                      {referral.new_user_name || referral.new_user_email || referral.email || "Unknown User"}
                    </p>
                    <p className="text-xs text-muted-foreground">PHP {Number(referral.amount_paid || 0).toLocaleString("en-PH")}</p>
                  </div>

                  <p className="font-bold">
                    PHP {Number(referral.commission_amount || 0).toLocaleString("en-PH")}
                  </p>
                </div>

                {referral.status === "pending" ? (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleApprove(referral)}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(referral)}>
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                ) : null}

                {referral.status === "approved" ? (
                  <Button size="sm" className="mt-2" onClick={() => handleMarkPaid(referral)}>
                    <DollarSign className="w-3 h-3 mr-1" /> Paid
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border p-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
