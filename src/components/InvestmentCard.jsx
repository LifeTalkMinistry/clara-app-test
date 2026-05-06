import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

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

const INVESTMENT_TYPES = [
  { value: "business", label: "Business" },
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "time_deposit", label: "Time Deposit" },
  { value: "other", label: "Other" },
];

const getInvestmentToneClasses = (tone = "gold") => {
  const claraInvestmentTone = {
    border: "border-cyan-300/20",
    iconShell:
      "border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
    icon: "text-cyan-100",
    status:
      "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
    value: "text-cyan-100",
    bar: "from-cyan-300 via-blue-300 to-violet-300",
    accent: "bg-blue-300/14",
    focus: "focus:border-cyan-300/35",
    primaryButton:
      "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/15",
    background:
      "radial-gradient(circle at -16% -22%, rgba(20,184,166,0.22), transparent 46%), radial-gradient(circle at 69% 112%, rgba(99,102,241,0.20), transparent 58%), linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.96) 48%, rgba(37,13,74,0.96))",
  };

  const toneMap = {
    emerald: {
      border: "border-emerald-300/20",
      iconShell:
        "border-emerald-300/25 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.14)]",
      icon: "text-emerald-200",
      status:
        "border-emerald-300/25 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.12)]",
      value: "text-emerald-200",
      bar: "from-emerald-300 via-emerald-400 to-green-300",
      accent: "bg-emerald-300/14",
      focus: "focus:border-emerald-300/35",
      primaryButton:
        "border-emerald-300/25 bg-emerald-500/10 text-emerald-100 transition hover:bg-emerald-500/15",
      background:
        "radial-gradient(circle at -16% -22%, rgba(16,185,129,0.22), transparent 46%), radial-gradient(circle at 69% 112%, rgba(20,184,166,0.18), transparent 58%), linear-gradient(135deg, rgba(4,25,24,0.98), rgba(3,14,24,0.99))",
    },
    teal: {
      border: "border-teal-300/20",
      iconShell:
        "border-teal-300/25 bg-teal-400/10 shadow-[0_0_18px_rgba(45,212,191,0.14)]",
      icon: "text-teal-200",
      status:
        "border-teal-300/25 bg-teal-500/15 text-teal-200 shadow-[0_0_18px_rgba(45,212,191,0.12)]",
      value: "text-teal-200",
      bar: "from-teal-300 via-cyan-300 to-emerald-300",
      accent: "bg-teal-300/14",
      focus: "focus:border-teal-300/35",
      primaryButton:
        "border-teal-300/25 bg-teal-500/10 text-teal-100 transition hover:bg-teal-500/15",
      background:
        "radial-gradient(circle at -16% -22%, rgba(45,212,191,0.22), transparent 46%), radial-gradient(circle at 69% 112%, rgba(56,189,248,0.18), transparent 58%), linear-gradient(135deg, rgba(4,23,30,0.98), rgba(3,14,24,0.99))",
    },
    blue: claraInvestmentTone,
    gold: claraInvestmentTone,
    rose: {
      border: "border-rose-300/20",
      iconShell:
        "border-rose-300/25 bg-rose-400/10 shadow-[0_0_18px_rgba(251,113,133,0.12)]",
      icon: "text-rose-200",
      status:
        "border-rose-300/25 bg-rose-500/15 text-rose-200 shadow-[0_0_18px_rgba(251,113,133,0.10)]",
      value: "text-rose-100",
      bar: "from-rose-300 via-pink-300 to-violet-300",
      accent: "bg-rose-300/14",
      focus: "focus:border-rose-300/35",
      primaryButton:
        "border-rose-300/25 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/15",
      background:
        "radial-gradient(circle at -16% -22%, rgba(251,113,133,0.18), transparent 46%), radial-gradient(circle at 69% 112%, rgba(124,58,237,0.18), transparent 58%), linear-gradient(135deg, rgba(40,12,18,0.96), rgba(3,14,24,0.99))",
    },
  };

  return toneMap[tone] || claraInvestmentTone;
};

const getDataValue = (data, keys, fallback = null) => {
  for (const key of keys) {
    const value = data?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const getEmergencyValue = (emergencyFund, keys, fallback = 0) => {
  for (const key of keys) {
    const value = emergencyFund?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

export default function InvestmentCard({ item = null }) {
  const [expanded, setExpanded] = useState(false);
  const [investmentType, setInvestmentType] = useState("business");
  const [plannedAmount, setPlannedAmount] = useState("");

  const {
    emergencyFund,
    totalExpenses = 0,
    totalIncome = 0,
    totalWalletBalance = 0,
  } = useFinancialData();

  const data = item?.data || {};
  const tone = getInvestmentToneClasses(item?.tone || data.tone || "gold");

  const title = data.title || item?.label || "Investment Fund";
  const subtitle = data.subtitle || "Decide before you invest.";

  const emergencySaved = toNumber(
    getEmergencyValue(
      emergencyFund,
      ["savedAmount", "saved_amount", "amount", "balance", "moneyLeft"],
      0
    )
  );
  const emergencyExpense = toNumber(
    getEmergencyValue(
      emergencyFund,
      ["survivalExpense", "survival_expense", "monthlyExpense", "monthly_expense"],
      0
    )
  );
  const emergencyTargetMonths = toNumber(
    getEmergencyValue(
      emergencyFund,
      ["targetMonths", "target_months", "months_target"],
      3
    )
  );

  const emergencyTarget = emergencyExpense * emergencyTargetMonths;
  const emergencyGap = Math.max(0, emergencyTarget - emergencySaved);
  const monthlyLeftover = Math.max(0, toNumber(totalIncome) - toNumber(totalExpenses));

  const safeToInvest = useMemo(() => {
    const dataOverride = getDataValue(data, ["safeToInvest", "availableToInvest"], null);

    if (dataOverride !== null) return Math.max(0, toNumber(dataOverride));

    const walletBase = Math.max(0, toNumber(totalWalletBalance) - emergencyGap);
    const conservativeWalletShare = walletBase * 0.12;
    const conservativeLeftoverShare = monthlyLeftover * 0.4;
    const estimate = Math.min(
      conservativeWalletShare,
      conservativeLeftoverShare || conservativeWalletShare
    );

    return Math.max(0, Math.floor(estimate / 100) * 100);
  }, [data, emergencyGap, monthlyLeftover, totalWalletBalance]);

  const plannedValue = toNumber(plannedAmount);
  const canSafelyInvest = safeToInvest > 0;
  const readinessProgress = clampProgress(
    getDataValue(
      data,
      ["readiness", "readinessProgress"],
      canSafelyInvest
        ? 100
        : emergencyTarget > 0
          ? (emergencySaved / emergencyTarget) * 100
          : 0
    )
  );
  const selectedType =
    INVESTMENT_TYPES.find((type) => type.value === investmentType)?.label ||
    "Business";
  const amountStatus =
    plannedValue > 0 && safeToInvest > 0
      ? plannedValue <= safeToInvest
        ? "Within safe range"
        : "Above safe range"
      : canSafelyInvest
        ? "Safe amount available"
        : "Build protection first";
  const statusLabel =
    data.statusLabel || data.ctaLabel || (canSafelyInvest ? "Ready" : "Not ready");
  const mainLabel =
    data.mainLabel || (canSafelyInvest ? `${fmt(safeToInvest)} safe` : "Not ready");
  const description =
    data.description ||
    (canSafelyInvest
      ? "You can start planning an investment based on your current finances."
      : "Build your emergency fund first before investing.");

  const statOneLabel = data.statOneLabel || "Safe";
  const statOneValue = data.statOneValue || (canSafelyInvest ? fmt(safeToInvest) : "₱0");
  const statTwoLabel = data.statTwoLabel || "Type";
  const statTwoValue = data.statTwoValue || selectedType;
  const statThreeLabel = data.statThreeLabel || "Status";
  const statThreeValue = data.statThreeValue || (canSafelyInvest ? "Ready" : "Not ready");

  const dispatchInvestmentPrompt = (prompt) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "investment-card",
          prompt,
          investmentType,
          plannedAmount: plannedValue,
          safeToInvest,
        },
      })
    );
  };

  const handlePlanInvestment = () => {
    dispatchInvestmentPrompt(
      `Help me plan an investment. Type: ${selectedType}. Amount I want to invest: ${
        plannedValue > 0 ? fmt(plannedValue) : "not set yet"
      }. CLARA says my safe-to-invest amount is ${fmt(safeToInvest)}.`
    );
  };

  const handleAskClara = () => {
    dispatchInvestmentPrompt(
      `Can I invest ${
        plannedValue > 0 ? fmt(plannedValue) : "money"
      } right now in ${selectedType}? Check my budget, wallet balance, emergency fund, and spending behavior first.`
    );
  };

  return (
    <div
      className={`clara-finance-bubble-card clara-finance-bubble-investment relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border text-white shadow-2xl transition-all duration-200 ${tone.border}`}
    >
      <div className="absolute inset-0" style={{ background: tone.background }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/18 via-black/12 to-black/32" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/8 blur-3xl" />
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
                <TrendingUp className={`h-4 w-4 ${tone.icon}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-white">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-white/82">
                      {subtitle}
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
                {mainLabel}
              </p>

              <p className="mt-2 max-w-[28rem] overflow-hidden text-xs font-medium leading-relaxed text-white/82 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {description}
              </p>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-white/75">
                <span>Readiness</span>
                <span className="truncate text-right">
                  {canSafelyInvest ? "Ready" : "Build protection"}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
                <div
                  className={`relative h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all duration-500`}
                  style={{ width: `${readinessProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-40" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
                <span>Safe: {canSafelyInvest ? fmt(safeToInvest) : "₱0"}</span>
                <span>Status: {canSafelyInvest ? "Ready" : "Not ready"}</span>
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
                      {statOneLabel}
                    </p>
                    <p className="truncate text-sm font-bold text-white">
                      {statOneValue}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      {statTwoLabel}
                    </p>
                    <p className="truncate text-sm font-bold text-white">
                      {statTwoValue}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      {statThreeLabel}
                    </p>
                    <p className="truncate text-sm font-bold text-white">
                      {statThreeValue}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Investment type
                  </label>
                  <select
                    value={investmentType}
                    onChange={(event) => setInvestmentType(event.target.value)}
                    className={`w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition ${tone.focus}`}
                  >
                    {INVESTMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value} className="bg-slate-950">
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    Money to invest
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={plannedAmount}
                    onChange={(event) => setPlannedAmount(event.target.value)}
                    placeholder="0"
                    className={`w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 ${tone.focus}`}
                  />
                  <p className="mt-1.5 text-[11px] font-medium text-white/60">
                    {amountStatus}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePlanInvestment}
                    className={`flex items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-semibold ${tone.primaryButton}`}
                  >
                    Plan Investment
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
