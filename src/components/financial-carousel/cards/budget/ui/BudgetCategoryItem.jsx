import { Edit3, Trash2 } from "lucide-react";
import {
  fmt,
  safeNumber,
} from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const glassPanel =
  "relative overflow-hidden border border-white/[0.075] bg-[linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.035)_46%,rgba(0,0,0,0.055))] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_22px_rgba(0,0,0,0.12)] backdrop-blur-sm";

const softButton =
  "rounded-xl border border-white/[0.075] bg-white/[0.055] text-white/76 transition hover:border-cyan-100/20 hover:bg-white/[0.09] hover:text-white disabled:opacity-50";

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
    <div className={`rounded-[20px] p-3.5 ${glassPanel}`}>
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-violet-400/[0.08] blur-2xl" />
      <div className="pointer-events-none absolute -left-10 bottom-[-42px] h-24 w-24 rounded-full bg-cyan-300/[0.07] blur-2xl" />

      <div className="relative mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black leading-tight tracking-[-0.02em] text-white/94">
            {item.title}
          </p>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-white/66">
            {fmt(categorySpent)} spent • {fmt(categoryRemaining)} left
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
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
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200/[0.14] bg-rose-400/[0.075] text-rose-100/78 transition hover:border-rose-200/24 hover:bg-rose-400/[0.13] hover:text-rose-50 disabled:opacity-50"
            aria-label={`Delete ${item.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full border border-white/[0.055] bg-black/[0.22]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 shadow-[0_0_12px_rgba(94,234,212,0.24)] transition-all duration-500"
          style={{ width: `${categoryProgress}%` }}
        />
      </div>

      <div className="relative mt-2.5 flex items-center justify-between text-[10px] font-black text-white/58">
        <span>{Math.round(categoryProgress)}% used</span>
        <span>{fmt(categoryAllocated)} allocated</span>
      </div>
    </div>
  );
}
