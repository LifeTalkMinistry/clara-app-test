import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  CheckCircle,
  Sparkles,
  CreditCard,
  Building2,
  Check,
  ArrowRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";

const TIER_CONFIG = {
  diy: {
    keyAliases: ["diy", "basic"],
    shortName: "DIY",
    subtitle: "Do-It-Yourself",
    badge: "Self-Paced",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 border border-emerald-200",
    cardClass:
      "bg-white/95 border border-emerald-100 shadow-[0_20px_45px_rgba(15,23,42,0.08)]",
    buttonClass:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_12px_25px_rgba(5,150,105,0.28)]",
    priceClass: "text-emerald-600",
    description:
      "Fully self-paced program with no personal coaching. Best for users who want structure, tools, and progress tracking while managing the journey on their own.",
    features: [
      "Full access to modules",
      "Daily tasks",
      "Money tracking tools",
      "Progress dashboard",
      "Certification path",
      "Onboarding via video",
      "Structured completion flow",
    ],
    notIncluded: [
      "No 1:1 coaching",
      "No scheduled calls",
      "No direct personal support",
    ],
    supportLine: "App-driven accountability • Fully self-managed",
    priceFallback: 299,
    sort: 1,
  },
  diwm: {
    keyAliases: ["diwm", "transformation"],
    shortName: "DIWM",
    subtitle: "Do-It-With-Me",
    badge: "Best Value",
    badgeClass: "bg-amber-400/15 text-amber-700 border border-amber-300",
    cardClass:
      "bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(254,252,232,1)_100%)] border-2 border-amber-400 shadow-[0_25px_60px_rgba(245,158,11,0.22)] xl:-translate-y-2",
    buttonClass:
      "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-[0_14px_30px_rgba(245,158,11,0.28)]",
    priceClass: "text-amber-600",
    description:
      "Guided program with limited but meaningful personal interaction at key milestones. Best for users who want structure plus human guidance without full intensive coaching.",
    features: [
      "Everything in DIY",
      "Onboarding session (Day 1–3)",
      "Final session (Day 27–30)",
      "Orientation & alignment",
      "Goal setting",
      "Accountability agreement",
      "Phone-based accountability as agreed",
    ],
    notIncluded: [
      "No continuous coaching",
      "No daily 1:1 support",
      "No frequent sessions beyond the two milestones",
    ],
    supportLine: "Hybrid accountability • System + human support",
    priceFallback: 499,
    highlight: true,
    sort: 2,
  },
  ldit: {
    keyAliases: ["ldit", "elite"],
    shortName: "LDIT",
    subtitle: "Led / Intensive Tier",
    badge: "Highest Support",
    badgeClass: "bg-cyan-500/10 text-cyan-700 border border-cyan-200",
    cardClass:
      "bg-white/95 border border-cyan-100 shadow-[0_20px_45px_rgba(15,23,42,0.08)]",
    buttonClass:
      "bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_12px_25px_rgba(8,145,178,0.28)]",
    priceClass: "text-cyan-600",
    description:
      "High-touch, closely guided coaching with continuous accountability. Best for users who want intensive support, closer monitoring, and stronger follow-through.",
    features: [
      "Everything in DIWM",
      "Weekly 1:1 coaching sessions",
      "Higher level of monitoring and reminders",
      "Stronger accountability enforcement",
      "Frequent follow-ups",
      "Missed tasks addressed quickly",
      "Continuous guidance throughout the 30 days",
    ],
    notIncluded: [],
    supportLine: "Active monitoring • Continuous guidance",
    priceFallback: 999,
    sort: 3,
  },
};

function classifyPlan(plan) {
  const key = String(plan?.plan_key || "").toLowerCase();
  const name = String(plan?.name || "").toLowerCase();

  if (TIER_CONFIG.diy.keyAliases.some((alias) => key.includes(alias) || name.includes(alias))) {
    return "diy";
  }

  if (TIER_CONFIG.diwm.keyAliases.some((alias) => key.includes(alias) || name.includes(alias))) {
    return "diwm";
  }

  if (TIER_CONFIG.ldit.keyAliases.some((alias) => key.includes(alias) || name.includes(alias))) {
    return "ldit";
  }

  return null;
}

function normalizePrice(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(String(value).replace(/[^\d.]/g, ""));
  if (Number.isNaN(numeric)) return fallback;
  return numeric;
}

export default function Enroll() {
  const { user } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlanData, setSelectedPlanData] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const planKey = params.get("plan");
    setSelectedPlan(planKey || null);
  }, [location.search]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) {
          console.error("Failed to load plans:", error);
          setPlans([]);
          return;
        }

        const matchedPlans = (data || [])
          .filter((plan) => classifyPlan(plan))
          .map((plan) => {
            const tierType = classifyPlan(plan);
            const tierUi = TIER_CONFIG[tierType];
            return {
              ...plan,
              tierType,
              ui: tierUi,
              normalizedPrice: normalizePrice(plan.price, tierUi.priceFallback),
            };
          })
          .sort((a, b) => a.ui.sort - b.ui.sort);

        setPlans(matchedPlans);
      } catch (error) {
        console.error("Unexpected error loading plans:", error);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  useEffect(() => {
    if (!selectedPlan || plans.length === 0) {
      setSelectedPlanData(null);
      return;
    }

    const foundPlan = plans.find((plan) => plan.plan_key === selectedPlan) || null;
    setSelectedPlanData(foundPlan);
  }, [selectedPlan, plans]);

  const isPaidUser = useMemo(() => {
    return (
      ["basic", "transformation", "elite", "student", "diy", "diwm", "ldit"].includes(user?.plan) ||
      user?.role === "paid_user"
    );
  }, [user]);

  useEffect(() => {
    if (isPaidUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [isPaidUser, navigate]);

  const handlePlanSelect = (planKey) => {
    setProofFile(null);
    navigate(`/enroll?plan=${planKey}`);
  };

  const handleBackToPlans = () => {
    setProofFile(null);
    navigate("/enroll");
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setProofFile(file);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      alert("User not found. Please log in again.");
      return;
    }

    if (!selectedPlanData) {
      alert("Please choose a plan first.");
      return;
    }

    setSubmitting(true);

    try {
      let proofUrl = null;

      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        const safeExt = fileExt ? `.${fileExt}` : "";
        const fileName = `${user.id}_${Date.now()}${safeExt}`;
        const filePath = `payment_proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, proofFile, { upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert(
            "Your enrollment record can’t be completed because the payment proof upload failed. Check that your Supabase storage bucket exists and is named payment-proofs."
          );
          setSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(filePath);

        proofUrl = publicUrlData?.publicUrl || null;
      }

      const { error: insertError } = await supabase.from("enrollments").insert([
        {
          user_id: user.id,
          plan_key: selectedPlanData.plan_key,
          plan_name: selectedPlanData.name,
          amount_paid: selectedPlanData.normalizedPrice,
          payment_proof_url: proofUrl,
          status: "pending",
        },
      ]);

      if (insertError) {
        console.error("Enrollment insert error:", insertError);
        alert("Something went wrong while submitting your enrollment.");
        setSubmitting(false);
        return;
      }

      alert("Enrollment submitted successfully. Please wait for admin approval.");
      navigate("/dashboard");
    } catch (error) {
      console.error("Unexpected submit error:", error);
      alert("Something went wrong while submitting your enrollment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef7f4_0%,#f8fafc_28%,#f8fafc_100%)]">
      <div className="w-full">
        <div className="relative overflow-hidden rounded-none xl:rounded-bl-[36px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_35%),linear-gradient(135deg,#0b3b24_0%,#0e7a46_52%,#10b5c9_100%)] text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.08),transparent)]" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:pt-14 md:pb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/15 px-4 py-1.5 text-sm font-medium mb-5">
              <Sparkles className="w-4 h-4" />
              CLARA Program
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              {selectedPlan ? "Complete Your Enrollment" : "Choose Your Plan"}
            </h1>

            <p className="mt-4 text-sm sm:text-base md:text-lg text-white/90 max-w-3xl mx-auto">
              {selectedPlan
                ? "Review your selected tier, send your payment, and upload your proof in one seamless flow."
                : "Choose the level of coaching, accountability, and guidance that matches the support you want for your 30-day CLARA journey."}
            </p>
          </div>
        </div>
      </div>

      {!selectedPlan ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 md:pb-12 -mt-8 md:-mt-10 relative z-20">
          <div className="grid gap-5 xl:grid-cols-3">
            {plans.map((plan) => {
              const ui = plan.ui;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[28px] p-5 md:p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${ui.cardClass}`}
                >
                  {ui.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold px-4 py-1.5 shadow-lg">
                        BEST VALUE
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-[2rem] leading-none font-extrabold text-slate-900">
                        {ui.shortName}
                      </h2>
                      <p className="text-sm font-medium text-slate-500 mt-2">
                        {ui.subtitle}
                      </p>
                    </div>

                    <div
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${ui.badgeClass}`}
                    >
                      {ui.badge}
                    </div>
                  </div>

                  <p className="text-slate-600 leading-8 min-h-[110px] text-[15px]">
                    {ui.description}
                  </p>

                  <div className="mt-6 mb-6">
                    <div className={`text-5xl md:text-6xl font-extrabold ${ui.priceClass}`}>
                      ₱{plan.normalizedPrice}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">30-day access</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50/95 border border-slate-200 p-4 mb-4">
                    <div className="text-sm font-semibold text-slate-800 mb-3">
                      What’s included
                    </div>
                    <ul className="space-y-2.5">
                      {ui.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-sm text-slate-600"
                        >
                          <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {ui.notIncluded?.length > 0 && (
                    <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4">
                      <div className="text-sm font-semibold text-slate-800 mb-3">
                        Not included
                      </div>
                      <ul className="space-y-2.5">
                        {ui.notIncluded.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2.5 text-sm text-slate-500"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mb-6 rounded-2xl bg-slate-900 text-white px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/60 mb-1">
                      Accountability Model
                    </div>
                    <div className="text-sm font-medium">{ui.supportLine}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlanSelect(plan.plan_key)}
                    className={`w-full rounded-2xl font-bold py-3.5 px-4 transition flex items-center justify-center gap-2 cursor-pointer ${ui.buttonClass}`}
                  >
                    Choose {ui.shortName}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.06)] p-5 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
              Tier Comparison
            </h3>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-slate-700">
                <span className="font-bold text-emerald-700">DIY</span> → Self-paced, no coach
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-slate-700">
                <span className="font-bold text-amber-700">DIWM</span> → Minimal coaching + structured accountability
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 text-slate-700">
                <span className="font-bold text-cyan-700">LDIT</span> → Frequent coaching + high-touch accountability
              </div>
            </div>
          </div>

          <div className="text-center mt-8 pb-6">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 -mt-8 md:-mt-10 relative z-20">
          <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] p-5 md:p-7">
                <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Selected Plan</p>
                    <h2 className="text-3xl font-extrabold text-slate-900">
                      {selectedPlanData?.ui?.shortName}
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                      {selectedPlanData?.ui?.subtitle}
                    </p>
                  </div>

                  <div
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${selectedPlanData?.ui?.badgeClass}`}
                  >
                    {selectedPlanData?.ui?.badge}
                  </div>
                </div>

                <p className="text-slate-600 leading-7">
                  {selectedPlanData?.ui?.description}
                </p>

                <div className="mt-6 flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <p className={`text-5xl font-extrabold ${selectedPlanData?.ui?.priceClass}`}>
                      ₱{selectedPlanData?.normalizedPrice ?? "0"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">One-time payment</p>
                  </div>

                  <Button variant="ghost" onClick={handleBackToPlans}>
                    Choose another plan
                  </Button>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] p-5 md:p-7">
                <h3 className="text-xl font-bold text-slate-900 mb-5">
                  Payment Details
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <p className="font-semibold text-slate-900">GCash</p>
                    </div>

                    <p className="text-xs uppercase tracking-wide text-slate-500">Number</p>
                    <p className="font-semibold text-slate-900 mt-1">09858410403</p>

                    <p className="text-xs uppercase tracking-wide text-slate-500 mt-4">
                      Account Name
                    </p>
                    <p className="font-semibold text-slate-900 mt-1">Jerome Mirabuenos</p>
                  </div>

                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-cyan-600" />
                      <p className="font-semibold text-slate-900">Bank Transfer</p>
                    </div>

                    <p className="text-xs uppercase tracking-wide text-slate-500">Bank</p>
                    <p className="font-semibold text-slate-900 mt-1">Security Bank</p>

                    <p className="text-xs uppercase tracking-wide text-slate-500 mt-4">
                      Account Number
                    </p>
                    <p className="font-semibold text-slate-900 mt-1">000-006-704-2019</p>

                    <p className="text-xs uppercase tracking-wide text-slate-500 mt-4">
                      Account Name
                    </p>
                    <p className="font-semibold text-slate-900 mt-1">
                      CLARA Financial Program
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] p-5 md:p-7">
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Upload Payment Proof
                </h3>

                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <p className="font-medium text-slate-900">
                      Receipt Screenshot or PDF
                    </p>
                  </div>

                  <p className="text-sm text-slate-500 mb-4">
                    Upload a screenshot or clear photo of your payment receipt.
                  </p>

                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                  />

                  {proofFile && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{proofFile.name}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full mt-6 rounded-2xl h-12 text-base font-bold"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Enrollment"}
                </Button>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] p-5 md:p-7">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/60 mb-2">
                  What happens next
                </div>
                <ul className="space-y-3 text-sm text-white/90">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span>Your enrollment is submitted for admin review.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span>Once verified, your program access will be activated.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span>You’ll continue into the CLARA experience from there.</span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <Button variant="ghost" onClick={handleSkip}>
                  Skip for now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}