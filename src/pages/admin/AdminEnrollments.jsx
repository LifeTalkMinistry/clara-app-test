import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Eye,
  RefreshCw,
  Clock3,
  AlertTriangle,
  BadgeCheck,
  ShieldCheck,
  ShieldOff,
  RotateCcw,
  Ban,
  Loader2,
  Mail,
  Package,
  KeyRound,
  CalendarClock,
  Users,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLAN_LABELS, normalizePlanKey } from "@/lib/plan-config";
import usePlanAccess from "@/hooks/usePlanAccess";

const PLAN_DETAILS = {
  committed_249: {
    label: "Committed",
    price: "₱249/month",
    badge: "Monthly Commitment",
    description: "CLARA Committed membership through Google Play.",
    benefits: [
      "Complete CLARA financial system",
      "Full AI guidance",
      "All committed features",
    ],
  },
  free: {
    label: "Free Version",
    price: "₱0",
    badge: "Free",
    description: "CLARA Free Version.",
    benefits: [],
  },
};

const STATUS_META = {
  free: {
    label: "FREE",
    classes: "bg-white/10 text-white/70 border border-white/10",
    icon: Users,
  },
  active: {
    label: "ACTIVE",
    classes: "bg-emerald-500/15 text-emerald-400 border border-emerald-400/20",
    icon: BadgeCheck,
  },
  expired: {
    label: "EXPIRED",
    classes: "bg-amber-500/15 text-amber-400 border border-amber-400/20",
    icon: Clock3,
  },
  refunded: {
    label: "REFUNDED",
    classes: "bg-orange-500/15 text-orange-400 border border-orange-400/20",
    icon: RotateCcw,
  },
  canceled: {
    label: "CANCELED",
    classes: "bg-red-500/15 text-red-400 border border-red-400/20",
    icon: Ban,
  },
  revoked: {
    label: "REVOKED",
    classes: "bg-rose-500/15 text-rose-400 border border-rose-400/20",
    icon: ShieldOff,
  },
  pending: {
    label: "PENDING",
    classes: "bg-yellow-500/15 text-yellow-400 border border-yellow-400/20",
    icon: Clock3,
  },
  unknown: {
    label: "UNKNOWN",
    classes: "bg-white/10 text-white/75 border border-white/10",
    icon: AlertTriangle,
  },
};

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeValue(value).toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function maskToken(value) {
  const token = normalizeValue(value);
  if (!token) return "—";
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}••••${token.slice(-8)}`;
}

function getPlanKey(record) {
  const candidates = [
    record?.plan,
    record?.plan_key,
    record?.tier,
    record?.selected_plan,
    record?.profile?.plan,
  ];

  for (const candidate of candidates) {
    const key = normalizePlanKey(candidate);
    if (key) return key;
  }

  return "";
}

function getPlanMeta(record, plansByKey = {}) {
  const key = getPlanKey(record);

  const planRow = plansByKey[key];
  if (planRow) {
    return {
      label: planRow.name || PLAN_LABELS[key] || key.toUpperCase(),
      price: `₱${Number(planRow.price || 0).toLocaleString("en-PH")}`,
      badge: planRow.billing_type === "subscription" ? "Monthly Subscription" : "One-Time Purchase",
      description: planRow.description || "",
      benefits: Array.isArray(planRow.features) ? planRow.features : [],
    };
  }

  if (key && PLAN_DETAILS[key]) {
    return PLAN_DETAILS[key];
  }

  return {
    label: PLAN_LABELS[key] || "Free",
    price: record?.amount_paid ? `₱${record.amount_paid}` : "—",
    badge: record?.purchase_token ? "Paid" : "Free",
    description: record?.purchase_token
      ? "Google Play enrollment record found."
      : "Basic free access.",
    benefits: [],
  };
}

function getRawStatus(record) {
  return normalizeLower(
    record?.enrollment_status ||
      record?.status ||
      record?.google_play_status ||
      record?.purchase_status ||
      record?.profile?.enrollment_status
  );
}

function getNormalizedStatus(record) {
  const raw = getRawStatus(record);

  if (!record?.enrollmentId && !record?.purchase_token && !record?.product_id) {
    return "free";
  }

  if (raw === "active" || raw === "approved") {
    return "active";
  }

  if (raw === "expired") {
    return "expired";
  }

  if (raw === "refunded") {
    return "refunded";
  }

  if (raw === "canceled" || raw === "cancelled") {
    return "canceled";
  }

  if (raw === "revoked") {
    return "revoked";
  }

  if (
    raw === "pending" ||
    raw === "under_review" ||
    raw === "payment_pending" ||
    raw === "google_play_pending" ||
    raw === "google_play_processing" ||
    raw === "purchase_pending" ||
    raw === "purchase_processing"
  ) {
    return "pending";
  }

  return record?.purchase_token || record?.product_id ? "unknown" : "free";
}

function getStatusMeta(record) {
  const key = getNormalizedStatus(record);
  return STATUS_META[key] || STATUS_META.unknown;
}

function getDisplayName(record) {
  return (
    record?.profile?.full_name ||
    record?.full_name ||
    record?.name ||
    record?.email ||
    "Unknown User"
  );
}

function getDisplayEmail(record) {
  return (
    record?.profile?.email ||
    record?.email ||
    record?.user_email ||
    "No email found"
  );
}

function getAmountDisplay(record, planMeta) {
  if (record?.amount_paid) return `₱${record.amount_paid}`;
  if (planMeta?.price) return planMeta.price;
  return "—";
}

function getGoogleProductId(record) {
  return (
    record?.product_id ||
    record?.google_product_id ||
    record?.google_play_product_id ||
    "—"
  );
}

function getPurchaseToken(record) {
  return (
    record?.purchase_token ||
    record?.google_purchase_token ||
    record?.token ||
    "—"
  );
}

function getPurchaseDate(record) {
  return (
    record?.purchase_date ||
    record?.purchased_at ||
    record?.created_at ||
    null
  );
}

function getExpiryDate(record) {
  return (
    record?.expiry_date ||
    record?.expires_at ||
    record?.expiration_date ||
    null
  );
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const aPaid = getNormalizedStatus(a) !== "free" ? 1 : 0;
    const bPaid = getNormalizedStatus(b) !== "free" ? 1 : 0;

    if (aPaid !== bPaid) return bPaid - aPaid;

    const aCreated = new Date(
      a?.created_at || a?.profile?.created_at || 0
    ).getTime();
    const bCreated = new Date(
      b?.created_at || b?.profile?.created_at || 0
    ).getTime();

    if (aCreated !== bCreated) return bCreated - aCreated;

    return getDisplayName(a).localeCompare(getDisplayName(b));
  });
}

export default function AdminEnrollments() {
  const { plansByKey } = usePlanAccess();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadEnrollments() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [{ data: profileData, error: profileError }, { data: enrollmentData, error: enrollmentError }] =
        await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
        ]);

      if (profileError) throw profileError;
      if (enrollmentError) throw enrollmentError;

      const profiles = profileData || [];
      const enrollments = enrollmentData || [];

      const latestEnrollmentByUserId = new Map();

      for (const enrollment of enrollments) {
        const userId = enrollment?.user_id;
        if (!userId) continue;
        if (!latestEnrollmentByUserId.has(userId)) {
          latestEnrollmentByUserId.set(userId, enrollment);
        }
      }

      const mergedFromProfiles = profiles.map((profile) => {
        const enrollment = latestEnrollmentByUserId.get(profile.id) || null;

        return {
          ...(enrollment || {}),
          enrollmentId: enrollment?.id || null,
          user_id: profile.id,
          profile,
          email: enrollment?.email || profile?.email || null,
          user_email: enrollment?.user_email || profile?.email || null,
          created_at: enrollment?.created_at || profile?.created_at || null,
        };
      });

      const orphanEnrollments = enrollments
        .filter((enrollment) => enrollment?.user_id && !profiles.some((p) => p.id === enrollment.user_id))
        .map((enrollment) => ({
          ...enrollment,
          enrollmentId: enrollment?.id || null,
          profile: null,
        }));

      const merged = sortRows([...mergedFromProfiles, ...orphanEnrollments]);

      setRows(merged);
    } catch (error) {
      console.error("Failed to load enrollments:", error);
      setErrorMessage(error.message || "Failed to load enrollments.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnrollments();
  }, []);

  async function syncStatus(record) {
    try {
      setActionLoading(`sync-${record.user_id || record.enrollmentId}`);
      setErrorMessage("");

      const hasFunctionClient =
        supabase?.functions && typeof supabase.functions.invoke === "function";

      if (hasFunctionClient && record?.purchase_token) {
        const { error } = await supabase.functions.invoke("sync-google-play-enrollment", {
          body: {
            enrollmentId: record.enrollmentId || null,
            userId: record.user_id || null,
            purchaseToken: record.purchase_token || null,
            productId: record.product_id || null,
            planKey: record.plan_key || record.plan || null,
          },
        });

        if (error) {
          console.warn("Sync function not available or failed:", error);
        }
      }

      await loadEnrollments();

      const { data: freshEnrollment } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", record.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (freshEnrollment) {
        setSelectedEnrollment((prev) =>
          prev && prev.user_id === record.user_id
            ? {
                ...freshEnrollment,
                enrollmentId: freshEnrollment.id,
                profile: prev.profile || null,
              }
            : prev
        );
      }
    } catch (error) {
      console.error("Failed to sync enrollment status:", error);
      setErrorMessage(error.message || "Failed to sync status.");
      alert(error.message || "Failed to sync status.");
    } finally {
      setActionLoading("");
    }
  }

  async function revokeAccess(record) {
    try {
      setActionLoading(`revoke-${record.user_id || record.enrollmentId}`);
      setErrorMessage("");

      if (!record?.user_id) {
        throw new Error("User ID not found.");
      }

      if (record?.enrollmentId) {
        const { error: enrollmentUpdateError } = await supabase
          .from("enrollments")
          .update({
            status: "revoked",
            enrollment_status: "revoked",
          })
          .eq("id", record.enrollmentId);

        if (enrollmentUpdateError) throw enrollmentUpdateError;
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          enrollment_status: "revoked",
          status: "revoked",
          is_enrolled: false,
          program_active: false,
          role: "free_user",
        })
        .eq("id", record.user_id);

      if (profileUpdateError) throw profileUpdateError;

      setReviewOpen(false);
      setSelectedEnrollment(null);
      await loadEnrollments();
    } catch (error) {
      console.error("Failed to revoke access:", error);
      setErrorMessage(error.message || "Failed to revoke access.");
      alert(error.message || "Failed to revoke access.");
    } finally {
      setActionLoading("");
    }
  }

  async function resetEnrollment(record) {
    try {
      setActionLoading(`reset-${record.user_id || record.enrollmentId}`);
      setErrorMessage("");

      if (!record?.user_id) {
        throw new Error("User ID not found.");
      }

      const { error: deleteEnrollmentError } = await supabase
        .from("enrollments")
        .delete()
        .eq("user_id", record.user_id);

      if (deleteEnrollmentError) throw deleteEnrollmentError;

      const { error: profileResetError } = await supabase
        .from("profiles")
        .update({
          plan: null,
          enrollment_status: null,
          status: null,
          is_enrolled: false,
          program_active: false,
          onboarding_completed: false,
          onboarding_step: 0,
          role: "free_user",
        })
        .eq("id", record.user_id);

      if (profileResetError) throw profileResetError;

      setReviewOpen(false);
      setSelectedEnrollment(null);
      await loadEnrollments();
    } catch (error) {
      console.error("Failed to reset enrollment:", error);
      setErrorMessage(error.message || "Failed to reset enrollment.");
      alert(error.message || "Failed to reset enrollment.");
    } finally {
      setActionLoading("");
    }
  }

  const selectedPlanMeta = useMemo(() => {
    if (!selectedEnrollment) return null;
    return getPlanMeta(selectedEnrollment, plansByKey);
  }, [plansByKey, selectedEnrollment]);

  const stats = useMemo(() => {
    const totalUsers = rows.length;
    const paidUsers = rows.filter((row) => getNormalizedStatus(row) === "active").length;
    const freeUsers = rows.filter((row) => getNormalizedStatus(row) === "free").length;
    const flaggedUsers = rows.filter((row) => {
      const status = getNormalizedStatus(row);
      return status === "pending" || status === "expired" || status === "refunded" || status === "canceled" || status === "revoked" || status === "unknown";
    }).length;

    return { totalUsers, paidUsers, freeUsers, flaggedUsers };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#081225]/90 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Total Users</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.totalUsers}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/60">Active Paid</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{stats.paidUsers}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Free Users</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.freeUsers}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/15 bg-amber-500/5 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200/60">Needs Attention</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{stats.flaggedUsers}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/70">
            {loading
              ? "Loading user enrollments..."
              : `${rows.length} user${rows.length !== 1 ? "s" : ""} in monitoring`}
          </p>

          {errorMessage ? (
            <p className="mt-1 break-words text-sm text-red-400">{errorMessage}</p>
          ) : (
            <p className="mt-1 text-sm text-white/45">
              Monitoring only. Google Play handles payment approval.
            </p>
          )}
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
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          No users found.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((record) => {
            const statusMeta = getStatusMeta(record);
            const StatusIcon = statusMeta.icon;
            const planMeta = getPlanMeta(record, plansByKey);
            const status = getNormalizedStatus(record);

            return (
              <div
                key={`${record.user_id || "no-user"}-${record.enrollmentId || "no-enrollment"}`}
                className="rounded-2xl border border-white/10 bg-[#081225]/90 px-5 py-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold text-white">
                      {getDisplayName(record)}
                    </p>

                    <p className="break-words text-sm text-white/60">
                      {getDisplayEmail(record)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                        {planMeta.label}
                      </span>
                      <span className="text-sm text-white/70">
                        {getAmountDisplay(record, planMeta)}
                      </span>
                      <span className="text-xs text-white/40">
                        {status === "free"
                          ? "No paid enrollment"
                          : `Product: ${getGoogleProductId(record)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusMeta.classes}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusMeta.label}
                    </span>

                    <Button
                      onClick={() => {
                        setSelectedEnrollment(record);
                        setReviewOpen(true);
                      }}
                      className="border border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
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
        <DialogContent className="max-w-5xl border-white/10 bg-[#07101f] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Enrollment Monitoring
            </DialogTitle>
          </DialogHeader>

          {selectedEnrollment ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-4 text-sm font-semibold text-white/85">
                      User Information
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 h-4 w-4 text-white/45" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Email
                          </p>
                          <p className="break-all text-sm text-white">
                            {getDisplayEmail(selectedEnrollment)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Plan
                          </p>
                          <p className="text-sm text-white">
                            {selectedPlanMeta?.label || "Basic"}
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
                          <p className="text-sm text-white">
                            {getStatusMeta(selectedEnrollment).label}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm font-semibold text-white/85">
                        Plan Overview
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        {selectedPlanMeta?.label || "Basic"}
                      </span>
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                        {selectedPlanMeta?.badge || "Free"}
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-4 text-sm font-semibold text-white/85">
                      Google Play Record
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Package className="mt-0.5 h-4 w-4 text-white/45" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Product ID
                          </p>
                          <p className="break-all text-sm text-white">
                            {getGoogleProductId(selectedEnrollment)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <KeyRound className="mt-0.5 h-4 w-4 text-white/45" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Purchase Token
                          </p>
                          <p className="break-all text-sm text-white">
                            {maskToken(getPurchaseToken(selectedEnrollment))}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CalendarClock className="mt-0.5 h-4 w-4 text-white/45" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Purchase Date
                          </p>
                          <p className="text-sm text-white">
                            {formatDateTime(getPurchaseDate(selectedEnrollment))}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CreditCard className="mt-0.5 h-4 w-4 text-white/45" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">
                            Expiry Date
                          </p>
                          <p className="text-sm text-white">
                            {formatDateTime(getExpiryDate(selectedEnrollment))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-3 text-sm font-semibold text-white/85">
                      Admin Controls
                    </p>

                    <div className="grid gap-3">
                      <Button
                        onClick={() => syncStatus(selectedEnrollment)}
                        disabled={Boolean(actionLoading)}
                        className="bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                      >
                        {actionLoading === `sync-${selectedEnrollment.user_id || selectedEnrollment.enrollmentId}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sync Status
                      </Button>

                      <Button
                        onClick={() => revokeAccess(selectedEnrollment)}
                        disabled={Boolean(actionLoading)}
                        className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        {actionLoading === `revoke-${selectedEnrollment.user_id || selectedEnrollment.enrollmentId}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldOff className="mr-2 h-4 w-4" />
                        )}
                        Revoke Access
                      </Button>

                      <Button
                        onClick={() => resetEnrollment(selectedEnrollment)}
                        disabled={Boolean(actionLoading)}
                        className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                      >
                        {actionLoading === `reset-${selectedEnrollment.user_id || selectedEnrollment.enrollmentId}` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Reset Enrollment
                      </Button>

                      <Button
                        onClick={() => {
                          setReviewOpen(false);
                          setSelectedEnrollment(null);
                        }}
                        disabled={Boolean(actionLoading)}
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                      >
                        Close
                      </Button>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/55">
                      Sync Status tries to refresh the Google Play enrollment record if a backend sync function exists.
                      Revoke Access disables CLARA access immediately.
                      Reset Enrollment removes enrollment records for testing and resets the profile back to free state.
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
