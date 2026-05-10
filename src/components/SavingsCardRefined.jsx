import { ChevronDown, ChevronUp, PiggyBank, Plus, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const getSavingsStage = ({ goalCount, progress }) => {
  if (!goalCount) return "Needs first goal";
  if (progress >= 100) return "Goal reached";
  if (progress >= 66) return "Almost there";
  if (progress >= 33) return "Building momentum";
  return "Getting started";
};

function buildNextStepCopy({ goals = [], mainGoal = null, saved = 0, target = 0 }) {
  if (!goals.length) {
    return {
      title: "Create your first goal",
      message:
        "Choose one real-life target first. Savings becomes easier when the money has a name, a reason, and a finish line.",
      cta: "Create Goal",
    };
  }

  const focusGoal = mainGoal || goals[0];
  const focusTitle = getTitle(focusGoal);
  const focusSaved = getSaved(focusGoal);
  const focusTarget = getTarget(focusGoal);
  const focusRemaining = Math.max(focusTarget - focusSaved, 0);

  if (focusTarget <= 0) {
    return {
      title: `Set a target for ${focusTitle}`,
      message:
        "This goal needs a clear target amount. Once the amount is set, CLARA can help you track progress and protect it from random spending.",
      cta: "Set Target",
    };
  }

  if (focusRemaining <= 0) {
    return {
      title: `${focusTitle} is complete`,
      message:
        "This goal is fully funded. Keep it protected or create your next goal when you are ready to build again.",
      cta: "Open Goals",
    };
  }

  const totalRemaining = Math.max(target - saved, 0);
  return {
    title: `Focus on ${focusTitle}`,
    message: `You need ${fmt(focusRemaining)} more for this goal${totalRemaining > focusRemaining ? ` and ${fmt(totalRemaining)} across all goals` : ""}. Open the goal and add savings intentionally when your wallet has room.`,
    cta: "Open Goal",
  };
}

const tileClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const starterIdeas = ["Phone", "Travel", "Emergency", "Gift"];

export default function SavingsCardRefined({
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  expanded = false,
  onToggleDetails,
  theme = null,
}) {
  const navigate = useNavigate();
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
  const savingsStage = getSavingsStage({ goalCount: goals.length, progress });
  const remainingTotal = Math.max(target - saved, 0);
  const { title: nextStepTitle, message: nextStepMessage, cta } = buildNextStepCopy({
    goals,
    mainGoal,
    saved,
    target,
  });

  const openSavingsGoals = (starterTitle = "") => {
    if (!goals.length) {
      navigate("/savings-goals", {
        state: {
          openCreateSavingsGoal: true,
          starterTitle,
        },
      });
      return;
    }

    if (mainGoal?.id) {
      navigate("/savings-goals", {
        state: {
          focusGoalId: mainGoal.id,
        },
      });
      return;
    }

    navigate("/savings-goals");
  };

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

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-5">
        <div className="flex shrink-0 flex-col gap-3">
          {expanded ? (
            <div className="shrink-0 pb-1">
              <p className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${status.text}`}>
                {fmt(saved)}
              </p>
              <p className={`mt-2.5 text-sm font-semibold leading-relaxed ${isLight ? "text-slate-800" : "text-white/82"}`}>
                Saved toward your goals.
              </p>
            </div>
          ) : (
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
          )}

          <div className="shrink-0 border-t border-white/6 pt-2.5">
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
          <div className="mt-4 min-h-0 flex-1 space-y-3.5 overflow-y-auto rounded-2xl border border-white/8 bg-black/15 p-3.5 pb-7 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_42%),rgba(16,185,129,0.10)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(16,185,129,0.07)]">
              <div className="pointer-events-none absolute -right-10 -top-14 h-28 w-28 rounded-full bg-emerald-300/10 blur-2xl" />
              <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/56">
                Next step
              </p>
              <p className="relative mt-2 text-[17px] font-black leading-snug text-white">
                {nextStepTitle}
              </p>
              <p className="relative mt-3 text-[12.5px] font-semibold leading-6 text-white/74">
                {nextStepMessage}
              </p>
              <button
                type="button"
                onClick={() => openSavingsGoals()}
                className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/15 px-4 py-3 text-sm font-black text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.10)] transition hover:bg-emerald-400/22"
              >
                <Plus className="h-4 w-4" />
                {cta}
              </button>
            </div>

            {!goals.length ? (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-3.5 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                    Starter ideas
                  </span>
                  <span className="text-[11px] font-black text-cyan-200">
                    Pick one
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {starterIdeas.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => openSavingsGoals(idea)}
                      className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5 text-left text-[12px] font-black text-white/82 transition hover:bg-white/[0.065]"
                    >
                      {idea}
                      <span className="mt-1 block text-[10px] font-semibold text-white/38">
                        Create goal
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-3.5 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                    Current setup
                  </span>
                  <span className={`text-[11px] font-black ${status.text}`}>
                    {savingsStage}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[12px] font-semibold text-white/60">
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-white/36">Remaining</p>
                    <p className="mt-1.5 text-sm font-black text-white/90">{fmt(remainingTotal)}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-white/36">Total target</p>
                    <p className="mt-1.5 text-sm font-black text-white/90">{fmt(target)}</p>
                  </div>
                </div>
              </div>
            )}

            {mainGoal ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{getTitle(mainGoal)}</p>
                    <p className="mt-1.5 text-xs font-semibold leading-relaxed text-white/56">
                      {fmt(getSaved(mainGoal))} saved of {fmt(getTarget(mainGoal))}
                    </p>
                  </div>
                  <PiggyBank className="h-4 w-4 shrink-0 text-emerald-200" />
                </div>
              </div>
            ) : null}

            <div aria-hidden="true" className="h-5 shrink-0" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
