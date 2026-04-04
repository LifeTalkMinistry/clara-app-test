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
      text: "text-white",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
      bar: "bg-gradient-to-r from-emerald-400 to-green-400",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-white",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
      bar: "bg-gradient-to-r from-emerald-400 to-green-400",
    };
  }

  if (months >= targetMonths * 0.33) {
    return {
      label: "Building",
      text: "text-white",
      badge:
        "bg-amber-500/15 text-amber-300 border border-amber-400/20",
      bar: "bg-gradient-to-r from-amber-400 to-yellow-400",
    };
  }

  return {
    label: "At Risk",
    text: "text-white",
    badge: "bg-[#6b2534] text-[#ff9daf] border border-[#ff9daf]/10",
    bar: "bg-gradient-to-r from-pink-400 to-red-400",
  };
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

      {/* CARD */}
      <div className="mb-6 rounded-3xl border border-[#5a3a5d]/40 bg-gradient-to-br from-[#1b0d26] to-[#14091f] p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white/90">
                Emergency Fund Progress
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">Goal:</span>

              <button
                onClick={decrease}
                className="h-8 w-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <Minus size={14} />
              </button>

              <span className="text-2xl font-bold text-emerald-400">
                {targetMonths} Months
              </span>

              <button
                onClick={increase}
                className="h-8 w-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10"
              >
                <Plus size={14} />
              </button>

              {milestone && (
                <span className="text-sm text-white/40">
                  {milestone.label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm rounded-full ${status.badge}`}>
              {status.label}
            </span>

            <button onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 text-white/50 hover:text-white" />
            </button>
          </div>
        </div>

        {/* TITLE */}
        <h2 className="text-[42px] font-bold leading-tight mb-4">
          {moneyLeft <= 0
            ? "Start building your fund"
            : `Survive ${months.toFixed(1)} months`}
        </h2>

        {/* PROGRESS */}
        <div className="mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/70">Progress to target</span>
            <span className="text-white/90 font-semibold">
              {pct.toFixed(0)}%
            </span>
          </div>

          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`${status.bar} h-full rounded-full transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-sm text-white/40 italic mt-2">
            Start with 3 months of protection.
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
            <p className="text-xs text-white/50 mb-1">Monthly Cost</p>
            <p className="text-lg font-bold">{fmt(survivalExpense)}</p>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
            <p className="text-xs text-white/50 mb-1">Available</p>
            <p className="text-lg font-bold">{fmt(moneyLeft)}</p>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 text-center">
            <p className="text-xs text-white/50 mb-1">Target</p>
            <p className="text-lg font-bold">{fmt(target)}</p>
          </div>
        </div>

        {retentionRate !== undefined && (
          <p className="mt-4 text-sm text-white/60">
            Retention Rate:{" "}
            <span className="text-white font-semibold">
              {retentionRate}%
            </span>
          </p>
        )}
      </div>
    </>
  );
}