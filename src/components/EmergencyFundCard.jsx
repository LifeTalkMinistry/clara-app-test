import { useState } from "react";
import { Shield, Edit2, Minus, Plus } from "lucide-react";

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
  if (months >= targetMonths) return { label: "Secure", color: "emerald" };
  if (months >= targetMonths * 0.66) return { label: "Stable", color: "emerald" };
  if (months >= targetMonths * 0.33) return { label: "Building", color: "amber" };
  return { label: "At Risk", color: "red" };
}

export default function EmergencyFundCard({
  moneyLeft,
  survivalExpense,
  retentionRate,
}) {
  const [targetMonths, setTargetMonths] = useState(3);

  const target = survivalExpense * targetMonths;
  const months = survivalExpense > 0 ? moneyLeft / survivalExpense : 0;
  const pct = target > 0 ? Math.min((moneyLeft / target) * 100, 100) : 0;

  const status = getStatus(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);

  return (
    <div className="rounded-[28px] p-7 md:p-8 mb-6 border border-white/10 bg-gradient-to-br from-[#1a0f27] via-[#160d22] to-[#1b1022] text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#30e38c]" />
            <span className="text-sm font-semibold">Emergency Fund Progress</span>
          </div>

          {/* TARGET */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white/70 text-sm">Goal:</span>

            <button className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
              <Minus className="w-4 h-4" />
            </button>

            <span className="text-[#30e38c] text-3xl font-bold">
              {targetMonths}
            </span>

            <span className="text-[#30e38c] text-xl font-bold">
              Months
            </span>

            <button className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </button>

            {milestone && (
              <span className="text-sm text-white/50">
                {milestone.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#5b2330] text-[#ff8ea1] text-sm font-semibold">
            {status.label}
          </span>
          <Edit2 className="w-4 h-4 text-white/50" />
        </div>
      </div>

      {/* TITLE */}
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        Start building your fund
      </h2>

      {/* PROGRESS */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-white/70">Progress to target</span>
        <span className="text-sm text-white/70 font-semibold">
          {pct.toFixed(0)}%
        </span>
      </div>

      <div className="h-2.5 bg-white/10 rounded-full mb-4">
        <div
          className="h-full bg-gradient-to-r from-[#25d366] to-[#34d399] rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-sm italic text-white/50 mb-6">
        Start with {targetMonths} months of protection.
      </p>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-xs text-white/50 mb-1">Monthly Cost</p>
          <p className="text-xl font-bold">{fmt(survivalExpense)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-xs text-white/50 mb-1">Available</p>
          <p className="text-xl font-bold">{fmt(moneyLeft)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-xs text-white/50 mb-1">Target</p>
          <p className="text-xl font-bold">{fmt(target)}</p>
        </div>
      </div>

      {retentionRate !== undefined && (
        <p className="text-sm text-white/60 mt-4">
          Retention Rate: <span className="text-white">{retentionRate}%</span>
        </p>
      )}
    </div>
  );
}