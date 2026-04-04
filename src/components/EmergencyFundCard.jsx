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
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "bg-[linear-gradient(90deg,#25d366,#34d399)]",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "bg-[linear-gradient(90deg,#25d366,#34d399)]",
    };
  }

  if (months >= targetMonths * 0.33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge:
        "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]",
    };
  }

  return {
    label: "At Risk",
    text: "text-[#ff96aa]",
    badge: "bg-[#5b2330] text-[#ff96aa] border border-[#ff96aa]/15",
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

      <div className="mb-6 rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,#1a0f27,#120a1a)] p-7 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#30e38c]" />
              <span className="text-sm font-semibold">
                Emergency Fund Progress
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-white/65">Goal:</span>

              <button
                onClick={decrease}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/8 transition hover:bg-white/12"
              >
                <Minus className="h-4 w-4" />
              </button>

              <span className="text-3xl font-bold text-[#30e38c]">
                {targetMonths}
              </span>
              <span className="text-xl font-bold text-[#30e38c]">Months</span>

              <button
                onClick={increase}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/8 transition hover:bg-white/12"
              >
                <Plus className="h-4 w-4" />
              </button>

              {milestone && (
                <span className="text-sm text-white/45">{milestone.label}</span>
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
              className="transition hover:text-white/80"
            >
              <Edit2 className="h-4 w-4 text-white/45" />
            </button>
          </div>
        </div>

        <h2 className={`mb-4 text-3xl font-bold md:text-5xl ${status.text}`}>
          {moneyLeft <= 0
            ? "Start building your fund"
            : `Survive ${months.toFixed(1)} months`}
        </h2>

        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-white/70">
            Progress to {targetMonths}-month target
          </span>
          <span className="font-semibold text-white/78">{pct.toFixed(0)}%</span>
        </div>

        <div className="mb-4 h-2.5 rounded-full bg-white/8 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mb-6 text-sm italic text-white/45">{progressionMsg}</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center">
            <p className="mb-1 text-xs text-white/45">Monthly Cost</p>
            <p className="text-2xl font-bold">{fmt(survivalExpense)}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center">
            <p className="mb-1 text-xs text-white/45">Available</p>
            <p className="text-2xl font-bold">{fmt(moneyLeft)}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center">
            <p className="mb-1 text-xs text-white/45">Target</p>
            <p className="text-2xl font-bold">{fmt(target)}</p>
          </div>
        </div>

        {retentionRate !== undefined && (
          <p className="mt-4 text-sm text-white/55">
            Retention Rate: <span className="text-white">{retentionRate}%</span>
          </p>
        )}
      </div>
    </>
  );
}