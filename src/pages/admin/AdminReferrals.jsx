import { useState, useEffect } from "react";
import { CheckCircle, X, DollarSign, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import useUserRole from "../../hooks/useUserRole";
import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default function AdminReferrals() {
  const { isAdmin } = useUserRole();

  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commissionPercent, setCommissionPercent] = useState(50);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [refRes, settingsRes] = await Promise.all([
        API.get("/referrals"),
        API.get("/settings/referral-commission"),
      ]);

      setReferrals(refRes.data);

      if (settingsRes.data?.value) {
        setCommissionPercent(Number(settingsRes.data.value));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateReferral = async (id, updates) => {
    const res = await API.patch(`/referrals/${id}`, updates);
    setReferrals(prev =>
      prev.map(r => r.id === id ? res.data : r)
    );
  };

  const handleApprove = async (ref) => {
    const commission = (ref.amount_paid || 0) * (commissionPercent / 100);

    await updateReferral(ref.id, {
      status: "approved",
      commission_amount: commission,
      approval_date: new Date().toISOString().split("T")[0],
    });
  };

  const handleReject = async (ref) => {
    await updateReferral(ref.id, { status: "rejected" });
  };

  const handleMarkPaid = async (ref) => {
    await updateReferral(ref.id, { status: "paid" });
  };

  const handleUpdateCommission = async () => {
    await API.post("/settings/referral-commission", {
      value: commissionPercent,
    });
  };

  const stats = {
    pending: referrals.filter(r => r.status === "pending").length,
    approved: referrals.filter(r => r.status === "approved").length,
    paid: referrals.filter(r => r.status === "paid").length,
    totalCommission: referrals
      .filter(r => r.status === "paid")
      .reduce((s, r) => s + (r.commission_amount || 0), 0),
  };

  if (!isAdmin)
    return <div className="p-6 text-center text-muted-foreground">Admin only.</div>;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Paid" value={stats.paid} />
        <Stat label="Total Paid" value={`₱${stats.totalCommission.toLocaleString("en-PH")}`} />
      </div>

      {/* Commission */}
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
                <DialogTitle>Update %</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <Input
                  type="number"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(Number(e.target.value))}
                />
                <Button onClick={handleUpdateCommission}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-sm text-muted-foreground">
          Current: {commissionPercent}%
        </p>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {referrals.map(ref => (
            <div key={ref.id} className="p-3 border rounded-xl text-sm">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">
                    {ref.referrer_name} → {ref.new_user_name || ref.new_user_email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₱{ref.amount_paid}
                  </p>
                </div>

                <p className="font-bold">
                  ₱{(ref.commission_amount || 0).toLocaleString("en-PH")}
                </p>
              </div>

              {ref.status === "pending" && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handleApprove(ref)}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(ref)}>
                    <X className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              )}

              {ref.status === "approved" && (
                <Button size="sm" className="mt-2" onClick={() => handleMarkPaid(ref)}>
                  <DollarSign className="w-3 h-3 mr-1" /> Paid
                </Button>
              )}
            </div>
          ))}
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