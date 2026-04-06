import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Eye, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadEnrollments() {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*")
        .order("created_at", { ascending: false });

      if (enrollmentError) throw enrollmentError;

      const safeEnrollments = enrollmentData || [];

      if (safeEnrollments.length === 0) {
        setEnrollments([]);
        return;
      }

      const userIds = [
        ...new Set(safeEnrollments.map((item) => item.user_id).filter(Boolean)),
      ];

      let profilesMap = {};

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        if (profileError) {
          console.error("Failed to load profiles:", profileError);
          setErrorMessage(profileError.message || "Failed to load profiles.");
        } else {
          profilesMap = (profileData || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      const merged = safeEnrollments.map((item) => ({
        ...item,
        profile: profilesMap[item.user_id] || null,
      }));

      setEnrollments(merged);
    } catch (error) {
      console.error("Failed to load enrollments:", error);
      setErrorMessage(error.message || "Failed to load enrollments.");
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnrollments();
  }, []);

  async function updateEnrollmentStatus(enrollmentId, newStatus) {
    try {
      setActionLoading(true);
      setErrorMessage("");

      const { data: enrollment, error: fetchError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("enrollments")
        .update({ status: newStatus })
        .eq("id", enrollmentId);

      if (error) throw error;

      if (newStatus === "approved" && enrollment?.user_id) {
        await supabase
          .from("profiles")
          .update({
            role: "paid_user",
            plan: enrollment.plan || "basic",
            enrollment_status: "active",
          })
          .eq("id", enrollment.user_id);
      }

      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollmentId ? { ...item, status: newStatus } : item
        )
      );

      setSelectedEnrollment((prev) =>
        prev && prev.id === enrollmentId
          ? { ...prev, status: newStatus }
          : prev
      );

      setReviewOpen(false);
      await loadEnrollments();
    } catch (error) {
      console.error("Failed to update enrollment:", error);
      setErrorMessage(error.message || "Failed to update enrollment status.");
      alert(error.message || "Failed to update enrollment status.");
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusClasses(status) {
    switch ((status || "").toLowerCase()) {
      case "approved":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-400/20";
      case "rejected":
        return "bg-red-500/15 text-red-400 border border-red-400/20";
      default:
        return "bg-yellow-500/15 text-yellow-400 border border-yellow-400/20";
    }
  }

  function getPlanLabel(enrollment) {
    return (
      enrollment.plan ||
      enrollment.plan_name ||
      enrollment.plan_key ||
      "No Plan"
    );
  }

  function getPaymentProof(enrollment) {
    return (
      enrollment.proof_url ||
      enrollment.payment_proof_url ||
      enrollment.receipt_url ||
      enrollment.proof ||
      null
    );
  }

  function getDisplayName(enrollment) {
    return (
      enrollment.profile?.full_name ||
      enrollment.full_name ||
      enrollment.email ||
      "Unknown User"
    );
  }

  function getDisplayEmail(enrollment) {
    return (
      enrollment.profile?.email ||
      enrollment.email ||
      enrollment.user_email ||
      "No email found"
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70">
            {loading
              ? "Loading enrollments..."
              : `${enrollments.length} enrollment${enrollments.length !== 1 ? "s" : ""}`}
          </p>

          {errorMessage ? (
            <p className="mt-1 text-sm text-red-400 break-words">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <Button
          onClick={loadEnrollments}
          variant="outline"
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          Loading...
        </div>
      ) : enrollments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          No enrollments found.
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment) => {
            const displayName = getDisplayName(enrollment);
            const displayEmail = getDisplayEmail(enrollment);

            return (
              <div
                key={enrollment.id}
                className="rounded-2xl border border-white/10 bg-[#081225]/90 px-5 py-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white break-words">
                      {displayName}
                    </p>

                    <p className="text-sm text-white/60 break-words">
                      {displayEmail}
                    </p>

                    <p className="mt-1 text-sm text-white/70">
                      {getPlanLabel(enrollment)} • ₱{enrollment.amount_paid || 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(
                        enrollment.status
                      )}`}
                    >
                      {enrollment.status || "pending"}
                    </span>

                    <Button
                      onClick={() => {
                        setSelectedEnrollment(enrollment);
                        setReviewOpen(true);
                      }}
                      className="bg-white/5 text-white border border-white/10 hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) setSelectedEnrollment(null);
        }}
      >
        <DialogContent className="max-w-3xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Enrollment Review
            </DialogTitle>
          </DialogHeader>

          {selectedEnrollment ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Name
                  </p>
                  <p className="text-sm text-white">
                    {getDisplayName(selectedEnrollment)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Email
                  </p>
                  <p className="text-sm text-white break-all">
                    {getDisplayEmail(selectedEnrollment)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      Plan
                    </p>
                    <p className="text-sm text-white">
                      {getPlanLabel(selectedEnrollment)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      Amount
                    </p>
                    <p className="text-sm text-white">
                      ₱{selectedEnrollment.amount_paid || 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">
                      Status
                    </p>
                    <p className="text-sm text-white capitalize">
                      {selectedEnrollment.status || "pending"}
                    </p>
                  </div>
                </div>
              </div>

              {getPaymentProof(selectedEnrollment) ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-3 text-sm font-medium text-white/80">
                    Payment Proof
                  </p>

                  <img
                    src={getPaymentProof(selectedEnrollment)}
                    alt="Payment Proof"
                    className="w-full max-h-[420px] rounded-xl border border-white/10 object-contain bg-black/20"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                  No payment proof uploaded.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setReviewOpen(false)}
                  disabled={actionLoading}
                >
                  Close
                </Button>

                <Button
                  onClick={() =>
                    updateEnrollmentStatus(selectedEnrollment.id, "rejected")
                  }
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {actionLoading ? "Processing..." : "Reject"}
                </Button>

                <Button
                  onClick={() =>
                    updateEnrollmentStatus(selectedEnrollment.id, "approved")
                  }
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {actionLoading ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/60">No enrollment selected.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}