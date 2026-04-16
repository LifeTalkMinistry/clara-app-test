import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Gem,
  Lock,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import {
  normalizePlanKey,
  PLAN_LABELS,
  sanitizePlanRow,
} from "@/lib/plan-config";
import {
  getGooglePlayProductId,
  launchGooglePlayPurchase,
  persistGooglePlayPurchase,
  waitForGooglePlayEntitlement,
} from "@/lib/google-play-billing";

const PLAN_UI_META = {
  entry: {
    label: "Entry",
    eyebrow: "Starter Access",
    badge: "Best for starting",
    statement: "Unlock your CLARA tools and begin with a guided starter path.",
    points: [
      "Full financial tools",
      "Starter program access",
      "Clear first steps",
      "A real guided beginning",
    ],
    accent: "from-cyan-400/22 via-sky-400/10 to-transparent",
    border: "border-cyan-400/20",
    button: "Unlock with Google Play",
    successTitle: "Entry unlocked",
    successBody: "Your starter path is ready. Open CLARA and begin your first guided steps.",
    successCta: "Start Starter Program",
    icon: Star,
  },
  core: {
    label: "Core",
    eyebrow: "Full 30-Day Reset",
    badge: "Most popular",
    statement: "Unlock the full guided system and move through CLARA one intentional day at a time.",
    points: [
      "Full 30-day guided system",
      "Daily task progression",
      "Reflection flow",
      "Best value for serious structure",
    ],
    accent: "from-emerald-400/22 via-teal-400/10 to-transparent",
    border: "border-emerald-400/20",
    button: "Buy with Google Play",
    successTitle: "Core unlocked",
    successBody: "Your full guided system is active. Day 1 is ready whenever you are.",
    successCta: "Open Program",
    icon: Target,
  },
  coaching: {
    label: "Coaching",
    eyebrow: "Personal Guidance",
    badge: "Premium support",
    statement: "Unlock the full system plus a deeper layer of personal guidance and accountability.",
    points: [
      "Full 30-day guided system",
      "Premium coaching layer",
      "Deeper support surfaces",
      "Built for real intervention and accountability",
    ],
    accent: "from-amber-400/22 via-orange-400/10 to-transparent",
    border: "border-amber-400/20",
    button: "Unlock with Google Play",
    successTitle: "Coaching unlocked",
    successBody: "Your guided system and coaching layer are active. Open the journey and review your support surfaces.",
    successCta: "View Coaching Journey",
    icon: Gem,
  },
};

const SUCCESS_STATUSES = new Set(["approved", "active"]);
const PENDING_STATUSES = new Set([
  "pending",
  "under_review",
  "payment_pending",
  "google_play_pending",
  "google_play_processing",
  "purchase_pending",
  "purchase_processing",
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function formatPeso(value) {
  const num = Number(value || 0);
  return `PHP ${num.toLocaleString("en-PH")}`;
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
  const normalizedRow = sanitizePlanRow(row);
  const key = normalizePlanKey(normalizedRow.plan_key || normalizedRow.key || normalizedRow.name);
  const ui = PLAN_UI_META[key] || null;

  return {
    id: normalizedRow?.id ?? null,
    key,
    name: ui?.label || PLAN_LABELS[key] || normalizeText(normalizedRow?.name) || key.toUpperCase(),
    price: Number(normalizedRow?.price || 0),
    badge: ui?.badge || (normalizedRow?.popular ? "Most Popular" : "Plan"),
    eyebrow: ui?.eyebrow || "Unlock CLARA",
    statement: ui?.statement || normalizeText(normalizedRow?.description),
    description: normalizeText(normalizedRow?.description),
    benefits: normalizeFeatures(normalizedRow?.features),
    ctaLabel: normalizeText(normalizedRow?.cta_label) || ui?.button || "Buy with Google Play",
    active: !!normalizedRow?.active,
    popular: !!normalizedRow?.popular || ui?.badge === "Most popular",
    sortOrder: Number(normalizedRow?.sort_order ?? 9999),
    accent: ui?.accent || "from-white/10 to-transparent",
    border: ui?.border || "border-white/10",
    successTitle: ui?.successTitle || "Plan unlocked",
    successBody:
      ui?.successBody || "Your purchase is complete and your CLARA access is ready.",
    successCta: ui?.successCta || "Open CLARA",
    productId: getGooglePlayProductId(key),
    icon: ui?.icon || Sparkles,
    displayBenefits:
      normalizeFeatures(normalizedRow?.features).length > 0 ? normalizeFeatures(normalizedRow?.features) : ui?.points || [],
  };
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

function getSuccessDestination(planKey) {
  const normalized = normalizeKey(planKey);
  if (normalized === "entry") return "/program-onboarding";
  if (normalized === "coaching") return "/tasks";
  return "/tasks";
}

function SelectionCard({ plan, selected, onSelect }) {
  const Icon = plan.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      className={`w-full rounded-[28px] border p-5 text-left transition-all duration-200 ${
        selected
          ? `${plan.border} bg-white/[0.08] shadow-[0_18px_36px_rgba(0,0,0,0.22)]`
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
            <Icon className="h-3.5 w-3.5" />
            {plan.eyebrow}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {plan.badge}
            </span>
          </div>

          <p className="mt-3 text-sm leading-7 text-white/72">{plan.statement}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">One-time</p>
          <p className="mt-1 text-xl font-semibold text-white">{formatPeso(plan.price)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {plan.displayBenefits.slice(0, 3).map((item, index) => (
          <div key={`${plan.key}-${index}`} className="flex items-start gap-2 text-sm text-white/75">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

export default function Enroll() {
  const { user, refreshUser } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [purchaseState, setPurchaseState] = useState("idle");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [activePurchasePlan, setActivePurchasePlan] = useState("");

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    const normalized = (data || [])
      .map(normalizePlanRecord)
      .filter((plan) => plan.active && plan.productId && PLAN_UI_META[plan.key]);

    setPlans(normalized);
  }, []);

  const fetchEnrollment = useCallback(async () => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    setEnrollment(data || null);
    return data || null;
  }, [user?.id]);

  const loadInitialData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await Promise.all([fetchPlans(), fetchEnrollment()]);
    } catch (error) {
      console.error("Failed to load Google Play purchase flow:", error);
      toast.error("Could not load plans right now.");
    } finally {
      setLoading(false);
    }
  }, [fetchEnrollment, fetchPlans, user?.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const currentStatus = normalizeKey(enrollment?.status);
  const enrollmentPlanKey = useMemo(
    () => getPlanKeyFromEnrollment(enrollment, searchParams),
    [enrollment, searchParams]
  );

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
  }, [plans]);

  const selectedPlanKey = normalizeKey(searchParams.get("plan") || enrollmentPlanKey);
  const view = searchParams.get("view") || (selectedPlanKey ? "detail" : "select");

  const selectedPlan = useMemo(() => {
    return sortedPlans.find((plan) => normalizeKey(plan.key) === selectedPlanKey) || null;
  }, [selectedPlanKey, sortedPlans]);

  const unlockedPlan = useMemo(() => {
    if (!SUCCESS_STATUSES.has(currentStatus)) return null;
    return sortedPlans.find((plan) => normalizeKey(plan.key) === enrollmentPlanKey) || selectedPlan;
  }, [currentStatus, enrollmentPlanKey, selectedPlan, sortedPlans]);

  const purchaseStatusMeta = useMemo(() => {
    if (purchaseState === "processing") {
      return {
        title: "Opening Google Play",
        body: "Confirm your purchase in Google Play to continue.",
      };
    }

    if (purchaseState === "verifying") {
      return {
        title: "Unlocking your access",
        body: "Your purchase was received. We are syncing your entitlement now.",
      };
    }

    if (purchaseState === "pending") {
      return {
        title: "Purchase received",
        body: "Google Play completed the purchase. Your access is still syncing in the background.",
      };
    }

    return null;
  }, [purchaseState]);

  const showSuccess = purchaseState === "success" || Boolean(unlockedPlan);
  const showProcessing = Boolean(purchaseStatusMeta);

  function updateSearch(nextPlan, nextView = "detail") {
    const next = new URLSearchParams(searchParams);

    if (nextPlan) next.set("plan", normalizeKey(nextPlan));
    else next.delete("plan");

    if (nextView) next.set("view", nextView);
    else next.delete("view");

    setSearchParams(next, { replace: true });
  }

  function handlePlanSelect(planKey) {
    updateSearch(planKey, "detail");
  }

  async function handlePurchase(plan) {
    if (!user?.id || !plan) return;

    try {
      setActivePurchasePlan(plan.key);
      setPurchaseState("processing");
      setPurchaseMessage("");

      const purchase = await launchGooglePlayPurchase({
        productId: plan.productId,
        planKey: plan.key,
        userId: user.id,
        userEmail: user.email,
      });

      if (purchase.cancelled) {
        setPurchaseState("idle");
        setActivePurchasePlan("");
        toast.message("Purchase cancelled");
        return;
      }

      if (!purchase.ok) {
        throw new Error("Google Play did not confirm the purchase.");
      }

      setPurchaseState("verifying");

      await persistGooglePlayPurchase({
        supabase,
        userId: user.id,
        planKey: plan.key,
        productId: plan.productId,
        purchaseToken: purchase.purchaseToken,
        orderId: purchase.orderId,
        bridgePayload: purchase.raw,
      });

      const entitlement = await waitForGooglePlayEntitlement({
        supabase,
        userId: user.id,
        expectedPlanKey: plan.key,
      });

      await fetchEnrollment();
      await refreshUser?.();

      if (entitlement.status === "active") {
        setPurchaseState("success");
        setPurchaseMessage(plan.successBody);
        toast.success(`${plan.name} unlocked`);
        return;
      }

      setPurchaseState("pending");
      setPurchaseMessage(
        "Your purchase is complete. Access is still syncing and should unlock shortly."
      );
    } catch (error) {
      console.error("Google Play purchase failed:", error);
      setPurchaseState("idle");
      setPurchaseMessage("");
      toast.error(error.message || "Could not complete purchase.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl">
            <p className="text-sm text-white/70">Loading plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.42),_rgba(2,6,23,1))]" />

      <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (view === "detail" && !showProcessing && !showSuccess) {
                updateSearch("", "select");
                return;
              }
              navigate(-1);
            }}
            className="h-10 rounded-2xl border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            {view === "detail" && !showProcessing && !showSuccess ? (
              <ChevronLeft className="mr-2 h-4 w-4" />
            ) : (
              <ArrowLeft className="mr-2 h-4 w-4" />
            )}
            {view === "detail" && !showProcessing && !showSuccess ? "Plans" : "Back"}
          </Button>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
            Google Play Unlock
          </div>
        </div>

        {!showSuccess && !showProcessing && (
          <div className="mb-6 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                  CLARA Plans
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Choose your next level with less friction
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                  Pick Entry, Core, or Coaching, review one focused plan page, and unlock through Google Play without the old proof-upload flow.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50">Purchase flow</p>
                    <p className="text-sm font-semibold text-white">Google Play one-time unlock</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSuccess ? (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-[32px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(8,16,31,0.98)_0%,rgba(9,34,46,0.96)_52%,rgba(16,73,58,0.9)_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.24)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/15 text-emerald-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                Purchase complete
              </p>
              <h2 className="mt-2 text-center text-3xl font-semibold text-white">
                {(unlockedPlan || selectedPlan)?.successTitle || "Access unlocked"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-white/75">
                {purchaseMessage ||
                  (unlockedPlan || selectedPlan)?.successBody ||
                  "Your CLARA access is ready."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {(unlockedPlan || selectedPlan)?.displayBenefits.slice(0, 3).map((item, index) => (
                  <div
                    key={`success-benefit-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/78"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1 h-12 rounded-2xl"
                onClick={() => navigate(getSuccessDestination((unlockedPlan || selectedPlan)?.key))}
              >
                {(unlockedPlan || selectedPlan)?.successCta || "Open CLARA"}
              </Button>

              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        ) : showProcessing ? (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10">
                {purchaseState === "pending" ? (
                  <Clock3 className="h-6 w-6 text-amber-300" />
                ) : (
                  <Zap className="h-6 w-6 text-emerald-300" />
                )}
              </div>

              <h2 className="mt-5 text-center text-2xl font-semibold text-white">
                {purchaseStatusMeta?.title}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-white/72">
                {purchaseMessage || purchaseStatusMeta?.body}
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Selected plan</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {sortedPlans.find((plan) => plan.key === activePurchasePlan)?.name || "CLARA plan"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1 h-12 rounded-2xl"
                onClick={async () => {
                  await fetchEnrollment();
                  await refreshUser?.();
                }}
              >
                Refresh access
              </Button>

              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                Return to dashboard
              </Button>
            </div>
          </div>
        ) : view === "detail" && selectedPlan ? (
          <div className="mx-auto max-w-3xl">
            <div className={`rounded-[32px] border ${selectedPlan.border} bg-white/[0.04] shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-2xl`}>
              <div className={`rounded-t-[32px] bg-gradient-to-br ${selectedPlan.accent} p-6`}>
                {(() => {
                  const SelectedIcon = selectedPlan.icon;
                  return (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  <SelectedIcon className="h-3.5 w-3.5" />
                  {selectedPlan.eyebrow}
                </div>
                  );
                })()}

                <div className="mt-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-3xl font-semibold text-white">{selectedPlan.name}</h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        {selectedPlan.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/74">{selectedPlan.statement}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">One-time unlock</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{formatPeso(selectedPlan.price)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">What's included</p>
                  <div className="mt-4 space-y-3">
                    {selectedPlan.displayBenefits.map((item, index) => (
                      <div key={`benefit-${index}`} className="flex items-start gap-3 text-sm text-white/78">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Purchase method</p>
                    <p className="mt-2 text-sm font-semibold text-white">Google Play Billing</p>
                    <p className="mt-2 text-sm leading-7 text-white/68">
                      Fast one-time unlock handled through Google Play. No proof upload. No manual review form.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">After purchase</p>
                    <p className="mt-2 text-sm font-semibold text-white">Immediate guided handoff</p>
                    <p className="mt-2 text-sm leading-7 text-white/68">
                      Once entitlement sync completes, CLARA will route you to the right next step for this plan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-4 mt-5 rounded-[28px] border border-white/10 bg-[#07111d]/92 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Selected plan</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedPlan.name} • {formatPeso(selectedPlan.price)}
                  </p>
                </div>

                <Button
                  className="h-12 rounded-2xl px-5"
                  onClick={() => handlePurchase(selectedPlan)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {selectedPlan.ctaLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentStatus && !showSuccess ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    {PENDING_STATUSES.has(currentStatus) ? (
                      <Clock3 className="h-5 w-5 text-amber-300" />
                    ) : SUCCESS_STATUSES.has(currentStatus) ? (
                      <BadgeCheck className="h-5 w-5 text-emerald-300" />
                    ) : (
                      <Lock className="h-5 w-5 text-white/60" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {PENDING_STATUSES.has(currentStatus)
                        ? "Purchase sync is still in progress"
                        : "Previous enrollment found"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/68">
                      {PENDING_STATUSES.has(currentStatus)
                        ? "If a recent Google Play purchase is still syncing, you can refresh access below or choose a plan to review again."
                        : "Your account has an existing enrollment record. You can still review the available plans and continue with the cleaner Google Play unlock flow."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              {sortedPlans.map((plan) => (
                <SelectionCard
                  key={plan.id || plan.key}
                  plan={plan}
                  selected={plan.key === selectedPlanKey}
                  onSelect={handlePlanSelect}
                />
              ))}
            </div>

            {sortedPlans.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 backdrop-blur-xl">
                No Google Play plans are active yet. Activate Entry, Core, or Coaching from admin first.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
