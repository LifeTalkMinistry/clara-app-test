import { ArrowLeft, Brain, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
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

function FieldLabel({ children }) {
  return (
    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
      {children}
    </label>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition focus:border-cyan-300/35"
    >
      {options.map((option) => (
        <option key={option} value={option} className="bg-slate-950 text-white">
          {option}
        </option>
      ))}
    </select>
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
  const [riskLevel, setRiskLevel] = useState("Moderate");
  const [timeHorizon, setTimeHorizon] = useState("Still exploring");
  const [idea, setIdea] = useState("");

  const plannedNumber = Number(plannedAmount) || 0;
  const amountStatus = useMemo(() => {
    if (!canSafelyInvest) return "Secure emergency protection before investing.";
    if (!plannedNumber) return "Enter the amount you want to test.";
    if (safeToInvest && plannedNumber > safeToInvest) {
      return "Above CLARA's safe starter range. Consider lowering it or asking CLARA first.";
    }
    return "Within CLARA's safe starter range.";
  }, [canSafelyInvest, plannedNumber, safeToInvest]);

  const openClara = () => {
    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "investment-plan-page",
          prompt: `Help me think through this investment plan. Type: ${investmentType}. Planned amount: ${plannedNumber ? fmt(plannedNumber) : "not set"}. Risk level: ${riskLevel}. Time horizon: ${timeHorizon}. Idea: ${idea || "not described yet"}. CLARA safe starter range: ${fmt(safeToInvest)}. Please check if this is financially wise before I act.`,
        },
      })
    );
  };

  return (
    <div className="theme-page-shell min-h-screen overflow-hidden text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.24),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.22),transparent_46%),linear-gradient(135deg,rgba(6,48,66,0.98),rgba(7,20,48,0.96)_48%,rgba(37,13,74,0.96))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.10)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
                CLARA Investment Plan
              </p>
              <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.05em] text-cyan-50">
                Plan before you risk.
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                CLARA helps you slow down, test the idea, and protect your emergency fund before committing money.
              </p>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">Safe starter</p>
              <p className="mt-1 text-lg font-black text-emerald-300">{fmt(safeToInvest)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">Readiness</p>
              <p className="mt-1 text-lg font-black text-white">{canSafelyInvest ? "Ready" : "Wait"}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 space-y-3 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div>
            <FieldLabel>Investment type</FieldLabel>
            <SelectField value={investmentType} onChange={setInvestmentType} options={investmentTypes} />
          </div>

          <div>
            <FieldLabel>Money to test</FieldLabel>
            <input
              type="number"
              min="0"
              value={plannedAmount}
              onChange={(event) => setPlannedAmount(event.target.value)}
              placeholder="0"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/35 focus:border-cyan-300/35"
            />
            <p className={`mt-2 text-[11px] font-semibold ${plannedNumber > safeToInvest && safeToInvest ? "text-amber-200" : "text-white/52"}`}>
              {amountStatus}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Risk level</FieldLabel>
              <SelectField value={riskLevel} onChange={setRiskLevel} options={riskLevels} />
            </div>
            <div>
              <FieldLabel>Time horizon</FieldLabel>
              <SelectField value={timeHorizon} onChange={setTimeHorizon} options={timeHorizons} />
            </div>
          </div>

          <div>
            <FieldLabel>Idea / reason</FieldLabel>
            <textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Example: I want to test a small food business, buy supplies, or invest in a time deposit..."
              className="min-h-[104px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm font-semibold leading-6 text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-white/30 focus:border-cyan-300/35"
            />
          </div>
        </section>

        <section className="mt-4 grid gap-3">
          <div className="rounded-[1.5rem] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_40%),rgba(16,185,129,0.07)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Protect the base first</p>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-white/62">
                  Investing should come from protected surplus, not pressure money. Keep your emergency fund untouched.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openClara}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-400/15"
          >
            <Brain className="h-4 w-4" />
            Ask CLARA to Review This Plan
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[11px] font-semibold leading-5 text-white/45">
            CLARA can help you think, compare risks, and slow down impulsive decisions, but it is not a licensed financial adviser. For serious investments, consult a qualified professional.
          </div>
        </section>
      </div>
    </div>
  );
}
