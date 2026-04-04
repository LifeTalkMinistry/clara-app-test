import { useEffect, useState } from "react";
import { Shield, Edit2, Minus, Plus } from "lucide-react";
import SurvivalExpenseModal from "./SurvivalExpenseModal";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n || 0);

const MILESTONES = [
  { months: 3, label: "Basic Safety" },
  { months: 6, label: "Strong Stability" },
  { months: 12, label: "Full Protection" },
];

function getStatus(months, targetMonths) {
  if (months >= targetMonths) {
    return {
      label: "Secure",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
      bar: "bg-[linear-gradient(90deg,#25d366,#34d399)]",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
      bar: "bg-[linear-gradient(90deg,#25d366,#34d399)]",
    };
  }

  if (months >= targetMonths * 0.33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge:
        "bg-amber-500/15 text-amber-300 border border-amber-400/20",
      bar: "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]",
    };
  }

  return {
    label: "At Risk",
    text: "text-[#f7e6d2]",
    badge: "bg-[#6b2534] text-[#ff9daf] border border-[#ff9daf]/10",
    bar: "bg-[linear-gradient(90deg,#ff6b8a,#ff96aa)]",
  };
}

function getProgression(months, targetMonths) {
  if (months >= targetMonths && targetMonths === 3) {
    return "Great job! Increase your safety to 6 months?";
  }
  if (months >= targetMonths && targetMonths === 6) {
    return "You're building strong security. Aim for 12 months!";
  }
  if (months >= targetMonths) {
    return "Outstanding! You have maximum financial protection.";
  }

  return `Start with ${targetMonths} month${targetMonths > 1 ? "s" : ""} of protection.`;
}

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
}) {
  const [targetMonths, setTargetMonths] = useState(3);
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!survivalExpense || Number(survivalExpense) <= 0) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [survivalExpense]);

  const target = (survivalExpense || 0) * targetMonths;
  const months = survivalExpense > 0 ? moneyLeft / survivalExpense : 0;
  const pct = target > 0 ? Math.min((moneyLeft / target) * 100, 100) : 0;

  const status = getStatus(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);
  const progressionMsg = getProgression(months, targetMonths);

  const decrease = () => setTargetMonths((prev) => Math.max(3, prev - 3));
  const increase = () => setTargetMonths((prev) => Math.min(12, prev + 3));

  const handleSaved = (val) => {
    setEditing(false);
    setShowModal(false);
    onSurvivalSaved?.(val);
  };

  return (
    <>
      <SurvivalExpenseModal
        open={showModal || editing}
        onSaved={handleSaved}
      />

      <div className="mb-5 rounded-[28px] border border-[#6d456f]/40 bg-[linear-gradient(180deg,#1d0d29_0%,#180a23_100%)] px-5 py-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] md:px-6 md:py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#30e38c]" />
                <span className="text-[15px] font-semibold text-white">
                  Emergency Fund Progress
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-sm font-medium text-white/65">Goal:</span>

                <button
                  onClick={decrease}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/75 transition hover:bg-white/12 hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="text-[20px] font-bold leading-none text-[#2ef08d] md:text-[22px]">
                  {targetMonths} Months
                </span>

                <button
                  onClick={increase}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/75 transition hover:bg-white/12 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {milestone && (
                  <span className="text-sm text-white/45">
                    {milestone.label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${status.badge}`}
              >
                {status.label}
              </span>

              <button
                onClick={() => setEditing(true)}
                className="text-white/45 transition hover:text-white/80"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <h2 className={`text-[34px] font-bold leading-tight md:text-[40px] ${status.text}`}>
              {moneyLeft <= 0
                ? "Start building your fund"
                : `Survive ${months.toFixed(1)} months`}
            </h2>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-white/72">
                Progress to {targetMonths}-month target
              </span>
              <span className="font-semibold text-white/85">
                {pct.toFixed(0)}%
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="mt-2.5 text-sm italic text-white/45">
              {progressionMsg}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
              <p className="mb-1 text-xs font-medium text-white/45">
                Monthly Cost
              </p>
              <p className="text-[18px] font-bold text-white md:text-[19px]">
                {fmt(survivalExpense)}
              </p>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
              <p className="mb-1 text-xs font-medium text-white/45">
                Available
              </p>
              <p className="text-[18px] font-bold text-white md:text-[19px]">
                {fmt(moneyLeft)}
              </p>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
              <p className="mb-1 text-xs font-medium text-white/45">
                Target
              </p>
              <p className="text-[18px] font-bold text-white md:text-[19px]">
                {fmt(target)}
              </p>
            </div>
          </div>

          {retentionRate !== undefined && (
            <div className="pt-1 text-sm text-white/58">
              Retention Rate:{" "}
              <span className="font-semibold text-white">
                {retentionRate}%
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}