import { useMemo } from "react";
import {
  Target,
  Trash2,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Edit3,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const getSaved = (goal) =>
  Number(
    goal?.saved_amount ??
      goal?.current_amount ??
      goal?.saved ??
      goal?.progress_amount ??
      0
  );

const getTarget = (goal) =>
  Number(
    goal?.target_amount ??
      goal?.goal_amount ??
      goal?.target ??
      goal?.amount ??
      0
  );

const getTitle = (goal) =>
  goal?.title || goal?.name || goal?.goal_name || "Savings Goal";

function getSavingsStatus(progress) {
  if (progress >= 100) {
    return {
      label: "Reached",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 via-lime-300 to-cyan-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    };
  }

  if (progress >= 66) {
    return {
      label: "Close",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 via-lime-300 to-cyan-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    };
  }

  if (progress >= 33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "from-amber-400 via-yellow-300 to-lime-300",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.15)]",
    };
  }

  return {
    label: "Starting",
    text: "text-cyan-300",
    badge: "bg-cyan-500/15 text-cyan-300 border border-cyan-400/25",
    bar: "from-cyan-400 via-emerald-300 to-lime-300",
    ring: "shadow-[0_0_24px_rgba(34,211,238,0.14)]",
  };
}

function getSavingsMessage(goalCount, progress) {
  if (!goalCount) return "Start one goal so your extra money gets a clear destination.";
  if (progress >= 100) return "You already hit the target. Protect it or move to the next one.";
  if (progress >= 66) return "You’re getting close. Stay steady and finish this.";
  if (progress >= 33) return "You’ve started strong. Keep feeding the goal.";
  return "Even small consistent deposits build real progress.";
}

export default function SavingsCard({
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveSavingsGoal,
  onDeleteSavingsGoal,
  onAddSavings,
  theme = null,
}) {
  const isLight = theme?.isLight === true;
  const surfaceStyle = {
    background: theme?.tokens?.gradientCard || "var(--theme-gradient-card)",
    borderColor: theme?.tokens?.border || "var(--theme-border)",
  };

  const overallProgress = useMemo(() => {
    return totalSavingsTarget > 0
      ? Math.min(
          100,
          (Number(totalSavingsSaved || 0) / Number(totalSavingsTarget || 1)) *
            100
        )
      : 0;
  }, [totalSavingsSaved, totalSavingsTarget]);

  const status = getSavingsStatus(overallProgress);
  const message = getSavingsMessage(savingsGoals.length, overallProgress);

  const previewGoals = useMemo(() => {
    if (expanded) return savingsGoals;
    return primarySavingsGoal ? [primarySavingsGoal] : savingsGoals.slice(0, 1);
  }, [expanded, primarySavingsGoal, savingsGoals]);

  const handleMainAddSavings = () => {
    if (primarySavingsGoal) {
      onAddSavings?.(primarySavingsGoal);
      return;
    }

    onSaveSavingsGoal?.(null);
  };

  return (
    <div
      className={`relative mb-3 overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${status.ring}`}
      style={surfaceStyle}
    >
      <div
        className="absolute inset-0"
        style={{
          background: theme?.tokens?.gradientCard || "var(--theme-gradient-card)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.26),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

      <div className="relative z-10 p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.12)] backdrop-blur-sm">
            <Target className="h-4 w-4 text-emerald-300" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`text-base font-semibold tracking-tight ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  Savings Goals
                </p>
                <p
                  className={`mt-0.5 text-[11px] font-medium ${
                    isLight ? "text-slate-600" : "text-white/75"
                  }`}
                >
                  Build dedicated money for what matters next
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}
              >
                {savingsGoals.length
                  ? `${savingsGoals.length} Goal${savingsGoals.length > 1 ? "s" : ""}`
                  : "No Goals"}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className={`text-[32px] font-bold leading-none ${status.text}`}>
            {fmt(totalSavingsSaved)}
          </p>

          <p
            className={`mt-2 max-w-[28rem] text-xs font-medium leading-relaxed ${
              isLight ? "text-slate-700" : "text-white/82"
            }`}
          >
            {message}
          </p>

          <p
            className={`mt-1 text-[11px] ${
              isLight ? "text-slate-500" : "text-white/60"
            }`}
          >
            Target: {fmt(totalSavingsTarget)}
          </p>
        </div>

        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
            <span>Overall progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
            <div
              className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`}
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-40" />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
            <span>{fmt(totalSavingsSaved)}</span>
            <span>{fmt(totalSavingsTarget)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleDetails}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:bg-white/10"
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
          <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Goals
                </p>
                <p className="text-sm font-bold text-white">
                  {savingsGoals.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Saved
                </p>
                <p className="text-sm font-bold text-white">
                  {fmt(totalSavingsSaved)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Target
                </p>
                <p className="text-sm font-bold text-white">
                  {fmt(totalSavingsTarget)}
                </p>
              </div>
            </div>

            {previewGoals.length ? (
              <div className="space-y-2">
                {previewGoals.map((goal, index) => {
                  const saved = getSaved(goal);
                  const target = getTarget(goal);
                  const progress =
                    target > 0 ? Math.min(100, (saved / target) * 100) : 0;

                  return (
                    <div
                      key={goal.id || `${getTitle(goal)}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {getTitle(goal)}
                          </p>
                          <p className="mt-1 text-xs text-white/55">
                            {fmt(saved)} / {fmt(target)}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-white">
                          {Math.round(progress)}%
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-cyan-300 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={financeActionLoading}
                          onClick={() => onAddSavings?.(goal)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          Add Savings
                        </button>

                        <button
                          type="button"
                          disabled={financeActionLoading}
                          onClick={() => onSaveSavingsGoal?.(goal)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          Edit Goal
                        </button>

                        <button
                          type="button"
                          disabled={financeActionLoading}
                          onClick={() => onDeleteSavingsGoal?.(goal.id)}
                          className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                          aria-label="Delete goal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center">
                <PiggyBank className="mx-auto h-8 w-8 text-white/30" />
                <p className="mt-3 text-sm font-semibold text-white">
                  No savings goals yet
                </p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Start one goal so your extra money gets a clear destination.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={financeActionLoading}
                onClick={handleMainAddSavings}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <Edit3 className="h-4 w-4" />
                Add Savings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
