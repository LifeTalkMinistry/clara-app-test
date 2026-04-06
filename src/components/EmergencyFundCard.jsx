import { useEffect, useMemo, useRef, useState } from "react";
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

const SURVIVAL_EXPENSE_KEY = "clara_survival_expense";
const SURVIVAL_SETUP_DONE_KEY = "survival_setup_done";

function getLocalSurvivalExpense() {
  try {
    const direct = localStorage.getItem("monthly_survival_expense");
    if (direct && Number(direct) > 0) return Number(direct);

    const clara = localStorage.getItem(SURVIVAL_EXPENSE_KEY);
    if (clara && Number(clara) > 0) return Number(clara);

    const user = JSON.parse(localStorage.getItem("clara_user") || "null");
    if (
      user?.monthly_survival_expense &&
      Number(user.monthly_survival_expense) > 0
    ) {
      return Number(user.monthly_survival_expense);
    }

    return 0;
  } catch {
    return 0;
  }
}

function setLocalSurvivalExpense(value) {
  try {
    localStorage.setItem("monthly_survival_expense", String(value));
    localStorage.setItem(SURVIVAL_EXPENSE_KEY, String(value));
    localStorage.setItem(SURVIVAL_SETUP_DONE_KEY, "true");

    const currentUser =
      JSON.parse(localStorage.getItem("clara_user") || "null") || {};

    localStorage.setItem(
      "clara_user",
      JSON.stringify({
        ...currentUser,
        monthly_survival_expense: Number(value),
        survival_setup_done: true,
      })
    );
  } catch {}
}

function isSetupDone() {
  try {
    return localStorage.getItem(SURVIVAL_SETUP_DONE_KEY) === "true";
  } catch {
    return false;
  }
}

function getStatus(months, targetMonths) {
  if (months >= targetMonths) {
    return {
      label: "Secure",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "bg-emerald-400",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
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

  return `Start with ${targetMonths} month${
    targetMonths > 1 ? "s" : ""
  } of protection.`;
}

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
}) {
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetMonths, setTargetMonths] = useState(3);
  const [localExpense, setLocalExpense] = useState(getLocalSurvivalExpense());

  const hasPrompted = useRef(false);

  const propExpense = Number(survivalExpense) || 0;
  const effectiveExpense = propExpense || localExpense;
  const safeMoneyLeft = Number(moneyLeft) || 0;

  useEffect(() => {
    if (propExpense > 0) {
      setLocalSurvivalExpense(propExpense);
      setLocalExpense(propExpense);
    }
  }, [propExpense]);

  useEffect(() => {
    if (hasPrompted.current) return;

    const done = isSetupDone();
    const hasValue = effectiveExpense > 0;

    if (!done && !hasValue) {
      setShowModal(true);
    }

    hasPrompted.current = true;
  }, [effectiveExpense]);

  const target = useMemo(
    () => effectiveExpense * targetMonths,
    [effectiveExpense, targetMonths]
  );

  const months = useMemo(
    () => (effectiveExpense > 0 ? safeMoneyLeft / effectiveExpense : 0),
    [safeMoneyLeft, effectiveExpense]
  );

  const pct = useMemo(
    () => (target > 0 ? Math.min((safeMoneyLeft / target) * 100, 100) : 0),
    [safeMoneyLeft, target]
  );

  const status = getStatus(months, targetMonths);
  const progression = getProgression(months, targetMonths);
  const milestone = MILESTONES.find((m) => m.months === targetMonths);

  const handleSaved = (val) => {
    const num = Number(val) || 0;

    setLocalSurvivalExpense(num);
    setLocalExpense(num);
    setEditing(false);
    setShowModal(false);
    hasPrompted.current = true;

    onSurvivalSaved?.(num);
  };

  return (
    <>
      <SurvivalExpenseModal
        open={showModal || editing}
        onSaved={handleSaved}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(false);
            setShowModal(false);
          }
        }}
      />

      <div className="rounded-2xl p-4 mb-4 border border-white/10 bg-gradient-to-br from-[#140E1A] via-[#211426] to-[#160F1C] shadow-xl">
        <div className="flex items-start gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />

          <p className="font-bold text-sm text-white flex-1">
            Emergency Fund Progress
          </p>

          <span className={`text-xs px-2 py-1 rounded-full ${status.badge}`}>
            {status.label}
          </span>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-white/60 hover:text-white"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-white/60">Goal:</span>

          <button
            type="button"
            onClick={() => setTargetMonths((m) => Math.max(3, m - 3))}
            className="text-white/70 hover:text-white"
          >
            <Minus className="w-3" />
          </button>

          <span className="font-bold text-emerald-400">
            {targetMonths} Months
          </span>

          <button
            type="button"
            onClick={() => setTargetMonths((m) => Math.min(12, m + 3))}
            className="text-white/70 hover:text-white"
          >
            <Plus className="w-3" />
          </button>

          {milestone && (
            <span className="text-xs text-white/40">{milestone.label}</span>
          )}
        </div>

        <div className="mb-4">
          {safeMoneyLeft <= 0 ? (
            <p className="text-xl text-white/80">Start building your fund</p>
          ) : (
            <p className={`text-xl font-bold ${status.text}`}>
              Survive {months.toFixed(1)} months
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>Progress</span>
            <span>{pct.toFixed(0)}%</span>
          </div>

          <div className="h-2 bg-white/10 rounded overflow-hidden">
            <div
              className={`${status.bar} h-full transition-all duration-300`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-xs text-white/50 mt-2 italic">{progression}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
          <div>
            <p className="text-white/50 text-xs">Monthly</p>
            <p>{fmt(effectiveExpense)}</p>
          </div>

          <div>
            <p className="text-white/50 text-xs">Available</p>
            <p>{fmt(safeMoneyLeft)}</p>
          </div>

          <div>
            <p className="text-white/50 text-xs">Target</p>
            <p>{fmt(target)}</p>
          </div>
        </div>

        {retentionRate != null && (
          <p className="text-xs text-white/50 mt-3">
            Retention Rate: {retentionRate}%
          </p>
        )}
      </div>
    </>
  );
}