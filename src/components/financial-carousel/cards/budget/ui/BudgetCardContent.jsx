import { Edit3, Plus } from "lucide-react";
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
  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-5">
      <div className={`${expanded ? "shrink-0" : "flex-1"} flex min-h-0 flex-col justify-between gap-2`}>
        <div className="min-h-0">
          <BudgetHeader
            monthKey={monthKey}
            badgeLabel={badgeLabel}
            status={status}
          />

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

        <div className="shrink-0 pb-0.5">
          <FinanceCardExpandButton
            detailKey="budgets"
            expanded={expanded}
            onToggleDetails={onToggleDetails}
          />
        </div>
      </div>

      {expanded && (
        <FinanceCardExpandedPanel>
          <div className="grid grid-cols-2 gap-2 text-center text-sm text-white">
            {[
              ["Declared", fmt(declared)],
              ["Spent", fmt(spent)],
              ["Remaining", fmt(remaining)],
              ["Categories", categories.length],
              ["Unallocated", fmt(unallocated)],
              ["Allocated", fmt(allocated)],
            ].map(([label, value]) => (
              <div key={label} className={`rounded-2xl px-2.5 py-2.5 ${glassPanel}`}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/58">
                  {label}
                </p>
                <p className="text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2.5 shadow-[0_0_16px_rgba(251,191,36,0.07)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/70">Unplanned</p>
              <p className="mt-1 text-sm font-bold text-amber-100">{fmt(unplannedSpent)}</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2.5 shadow-[0_0_16px_rgba(0,255,220,0.07)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/70">Undocumented</p>
              <p className="mt-1 text-sm font-bold text-cyan-100">{fmt(undocumentedSpent)}</p>
            </div>
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
                <p className="mt-1 text-xs leading-5 text-cyan-50/70">
                  {hasDeclaredBudget
                    ? "Distribute your declared budget into categories like Bills, Food, Transportation, Family Support, or Personal."
                    : "Start by declaring your total monthly spending amount, then distribute it into categories."}
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
        </FinanceCardExpandedPanel>
      )}
    </div>
  );
}
