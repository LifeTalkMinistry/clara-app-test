import { useState, useEffect } from "react";
import { Share2, Copy, Award, Users, FileText, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

export default function Referrals() {
  const { user } = useUserRole();

  const [referrals, setReferrals] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;

    Promise.all([
      fetch(`/api/referrals?email=${user.email}`).then(r => r.json()),
      fetch(`/api/referral-materials`).then(r => r.json()),
    ])
      .then(([refs, mats]) => {
        setReferrals(refs || []);
        setMaterials(mats || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // LOCKED
  if (!user?.referral_enabled) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Referral access is locked
        </p>
      </div>
    );
  }

  const stats = {
    total: referrals.length,
    approved: referrals.filter(r => r.status === "approved").length,
    pending: referrals.filter(r => r.status === "pending").length,
    earned: referrals.reduce((s, r) => s + (r.commission_amount || 0), 0),
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      <PageHeader title="Referrals" />

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 border rounded">Total: {stats.total}</div>
        <div className="p-3 border rounded">Approved: {stats.approved}</div>
        <div className="p-3 border rounded">Pending: {stats.pending}</div>
        <div className="p-3 border rounded">Earned: {fmt(stats.earned)}</div>
      </div>

      {/* CODE */}
      <div className="p-4 border rounded mb-6">
        <p className="font-bold mb-2">Referral Code</p>

        <div className="flex gap-2 items-center">
          <code className="text-lg">{user?.referral_code}</code>

          <Button
            size="sm"
            onClick={() => navigator.clipboard.writeText(user?.referral_code)}
          >
            <Copy className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigator.clipboard.writeText(
                `Join CLARA: ${user?.referral_code}`
              )
            }
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* REFERRALS */}
      <div className="mb-6">
        <h3 className="font-bold mb-2">My Referrals</h3>

        {referrals.length === 0 ? (
          <EmptyState icon={Users} title="No referrals yet" />
        ) : (
          <div className="space-y-2">
            {referrals.map(r => (
              <div key={r.id} className="p-3 border rounded flex justify-between">
                <div>
                  <p>{r.new_user_name || r.new_user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.status}
                  </p>
                </div>

                <p className="font-bold">
                  {fmt(r.commission_amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MATERIALS */}
      <div>
        <h3 className="font-bold mb-2">Materials</h3>

        {materials.length === 0 ? (
          <EmptyState icon={FileText} title="No materials" />
        ) : (
          <div className="space-y-2">
            {materials.map(m => (
              <div key={m.id} className="p-3 border rounded">
                <p className="font-medium">{m.title}</p>

                {m.file_url && (
                  <a href={m.file_url} target="_blank">
                    <Button size="sm" variant="outline">
                      <ArrowRight className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}