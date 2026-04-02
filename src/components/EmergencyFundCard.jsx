import { useEffect, useState } from "react";
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
  if (months >= targetMonths) {
    return { label: "Secure", color: "emerald" };
  }
  if (months >= targetMonths * 0.66) {
    return { label: "Stable", color: "emerald" };
  }
  if (months >= targetMonths * 0.33) {
    return { label: "Building", color: "amber" };
  }
  return { label: "At Risk", color: "red" };
}

export default function EmergencyFundCard({
  moneyLeft,
  survivalExpense,
  retentionRate,
  onSurvivalSaved,
}) {
  const [targetMonths, setTargetMonths] = useState(3);

  const target = survivalExpense * targetMonths;
  const months = survivalExpense > 0 ? moneyLeft / survivalExpense : 0;
  const pct = target > 0 ? Math.min((moneyLeft / target) * 100, 100) : 0;

  const status = getStatus(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);

  return (
    <div className="rounded-2xl p-5 mb-4 border border-white/10 bg-[#0F172A] text-white">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <p className="font-semibold text-sm">Emergency Fund Progress</p>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300">
          {status.label}
        </span>
      </div>

      {/* TARGET */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setTargetMonths((m) => Math.max(3, m - 1))}>
          <Minus className="w-4 h-4" />
        </button>

        <span className="font-bold text-emerald-400">
          {targetMonths} Months
        </span>

        <button onClick={() => setTargetMonths((m) => Math.min(12, m + 1))}>
          <Plus className="w-4 h-4" />
        </button>

        {milestone && (
          <span className="text-xs text-white/50 ml-2">
            {milestone.label}
          </span>
        )}
      </div>

      {/* MAIN */}
      <h2 className="text-2xl font-bold text-emerald-300 mb-3">
        Survive {months.toFixed(1)} months
      </h2>

      {/* PROGRESS */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span>Progress to {targetMonths}-month target</span>
          <span>{pct.toFixed(0)}%</span>
        </div>

        <div className="h-2 bg-white/10 rounded-full">
          <div
            className="h-full bg-emerald-400 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white/5 p-3 rounded-lg">
          <p className="text-xs text-white/50">Monthly</p>
          <p className="font-bold">{fmt(survivalExpense)}</p>
        </div>

        <div className="bg-white/5 p-3 rounded-lg">
          <p className="text-xs text-white/50">Available</p>
          <p className="font-bold">{fmt(moneyLeft)}</p>
        </div>

        <div className="bg-white/5 p-3 rounded-lg">
          <p className="text-xs text-white/50">Target</p>
          <p className="font-bold">{fmt(target)}</p>
        </div>
      </div>

      {retentionRate !== undefined && (
        <p className="text-xs text-white/50 mt-3">
          Retention Rate: {retentionRate}%
        </p>
      )}
    </div>
  );
}