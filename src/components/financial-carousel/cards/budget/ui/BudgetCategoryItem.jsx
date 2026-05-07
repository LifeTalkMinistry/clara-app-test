import { Edit3, Trash2 } from "lucide-react";
import {
  fmt,
  safeNumber,
} from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const glassPanel =
  "border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_18px_rgba(0,255,220,0.035)] backdrop-blur-sm";

const softButton =
  "rounded-xl border border-cyan-100/15 bg-white/[0.055] text-white/85 transition hover:border-cyan-100/25 hover:bg-white/10 hover:text-white disabled:opacity-50";

export default function BudgetCategoryItem({
  item,
  financeActionLoading = false,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
}) {
  const categoryAllocated = safeNumber(item.allocated ?? item.allocated_amount);
  const categorySpent = safeNumber(item.spent ?? item.spent_amount);
  const categoryRemaining = Math.max(categoryAllocated - categorySpent, 0);
  const categoryProgress =
    categoryAllocated > 0 ? Math.min(100, (categorySpent / categoryAllocated) * 100) : 0;

  return (
    <div className={`rounded-2xl p-3 ${glassPanel}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{item.title}</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            {fmt(categorySpent)} spent • {fmt(categoryRemaining)} left
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEditBudgetCategory?.(item)}
            disabled={financeActionLoading}
            className={`${softButton} flex h-8 w-8 items-center justify-center`}
            aria-label={`Edit ${item.title}`}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteBudgetCategory?.(item)}
            disabled={financeActionLoading}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
            aria-label={`Delete ${item.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full border border-cyan-100/15 bg-black/25">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 transition-all duration-500"
          style={{ width: `${categoryProgress}%` }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-white/55">
        <span>{Math.round(categoryProgress)}%</span>
        <span>{fmt(categoryAllocated)}</span>
      </div>
    </div>
  );
}
