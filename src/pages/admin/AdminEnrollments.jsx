import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock3,
  AlertTriangle,
  BadgeCheck,
  FileImage,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizePlanKey } from "@/lib/plan-config";

const PLAN_DETAILS = {
  diy: {
    label: "DIY",
    price: "₱2,999",
    badge: "Self-Paced",
    description:
      "Self-paced access for users who want to learn and apply independently.",
    benefits: [
      "Core CLARA access",
      "Self-guided learning flow",
      "Track progress inside the app",
      "Best for independent learners",
    ],
  },
  diwm: {
    label: "DIWM",
    price: "₱5,999",
    badge: "Most Popular",
    description:
      "More guided structure and accountability for better consistency.",
    benefits: [
      "Everything in DIY",
      "More support and follow-through",
      "Better accountability structure",
      "Best for users who want guidance",
    ],
  },
  ldit: {
    label: "LDIT",
    price: "₱11,999",
    badge: "Premium",
    description:
      "A more premium CLARA journey with the strongest support experience.",
    benefits: [
      "Everything in lower tiers",
      "Highest level of support",
      "Premium guided structure",
      "Best for serious transformation",
    ],
  },
  basic: {
    label: "Basic",
    price: "—",
    badge: "Standard",
    description: "Basic plan access.",
    benefits: [],
  },
};

const ENROLLMENT_STATUS_META = {
  pending: {
    label: "Pending",
    classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-400/20",
    icon: Clock3,
  },
  under_review: {
    label: "Under Review",
    classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-400/20",
    icon: Clock3,
  },
  payment_pending: {
    label: "Payment Pending",
    classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-400/20",
    icon: Clock3,
  },
  approved: {
    label: "Approved",
    classes: "bg-emerald-500/15 text-emerald-400 border border-emerald-400/20",
    icon: CheckCircle2,
  },
  active: {
    label: "Active",
    classes: "bg-emerald-500/15 text-emerald-400 border border-emerald-400/20",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-500/15 text-red-400 border border-red-400/20",
    icon: XCircle,
  },
  resubmit_required: {
    label: "Resubmit Required",
    classes: "bg-orange-500/15 text-orange-400 border border-orange-400/20",
    icon: AlertTriangle,
  },
};

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeValue(value).toLowerCase();
}

function getPlanKey(enrollment) {
  const candidates = [
    enrollment?.plan,
    enrollment?.plan_key,
    enrollment?.tier,
    enrollment?.selected_plan,
    enrollment?.profile?.plan,
  ];

  for (const candidate of candidates) {
    const key = normalizePlanKey(candidate);
    if (PLAN_DETAILS[key]) return key;
  }

  return "";
}

function getPlanMeta(enrollment) {
  const key = getPlanKey(enrollment);
  if (key && PLAN_DETAILS[key]) return PLAN_DETAILS[key];

  return {
    label:
      enrollment?.plan ||
      enrollment?.plan_key ||
      enrollment?.tier ||
      enrollment?.selected_plan ||
      "No Plan",
    price: enrollment?.amount_paid ? `₱${enrollment.amount_paid}` : "—",
    badge: "Unknown",
    description: "No detailed tier information available.",
    benefits: [],
  };
}

function getStatusMeta(status) {
  const key = normalizeLower(status);
  return (
    ENROLLMENT_STATUS_META[key] || {
      label: key || "Pending",
      classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-400/20",
      icon: Clock3,
    }
  );
}

function getPaymentProof(enrollment) {
  return (
    enrollment?.proof_url ||
    enrollment?.payment_proof_url ||
    enrollment?.receipt_url ||
    enrollment?.proof ||
    null
  );
}

function getDisplayName(enrollment) {
  return (
    enrollment?.profile?.full_name ||
    enrollment?.full_name ||
    enrollment?.name ||
    enrollment?.email ||
    "Unknown User"
  );
}

function getDisplayEmail(enrollment) {
  return (
    enrollment?.profile?.email ||
    enrollment?.email ||
    enrollment?.user_email ||
    "No email found"
  );
}

function getAmountDisplay(enrollment, planMeta) {
  if (enrollment?.amount_paid) return `₱${enrollment.amount_paid}`;
  if (planMeta?.price) return planMeta.price;
  return "—";
}

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
          .select("*")
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
      if (!enrollment) throw new Error("Enrollment not found.");

      const { error: enrollmentUpdateError } = await supabase
        .from("enrollments")
        .update({
          status: newStatus,
        })
        .eq("id", enrollmentId);

      if (enrollmentUpdateError) throw enrollmentUpdateError;

      if (enrollment?.user_id) {
        if (newStatus === "approved") {
          const profileApprovalPayload = {
            role: "paid_user",
            plan:
              enrollment.plan ||
              enrollment.plan_key ||
              enrollment.tier ||
              enrollment.selected_plan ||
              "entry",
            enrollment_status: "approved",
            status: "approved",
            is_enrolled: true,
            program_active: true,
            onboarding_completed: false,
            onboarding_step: 0,
          };

          const { error: profileApproveError } = await supabase
            .from("profiles")
            .update(profileApprovalPayload)
            .eq("id", enrollment.user_id);

          if (profileApproveError) throw profileApproveError;
        }

        if (newStatus === "rejected") {
          const profileRejectPayload = {
            enrollment_status: "rejected",
            status: "rejected",
            is_enrolled: false,
            program_active: false,
          };

          const { error: profileRejectError } = await supabase
            .from("profiles")
            .update(profileRejectPayload)
            .eq("id", enrollment.user_id);

          if (profileRejectError) throw profileRejectError;
        }

        if (newStatus === "resubmit_required") {
          const profileResubmitPayload = {
            enrollment_status: "resubmit_required",
            status: "resubmit_required",
            is_enrolled: false,
            program_active: false,
          };

          const { error: profileResubmitError } = await supabase
            .from("profiles")
            .update(profileResubmitPayload)
            .eq("id", enrollment.user_id);

          if (profileResubmitError) throw profileResubmitError;
        }
      }

      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollmentId
            ? {
                ...item,
                status: newStatus,
                profile:
                  newStatus === "approved"
                    ? {
                        ...(item.profile || {}),
                        role: "paid_user",
                        plan:
                          enrollment.plan ||
                          enrollment.plan_key ||
                          enrollment.tier ||
                          enrollment.selected_plan ||
                          "entry",
                        enrollment_status: "approved",
                        status: "approved",
                        is_enrolled: true,
                        program_active: true,
                        onboarding_completed: false,
                        onboarding_step: 0,
                      }
                    : newStatus === "rejected"
                    ? {
                        ...(item.profile || {}),
                        enrollment_status: "rejected",
                        status: "rejected",
                        is_enrolled: false,
                        program_active: false,
                      }
                    : newStatus === "resubmit_required"
                    ? {
                        ...(item.profile || {}),
                        enrollment_status: "resubmit_required",
                        status: "resubmit_required",
                        is_enrolled: false,
                        program_active: false,
                      }
                    : item.profile,
              }
            : item
        )
      );

      setSelectedEnrollment((prev) =>
        prev && prev.id === enrollmentId
          ? {
              ...prev,
              status: newStatus,
            }
          : prev
      );

      setReviewOpen(false);
      setSelectedEnrollment(null);
      await loadEnrollments();
    } catch (error) {
      console.error("Failed to update enrollment:", error);
      setErrorMessage(error.message || "Failed to update enrollment status.");
      alert(error.message || "Failed to update enrollment status.");
    } finally {
      setActionLoading(false);
    }
  }

  const selectedPlanMeta = useMemo(() => {
    if (!selectedEnrollment) return null;
    return getPlanMeta(selectedEnrollment);
  }, [selectedEnrollment]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/70">
            {loading
              ? "Loading enrollments..."
              : `${enrollments.length} enrollment${enrollments.length !== 1 ? "s" : ""}`}
          </p>

          {errorMessage ? (
            <p className="mt-1 break-words text-sm text-red-400">{errorMessage}</p>
          ) : null}
        </div>

        <Button
          onClick={loadEnrollments}
          variant="outline"
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
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
            const statusMeta = getStatusMeta(enrollment.status);
            const StatusIcon = statusMeta.icon;
            const planMeta = getPlanMeta(enrollment);

            return (
              <div
                key={enrollment.id}
                className="rounded-2xl border border-white/10 bg-[#081225]/90 px-5 py-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold text-white">
                      {getDisplayName(enrollment)}
                    </p>

                    <p className="break-words text-sm text-white/60">
                      {getDisplayEmail(enrollment)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                        {planMeta.label}
                      </span>
                      <span className="text-sm text-white/70">
                        {getAmountDisplay(enrollment, planMeta)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium capitalize ${statusMeta.classes}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusMeta.label}
                    </span>

                    <Button
                      onClick={() => {
                        setSelectedEnrollment(enrollment);
                        setReviewOpen(true);
                      }}
                      className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Eye className="mr-2 h-4 w-4" />
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
          if (!open) {
            setSelectedEnrollment(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Enrollment Review
            </DialogTitle>
          </DialogHeader>

          {selectedEnrollment ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-4 text-sm font-semibold text-white/85">
                      Student Information
                    </p>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/45">
                          Name
                        </p>
                        <p className="text-sm text-white">
                          {getDisplayName(selectedEnrollment)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/45">
                          Email
                        </p>
                        <p className="break-all text-sm text-white">
                          {getDisplayEmail(selectedEnrollment)}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Plan
                          </p>
                          <p className="text-sm text-white">
                            {selectedPlanMeta?.label || "No Plan"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Amount
                          </p>
                          <p className="text-sm text-white">
                            {getAmountDisplay(selectedEnrollment, selectedPlanMeta)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Status
                          </p>
                          <p className="text-sm capitalize text-white">
                            {selectedEnrollment.status || "pending"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm font-semibold text-white/85">
                        Tier Overview
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        {selectedPlanMeta?.label || "No Plan"}
                      </span>
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                        {selectedPlanMeta?.badge || "Standard"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75">
                        {selectedPlanMeta?.price || "—"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-white/75">
                      {selectedPlanMeta?.description || "No tier description available."}
                    </p>

                    {selectedPlanMeta?.benefits?.length ? (
                      <div className="mt-4 space-y-2">
                        {selectedPlanMeta.benefits.map((item, idx) => (
                          <div
                            key={`${item}-${idx}`}
                            className="flex items-start gap-2 text-sm text-white/78"
                          >
                            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  {getPaymentProof(selectedEnrollment) ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white/85">
                          Payment Proof
                        </p>

                        <a
                          href={getPaymentProof(selectedEnrollment)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                          Open Full Image
                        </a>
                      </div>

                      <img
                        src={getPaymentProof(selectedEnrollment)}
                        alt="Payment Proof"
                        className="max-h-[470px] w-full rounded-xl border border-white/10 bg-black/20 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                      No payment proof uploaded.
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-3 text-sm font-semibold text-white/85">
                      Review Actions
                    </p>

                    <div className="grid gap-3">
                      <Button
                        onClick={() =>
                          updateEnrollmentStatus(selectedEnrollment.id, "approved")
                        }
                        disabled={actionLoading}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {actionLoading ? "Processing..." : "Approve Enrollment"}
                      </Button>

                      <Button
                        onClick={() =>
                          updateEnrollmentStatus(
                            selectedEnrollment.id,
                            "resubmit_required"
                          )
                        }
                        disabled={actionLoading}
                        className="bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {actionLoading ? "Processing..." : "Request Resubmission"}
                      </Button>

                      <Button
                        onClick={() =>
                          updateEnrollmentStatus(selectedEnrollment.id, "rejected")
                        }
                        disabled={actionLoading}
                        className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {actionLoading ? "Processing..." : "Reject Enrollment"}
                      </Button>

                      <Button
                        onClick={() => {
                          setReviewOpen(false);
                          setSelectedEnrollment(null);
                        }}
                        disabled={actionLoading}
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
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
