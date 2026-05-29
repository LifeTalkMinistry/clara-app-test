import { ArrowLeft, Brain, CheckCircle2, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import {
  deleteInvestmentPlan,
  getInvestmentPlanLocalUserId,
  getInvestmentPlans,
  upsertInvestmentPlan,
} from "@/lib/investmentPlanRepository";

const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const investmentTypes = [
  "Business",
  "Skill / Education",
  "Equipment",
  "Side hustle",
  "Digital product",
  "Stocks / Funds",
  "Crypto",
  "Time deposit",
  "Other",
];
const riskLevels = ["Low", "Medium", "High"];
const timeHorizons = ["1 month", "3–6 months", "6–12 months", "1 year+"];

const controlClass =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition placeholder:text-white/38 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15";

const normalizePlanType = (value) =>
  String(value || "Business")
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, "_")
    .replace(/\s+/g, "_");

const formatStatus = (value) => {
  const normalized = String(value || "idea_only").replace(/_/g, " ");
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const cleanPlanTypeLabel = (plan = {}) =>
  plan.planTypeLabel ||
  plan.plan_type_label ||
  String(plan.planType || plan.plan_type || "Business")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/52">
      {children}
    </label>
  );
}

function SelectField({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${controlClass} appearance-none pr-9 backdrop-blur-xl`}
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-slate-950 text-white">
          {option}
        </option>
      ))}
    </select>
  );
}

function GuidanceCard({ canSafelyInvest, isAboveSafeRange, safeToInvest }) {
  const title = canSafelyInvest
    ? isAboveSafeRange
      ? "Lower the test amount"
      : "Protected surplus only"
    : "Save as an idea first";
  const body = canSafelyInvest
    ? isAboveSafeRange
      ? `Above your ${fmt(safeToInvest)} safe test range. Lower the amount or wait until your protection base improves.`
      : "This can be reviewed as a small controlled test. Keep emergency and bill money untouched."
    : "Write the idea now. CLARA will not recommend funding it until your protection base is ready.";
  const toneClass = canSafelyInvest
    ? isAboveSafeRange
      ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
      : "border-emerald-300/18 bg-emerald-400/10 text-emerald-100"
    : "border-cyan-300/16 bg-cyan-400/[0.07] text-cyan-100";

  return (
    <div className={`rounded-[1.35rem] border px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${toneClass}`}>
      <div className="grid grid-cols-[34px_minmax(0,1fr)] items-start gap-3">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/16 text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-black leading-4 text-white">{title}</p>
          <p className="mt-1 text-[11.5px] font-semibold leading-[1.45] text-white/66">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default function InvestmentPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const safeToInvest = Number(location.state?.safeToInvest || 0);
  const safeRangeMin = Number(location.state?.safeRangeMin || 0);
  const canSafelyInvest = Boolean(location.state?.canSafelyInvest);
  const readinessStatus = location.state?.readinessStatus || (canSafelyInvest ? "ready_to_test" : "not_ready");
  const blockers = Array.isArray(location.state?.blockers) ? location.state.blockers : [];
  const initialType = location.state?.selectedType || "Business";

  const [investmentType, setInvestmentType] = useState(initialType);
  const [plannedAmount, setPlannedAmount] = useState(canSafelyInvest && safeToInvest ? String(safeToInvest) : "");
  const [riskLevel, setRiskLevel] = useState("Low");
  const [timeHorizon, setTimeHorizon] = useState("3–6 months");
  const [idea, setIdea] = useState("");
  const [existingPlan, setExistingPlan] = useState(null);
  const [isEditingPlan, setIsEditingPlan] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const localUserId = useMemo(() => getInvestmentPlanLocalUserId(user), [user]);

  const plannedNumber = Number(plannedAmount) || 0;
  const hasAmount = plannedNumber > 0;
  const hasIdea = idea.trim().length > 0;
  const isAboveSafeRange = Boolean(safeToInvest && plannedNumber > safeToInvest);
  const canStartActivePlan = canSafelyInvest && hasAmount && hasIdea && !isAboveSafeRange;

  const hydrateFormFromPlan = (plan) => {
    if (!plan) return;

    const label = cleanPlanTypeLabel(plan);
    setInvestmentType(investmentTypes.includes(label) ? label : "Other");
    setPlannedAmount(String(plan.requestedAmount ?? plan.requested_amount ?? ""));
    setRiskLevel(plan.riskLevel || plan.risk_level || "Low");
    setTimeHorizon(plan.timeHorizon || plan.time_horizon || "3–6 months");
    setIdea(plan.ideaReason || plan.idea_reason || "");
  };

  const resetForm = () => {
    setInvestmentType(initialType);
    setPlannedAmount(canSafelyInvest && safeToInvest ? String(safeToInvest) : "");
    setRiskLevel("Low");
    setTimeHorizon("3–6 months");
    setIdea("");
  };

  useEffect(() => {
    let alive = true;

    async function loadSinglePlan() {
      setLoadingPlan(true);

      try {
        const plans = await getInvestmentPlans(localUserId);
        const currentPlan = plans?.[0] || null;

        if (!alive) return;

        setExistingPlan(currentPlan);
        setConfirmingDelete(false);

        if (currentPlan) {
          hydrateFormFromPlan(currentPlan);
          setIsEditingPlan(false);
        } else {
          setIsEditingPlan(true);
        }
      } catch (error) {
        console.error("CLARA investment plan load error:", error);
        if (alive) {
          setFeedback({ tone: "rose", message: "CLARA could not load your investment idea yet." });
        }
      } finally {
        if (alive) setLoadingPlan(false);
      }
    }

    loadSinglePlan();

    return () => {
      alive = false;
    };
  }, [localUserId]);

  const amountStatus = useMemo(() => {
    if (!canSafelyInvest) return "Save this as an idea for now. CLARA does not recommend funding it yet.";
    if (!hasAmount) return "Enter the amount you want to test.";
    if (isAboveSafeRange) return "This is above your current safe test range. Consider lowering the amount or waiting.";
    return "This fits your current test range. Keep your emergency fund untouched.";
  }, [canSafelyInvest, hasAmount, isAboveSafeRange]);

  const amountStatusClass = !canSafelyInvest
    ? "text-rose-200"
    : isAboveSafeRange
      ? "text-amber-200"
      : hasAmount
        ? "text-emerald-200"
        : "text-white/56";

  const buildPlanPayload = (status, planToUpdate = existingPlan) => ({
    ...(planToUpdate || {}),
    id: planToUpdate?.id,
    status,
    readinessStatus,
    planType: normalizePlanType(investmentType),
    planTypeLabel: investmentType,
    requestedAmount: plannedNumber,
    approvedTestAmount: status === "active_test" ? Math.min(plannedNumber, safeToInvest) : 0,
    safeRangeMin,
    safeRangeMax: safeToInvest,
    riskLevel,
    timeHorizon,
    ideaReason: idea.trim(),
    startDate: status === "active_test" ? planToUpdate?.startDate || planToUpdate?.start_date || new Date().toISOString() : null,
    reviewDate: status === "active_test" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    claraWarnings: [
      ...blockers,
      ...(!canSafelyInvest ? ["Save as idea only until protection base is ready."] : []),
      ...(isAboveSafeRange ? ["Requested amount is above current safe test range."] : []),
      ...(investmentType === "Crypto" ? ["Only test what you can afford to lose. Do not use emergency or bill money."] : []),
      ...(riskLevel === "High" ? ["High risk needs a stronger base and slower review."] : []),
    ],
    claraRecommendation: canStartActivePlan
      ? "This can be reviewed as a small controlled test from protected surplus."
      : "Keep this as a future idea until CLARA confirms the protection base is ready.",
  });

  const savePlan = async (status) => {
    if (!hasIdea) {
      setFeedback({
        tone: "amber",
        message: "Add a short idea or reason first so CLARA knows what you are testing.",
      });
      return;
    }

    if (status === "active_test" && !canStartActivePlan) {
      setFeedback({
        tone: "amber",
        message: "CLARA saved this as an idea for now. Your protection base needs to be stronger before funding it.",
      });
      status = "idea_only";
    }

    setSaving(true);

    try {
      const plans = await getInvestmentPlans(localUserId);
      const planToUpdate = existingPlan || plans?.[0] || null;
      const savedPlan = await upsertInvestmentPlan(localUserId, buildPlanPayload(status, planToUpdate));

      setExistingPlan(savedPlan);
      setIsEditingPlan(false);
      setConfirmingDelete(false);
      setFeedback({
        tone: status === "active_test" ? "emerald" : "cyan",
        message:
          status === "active_test"
            ? "Investment test saved. Keep it small, controlled, and reviewed."
            : planToUpdate
              ? "Investment idea updated. CLARA will keep this as your only current idea."
              : "Future investment idea saved. Delete it first before adding a new idea.",
      });
    } catch (error) {
      console.error("CLARA investment plan save error:", error);
      setFeedback({
        tone: "rose",
        message: "CLARA could not save this plan yet. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentPlan = async () => {
    if (!existingPlan?.id || saving) return;

    setSaving(true);

    try {
      await deleteInvestmentPlan(localUserId, existingPlan.id);
      setExistingPlan(null);
      resetForm();
      setIsEditingPlan(true);
      setConfirmingDelete(false);
      setFeedback({ tone: "cyan", message: "Investment idea deleted. You can now create a new one." });
    } catch (error) {
      console.error("CLARA investment plan delete error:", error);
      setFeedback({ tone: "rose", message: "CLARA could not delete this idea yet. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const startEditingExistingPlan = () => {
    hydrateFormFromPlan(existingPlan);
    setConfirmingDelete(false);
    setFeedback(null);
    setIsEditingPlan(true);
  };

  const cancelEditingExistingPlan = () => {
    hydrateFormFromPlan(existingPlan);
    setIsEditingPlan(false);
    setFeedback(null);
  };

  const openClara = () => {
    const planLabel = isEditingPlan ? investmentType : cleanPlanTypeLabel(existingPlan || {});
    const planAmount = isEditingPlan
      ? plannedNumber
      : Number(existingPlan?.requestedAmount ?? existingPlan?.requested_amount ?? plannedNumber) || 0;
    const planRisk = isEditingPlan ? riskLevel : existingPlan?.riskLevel || existingPlan?.risk_level || riskLevel;
    const planHorizon = isEditingPlan ? timeHorizon : existingPlan?.timeHorizon || existingPlan?.time_horizon || timeHorizon;
    const planIdea = isEditingPlan ? idea : existingPlan?.ideaReason || existingPlan?.idea_reason || idea;

    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "investment-plan-page",
          prompt: `Help me review this investment idea as a behavioral money coach. Type: ${planLabel}. Amount I want to test: ${planAmount ? fmt(planAmount) : "not set"}. Risk level: ${planRisk}. Time horizon: ${planHorizon}. Idea: ${planIdea || "not described yet"}. CLARA readiness status: ${readinessStatus}. Safe test range: ${safeRangeMin ? `${fmt(safeRangeMin)}–` : ""}${fmt(safeToInvest)}. Do not recommend specific assets or guarantee returns. Help me decide if this should stay as an idea, be lowered, paused, or reviewed again later.`,
          investmentContext: {
            readinessStatus,
            safeRange: { min: safeRangeMin, max: safeToInvest },
            selectedInvestmentType: planLabel,
            amountUserWantsToTest: planAmount,
            riskLevel: planRisk,
            timeHorizon: planHorizon,
            ideaReason: planIdea,
            warningsTriggered: blockers,
            recommendedAction: canStartActivePlan ? "Review as small test" : "Save as idea only",
          },
        },
      })
    );
  };

  const showForm = !loadingPlan && (!existingPlan || isEditingPlan);
  const showCurrentPlan = !loadingPlan && existingPlan && !isEditingPlan;

  return (
    <div className="theme-page-shell min-h-[100dvh] overflow-y-auto text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-[calc(env(safe-area-inset-top,0px)+14px)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {loadingPlan ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 text-sm font-bold text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            Loading investment idea…
          </div>
        ) : null}

        {showCurrentPlan ? (
          <section className="space-y-3 rounded-[1.75rem] border border-cyan-300/18 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <div className="rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.07] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/58">Current Investment Idea</p>
              <h1 className="mt-1 text-lg font-black leading-6 text-white">{cleanPlanTypeLabel(existingPlan)}</h1>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/62">
                CLARA allows one investment idea at a time. Edit this idea or delete it before creating a new one.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Amount</p>
                <p className="mt-1 text-sm font-black text-white">{fmt(existingPlan.requestedAmount ?? existingPlan.requested_amount)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Status</p>
                <p className="mt-1 text-sm font-black text-white">{formatStatus(existingPlan.status)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Risk</p>
                <p className="mt-1 text-sm font-black text-white">{existingPlan.riskLevel || existingPlan.risk_level || "Low"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Horizon</p>
                <p className="mt-1 text-sm font-black text-white">{existingPlan.timeHorizon || existingPlan.time_horizon || "3–6 months"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">Idea / reason</p>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-white/68">
                {existingPlan.ideaReason || existingPlan.idea_reason || "No reason added yet."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={startEditingExistingPlan}
                disabled={saving}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={saving}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-black text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>

            {confirmingDelete ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3">
                <p className="text-xs font-black text-rose-100">Delete this investment idea?</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/62">
                  After deleting, CLARA will allow you to create a new investment idea.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={saving}
                    className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/74 disabled:opacity-55"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={deleteCurrentPlan}
                    disabled={saving}
                    className="rounded-xl border border-rose-300/25 bg-rose-400/15 px-3 py-2 text-xs font-black text-rose-100 disabled:opacity-55"
                  >
                    Delete Idea
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {showForm ? (
          <section className="space-y-3.5 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            {existingPlan ? (
              <div className="rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.07] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/58">Editing current idea</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/62">
                  Updating will preserve this same plan. CLARA will not create a duplicate investment idea.
                </p>
              </div>
            ) : null}

            <div>
              <FieldLabel htmlFor="investment-type">Plan type</FieldLabel>
              <SelectField id="investment-type" value={investmentType} onChange={setInvestmentType} options={investmentTypes} />
            </div>

            <div>
              <FieldLabel htmlFor="planned-amount">Amount you want to test</FieldLabel>
              <input
                id="planned-amount"
                type="number"
                inputMode="decimal"
                min="0"
                value={plannedAmount}
                onChange={(event) => setPlannedAmount(event.target.value)}
                placeholder="0"
                aria-describedby="planned-amount-status"
                className={controlClass}
              />
              <p id="planned-amount-status" className={`mt-2 text-[11px] font-semibold leading-5 ${amountStatusClass}`}>
                {amountStatus}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <FieldLabel htmlFor="risk-level">Risk level</FieldLabel>
                <SelectField id="risk-level" value={riskLevel} onChange={setRiskLevel} options={riskLevels} />
              </div>
              <div>
                <FieldLabel htmlFor="time-horizon">Time horizon</FieldLabel>
                <SelectField id="time-horizon" value={timeHorizon} onChange={setTimeHorizon} options={timeHorizons} />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="investment-idea">Idea / reason</FieldLabel>
              <textarea
                id="investment-idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="Example: I want to test a small food business, buy supplies, enroll in a skill course, or invest a small starter amount…"
                className={`${controlClass} min-h-[104px] resize-none leading-6`}
              />
            </div>
          </section>
        ) : null}

        <section className="mt-3.5 grid gap-3">
          {showForm ? (
            <GuidanceCard canSafelyInvest={canSafelyInvest} isAboveSafeRange={isAboveSafeRange} safeToInvest={safeToInvest} />
          ) : null}

          {feedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-[12px] font-bold leading-5 ${
                feedback.tone === "emerald"
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                  : feedback.tone === "rose"
                    ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
                    : feedback.tone === "amber"
                      ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
                      : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
              }`}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{feedback.message}</span>
              </div>
            </div>
          ) : null}

          {showForm ? (
            <div className="grid gap-2.5">
              <button
                type="button"
                onClick={() => savePlan(canStartActivePlan ? "active_test" : "idea_only")}
                disabled={saving}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
              >
                <ShieldCheck className="h-4 w-4" />
                {existingPlan ? "Update Investment Idea" : canStartActivePlan ? "Start Investment Plan" : "Save as Future Plan"}
              </button>

              {existingPlan ? (
                <button
                  type="button"
                  onClick={cancelEditingExistingPlan}
                  disabled={saving}
                  className="flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.07] disabled:opacity-55"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          ) : null}

          {!loadingPlan ? (
            <button
              type="button"
              onClick={openClara}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
            >
              <Brain className="h-4 w-4" />
              Ask CLARA to Review This Plan
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
