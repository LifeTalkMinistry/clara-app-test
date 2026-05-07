import { Edit3, Plus } from "lucide-react";
import BudgetHeader from "@/components/financial-carousel/cards/budget/ui/BudgetHeader";
import BudgetSummaryStats from "@/components/financial-carousel/cards/budget/ui/BudgetSummaryStats";
import BudgetExpandToggle from "@/components/financial-carousel/cards/budget/ui/BudgetExpandToggle";
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
    <>
      <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-cyan-300/22 blur-[78px]" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-purple-500/22 blur-[82px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-[76px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,220,0.26),transparent_32%),radial-gradient(circle_at_top_right,rgba(126,34,206,0.24),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.035)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/16 via-black/10 to-black/26" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.13),rgba(255,255,255,0.035)_38%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
        <div className={`${expanded ? "shrink-0" : "flex-1"} flex min-h-0 flex-col justify-between`}>
          <div>
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

          <BudgetExpandToggle
            expanded={expanded}
            onToggleDetails={onToggleDetails}
          />
        </div>

        {expanded && (
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-cyan-200/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(0,255,220,0.035)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          </div>
        )}
      </div>
    </>
  );
}
