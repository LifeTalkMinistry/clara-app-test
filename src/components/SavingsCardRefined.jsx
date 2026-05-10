import { ChevronDown, ChevronUp, PiggyBank, Target } from "lucide-react";

const fmt = (value = 0) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const safeNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[₱,\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSaved = (goal = {}) =>
  safeNumber(
    goal.saved_amount ??
      goal.current_amount ??
      goal.saved ??
      goal.progress_amount ??
      goal.amount_saved
  );

const getTarget = (goal = {}) =>
  safeNumber(goal.target_amount ?? goal.goal_amount ?? goal.target ?? goal.amount);

const getTitle = (goal = {}) =>
  goal.title || goal.name || goal.goal_name || goal.label || "Savings Goal";

const getGoalStatus = (progress = 0, goalCount = 0) => {
  if (!goalCount) {
    return {
      label: "Ready",
      text: "text-cyan-300",
      badge: "border-cyan-300/25 bg-cyan-400/12 text-cyan-200",
      ring: "shadow-[0_0_24px_rgba(34,211,238,0.12)]",
    };
  }

  if (progress >= 100) {
    return {
      label: "Reached",
      text: "text-emerald-300",
      badge: "border-emerald-300/25 bg-emerald-400/12 text-emerald-200",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    };
  }

  if (progress >= 66) {
    return {
      label: "Close",
      text: "text-emerald-300",
      badge: "border-emerald-300/25 bg-emerald-400/12 text-emerald-200",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.14)]",
    };
  }

  if (progress >= 33) {
    return {
      label: "Building",
      text: "text-amber-300",
      badge: "border-amber-300/25 bg-amber-400/12 text-amber-200",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.13)]",
    };
  }

  return {
    label: "Starting",
    text: "text-cyan-300",
    badge: "border-cyan-300/25 bg-cyan-400/12 text-cyan-200",
    ring: "shadow-[0_0_24px_rgba(34,211,238,0.12)]",
  };
};

const tileClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

export default function SavingsCardRefined({
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  expanded = false,
  onToggleDetails,
  theme = null,
}) {
  const goals = Array.isArray(savingsGoals)
    ? savingsGoals.filter((goal) => goal && !goal.deleted_at && !goal.deletedAt)
    : [];

  const computedSaved = goals.reduce((sum, goal) => sum + getSaved(goal), 0);
  const computedTarget = goals.reduce((sum, goal) => sum + getTarget(goal), 0);
  const saved = safeNumber(totalSavingsSaved) || computedSaved;
  const target = safeNumber(totalSavingsTarget) || computedTarget;
  const progress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const status = getGoalStatus(progress, goals.length);
  const mainGoal = primarySavingsGoal || goals[0] || null;
  const isLight = theme?.isLight === true;

  const surfaceStyle = {
    background: theme?.tokens?.gradientCard || "var(--theme-gradient-card)",
    borderColor: theme?.tokens?.border || "var(--theme-border)",
  };

  const summaryTiles = [
    {
      label: "Goals",
      value: goals.length,
    },
    {
      label: "Target",
      value: fmt(target),
    },
    {
      label: "Status",
      value: status.label,
      valueClassName: status.text,
    },
  ];

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.10)] transition-all duration-200 ${status.ring}`}
      style={surfaceStyle}
    >
      <div className="absolute inset-0" style={surfaceStyle} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_31%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.20),transparent_33%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.02)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/16 to-black/30" />
      <div className="pointer-events-none absolute bottom-[-135px] right-[-92px] h-[230px] w-[230px] rounded-full bg-violet-400/[0.09] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-4">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/18 bg-white/[0.065] text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm">
                <Target className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-base font-semibold tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
                      Savings Goals
                    </p>
                    <p className={`mt-0.5 text-[11px] font-medium ${isLight ? "text-slate-700" : "text-white/76"}`}>
                      Dedicated money for goals
                    </p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${status.badge}`}>
                    {goals.length ? `${goals.length} Goal${goals.length > 1 ? "s" : ""}` : "No Goals"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${status.text}`}>
                {fmt(saved)}
              </p>
              <p className={`mt-2 text-sm font-semibold leading-tight ${isLight ? "text-slate-800" : "text-white/82"}`}>
                Saved toward your goals.
              </p>
            </div>

            <div className="mb-1 grid grid-cols-3 gap-2">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className={tileClass}>
                  <p className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${tile.valueClassName || "text-white/92"}`}>
                    {tile.value}
                  </p>
                  <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
                    {tile.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-white/6 pt-2">
            <button
              type="button"
              onClick={onToggleDetails}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:bg-white/10"
            >
              <span>{expanded ? "Hide details" : "Show details"}</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {expanded ? (
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Progress</p>
                <p className="text-sm font-bold text-white">{progress}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Saved</p>
                <p className="text-sm font-bold text-white">{fmt(saved)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Target</p>
                <p className="text-sm font-bold text-white">{fmt(target)}</p>
              </div>
            </div>

            {mainGoal ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{getTitle(mainGoal)}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {fmt(getSaved(mainGoal))} saved of {fmt(getTarget(mainGoal))}
                    </p>
                  </div>
                  <PiggyBank className="h-4 w-4 shrink-0 text-emerald-200" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-4 text-center">
                <p className="text-sm font-semibold text-white">No savings goal yet.</p>
                <p className="mt-1 text-xs text-white/55">Create your first goal from the Savings Goals page.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
