import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Upload,
  XCircle,
  Clock3,
  ShieldCheck,
  Sparkles,
  CreditCard,
  RefreshCcw,
  ArrowLeft,
  Info,
  FileImage,
  Star,
  Target,
  Gem,
  BadgeCheck,
  Wallet,
  Landmark,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";

const STATUS_META = {
  pending: {
    title: "Payment Under Review",
    subtitle: "Your payment proof has been submitted successfully.",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "from-yellow-500/10 to-transparent",
    icon: Clock3,
  },
  under_review: {
    title: "Payment Under Review",
    subtitle: "Your payment proof is currently being checked by admin.",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "from-yellow-500/10 to-transparent",
    icon: Clock3,
  },
  payment_pending: {
    title: "Payment Pending Review",
    subtitle: "We received your submission and it is waiting for verification.",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "from-yellow-500/10 to-transparent",
    icon: Clock3,
  },
  rejected: {
    title: "Payment Not Approved",
    subtitle:
      "Your payment proof was not approved. You may resubmit your proof or choose another tier before submitting again.",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "from-red-500/10 to-transparent",
    icon: XCircle,
  },
  resubmit_required: {
    title: "Resubmission Required",
    subtitle:
      "Your proof needs to be replaced with a clearer or more complete screenshot. You may also return to tier selection before resubmitting.",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "from-red-500/10 to-transparent",
    icon: RefreshCcw,
  },
  approved: {
    title: "Approved",
    subtitle: "Your enrollment is approved. Redirecting you now...",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "from-emerald-500/10 to-transparent",
    icon: CheckCircle2,
  },
  active: {
    title: "Active",
    subtitle: "Your enrollment is active. Redirecting you now...",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "from-emerald-500/10 to-transparent",
    icon: CheckCircle2,
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function formatPeso(value) {
  const num = Number(value || 0);
  return `₱${num.toLocaleString("en-PH")}`;
}

function normalizeFeatures(features) {
  if (Array.isArray(features)) {
    return features.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof features === "string") {
    return features
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePlanRecord(row) {
  const key = normalizeKey(row?.plan_key || row?.key || row?.name);

  return {
    id: row?.id ?? null,
    key,
    name: normalizeText(row?.name) || key.toUpperCase(),
    price: Number(row?.price || 0),
    badge: row?.popular ? "Most Popular" : "Plan",
    description: normalizeText(row?.description),
    benefits: normalizeFeatures(row?.features),
    ctaLabel: normalizeText(row?.cta_label),
    active: !!row?.active,
    popular: !!row?.popular,
    sortOrder: Number(row?.sort_order ?? 9999),
  };
}

function pickTierIcon(planKey) {
  if (planKey === "diy" || planKey === "basic") return Star;
  if (planKey === "diwm" || planKey === "transformation") return Target;
  if (planKey === "ldit" || planKey === "elite") return Gem;
  return Sparkles;
}

function getPlanKeyFromEnrollment(enrollment, searchParams) {
  const candidates = [
    enrollment?.plan,
    enrollment?.plan_key,
    enrollment?.tier,
    enrollment?.selected_plan,
    searchParams.get("plan"),
  ];

  for (const item of candidates) {
    const normalized = normalizeKey(item);
    if (normalized) return normalized;
  }

  return "";
}

export default function Enroll() {
  const { user } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);

  const [plans, setPlans] = useState([]);
  const [enrollment, setEnrollment] = useState(null);

  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showReplaceUploader, setShowReplaceUploader] = useState(false);
  const [manualTierEdit, setManualTierEdit] = useState(false);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  }, [plans]);

  const activePlans = useMemo(() => {
    return sortedPlans.filter((plan) => plan.active);
  }, [sortedPlans]);

  const enrollmentPlanKey = useMemo(() => {
    return getPlanKeyFromEnrollment(enrollment, searchParams);
  }, [enrollment, searchParams]);

  const selectedPlanKey = useMemo(() => {
    if (manualTierEdit) {
      return normalizeKey(searchParams.get("plan"));
    }
    return enrollment ? enrollmentPlanKey : normalizeKey(searchParams.get("plan"));
  }, [manualTierEdit, enrollment, enrollmentPlanKey, searchParams]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanKey) return null;
    return (
      plans.find((plan) => normalizeKey(plan.key) === normalizeKey(selectedPlanKey)) || null
    );
  }, [plans, selectedPlanKey]);

  const currentStatus = normalizeKey(enrollment?.status);
  const statusMeta = STATUS_META[currentStatus] || null;
  const isFreshFreeProfile = useMemo(() => {
    const profile = user?.profile;
    if (!profile) return false;

    return (
      normalizeKey(profile.role || "free_user") !== "paid_user" &&
      normalizeKey(profile.plan || "free") === "free" &&
      normalizeKey(profile.enrollment_status || "none") === "none" &&
      profile.is_enrolled !== true &&
      profile.program_active !== true
    );
  }, [user?.profile]);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch plans:", error);
      throw error;
    }

    const normalized = (data || []).map(normalizePlanRecord);
    setPlans(normalized);
  }, []);

  const fetchEnrollment = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch enrollment:", error);
      throw error;
    }

    const nextEnrollment = data || null;

    if (isFreshFreeProfile) {
      setEnrollment(null);
      return;
    }

    setEnrollment(nextEnrollment);
  }, [isFreshFreeProfile, user?.id]);

  const loadInitialData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setPlansLoading(false);
      return;
    }

    setLoading(true);
    setPlansLoading(true);

    try {
      await Promise.all([fetchPlans(), fetchEnrollment()]);
    } catch (error) {
      console.error("Failed to load enrollment page:", error);
    } finally {
      setLoading(false);
      setPlansLoading(false);
    }
  }, [fetchEnrollment, fetchPlans, user?.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview("");
      return;
    }

    if (proofFile.type?.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(proofFile);
      setProofPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setProofPreview("");
  }, [proofFile]);

  useEffect(() => {
    if (!currentStatus) return;

    if (["approved", "active"].includes(currentStatus)) {
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [currentStatus, navigate]);

  useEffect(() => {
    if (enrollment && !manualTierEdit) {
      const currentPlanKey = normalizeKey(searchParams.get("plan"));
      const next = new URLSearchParams(searchParams);
      const liveKey =
        normalizeKey(enrollment?.plan_key) ||
        normalizeKey(enrollment?.plan) ||
        normalizeKey(enrollment?.tier) ||
        "";
      if (liveKey && currentPlanKey !== liveKey) {
        next.set("plan", liveKey);
        setSearchParams(next, { replace: true });
      }
    }
  }, [enrollment, manualTierEdit, searchParams, setSearchParams]);

  async function refreshEnrollment() {
    await fetchEnrollment();
  }

  function handlePlanSelect(planKey) {
    const next = new URLSearchParams(searchParams);
    next.set("plan", normalizeKey(planKey));
    setSearchParams(next);
    setManualTierEdit(true);
    setUploadError("");
  }

  function handleChangeTierMode() {
    setManualTierEdit(true);
    const next = new URLSearchParams(searchParams);
    next.delete("plan");
    setSearchParams(next);
  }

  function cancelChangeTierMode() {
    setManualTierEdit(false);
    const next = new URLSearchParams(searchParams);
    const originalKey =
      normalizeKey(enrollment?.plan_key) || normalizeKey(enrollment?.plan) || "";
    if (originalKey) {
      next.set("plan", originalKey);
    } else {
      next.delete("plan");
    }
    setSearchParams(next);
    setUploadError("");
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setProofFile(file);
    setUploadError("");
  }

  async function uploadProofAndGetUrl(file) {
    const originalName = String(file?.name || "proof");
    const ext = originalName.includes(".") ? originalName.split(".").pop() : "jpg";
    const safeExt = normalizeKey(ext || "jpg") || "jpg";
    const fileName = `${user.id}_${Date.now()}.${safeExt}`;
    const path = `payment_proofs/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("payment-proofs")
      .upload(path, file, { upsert: false });

    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
    return data?.publicUrl || "";
  }

  async function handleSubmit() {
    if (!user?.id) return;

    if (!proofFile) {
      setUploadError("Please upload your proof of payment first.");
      return;
    }

    const effectivePlanKey =
      normalizeKey(selectedPlanKey) ||
      normalizeKey(enrollment?.plan_key) ||
      normalizeKey(enrollment?.plan) ||
      "";

    if (!effectivePlanKey) {
      setUploadError("Please choose a plan first.");
      return;
    }

    setSubmitting(true);
    setUploadError("");

    try {
      const paymentProofUrl = await uploadProofAndGetUrl(proofFile);

      if (enrollment) {
        const { error } = await supabase
          .from("enrollments")
          .update({
            payment_proof_url: paymentProofUrl,
            status: "pending",
            plan: effectivePlanKey,
            plan_key: effectivePlanKey,
          })
          .eq("id", enrollment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("enrollments").insert([
          {
            user_id: user.id,
            payment_proof_url: paymentProofUrl,
            status: "pending",
            plan: effectivePlanKey,
            plan_key: effectivePlanKey,
          },
        ]);

        if (error) throw error;
      }

      setProofFile(null);
      setProofPreview("");
      setShowReplaceUploader(false);
      setManualTierEdit(false);
      await refreshEnrollment();
    } catch (err) {
      console.error(err);
      setUploadError(err?.message || "Something went wrong while submitting your proof.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(String(value || ""));
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  function renderPlanSelector() {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-white">Choose Your Plan</h2>
            <p className="mt-2 text-sm text-white/65">
              Select a tier first so the user clearly sees what they are enrolling in.
            </p>
          </div>

          {enrollment && manualTierEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={cancelChangeTierMode}
              className="h-10 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              Cancel Tier Change
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {activePlans.map((plan) => {
            const active = normalizeKey(selectedPlanKey) === normalizeKey(plan.key);

            return (
              <button
                key={plan.id || plan.key}
                type="button"
                onClick={() => handlePlanSelect(plan.key)}
                className={`w-full rounded-3xl border text-left transition-all duration-200 p-5 ${
                  active
                    ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>

                      {plan.popular ? (
                        <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">
                          Most Popular
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-white/70">
                      {plan.description || "Choose this plan to continue your CLARA journey."}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{formatPeso(plan.price)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSelectedTierOverview() {
    if (!selectedPlan) return null;

    const TierIcon = pickTierIcon(selectedPlan.key);

    return (
      <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent p-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
              <TierIcon className="h-6 w-6 text-emerald-300" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-white">{selectedPlan.name}</h2>

                {selectedPlan.popular ? (
                  <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">
                    Most Popular
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    Active Plan
                  </span>
                )}
              </div>

              <p className="mt-2 text-base font-medium text-emerald-200">
                {selectedPlan.description || "This is the plan currently selected for your enrollment."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Tier Price</p>
            <p className="text-2xl font-bold text-white">{formatPeso(selectedPlan.price)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/80">
                What’s Included
              </h3>
            </div>

            <div className="space-y-2">
              {selectedPlan.benefits.length > 0 ? (
                selectedPlan.benefits.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-white/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-2 text-sm text-white/60">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Plan features will appear here once added from admin.</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-yellow-300" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/80">
                Enrollment Details
              </h3>
            </div>

            <div className="space-y-3 text-sm text-white/80">
              <div className="flex items-start gap-2">
                <BadgeCheck className="mt-0.5 h-4 w-4 text-cyan-300 shrink-0" />
                <span>
                  Plan key: <span className="font-semibold text-white">{selectedPlan.key}</span>
                </span>
              </div>

              <div className="flex items-start gap-2">
                <CreditCard className="mt-0.5 h-4 w-4 text-cyan-300 shrink-0" />
                <span>
                  CTA label:{" "}
                  <span className="font-semibold text-white">
                    {selectedPlan.ctaLabel || "Not set"}
                  </span>
                </span>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-300 shrink-0" />
                <span>
                  Status:{" "}
                  <span className="font-semibold text-white">
                    {selectedPlan.active ? "Active" : "Inactive"}
                  </span>
                </span>
              </div>

              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300 shrink-0" />
                <span>
                  Popular flag:{" "}
                  <span className="font-semibold text-white">
                    {selectedPlan.popular ? "Yes" : "No"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStatusCard() {
    if (!statusMeta) return null;

    const Icon = statusMeta.icon;

    return (
      <div
        className={`rounded-3xl border ${statusMeta.border} bg-gradient-to-br ${statusMeta.bg} p-5 backdrop-blur-xl`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
            <Icon className={`h-7 w-7 ${statusMeta.color}`} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{statusMeta.title}</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">
                {currentStatus.replace(/_/g, " ")}
              </span>
            </div>

            <p className="mt-2 text-sm text-white/70">{statusMeta.subtitle}</p>

            {enrollment?.admin_notes ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Admin Notes</p>
                <p className="mt-2 text-sm text-white/80">{enrollment.admin_notes}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  function renderPaymentMethods() {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15">
            <CreditCard className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Payment Methods</h3>
            <p className="text-sm text-white/60">
              Send your payment first, then upload a clear screenshot as proof.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-300" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/85">
                GCash
              </h4>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-white/50 text-xs uppercase tracking-[0.14em]">Account Name</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">Jerome Mirabuenos</p>
                  <button
                    type="button"
                    onClick={() => copyText("Jerome Mirabuenos")}
                    className="inline-flex items-center gap-1 text-white/60 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-white/50 text-xs uppercase tracking-[0.14em]">GCash Number</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">09858410403</p>
                  <button
                    type="button"
                    onClick={() => copyText("09858410403")}
                    className="inline-flex items-center gap-1 text-white/60 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-yellow-300" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/85">
                Security Bank
              </h4>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-white/50 text-xs uppercase tracking-[0.14em]">Account Name</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">Jerome Mirabuenos</p>
                  <button
                    type="button"
                    onClick={() => copyText("Jerome Mirabuenos")}
                    className="inline-flex items-center gap-1 text-white/60 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-white/50 text-xs uppercase tracking-[0.14em]">Account Number</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">000-006-704-2019</p>
                  <button
                    type="button"
                    onClick={() => copyText("000-006-704-2019")}
                    className="inline-flex items-center gap-1 text-white/60 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/50">Important</p>
          <p className="mt-2 text-sm text-white/75">
            Make sure the uploaded screenshot clearly shows the sender, amount, and reference or
            transaction details so admin can verify it faster.
          </p>
        </div>
      </div>
    );
  }

  function renderCurrentProof() {
    if (!enrollment?.payment_proof_url) return null;

    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white">Current Submitted Proof</h3>
            <p className="text-sm text-white/60">
              This is the screenshot currently attached to your enrollment.
            </p>
          </div>

          <a
            href={enrollment.payment_proof_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            <FileImage className="h-4 w-4" />
            Open Current Proof
          </a>
        </div>
      </div>
    );
  }

  function renderUploadBox({ isResubmit = false } = {}) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15">
            <Upload className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {isResubmit ? "Re-upload Payment Proof" : "Upload Payment Proof"}
            </h3>
            <p className="text-sm text-white/60">
              Upload a clear screenshot of your payment confirmation.
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center transition hover:border-emerald-400/40 hover:bg-white/5">
          <FileImage className="mb-3 h-8 w-8 text-white/50" />
          <span className="text-sm font-medium text-white">
            {proofFile ? proofFile.name : "Click to choose image or proof file"}
          </span>
          <span className="mt-1 text-xs text-white/50">
            Best if the amount, sender, and transaction details are clearly visible
          </span>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {proofPreview ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <img
              src={proofPreview}
              alt="Proof preview"
              className="max-h-[320px] w-full object-contain bg-black/30"
            />
          </div>
        ) : null}

        {proofFile && !proofPreview && proofFile.type === "application/pdf" ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            PDF selected: <span className="font-medium text-white">{proofFile.name}</span>
          </div>
        ) : null}

        {uploadError ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {uploadError}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !proofFile}
            className="h-11 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600"
          >
            {submitting
              ? isResubmit
                ? "Resubmitting..."
                : "Submitting..."
              : isResubmit
              ? "Resubmit Proof"
              : "Submit Proof"}
          </Button>

          {proofFile ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProofFile(null);
                setProofPreview("");
                setUploadError("");
              }}
              className="h-11 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              Remove Selected File
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (loading || plansLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl">
          <p className="text-sm text-white/70">Loading your enrollment...</p>
        </div>
      </div>
    );
  }

  const hasEnrollment = !!enrollment;
  const isRejectedState = ["rejected", "resubmit_required"].includes(currentStatus);
  const isPendingState = ["pending", "under_review", "payment_pending"].includes(currentStatus);
  const allowTierChange = isRejectedState;
  const showPlanChooser = !hasEnrollment || allowTierChange || manualTierEdit;
  const effectivePlanExists = !!selectedPlan;

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.4),_rgba(2,6,23,1))]" />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-10 rounded-2xl border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
            CLARA Enrollment
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                Secure Enrollment
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Review your selected tier, payment status, and next steps
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base">
                Users see the live admin plan info, the available payment methods, and can
                resubmit or change tier if the payment gets rejected.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">Enrollment</p>
                  <p className="text-sm font-semibold text-white">
                    {selectedPlan?.name || "No tier selected yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {statusMeta ? <div className="mb-5">{renderStatusCard()}</div> : null}

        {allowTierChange ? (
          <div className="mb-5 rounded-3xl border border-yellow-400/20 bg-yellow-500/5 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-white">Choose Another Tier</h3>
                <p className="mt-2 text-sm text-white/70">
                  Since the payment was rejected, the user can now switch to another plan before
                  uploading a new proof of payment.
                </p>
              </div>

              {!manualTierEdit ? (
                <Button
                  type="button"
                  onClick={handleChangeTierMode}
                  className="h-11 rounded-2xl bg-yellow-400 text-black hover:bg-yellow-300"
                >
                  Change Tier
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelChangeTierMode}
                  className="h-11 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  Keep Current Tier
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {showPlanChooser ? <div className="mb-5">{renderPlanSelector()}</div> : null}

        {effectivePlanExists ? <div className="mb-5">{renderSelectedTierOverview()}</div> : null}

        {renderPaymentMethods()}

        {hasEnrollment ? (
          <div className="mt-5 space-y-5">
            {renderCurrentProof()}

            {isPendingState ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-base font-semibold text-white">What Happens Next</h3>

                    <div className="mt-3 space-y-2 text-sm text-white/75">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Admin reviews the screenshot you submitted.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                        <span>If approved, your program access will unlock automatically.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                        <span>If there is an issue, your status can be updated to resubmit.</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReplaceUploader((prev) => !prev)}
                    className="h-11 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {showReplaceUploader ? "Hide Re-upload" : "Replace Proof"}
                  </Button>
                </div>

                {showReplaceUploader ? (
                  <div className="mt-5">{renderUploadBox({ isResubmit: true })}</div>
                ) : null}
              </div>
            ) : null}

            {isRejectedState ? renderUploadBox({ isResubmit: true }) : null}
          </div>
        ) : (
          effectivePlanExists && <div className="mt-5">{renderUploadBox()}</div>
        )}

        {!hasEnrollment && !effectivePlanExists && activePlans.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 backdrop-blur-xl">
            No active plans found yet. Please activate at least one plan from admin.
          </div>
        ) : null}
      </div>
    </div>
  );
}
