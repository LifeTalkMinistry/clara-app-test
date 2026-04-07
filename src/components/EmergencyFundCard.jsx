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

const VALID_TARGET_MONTHS = [3, 6, 12];

const SURVIVAL_EXPENSE_KEY = "clara_survival_expense";
const SURVIVAL_SETUP_DONE_KEY = "survival_setup_done";
const EMERGENCY_TARGET_MONTHS_KEY = "clara_emergency_target_months";

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

function getStoredTargetMonths() {
  try {
    const saved = Number(localStorage.getItem(EMERGENCY_TARGET_MONTHS_KEY));
    if (VALID_TARGET_MONTHS.includes(saved)) return saved;
    return 3;
  } catch {
    return 3;
  }
}

function setStoredTargetMonths(value) {
  try {
    localStorage.setItem(EMERGENCY_TARGET_MONTHS_KEY, String(value));
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
      bar: "from-emerald-400 to-green-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    };
  }

  if (months >= targetMonths * 0.66) {
    return {
      label: "Stable",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 to-green-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    };
  }

  if (months >= targetMonths * 0.33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "from-amber-400 to-yellow-300",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.16)]",
    };
  }

  return {
    label: "At Risk",
    text: "text-rose-300",
    badge: "bg-rose-500/15 text-rose-300 border border-rose-400/25",
    bar: "from-rose-400 to-pink-300",
    ring: "shadow-[0_0_24px_rgba(244,63,94,0.16)]",
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
  const [targetMonths, setTargetMonths] = useState(getStoredTargetMonths());
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
    setStoredTargetMonths(targetMonths);
  }, [targetMonths]);

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

  const changeTargetMonths = (next) => {
    const currentIndex = VALID_TARGET_MONTHS.indexOf(targetMonths);

    if (next < targetMonths) {
      const prevIndex = Math.max(0, currentIndex - 1);
      const safeNext = VALID_TARGET_MONTHS[prevIndex];
      setTargetMonths(safeNext);
      setStoredTargetMonths(safeNext);
      return;
    }

    if (next > targetMonths) {
      const nextIndex = Math.min(
        VALID_TARGET_MONTHS.length - 1,
        currentIndex + 1
      );
      const safeNext = VALID_TARGET_MONTHS[nextIndex];
      setTargetMonths(safeNext);
      setStoredTargetMonths(safeNext);
      return;
    }

    if (VALID_TARGET_MONTHS.includes(next)) {
      setTargetMonths(next);
      setStoredTargetMonths(next);
    }
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

      <div
        className={`relative overflow-hidden rounded-3xl p-4 mb-3 border border-white/10 bg-gradient-to-br from-[#120d19] via-[#181227] to-[#0c1628] shadow-2xl ${status.ring}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.08),transparent_28%),radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 flex items-start gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(52,211,153,0.12)]">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base text-white tracking-tight">
              Emergency Fund Progress
            </p>
            <p className="text-[11px] text-white/70 mt-0.5 font-medium">
              Protection based on your monthly survival expense
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold backdrop-blur-sm ${status.badge}`}
            >
              {status.label}
            </span>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-7.5 h-7.5 min-w-[30px] min-h-[30px] rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative z-10 mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-white/90 font-semibold">Goal</span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeTargetMonths(targetMonths - 1)}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <Minus className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => changeTargetMonths(targetMonths + 1)}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {VALID_TARGET_MONTHS.map((m) => {
              const active = targetMonths === m;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => changeTargetMonths(m)}
                  className={`relative rounded-lg px-2 py-2 text-xs font-semibold border transition-all duration-200 ${
                    active
                      ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.25)]"
                      : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="block">{m} Months</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium text-white/60 uppercase tracking-[0.14em]">
              Selected Plan
            </span>
            <span className="text-xs font-semibold text-white/85">
              {milestone?.label}
            </span>
          </div>
        </div>

        <div className="relative z-10 mb-4 flex items-end justify-between gap-3">
          <div>
            {safeMoneyLeft <= 0 ? (
              <p className="text-lg text-white/95 font-semibold">
                Start building your fund
              </p>
            ) : (
              <p className={`text-[28px] leading-none font-bold ${status.text}`}>
                {months.toFixed(1)}
                <span className="text-base font-semibold text-white/90 ml-1.5">
                  months
                </span>
              </p>
            )}
            <p className="text-xs text-white/80 mt-1.5 font-medium max-w-[28rem] leading-relaxed">
              {progression}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-semibold">
              Progress
            </p>
            <p className="text-xl font-bold text-white">{pct.toFixed(0)}%</p>
          </div>
        </div>

        <div className="relative z-10 mb-4">
          <div className="flex items-center justify-between mb-1.5 text-[11px] font-medium text-white/60">
            <span>Current progress</span>
            <span>
              {fmt(safeMoneyLeft)} / {fmt(target)}
            </span>
          </div>

          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500 relative`}
              style={{ width: `${pct}%` }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-40" />
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 text-center text-sm text-white">
          <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-sm">
            <p className="text-white/65 text-[10px] uppercase tracking-[0.16em] mb-1 font-semibold">
              Monthly
            </p>
            <p className="font-bold text-sm text-white">{fmt(effectiveExpense)}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-sm">
            <p className="text-white/65 text-[10px] uppercase tracking-[0.16em] mb-1 font-semibold">
              Available
            </p>
            <p className="font-bold text-sm text-white">{fmt(safeMoneyLeft)}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-sm">
            <p className="text-white/65 text-[10px] uppercase tracking-[0.16em] mb-1 font-semibold">
              Target
            </p>
            <p className="font-bold text-sm text-white">{fmt(target)}</p>
          </div>
        </div>

        {retentionRate != null && (
          <div className="relative z-10 mt-3 flex items-center justify-between text-xs text-white/70 font-medium">
            <span>Retention Rate</span>
            <span className="text-white/90">{retentionRate}%</span>
          </div>
        )}
      </div>
    </>
  );
}