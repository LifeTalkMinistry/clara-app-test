import { ArrowLeft, Brain, ShieldCheck, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const investmentTypes = ["Business", "Stocks", "Crypto", "Time Deposit", "Other"];
const riskLevels = ["Low", "Moderate", "High"];
const timeHorizons = ["This month", "3-6 months", "1 year+", "Still exploring"];

const controlClass =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition placeholder:text-white/38 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15";

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

function StatusTile({ label, value, tone = "slate" }) {
  const toneClass = {
    emerald: "border-emerald-300/18 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-300/18 bg-amber-400/10 text-amber-100",
    slate: "border-white/10 bg-white/[0.055] text-white",
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${toneClass}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-base font-black leading-none tracking-[-0.03em]">{value}</p>
    </div>
  );
}

export default function InvestmentPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const safeToInvest = Number(location.state?.safeToInvest || 0);
  const canSafelyInvest = Boolean(location.state?.canSafelyInvest);
  const initialType = location.state?.selectedType || "Business";

  const [investmentType, setInvestmentType] = useState(initialType);
  const [plannedAmount, setPlannedAmount] = useState(safeToInvest ? String(safeToInvest) : "");
  const [riskLevel, setRiskLevel] = useState("Low");
  const [timeHorizon, setTimeHorizon] = useState("3-6 months");
  const [idea, setIdea] = useState("");

  const plannedNumber = Number(plannedAmount) || 0;
  const hasAmount = plannedNumber > 0;
  const isAboveSafeRange = Boolean(safeToInvest && plannedNumber > safeToInvest);

  const amountStatus = useMemo(() => {
    if (!canSafelyInvest) return "Secure emergency protection before investing.";
    if (!hasAmount) return "Enter the amount you want to test.";
    if (isAboveSafeRange) return "Above CLARA's safe starter range. Consider lowering it or asking CLARA first.";
    return "Within CLARA's safe starter range.";
  }, [canSafelyInvest, hasAmount, isAboveSafeRange]);

  const amountStatusClass = !canSafelyInvest
    ? "text-rose-200"
    : isAboveSafeRange
      ? "text-amber-200"
      : hasAmount
        ? "text-emerald-200"
        : "text-white/56";

  const openClara = () => {
    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "investment-plan-page",
          prompt: `Help me review this plan as an educational money check. Type: ${investmentType}. Planned amount: ${plannedNumber ? fmt(plannedNumber) : "not set"}. Risk level: ${riskLevel}. Time horizon: ${timeHorizon}. Idea: ${idea || "not described yet"}. CLARA safe starter range: ${fmt(safeToInvest)}. Help me slow down, compare risks, and decide what questions to ask before taking action.`,
        },
      })
    );
  };

  return (
    <div className="theme-page-shell min-h-[100dvh] overflow-y-auto text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-[calc(env(safe-area-inset-top,0px)+14px)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.24),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.22),transparent_46%),linear-gradient(135deg,rgba(6,48,66,0.98),rgba(7,20,48,0.96)_48%,rgba(37,13,74,0.96))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.10)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/58">CLARA Investment Plan</p>
              <h1 className="mt-1.5 text-[clamp(1.65rem,7vw,2rem)] font-black leading-[0.95] tracking-[-0.055em] text-cyan-50">
                Plan before you risk.
              </h1>
              <p className="mt-2 text-[13px] font-semibold leading-5 text-white/72">
                Slow down, test the idea, and protect your emergency fund before committing money.
              </p>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <StatusTile label="Safe starter" value={safeToInvest ? fmt(safeToInvest) : "Build base"} tone="emerald" />
            <StatusTile label="Readiness" value={canSafelyInvest ? "Ready" : "Wait"} tone={canSafelyInvest ? "emerald" : "amber"} />
          </div>
        </section>

        <section className="mt-4 space-y-3.5 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div>
            <FieldLabel htmlFor="investment-type">Investment type</FieldLabel>
            <SelectField id="investment-type" value={investmentType} onChange={setInvestmentType} options={investmentTypes} />
          </div>

          <div>
            <FieldLabel htmlFor="planned-amount">Money to test</FieldLabel>
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
              placeholder="Example: I want to test a small food business, buy supplies, or invest in a time deposit..."
              className={`${controlClass} min-h-[104px] resize-none leading-6`}
            />
          </div>
        </section>

        <section className="mt-4 grid gap-3">
          <div className="rounded-[1.5rem] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_40%),rgba(16,185,129,0.07)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Protect the base first</p>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-white/64">
                  Investing should come from protected surplus, not pressure money. Keep your emergency fund untouched.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openClara}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
          >
            <Brain className="h-4 w-4" />
            Ask CLARA to Review This Plan
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[11px] font-semibold leading-5 text-white/48">
            CLARA can help you think, compare risks, and slow down impulsive decisions. For major decisions, consult a qualified professional.
          </div>
        </section>
      </div>
    </div>
  );
}
