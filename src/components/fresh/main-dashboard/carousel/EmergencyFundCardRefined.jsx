import { Shield, ChevronDown, ChevronUp, Edit2, Plus } from "lucide-react";

import SurvivalExpenseModal from "../../../../SurvivalExpenseModal";
import useEmergencyFundCard, { fmt, VALID_TARGET_MONTHS } from "../../../../hooks/useEmergencyFundCard";

const tileClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const getSafetyStage = ({ effectiveExpense, amountNeeded, pct, statusLabel }) => {
  if (effectiveExpense <= 0) return "Needs setup";
  if (amountNeeded <= 0) return "Protected";
  if (pct >= 66) return "Almost safe";
  if (pct >= 33) return "Building safety";
  if (statusLabel === "At Risk") return "Early protection";
  return "Getting started";
};

const getIncomeStabilityLabel = (stability) => {
  if (stability === "stable") return "stable income pattern";
  if (stability === "mixed") return "slightly changing income pattern";
  if (stability === "irregular") return "irregular income pattern";
  return "limited income history";
};

function buildNextStepCopy({
  effectiveExpense,
  amountNeeded,
  targetLabel,
  emergencyAdvisor,
}) {
  if (effectiveExpense <= 0) {
    return {
      title: "Set your monthly survival cost",
      message: "CLARA needs your monthly survival cost before it can calculate a realistic emergency target.",
    };
  }

  if (amountNeeded <= 0) {
    return {
      title: "Goal reached",
      message: `You reached ${targetLabel}. Keep this fund protected and avoid using it for non-emergencies.`,
    };
  }

  const advisor = emergencyAdvisor || {};
  const hasIncomeSignal = advisor.hasIncomeSignal === true;
  const recommendedMonthlyAmount = Number(advisor.recommendedMonthlyAmount || 0);
  const averageMonthlyIncome = Number(advisor.averageMonthlyIncome || 0);
  const estimatedMonthsToTarget = Number(advisor.estimatedMonthsToTarget || 0);
  const stabilityLabel = getIncomeStabilityLabel(advisor.stability);

  if (hasIncomeSignal && recommendedMonthlyAmount > 0) {
    return {
      title: `You need ${fmt(amountNeeded)} more`,
      message: `Based on your last 90-day average income of ${fmt(averageMonthlyIncome)}/month and your ${stabilityLabel}, CLARA suggests around ${fmt(recommendedMonthlyAmount)}/month to reach ${targetLabel}${estimatedMonthsToTarget > 0 ? ` in about ${estimatedMonthsToTarget} month${estimatedMonthsToTarget === 1 ? "" : "s"}` : ""}.`,
    };
  }

  if (hasIncomeSignal && recommendedMonthlyAmount <= 0) {
    return {
      title: `You need ${fmt(amountNeeded)} more`,
      message: `Based on your last 90-day average income of ${fmt(averageMonthlyIncome)}/month, CLARA does not want to force a fixed amount yet. Add a small amount intentionally when your wallet has breathing room.`,
    };
  }

  return {
    title: `You need ${fmt(amountNeeded)} more`,
    message: `CLARA needs more income history before suggesting a precise monthly amount. For now, add funds intentionally when possible; your emergency balance only grows when you tap Add Fund.`,
  };
}

export default function EmergencyFundCard({
  moneyLeft = 0,
  survivalExpense = 0,
  retentionRate,
  onSurvivalSaved,
  canAutoPrompt = false,
  hasSurvivalSetup = false,
  theme = null,
  expanded = false,
  onToggleDetails,
  onQuickExpense,
  onQuickAI,
}) {
  const { state, computed, handlers } = useEmergencyFundCard({
    moneyLeft,
    survivalExpense,
    retentionRate,
    onSurvivalSaved,
    canAutoPrompt,
    hasSurvivalSetup,
    theme,
    expanded,
    onQuickExpense,
    onQuickAI,
  });

  const { isExpanded, editing, showModal, targetMonths, saving } = state;
  const {
    effectiveExpense,
    safeMoneyLeft,
    target,
    months,
    pct,
    status,
    milestone,
    themeClasses,
    emergencyAdvisor,
  } = computed;
  const {
    setEditing,
    setShowModal,
    handleSaved,
    changeTargetMonths,
    openTopUpModal,
  } = handlers;

  const coverageLabel = effectiveExpense > 0 ? `${months.toFixed(1)} months` : "Set expense";
  const amountNeeded = Math.max(target - safeMoneyLeft, 0);
  const targetLabel = milestone?.label || `${targetMonths}-Month Safety`;
  const safetyStage = getSafetyStage({
    effectiveExpense,
    amountNeeded,
    pct,
    statusLabel: status.label,
  });
  const { title: nextStepTitle, message: nextStepMessage } = buildNextStepCopy({
    effectiveExpense,
    amountNeeded,
    targetLabel,
    emergencyAdvisor,
  });

  const summaryTiles = [
    { label: "Saved", value: fmt(safeMoneyLeft), valueClassName: status.text },
    { label: "Target", value: fmt(target) },
    { label: "Status", value: status.label, valueClassName: status.text },
  ];

  return (
    <>
      <SurvivalExpenseModal
        open={showModal || editing}
        initialValue={effectiveExpense}
        onSaved={handleSaved}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(false);
            setShowModal(false);
          }
        }}
      />

      <div
        data-emergency-card="true"
        className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.10)] transition-all duration-200 ${themeClasses.border} ${status.ring}`}
        style={{ borderColor: themeClasses.outline }}
      >
        <div className="absolute inset-0" style={{ background: themeClasses.background }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_31%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.20),transparent_33%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.02)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/16 to-black/30" />
        <div className="pointer-events-none absolute bottom-[-135px] right-[-92px] h-[230px] w-[230px] rounded-full bg-violet-400/[0.09] blur-3xl" />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />

        <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-5">
          <div className="flex shrink-0 flex-col gap-3">
            {isExpanded ? (
              <div className="shrink-0 pb-1">
                <p className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${status.text}`}>
                  {coverageLabel}
                </p>
                <p className={`mt-2.5 text-sm font-semibold leading-relaxed ${themeClasses.body}`}>
                  Protection covered right now.
                </p>
              </div>
            ) : (
              <div className="min-h-0">
                <div className="mb-3 flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${themeClasses.iconShell}`}>
                    <Shield className={`h-4 w-4 ${themeClasses.iconColor}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-base font-semibold tracking-tight ${themeClasses.title}`}>
                          Emergency Fund
                        </p>
                        <p className={`mt-0.5 text-[11px] font-medium ${themeClasses.body}`}>
                          Safety buffer for emergencies
                        </p>
                      </div>

                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <p className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${status.text}`}>
                    {coverageLabel}
                  </p>
                  <p className={`mt-2 text-sm font-semibold leading-tight ${themeClasses.body}`}>
                    Protection covered right now.
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
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-sm font-medium backdrop-blur-sm transition hover:bg-white/10 ${themeClasses.glass}`}
              >
                <span>{isExpanded ? "Hide details" : "Show details"}</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className={`mt-4 min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain rounded-2xl border border-white/8 p-3.5 pb-7 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [scrollbar-width:none] ${themeClasses.glass} [&::-webkit-scrollbar]:hidden`}>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white/88">Goal</span>
                  <span className="text-[10px] font-semibold text-white/52">{targetLabel}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {VALID_TARGET_MONTHS.map((item) => {
                    const active = targetMonths === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => changeTargetMonths(item)}
                        disabled={saving}
                        className={`relative rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
                          active
                            ? "border-emerald-400/35 bg-emerald-500/14 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.20)]"
                            : "border-white/8 bg-white/[0.045] text-white/72 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="block">{item} Months</span>
                        {active ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

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
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/10 px-3.5 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">
                    Current setup
                  </span>
                  <span className={`text-[11px] font-black ${status.text}`}>
                    {safetyStage}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[12px] font-semibold text-white/60">
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-white/36">Monthly survival cost</p>
                    <p className="mt-1.5 text-sm font-black text-white/90">{fmt(effectiveExpense)}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                    <p className="text-white/36">Target amount</p>
                    <p className="mt-1.5 text-sm font-black text-white/90">{fmt(target)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3.5 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Expense
                </button>

                <button
                  type="button"
                  onClick={openTopUpModal}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/18 px-4 py-3.5 text-sm font-black text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.13)] transition hover:bg-emerald-500/24"
                >
                  <Plus className="h-4 w-4" />
                  Add Fund
                </button>
              </div>

              <div aria-hidden="true" className="h-5 shrink-0" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
