import { useEffect, useRef, useState } from "react";
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
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "bg-emerald-400",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "bg-emerald-400",
    };
  }

  if (months >= targetMonths * 0.33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "bg-amber-400",
    };
  }

  return {
    label: "At Risk",
    text: "text-red-300",
    badge: "bg-red-500/15 text-red-300 border border-red-400/25",
    bar: "bg-red-400",
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
  const [editing, setEditing] = useState(false);
  const [targetMonths, setTargetMonths] = useState(3);
  const [showModal, setShowModal] = useState(false);

  // only allow auto-open once per mount cycle
  const hasAutoPromptedRef = useRef(false);

  useEffect(() => {
    const safeSurvivalExpense = Number(survivalExpense) || 0;

    // if value exists, never auto-open
    if (safeSurvivalExpense > 0) {
      setShowModal(false);
      hasAutoPromptedRef.current = true;
      return;
    }

    // auto-open only once when truly no value yet
    if (!hasAutoPromptedRef.current) {
      setShowModal(true);
      hasAutoPromptedRef.current = true;
    }
  }, [survivalExpense]);

  const safeMoneyLeft = Number(moneyLeft) || 0;
  const safeSurvivalExpense = Number(survivalExpense) || 0;

  const target = safeSurvivalExpense * targetMonths;
  const months =
    safeSurvivalExpense > 0 ? safeMoneyLeft / safeSurvivalExpense : 0;
  const pct = target > 0 ? Math.min((safeMoneyLeft / target) * 100, 100) : 0;
  const status = getStatus(months, targetMonths);
  const progressionMsg = getProgression(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);

  const handleSaved = (val) => {
    setEditing(false);
    setShowModal(false);
    hasAutoPromptedRef.current = true;
    onSurvivalSaved?.(Number(val) || 0);
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const isModalOpen = showModal || editing;

  return (
    <>
      <SurvivalExpenseModal
        open={isModalOpen}
        onSaved={handleSaved}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(false);
            setShowModal(false);
          }
        }}
      />

      <div
        className="
          rounded-2xl p-4 mb-4 w-full overflow-hidden
          border border-white/10
          bg-[linear-gradient(135deg,rgba(20,14,26,0.98)_0%,rgba(33,20,38,0.96)_50%,rgba(22,15,28,0.98)_100%)]
          shadow-[0_12px_30px_rgba(0,0,0,0.35)]
        "
      >
        <div className="flex items-start gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />

          <p className="font-heading font-bold text-sm text-white flex-1 min-w-0 leading-snug">
            Emergency Fund Progress
          </p>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${status.badge}`}
          >
            {status.label}
          </span>

          <button
            type="button"
            onClick={handleEdit}
            className="text-white/45 hover:text-white/80 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-white/60 font-semibold">Goal:</span>

          <button
            type="button"
            onClick={() => setTargetMonths((m) => Math.max(3, m - 1))}
            className="w-7 h-7 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>

          <span className="font-heading font-bold text-base text-emerald-400 min-w-[88px] text-center">
            {targetMonths} Months
          </span>

          <button
            type="button"
            onClick={() => setTargetMonths((m) => Math.min(12, m + 1))}
            className="w-7 h-7 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>

          {milestone && (
            <span className="text-[11px] text-white/45">
              {milestone.label}
            </span>
          )}
        </div>

        <div className="mb-4">
          {safeMoneyLeft <= 0 ? (
            <p className="font-bold text-[clamp(1.6rem,4vw,2rem)] text-white/80 leading-tight">
              Start building your fund
            </p>
          ) : (
            <p
              className={`font-bold text-[clamp(1.7rem,4vw,2.1rem)] leading-tight ${status.text}`}
            >
              Survive {months.toFixed(1)} months
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/65 mb-1.5">
            <span>Progress to {targetMonths}-month target</span>
            <span>{pct.toFixed(0)}%</span>
          </div>

          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-[12px] text-white/55 mt-2 italic leading-relaxed">
            {progressionMsg}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
            <p className="text-[11px] text-white/55">Monthly Cost</p>
            <p className="font-bold text-sm text-white mt-1">
              {fmt(safeSurvivalExpense)}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
            <p className="text-[11px] text-white/55">Available</p>
            <p className="font-bold text-sm text-white mt-1">
              {fmt(safeMoneyLeft)}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
            <p className="text-[11px] text-white/55">Target</p>
            <p className="font-bold text-sm text-white mt-1">{fmt(target)}</p>
          </div>
        </div>

        {retentionRate !== undefined && retentionRate !== null && (
          <p className="text-xs text-white/55 mt-3">
            Retention Rate: {retentionRate}%
          </p>
        )}
      </div>
    </>
  );
}