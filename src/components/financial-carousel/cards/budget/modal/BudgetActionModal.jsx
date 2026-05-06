import { Plus, RotateCcw, X } from "lucide-react";
import { safeNumber } from "../logic/useBudgetCardLogic";

const softButton =
  "rounded-xl border border-cyan-100/15 bg-white/[0.055] text-white/85 transition hover:border-cyan-100/25 hover:bg-white/10 hover:text-white disabled:opacity-50";

export default function BudgetActionModal({
  open,
  onClose,
  activeBudget,
  financeActionLoading,
  onSaveBudget,
  onResetBudget,
}) {
  if (!open) return null;

  const hasDeclaredBudget =
    safeNumber(activeBudget?.declared_budget ?? activeBudget?.declared_amount) > 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(6,48,66,0.98),rgba(7,20,48,0.96)_48%,rgba(37,13,74,0.96))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_36px_rgba(0,255,220,0.12)]">
        <div className="relative border-b border-white/10 px-5 py-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white"
            aria-label="Close budget actions"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-12">
            <div className="mb-3 inline-flex items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/85">
              Budget setup
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white">
              Budget Actions
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/65">
              Build this month’s spending plan.
            </p>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5">
          <button
            type="button"
            disabled={financeActionLoading}
            onClick={() => {
              onClose();
              onSaveBudget?.();
            }}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_20px_rgba(0,255,220,0.08)] transition hover:bg-cyan-300/15 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {hasDeclaredBudget ? "Add Category" : "Declare Monthly Budget"}
          </button>

          {!!activeBudget?.category_count && (
            <button
              type="button"
              disabled={financeActionLoading}
              onClick={() => {
                onClose();
                onResetBudget?.();
              }}
              className={`${softButton} flex min-h-[52px] w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold`}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Tracking Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
