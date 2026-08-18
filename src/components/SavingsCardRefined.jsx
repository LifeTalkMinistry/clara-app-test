import { CheckCircle2, Info, PiggyBank, Plus, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import {
  FINANCE_ITEM_HIERARCHY_TONES,
  getFinanceItemHierarchyTone,
} from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceIconTile,
  PremiumFinanceInfoRow,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";
import { SAVINGS_GOALS_MASTERCLASS_ROUTE } from "@/lib/clara-savings-goals-masterclass-route";

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
      text: "text-cyan-200",
      badge:
        "border border-cyan-300/16 bg-cyan-400/[0.075] text-cyan-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
      ring: "shadow-[0_0_24px_rgba(34,211,238,0.08),0_0_46px_rgba(88,28,135,0.07)]",
    };
  }

  if (progress >= 100) {
    return {
      label: "Reached",
      text: "text-emerald-200",
      badge:
        "border border-emerald-300/16 bg-emerald-400/[0.075] text-emerald-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
      ring: "shadow-[0_0_24px_rgba(16,185,129,0.08),0_0_46px_rgba(88,28,135,0.07)]",
    };
  }

  if (progress >= 66) {
    return {
      label: "Close",
      text: "text-emerald-200",
      badge:
        "border border-emerald-300/16 bg-emerald-400/[0.075] text-emerald-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
      ring: "shadow-[0_0_24px_rgba(16,185,129,0.08),0_0_46px_rgba(88,28,135,0.07)]",
    };
  }

  if (progress >= 33) {
    return {
      label: "Building",
      text: "text-amber-200",
      badge:
        "border border-amber-300/16 bg-amber-400/[0.075] text-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.07),0_0_46px_rgba(88,28,135,0.07)]",
    };
  }

  return {
    label: "Starting",
    text: "text-cyan-200",
    badge:
      "border border-cyan-300/16 bg-cyan-400/[0.075] text-cyan-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
    ring: "shadow-[0_0_24px_rgba(34,211,238,0.08),0_0_46px_rgba(88,28,135,0.07)]",
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
      ctaMode: "create",
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
        "Review this goal first, then tap Edit to give it a clear target amount. CLARA can protect the goal better once it has a finish line.",
      cta: "Review Goal",
      ctaMode: "review",
    };
  }

  if (focusRemaining <= 0) {
    return {
      title: `${focusTitle} is complete`,
      message:
        "This goal is fully funded. Review it, keep it protected, or create your next goal when you are ready to build again.",
      cta: "Review Goal",
      ctaMode: "review",
    };
  }

  const totalRemaining = Math.max(target - saved, 0);

  return {
    title: `Focus on ${focusTitle}`,
    message: `You need ${fmt(focusRemaining)} more for this goal${
      totalRemaining > focusRemaining ? ` and ${fmt(totalRemaining)} across all goals` : ""
    }. Review the goal first, then add savings from its action panel when your wallet has room.`,
    cta: "Review Goal",
    ctaMode: "review",
  };
}

function getProgressMeta(progress) {
  if (progress >= 100) {
    return {
      rgb: "52 211 153",
      label: "Complete",
      labelClass: "text-emerald-200",
      badgeClass: "border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-100",
    };
  }
  if (progress >= 66) return { rgb: "52 211 153", label: `${progress}%`, labelClass: "text-emerald-200" };
  if (progress >= 33) return { rgb: "251 191 36", label: `${progress}%`, labelClass: "text-amber-200" };
  if (progress > 0) return { rgb: "34 211 238", label: `${progress}%`, labelClass: "text-cyan-200" };
  return { rgb: "148 163 184", label: "0%", labelClass: "text-slate-300/70" };
}

const premiumActionClass =
  "border-white/[0.045] bg-black/[0.105] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.026),0_10px_22px_rgba(0,0,0,0.14)] hover:border-white/[0.07] hover:bg-white/[0.04]";

const expandButtonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const SAVINGS_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-blue-500/[0.10] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-fuchsia-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(103,232,249,0.105),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(168,85,247,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/[0.055]",
];

const starterIdeas = ["Phone", "Travel", "Emergency", "Gift"];

function SavingsLearningButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Savings Goals Masterclass"
      title="Savings Goals Masterclass"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-white/52 transition hover:border-cyan-200/24 hover:bg-cyan-300/[0.07] hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/25"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

function SavingsHeader({ goals = [], status, onOpenMasterclass }) {
  const goalCountLabel = goals.length ? `${goals.length} Goal${goals.length > 1 ? "s" : ""}` : "No Goals";

  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm">
        <Target className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold tracking-tight text-white">Savings Goals</p>
              <SavingsLearningButton onClick={onOpenMasterclass} />
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-white/76">Dedicated money for goals</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${status.badge}`}>
            {goalCountLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function SavingsSummaryStats({ saved, target, goals = [], status }) {
  const summaryTiles = [
    { label: "Goals", value: goals.length },
    { label: "Target", value: fmt(target) },
    { label: "Status", value: status.label, valueClassName: status.text },
  ];

  return (
    <>
      <div className="mb-3">
        <p className={`text-[32px] font-bold leading-none tracking-[-0.045em] ${status.text}`}>{fmt(saved)}</p>
        <p className="mt-2 text-sm font-semibold leading-tight text-white/76">Saved toward your goals.</p>
      </div>
      <div className="mb-1 overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm">
        <div className="grid grid-cols-3 divide-x divide-white/[0.055]">
          {summaryTiles.map((tile) => (
            <div key={tile.label} className="relative px-2.5 py-2.5 text-center">
              <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
              <p className={`truncate text-[13px] font-black leading-none tracking-[-0.03em] ${tile.valueClassName || "text-white/88"}`}>{tile.value}</p>
              <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="shrink-0 border-t border-white/[0.035] pt-3">
      <FinanceCardExpandButton
        detailKey="savings"
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        collapsedLabel="View savings details"
        expandedLabel="Hide savings details"
        className={expandButtonClass}
      />
    </div>
  );
}

function SavingsGoalItem({ goal, totalPositiveSavings, onReview }) {
  const saved = getSaved(goal);
  const target = getTarget(goal);
  const remaining = Math.max(target - saved, 0);
  const progress = target > 0 ? Math.max(0, Math.min(Math.round((saved / target) * 100), 100)) : 0;
  const tone = getFinanceItemHierarchyTone(saved, totalPositiveSavings);
  const progressMeta = getProgressMeta(progress);

  return (
    <PremiumFinanceItemSurface tone={tone} className="p-3.5">
      <div className="grid grid-cols-[48px_minmax(0,1fr)_32px] items-start gap-3">
        <PremiumFinanceIconTile tone={tone}>
          <PiggyBank className="h-5 w-5" />
        </PremiumFinanceIconTile>

        <div className="min-w-0 pt-0.5">
          <p className="truncate text-[14px] font-black tracking-[-0.02em] text-white/92">{getTitle(goal)}</p>
          <p className="mt-1.5 truncate text-[20px] font-black leading-none tracking-[-0.04em]" style={{ color: `rgb(${tone.rgb})` }}>
            {fmt(saved)}
          </p>
          <p className="mt-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/38">Saved</p>
        </div>

        <button
          type="button"
          onClick={() => onReview(goal)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.055] text-white/78 transition hover:border-white/28 hover:bg-white/[0.10] hover:text-white"
          aria-label={`Review ${getTitle(goal)}`}
        >
          <Target className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-2.5">
        <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
          <div className="pr-3">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/32">Target</p>
            <p className="mt-1.5 truncate text-[12px] font-black text-white/82">{fmt(target)}</p>
          </div>
          <div className="pl-3">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/32">Remaining</p>
            <p className="mt-1.5 truncate text-[12px] font-black text-white/82">{fmt(remaining)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/34">Current progress</span>
          {progressMeta.badgeClass ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${progressMeta.badgeClass}`}>
              <CheckCircle2 className="h-3 w-3" /> {progressMeta.label}
            </span>
          ) : (
            <span className={`text-[10px] font-black ${progressMeta.labelClass}`}>{progressMeta.label}</span>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progress}%`, backgroundColor: `rgb(${progressMeta.rgb})`, boxShadow: progress > 0 ? `0 0 12px rgb(${progressMeta.rgb} / 0.30)` : "none" }}
          />
        </div>
      </div>
    </PremiumFinanceItemSurface>
  );
}

export default function SavingsCardRefined({
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  expanded = false,
  onToggleDetails,
}) {
  const navigate = useNavigate();
  const goals = Array.isArray(savingsGoals)
    ? savingsGoals.filter((goal) => goal && !goal.deleted_at && !goal.deletedAt)
    : [];

  const computedSaved = goals.reduce((sum, goal) => sum + getSaved(goal), 0);
  const computedTarget = goals.reduce((sum, goal) => sum + getTarget(goal), 0);
  const totalPositiveSavings = goals.reduce((sum, goal) => sum + Math.max(getSaved(goal), 0), 0);
  const hasExplicitSaved = totalSavingsSaved !== undefined && totalSavingsSaved !== null && totalSavingsSaved !== "";
  const hasExplicitTarget = totalSavingsTarget !== undefined && totalSavingsTarget !== null && totalSavingsTarget !== "";
  const saved = hasExplicitSaved ? safeNumber(totalSavingsSaved) : computedSaved;
  const target = hasExplicitTarget ? safeNumber(totalSavingsTarget) : computedTarget;
  const progress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const status = getGoalStatus(progress, goals.length);
  const primaryGoalId = primarySavingsGoal?.id || primarySavingsGoal?.goal_id || "";
  const activePrimaryGoal = primaryGoalId
    ? goals.find((goal) => String(goal?.id || goal?.goal_id || "") === String(primaryGoalId)) || null
    : null;
  const mainGoal = activePrimaryGoal || goals[0] || null;
  const savingsStage = getSavingsStage({ goalCount: goals.length, progress });
  const remainingTotal = Math.max(target - saved, 0);
  const nextStep = buildNextStepCopy({ goals, mainGoal, saved, target });

  const openSavingsGoals = (starterTitle = "", goal = null) => {
    if (!goals.length) {
      navigate("/savings-goals", { state: { openCreateSavingsGoal: true, starterTitle } });
      return;
    }

    const focusGoal = goal || mainGoal;
    if (focusGoal?.id) {
      navigate("/savings-goals", { state: { focusGoalId: focusGoal.id } });
      return;
    }

    navigate("/savings-goals");
  };

  const openSavingsGoalsMasterclass = () => {
    if (!mainGoal) {
      navigate(SAVINGS_GOALS_MASTERCLASS_ROUTE, {
        state: {
          claraMasterclassContext: {
            masterclassId: "savings-goals",
            setupRequired: true,
          },
        },
      });
      return;
    }

    const focusGoalSaved = getSaved(mainGoal);
    const focusGoalTarget = getTarget(mainGoal);
    const focusGoalRemaining = Math.max(focusGoalTarget - focusGoalSaved, 0);
    const focusGoalProgress =
      focusGoalTarget > 0
        ? Math.max(0, Math.min(Math.round((focusGoalSaved / focusGoalTarget) * 100), 100))
        : 0;

    navigate(SAVINGS_GOALS_MASTERCLASS_ROUTE, {
      state: {
        claraMasterclassContext: {
          masterclassId: "savings-goals",
          goalCount: goals.length,
          totalSaved: saved,
          totalTarget: target,
          focusGoalTitle: getTitle(mainGoal),
          focusGoalSaved,
          focusGoalTarget,
          focusGoalRemaining,
          focusGoalProgress,
        },
      },
    });
  };

  return (
    <FinanceCardShell
      cardKey="savingsGoals"
      expanded={expanded}
      ringClass={status.ring}
      roundedClass="rounded-3xl"
      glowLayerClassNames={SAVINGS_GLOW_LAYERS}
      surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(38,10,52,0.93))]"
      shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]"
    >
      {!expanded ? (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.48]">
            <div className="absolute -left-20 top-[-58px] h-40 w-40 rounded-full bg-cyan-400/[0.065] blur-3xl" />
            <div className="absolute bottom-[-104px] right-[-82px] h-48 w-48 rounded-full bg-fuchsia-500/[0.10] blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),transparent_30%,rgba(0,0,0,0.16)_100%)]" />
          </div>
          <div className="relative flex min-h-0 flex-col gap-4">
            <div className="min-h-0 rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]">
              <SavingsHeader goals={goals} status={status} onOpenMasterclass={openSavingsGoalsMasterclass} />
              <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
                <SavingsSummaryStats saved={saved} target={target} goals={goals} status={status} />
              </div>
            </div>
            <ExpandButtonRow expanded={false} onToggleDetails={onToggleDetails} />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.42]">
            <div className="absolute -left-24 top-[-70px] h-48 w-48 rounded-full bg-cyan-400/[0.06] blur-3xl" />
            <div className="absolute bottom-[-130px] right-[-110px] h-60 w-60 rounded-full bg-fuchsia-500/[0.10] blur-3xl" />
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${status.text}`}>{fmt(saved)}</p>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-white/68">Saved toward your goals.</p>
              </div>
              <SavingsLearningButton onClick={openSavingsGoalsMasterclass} />
            </div>
            <ExpandButtonRow expanded={true} onToggleDetails={onToggleDetails} />

            <div className="min-h-0 flex-1 overflow-hidden pt-1">
              <FinanceCardExpandedPanel className="h-full space-y-3 overflow-y-auto pr-1">
                <div className="relative overflow-hidden rounded-[20px] border border-emerald-300/14 bg-[radial-gradient(circle_at_10%_0%,rgba(52,211,153,0.09),transparent_38%),linear-gradient(145deg,rgba(8,20,38,0.97),rgba(8,13,31,0.985))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_26px_rgba(0,0,0,0.20),0_0_18px_rgba(16,185,129,0.035)]">
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/35 to-transparent" />
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/46">Next step</p>
                  <p className="mt-2 text-[17px] font-black leading-snug text-white/92">{nextStep.title}</p>
                  <p className="mt-3 text-[12.5px] font-semibold leading-6 text-white/68">{nextStep.message}</p>
                  <button
                    type="button"
                    onClick={() => openSavingsGoals()}
                    aria-label={nextStep.cta}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.085] px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/[0.12] focus:outline-none focus:ring-2 focus:ring-emerald-300/35"
                  >
                    {nextStep.ctaMode === "create" ? <Plus className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    {nextStep.cta}
                  </button>
                </div>

                {!goals.length ? (
                  <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Starter ideas</span>
                      <span className="text-[11px] font-black text-cyan-200">Pick one</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/[0.14]">
                      {starterIdeas.map((idea) => (
                        <button key={idea} type="button" onClick={() => openSavingsGoals(idea)} className="px-3 py-3 text-left text-[12px] font-black text-white/82 transition hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-300/25">
                          {idea}
                          <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/32">Create goal</span>
                        </button>
                      ))}
                    </div>
                  </PremiumFinanceItemSurface>
                ) : (
                  <>
                    <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Current setup</span>
                        <span className={`text-[11px] font-black ${status.text}`}>{savingsStage}</span>
                      </div>
                      <div className="mt-2 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                        <PremiumFinanceInfoRow label="Remaining across goals" value={fmt(remainingTotal)} />
                        <PremiumFinanceInfoRow label="Total target" value={fmt(target)} />
                      </div>
                    </PremiumFinanceItemSurface>

                    <div className="space-y-2.5">
                      {goals.map((goal, index) => (
                        <SavingsGoalItem
                          key={goal.id || goal.goal_id || `${getTitle(goal)}-${index}`}
                          goal={goal}
                          totalPositiveSavings={totalPositiveSavings}
                          onReview={(selectedGoal) => openSavingsGoals("", selectedGoal)}
                        />
                      ))}
                    </div>
                  </>
                )}

                <button type="button" onClick={() => openSavingsGoals()} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${premiumActionClass}`}>
                  <Target className="h-4 w-4" /> Manage Savings
                </button>
                <div aria-hidden="true" className="h-5 shrink-0" />
              </FinanceCardExpandedPanel>
            </div>
          </div>
        </div>
      )}
    </FinanceCardShell>
  );
}
