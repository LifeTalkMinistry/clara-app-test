import { ChevronDown, Edit3 } from "lucide-react";
import BudgetHeader from "@/components/financial-carousel/cards/budget/ui/BudgetHeader";
import BudgetSummaryStats from "@/components/financial-carousel/cards/budget/ui/BudgetSummaryStats";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import BudgetCategoryItem from "@/components/financial-carousel/cards/budget/ui/BudgetCategoryItem";
import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const expandButtonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const expandedPanelClass =
  "h-full overflow-y-auto rounded-[24px] border border-emerald-100/[0.10] bg-[linear-gradient(135deg,rgba(9,54,68,0.42),rgba(18,30,70,0.48)_48%,rgba(54,34,104,0.46))] p-3.5 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_14px_30px_rgba(0,0,0,0.16)]";

function getBudgetDriftState({ outsidePlanSpent = 0, spent = 0, declared = 0 }) {
  const safeOutside = Math.max(Number(outsidePlanSpent || 0), 0);
  const safeDeclared = Math.max(Number(declared || 0), 0);
  const safeSpent = Math.max(Number(spent || 0), 0);
  const base = safeDeclared > 0 ? safeDeclared : safeSpent;
  const rate = base > 0 ? Math.min((safeOutside / base) * 100, 999) : 0;

  if (safeOutside <= 0) {
    return {
      rate,
      label: "On track",
      title: "Budget discipline looks clean.",
      message: "No spending outside your plan yet.",
      tone: "border-emerald-100/[0.12] bg-[linear-gradient(135deg,rgba(16,185,129,0.095),rgba(15,118,110,0.045)_48%,rgba(255,255,255,0.035))] text-emerald-50",
      valueTone: "text-emerald-200",
    };
  }

  return {
    rate,
    label: "Watch zone",
    title: "Some spending went outside your plan.",
    message: "Review it before it becomes a pattern.",
    tone: "border-cyan-100/[0.12] bg-[linear-gradient(135deg,rgba(34,211,238,0.095),rgba(59,130,246,0.045)_48%,rgba(255,255,255,0.035))] text-cyan-50",
    valueTone: "text-cyan-200",
  };
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="mt-0.5 shrink-0 border-t border-white/[0.035] pt-3">
      <FinanceCardExpandButton
        detailKey="budgets"
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        collapsedLabel="View budget details"
        expandedLabel="Hide budget details"
        className={expandButtonClass}
      />
    </div>
  );
}

function BudgetInsightCard({ driftState, outsidePlanSpent }) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] border px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-sm ${driftState.tone}`}>
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <div className="relative min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-black leading-tight text-white/92">
            {driftState.label}
          </p>
          <span className="rounded-full border border-white/[0.065] bg-black/[0.14] px-2 py-0.5 text-[10px] font-black text-white/60">
            {Math.round(driftState.rate)}%
          </span>
        </div>

        <p className="text-[12px] font-semibold leading-5 text-white/70">
          {outsidePlanSpent > 0 ? `${fmt(outsidePlanSpent)} spent outside your plan. ` : ""}
          {driftState.message}
        </p>
      </div>
    </div>
  );
}

function DiagnosticsTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.055] bg-black/[0.10] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/36">
        {label}
      </p>
      <p className="whitespace-nowrap text-[13px] font-bold text-white/82">
        {value}
      </p>
    </div>
  );
}

export default function BudgetCardContent(props) {
  const {
    expanded = false,
    onToggleDetails,
    financeActionLoading = false,
    onEditBudgetCategory,
    onDeleteBudgetCategory,
    categories = [],
    declared = 0,
    allocated = 0,
    spent = 0,
    remaining = 0,
    unallocated = 0,
    progress = 0,
    hasDeclaredBudget = false,
    planIsComplete = false,
    unplannedSpent = 0,
    undocumentedSpent = 0,
    status,
    message,
    remainingAmountColor,
    monthKey,
    badgeLabel,
    budgetPace,
    openBudgetModal,
  } = props;

  const outsidePlanSpent = Number(unplannedSpent || 0) + Number(undocumentedSpent || 0);
  const driftState = getBudgetDriftState({ outsidePlanSpent, spent, declared });
  const cycleLabel = budgetPace?.cycleLabel || "Monthly";
  const cycleRange = budgetPace?.cycleRange || null;
  const cycleDisplayLabel = budgetPace?.cycleDisplayLabel || "";

  if (!expanded) {
    return (
      <div className="relative z-10 flex h-full min-h-[286px] flex-col overflow-hidden px-4 pb-4 pt-5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.46]">
          <div className="absolute -left-20 top-[-58px] h-40 w-40 rounded-full bg-cyan-400/[0.06] blur-3xl" />
          <div className="absolute bottom-[-104px] right-[-82px] h-48 w-48 rounded-full bg-violet-500/[0.10] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),transparent_30%,rgba(0,0,0,0.16)_100%)]" />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]">
            <BudgetHeader
              monthKey={monthKey}
              badgeLabel={badgeLabel}
              status={status}
              cycleLabel={cycleLabel}
              cycleRange={cycleRange}
              cycleDisplayLabel={cycleDisplayLabel}
            />

            <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
              <BudgetSummaryStats
                declared={declared}
                remaining={remaining}
                spent={spent}
                allocated={allocated}
                unallocated={unallocated}
                progress={progress}
                status={status}
                message={message}
                remainingAmountColor={remainingAmountColor}
                hasDeclaredBudget={hasDeclaredBudget}
                planIsComplete={planIsComplete}
              />
            </div>
          </div>

          <ExpandButtonRow expanded={expanded} onToggleDetails={onToggleDetails} />
        </div>
      </div>
    );
  }

  const quietMetrics = [
    ["Allocated", fmt(allocated)],
    ["Unallocated", fmt(unallocated)],
    ["Unplanned", fmt(unplannedSpent)],
    ["Undocumented", fmt(undocumentedSpent)],
  ];

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
      <div className="pointer-events-none absolute inset-0 opacity-[0.48]">
        <div className="absolute -left-24 top-[-70px] h-48 w-48 rounded-full bg-cyan-400/[0.07] blur-3xl" />
        <div className="absolute bottom-[-130px] right-[-110px] h-60 w-60 rounded-full bg-violet-500/[0.12] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_40%,rgba(0,0,0,0.12)_100%)]" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-3.5">
        <div className="relative shrink-0 overflow-hidden rounded-[26px] border border-emerald-100/[0.12] bg-[linear-gradient(135deg,rgba(10,126,128,0.24),rgba(17,44,85,0.42)_48%,rgba(82,45,147,0.36))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_16px_32px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_18%_22%,rgba(94,234,212,0.14),transparent_44%),radial-gradient(circle_at_88%_80%,rgba(168,85,247,0.16),transparent_52%)]" />
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/38 to-transparent" />

          <div className="relative">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.20em] text-white/42">
              Available balance
            </p>
            <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${hasDeclaredBudget ? remainingAmountColor : "text-white/93"}`}>
              {fmt(remaining)}
            </p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-white/70">
              Available for this cycle.
            </p>
          </div>
        </div>

        <ExpandButtonRow expanded={expanded} onToggleDetails={onToggleDetails} />

        <div className="min-h-0 flex-1 overflow-hidden pt-0.5">
          <FinanceCardExpandedPanel className={expandedPanelClass}>
            <BudgetInsightCard
              driftState={driftState}
              outsidePlanSpent={outsidePlanSpent}
            />

            <div>
              {categories.length ? (
                <div className="space-y-2.5">
                  {categories.map((item) => (
                    <BudgetCategoryItem
                      key={item.key || item.id || item.title}
                      item={item}
                      financeActionLoading={financeActionLoading}
                      onEditBudgetCategory={onEditBudgetCategory}
                      onDeleteBudgetCategory={onDeleteBudgetCategory}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-white/[0.065] bg-black/[0.10] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-sm font-semibold text-white/78">
                    {hasDeclaredBudget
                      ? "Add your budget categories next."
                      : "Create this cycle’s spending plan."}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openBudgetModal}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-emerald-100/[0.11] bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(255,255,255,0.045)_48%,rgba(168,85,247,0.055))] px-4 py-3 text-sm font-black text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] transition hover:border-emerald-100/20 hover:bg-white/[0.08]"
            >
              <Edit3 className="h-4 w-4" />
              Manage Budget
            </button>

            <details className="group rounded-[20px] border border-white/[0.055] bg-black/[0.09] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/42 outline-none transition group-open:text-white/66">
                <span>Budget diagnostics</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm text-white">
                {quietMetrics.map(([label, value]) => (
                  <DiagnosticsTile key={label} label={label} value={value} />
                ))}
              </div>
            </details>
            <div aria-hidden="true" className="h-3 shrink-0" />
          </FinanceCardExpandedPanel>
        </div>
      </div>
    </div>
  );
}
