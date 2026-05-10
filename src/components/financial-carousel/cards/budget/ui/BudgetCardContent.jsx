import { ChevronDown, Edit3, Plus } from "lucide-react";
import BudgetHeader from "@/components/financial-carousel/cards/budget/ui/BudgetHeader";
import BudgetSummaryStats from "@/components/financial-carousel/cards/budget/ui/BudgetSummaryStats";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import BudgetCategoryItem from "@/components/financial-carousel/cards/budget/ui/BudgetCategoryItem";
import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const glassPanel =
  "border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_18px_rgba(0,255,220,0.035)] backdrop-blur-sm";

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

          <div className="shrink-0 border-t border-white/6 pt-2">
            <FinanceCardExpandButton
              detailKey="budgets"
              expanded={expanded}
              onToggleDetails={onToggleDetails}
              collapsedLabel="View budget details"
              expandedLabel="Hide budget details"
              className="border-white/10 bg-white/[0.055] py-3 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.12)]"
            />
          </div>
        </div>
      </div>
    );
  }

  const overviewMetrics = [
    ["Declared", fmt(declared)],
    ["Spent", fmt(spent)],
    ["Remaining", fmt(remaining)],
    ["Categories", categories.length],
  ];

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
            Available to spend this month.
          </p>
        </div>

        <div className="shrink-0 border-t border-white/6 pt-2">
          <FinanceCardExpandButton
            detailKey="budgets"
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            collapsedLabel="View budget details"
            expandedLabel="Hide budget details"
            className="border-white/10 bg-white/[0.055] py-3 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.12)]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-3">
        <FinanceCardExpandedPanel className="h-full overflow-y-auto pr-1">
          <div className="mb-3 rounded-2xl border border-cyan-100/15 bg-white/[0.045] px-3 py-2.5 text-xs font-medium leading-5 text-white/68">
            {message || "Review your monthly budget details without leaving the dashboard."}
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-sm text-white">
            {overviewMetrics.map(([label, value]) => (
              <div key={label} className={`rounded-2xl px-2.5 py-2.5 ${glassPanel}`}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/58">
                  {label}
                </p>
                <p className="truncate text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/90">Monthly Spending Plan</span>
              <button
                type="button"
                onClick={() => onSaveBudget?.()}
                disabled={financeActionLoading}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 transition hover:bg-cyan-300/15 disabled:opacity-50"
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
                  {hasDeclaredBudget ? "Add your budget categories next." : "Create this month’s spending plan."}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openBudgetModal}
            className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_20px_rgba(0,255,220,0.08)] transition hover:bg-cyan-300/15"
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
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] px-2.5 py-2.5">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/42">
                    {label}
                  </p>
                  <p className="truncate text-sm font-bold text-white/84">{value}</p>
                </div>
              ))}
            </div>
          </details>

          <div aria-hidden="true" className="h-3 shrink-0" />
        </FinanceCardExpandedPanel>
      </div>
    </div>
  );
}
