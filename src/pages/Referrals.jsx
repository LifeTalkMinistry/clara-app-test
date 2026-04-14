import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Share2,
  Copy,
  Award,
  Users,
  FileText,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { formatSupabaseError } from "@/lib/admin-panel-utils";

const ACHIEVEMENTS = [
  { id: "first", label: "First Referral", icon: "Target", requirement: (s) => s.total_referrals >= 1 },
  { id: "three", label: "3 Approved Referrals", icon: "Star", requirement: (s) => s.approved_referrals >= 3 },
  { id: "five", label: "5 Referrals", icon: "Rocket", requirement: (s) => s.total_referrals >= 5 },
  { id: "ten", label: "10 Referrals", icon: "Crown", requirement: (s) => s.total_referrals >= 10 },
  { id: "commission", label: "First Paid Commission", icon: "Money", requirement: (s) => s.total_paid > 0 },
  { id: "ambassador", label: "CLARA Ambassador Active", icon: "Spark", requirement: (s) => s.approved_referrals >= 3 && s.total_paid > 0 },
];

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

function StatCard({ label, value, sub, color = "text-primary" }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
      <p className={`font-heading font-bold text-2xl ${color}`}>{value}</p>
      {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
    </div>
  );
}

export default function Referrals() {
  const { user } = useUserRole();
  const [referrals, setReferrals] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      const [referralRes, materialsRes] = await Promise.all([
        supabase
          .from("referrals")
          .select("*")
          .or(`referrer_email.eq.${user.email},created_by.eq.${user.email}`)
          .order("created_at", { ascending: false }),
        supabase
          .from("referral_materials")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (referralRes.error) throw referralRes.error;
      if (materialsRes.error) throw materialsRes.error;

      setReferrals(referralRes.data || []);
      setMaterials(materialsRes.data || []);
    } catch (error) {
      console.error("Failed to load referrals page:", error);
      setReferrals([]);
      setMaterials([]);
      setErrorText(formatSupabaseError(error, "Failed to load referral data."));
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(
    () => ({
      total_referrals: referrals.length,
      approved_referrals: referrals.filter((item) =>
        ["approved", "paid", "converted", "successful"].includes(String(item.status || "").toLowerCase())
      ).length,
      pending_referrals: referrals.filter((item) => String(item.status || "").toLowerCase() === "pending").length,
      total_earned: referrals
        .filter((item) => ["approved", "paid"].includes(String(item.status || "").toLowerCase()))
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0),
      total_paid: referrals
        .filter((item) => String(item.status || "").toLowerCase() === "paid")
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0),
      unpaid_balance: referrals
        .filter((item) => String(item.status || "").toLowerCase() === "approved")
        .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0),
    }),
    [referrals]
  );

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter((achievement) => achievement.requirement(stats)),
    [stats]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.referral_enabled) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-muted bg-muted/30 p-8 text-center">
          <Lock className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold mb-2">Referral Access</h2>
          <p className="text-muted-foreground text-sm">
            Referral access is only available to selected CLARA students.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-8">
      <PageHeader
        title="Referral Program"
        subtitle="Earn commissions by sharing CLARA"
      />

      {errorText ? <p className="mb-4 text-sm text-red-400">{errorText}</p> : null}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Referrals" value={stats.total_referrals} />
        <StatCard label="Approved" value={stats.approved_referrals} />
        <StatCard label="Pending" value={stats.pending_referrals} color="text-orange-500" />
        <StatCard label="Total Earned" value={fmt(stats.total_earned)} />
        <StatCard label="Paid Out" value={fmt(stats.total_paid)} />
        <StatCard label="Unpaid" value={fmt(stats.unpaid_balance)} color="text-orange-500" />
      </div>

      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h3 className="font-bold mb-3">Your Referral Code</h3>
        <div className="flex gap-2">
          <code className="flex-1 text-xl font-bold text-primary">{user?.referral_code || "N/A"}</code>
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(user?.referral_code || "");
              toast.success("Copied!");
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(`Join CLARA: ${user?.referral_code || ""}`);
              toast.success("Ready to share!");
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h3 className="font-bold mb-3">Achievements</h3>
        {unlockedAchievements.length === 0 ? (
          <EmptyState icon={Award} title="No achievements yet" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {unlockedAchievements.map((achievement) => (
              <div key={achievement.id} className="p-3 text-center border rounded-xl">
                <span className="text-sm font-semibold">{achievement.icon}</span>
                <p className="text-sm font-semibold">{achievement.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h3 className="font-bold mb-3">My Referrals</h3>
        {referrals.length === 0 ? (
          <EmptyState icon={Users} title="No referrals yet" />
        ) : (
          <div className="space-y-2">
            {referrals.map((referral) => (
              <div key={referral.id} className="p-3 border rounded-xl flex justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {referral.new_user_name || referral.new_user_email || referral.email || "Unknown User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {referral.plan || referral.plan_key || "No plan"}
                  </p>
                </div>
                <span className="text-xs font-bold capitalize">{referral.status || "pending"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold mb-3">Materials</h3>
        {materials.length === 0 ? (
          <EmptyState icon={FileText} title="No materials yet" />
        ) : (
          <div className="space-y-3">
            {materials.map((material) => (
              <div key={material.id} className="p-3 border rounded-xl">
                <p className="font-semibold text-sm">{material.title}</p>
                <p className="text-xs text-muted-foreground">{material.description}</p>
                {material.file_url ? (
                  <a href={material.file_url} target="_blank" rel="noreferrer">
                    <Button size="sm" className="mt-2">
                      <ArrowRight className="w-3 h-3 mr-1" /> Open
                    </Button>
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
