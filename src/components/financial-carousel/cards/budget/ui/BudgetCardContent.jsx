import { ChevronDown, Edit3, Plus } from "lucide-react";
import BudgetHeader from "@/components/financial-carousel/cards/budget/ui/BudgetHeader";
import BudgetSummaryStats from "@/components/financial-carousel/cards/budget/ui/BudgetSummaryStats";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import BudgetCategoryItem from "@/components/financial-carousel/cards/budget/ui/BudgetCategoryItem";
import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const expandButtonClass =
  "border-white/10 bg-white/[0.055] py-3 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.12)]";

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
      tone: "border-emerald-300/18 bg-emerald-400/10 text-emerald-50",
      valueTone: "text-emerald-200",
    };
  }

  if (rate <= 5) {
    return {
      rate,
      label: "Minor drift",
      title: "Small outside-plan spending detected.",
      message: "Still manageable. Keep asking before spending so it does not become a pattern.",
      tone: "border-cyan-300/18 bg-cyan-400/10 text-cyan-50",
      valueTone: "text-cyan-200",
    };
  }

  if (rate <= 15) {
    return {
      rate,
      label: "Watch zone",
      title: "Some spending went outside your plan.",
      message: "Review it or adjust your categories before it becomes a pattern.",
      tone: "border-amber-300/20 bg-amber-400/10 text-amber-50",
      valueTone: "text-amber-200",
    };
  }

  if (rate <= 30) {
    return {
      rate,
      label: "Drifting",
      title: "Your budget is drifting from the plan.",
      message: "Pause before the next expense. Ask CLARA first or adjust intentionally.",
      tone: "border-orange-300/20 bg-orange-500/10 text-orange-50",
      valueTone: "text-orange-200",
    };
  }

  return {
    rate,
    label: "High drift",
    title: "Too much spending is outside your plan.",
    message: "This cycle needs attention before logging more unplanned spending.",
    tone: "border-rose-300/20 bg-rose-500/10 text-rose-50",
    valueTone: "text-rose-200",
  };
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="shrink-0 border-t border-white/6 pt-2">
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

function BudgetSummaryLine({ declared, spent, categoriesCount }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold leading-relaxed text-white/68">
        <span>
          <span className="text-white/42">Declared</span>{" "}
          <span className="font-black text-white/90">{fmt(declared)}</span>
        </span>
        <span className="text-white/24">•</span>
        <span>
          <span className="text-white/42">Spent</span>{" "}
          <span className="font-black text-white/90">{fmt(spent)}</span>
        </span>
        <span className="text-white/24">•</span>
        <span>
          <span className="text-white/42">Categories</span>{" "}
          <span className="font-black text-white/90">{categoriesCount}</span>
        </span>
      </div>
    </div>
  );
}

function BudgetInsightCard({ driftState, outsidePlanSpent, onAdjust }) {
  return (
    <div className={`rounded-2xl border px-3.5 py-3.5 ${driftState.tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-black leading-tight text-white">
              {driftState.label}
            </p>
            <span className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[10px] font-black text-white/70">
              {Math.round(driftState.rate)}%
            </span>
          </div>

          <p className="text-[12px] font-semibold leading-5 text-white/72">
            {outsidePlanSpent > 0 ? `${fmt(outsidePlanSpent)} spent outside your plan. ` : ""}
            {driftState.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onAdjust}
          className="shrink-0 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[11px] font-black text-white/86 transition hover:bg-white/[0.06]"
        >
          Adjust
        </button>
      </div>
    </div>
  );
}

function DiagnosticsTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-2.5 py-2.5 text-center">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/42">
        {label}
      </p>
      <p className="whitespace-nowrap text-[13px] font-bold text-white/84">
        {value}
      </p>
    </div>
  );
}

export default function BudgetCardContent({
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveBudget,
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
  openBudgetModal,
}) {
  const outsidePlanSpent = Number(unplannedSpent || 0) + Number(undocumentedSpent || 0);
  const driftState = getBudgetDriftState({ outsidePlanSpent, spent, declared });

  if (!expanded) {
    return (
      <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-4">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0">
            <BudgetHeader monthKey={monthKey} badgeLabel={badgeLabel} status={status} />
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
    <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden p-[clamp(0.875rem,3.2vw,1rem)] pb-[clamp(0.9rem,1.8svh,1.1rem)]">
      <div className="flex shrink-0 flex-col gap-[clamp(0.625rem,1.4svh,0.85rem)]">
        <div className="shrink-0">
          <p
            className={`text-[clamp(2rem,8vw,2.25rem)] font-black leading-none tracking-[-0.045em] ${
              hasDeclaredBudget ? remainingAmountColor : "text-white/95"
            }`}
          >
            {fmt(remaining)}
          </p>
          <p className="mt-[clamp(0.45rem,1svh,0.65rem)] text-xs font-semibold leading-relaxed text-white/76">
            Available for this cycle.
          </p>
        </div>
        <ExpandButtonRow expanded={expanded} onToggleDetails={onToggleDetails} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-3">
        <FinanceCardExpandedPanel className="h-full overflow-y-auto pr-1">
          <BudgetInsightCard
            driftState={driftState}
            outsidePlanSpent={outsidePlanSpent}
            onAdjust={openBudgetModal}
          />

          <BudgetSummaryLine
            declared={declared}
            spent={spent}
            categoriesCount={categories.length}
          />

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white/90">Spending Plan</span>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-white/52">
                  Category limits for this cycle.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSaveBudget?.()}
                disabled={financeActionLoading}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 transition hover:bg-cyan-300/15 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                {hasDeclaredBudget ? "Add" : "Start"}
              </button>
            </div>

            {categories.length ? (
              <div className="space-y-2">
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
              <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/10 p-4 shadow-[0_0_18px_rgba(0,255,220,0.06)]">
                <p className="text-sm font-semibold text-cyan-50">
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
            className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_20px_rgba(0,255,220,0.06)] transition hover:bg-cyan-300/15"
          >
            <Edit3 className="h-4 w-4" />
            Manage Budget
          </button>

          <details className="group rounded-2xl border border-white/10 bg-white/[0.028] p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/48 outline-none transition group-open:text-white/72">
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
  );
}
