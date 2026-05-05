import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";

import useFinancialData from "../hooks/useFinancialData";

const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const clampProgress = (value) => Math.max(0, Math.min(Number(value) || 0, 100));

const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "personal_debt", label: "Personal Debt" },
  { value: "other", label: "Other" },
];

const tone = {
  border: "border-rose-300/20",
  iconShell:
    "border-rose-300/25 bg-rose-400/10 shadow-[0_0_18px_rgba(251,113,133,0.14)]",
  icon: "text-rose-200",
  status:
    "border-rose-300/25 bg-rose-500/15 text-rose-200 shadow-[0_0_18px_rgba(251,113,133,0.12)]",
  value: "text-rose-200",
  bar: "from-rose-300 via-red-300 to-orange-300",
  accent: "bg-rose-300/20",
  background:
    "radial-gradient(circle at top left, rgba(251,113,133,0.28), transparent 28%), radial-gradient(circle at top right, rgba(244,63,94,0.13), transparent 26%), radial-gradient(circle at bottom right, rgba(250,204,21,0.09), transparent 24%), linear-gradient(135deg, rgba(40,12,18,0.96), rgba(3,14,24,0.99))",
};

export default function ObligationDebt({ item = null }) {
  const [expanded, setExpanded] = useState(false);
  const [debtType, setDebtType] = useState("credit_card");
  const [totalDebtInput, setTotalDebtInput] = useState("");
  const [monthlyDebtInput, setMonthlyDebtInput] = useState("");
  const [interestInput, setInterestInput] = useState("");

  const {
    totalIncome = 0,
    totalExpenses = 0,
    totalWalletBalance = 0,
  } = useFinancialData();

  const data = item?.data || {};

  const totalDebt = toNumber(totalDebtInput || data.totalDebt || data.amount || 0);
  const monthlyDebt = toNumber(
    monthlyDebtInput || data.monthlyDebt || data.monthlyPayment || 0
  );
  const income = toNumber(totalIncome);
  const expenses = toNumber(totalExpenses);
  const walletBalance = toNumber(totalWalletBalance);

  const selectedType =
    DEBT_TYPES.find((type) => type.value === debtType)?.label || "Credit Card";

  const debtRatio = useMemo(() => {
    if (income <= 0) return monthlyDebt > 0 ? 100 : 0;
    return (monthlyDebt / income) * 100;
  }, [income, monthlyDebt]);

  const riskLevel =
    totalDebt <= 0
      ? "Debt free"
      : debtRatio < 20
        ? "Healthy"
        : debtRatio <= 40
          ? "Moderate"
          : "Risk";

  const statusLabel =
    totalDebt <= 0 ? "No debt" : debtRatio > 40 ? "At risk" : "Active";

  const smartFeedback =
    totalDebt <= 0
      ? "Debt free"
      : debtRatio > 40
        ? "High pressure"
        : debtRatio >= 20
          ? "Controlled, but needs attention"
          : "Controlled";

  const pressureProgress = clampProgress(totalDebt <= 0 ? 0 : debtRatio);
  const monthlyLeftover = Math.max(0, income - expenses);
  const payoffMonths =
    monthlyDebt > 0 && totalDebt > 0 ? Math.ceil(totalDebt / monthlyDebt) : 0;

  const description =
    totalDebt <= 0
      ? "No active debt recorded. Keep your cash flow protected."
      : debtRatio > 40
        ? "Debt pressure is high. Build a payoff plan before adding new spending."
        : "Your obligations are trackable. Keep payments aligned with income.";

  const dispatchDebtPrompt = (prompt) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "obligation-debt-card",
          prompt,
          debtType,
          totalDebt,
          monthlyDebt,
          debtRatio,
          riskLevel,
        },
      })
    );
  };

  const handlePlanPayoff = () => {
    dispatchDebtPrompt(
      `Help me plan a debt payoff strategy. Debt type: ${selectedType}. Total debt: ${fmt(
        totalDebt
      )}. Monthly payment: ${fmt(monthlyDebt)}. Debt ratio: ${debtRatio.toFixed(
        1
      )}%. Current status: ${riskLevel}.`
    );
  };

  const handleAskClara = () => {
    dispatchDebtPrompt(
      `Review my debt situation. I owe ${fmt(totalDebt)} with a monthly obligation of ${fmt(
        monthlyDebt
      )}. My income is ${fmt(income)}, expenses are ${fmt(
        expenses
      )}, and wallet balance is ${fmt(walletBalance)}. Tell me if this is safe.`
    );
  };

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border text-white shadow-2xl transition-all duration-200 ${tone.border}`}
    >
      <div className="absolute inset-0" style={{ background: tone.background }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/24 via-black/16 to-black/38" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/10 blur-3xl" />
      <div
        className={`pointer-events-none absolute right-5 top-24 h-24 w-24 rounded-full blur-3xl ${tone.accent}`}
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col justify-between">
          <div>
            <div className="mb-3 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${tone.iconShell}`}
              >
                <ShieldAlert className={`h-4 w-4 ${tone.icon}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-white">
                      Debt / Obligations
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-white/82">
                      Track and manage what you owe.
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${tone.status}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3 pr-8">
              <p className={`text-[30px] font-bold leading-none ${tone.value}`}>
                {fmt(totalDebt)}
              </p>

              <p className="mt-2 max-w-[28rem] overflow-hidden text-xs font-medium leading-relaxed text-white/82 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {description}
              </p>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-white/75">
                <span>Debt pressure</span>
                <span className="truncate text-right">{riskLevel}</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
                <div
                  className={`relative h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all duration-500`}
                  style={{ width: `${pressureProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-40" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
                <span>Monthly: {fmt(monthlyDebt)}</span>
                <span>Ratio: {debtRatio.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="min-h-0">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/82 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
            >
              <span className="font-medium">
                {expanded ? "Hide details" : "Show details"}
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expanded && (
              <div className="mt-3 max-h-[230px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      Total Debt
                    </p>
                    <p className="truncate text-sm font-bold text-white">
                      {fmt(totalDebt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      Monthly
                    </p>
                    <p className="truncate text-sm font-bold text-white">
                      {fmt(monthlyDebt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      Status
                    </p>
                    <p className="truncate text-sm font-bold text-white">
                      {riskLevel}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Debt type
                  </label>
                  <select
                    value={debtType}
                    onChange={(event) => setDebtType(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-rose-300/35"
                  >
                    {DEBT_TYPES.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                        className="bg-slate-950"
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      Total debt
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalDebtInput}
                      onChange={(event) => setTotalDebtInput(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-rose-300/35"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      Monthly payment
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={monthlyDebtInput}
                      onChange={(event) => setMonthlyDebtInput(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-rose-300/35"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Interest rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={interestInput}
                    onChange={(event) => setInterestInput(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-rose-300/35"
                  />
                  <p className="mt-1.5 text-[11px] font-medium text-white/60">
                    {smartFeedback}
                    {payoffMonths > 0
                      ? ` • Around ${payoffMonths} month${
                          payoffMonths === 1 ? "" : "s"
                        } at current payment.`
                      : ""}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-white/70">
                  Cash left after expenses:{" "}
                  <span className="font-semibold text-white">
                    {fmt(monthlyLeftover)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePlanPayoff}
                    className="flex items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15"
                  >
                    Plan payoff
                  </button>

                  <button
                    type="button"
                    onClick={handleAskClara}
                    className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
                  >
                    Ask CLARA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
