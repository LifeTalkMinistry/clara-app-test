import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

export default function BudgetSummaryStats({
  declared = 0,
  remaining = 0,
  spent = 0,
  allocated = 0,
  unallocated = 0,
  progress = 0,
  status,
  message,
  remainingAmountColor,
  hasDeclaredBudget = false,
  planIsComplete = false,
}) {
  return (
    <>
      <div className="mb-2.5">
        <p
          className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${
            hasDeclaredBudget ? status.text : "text-white/95"
          }`}
        >
          {fmt(declared)}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          <p className={`text-sm font-bold leading-tight ${remainingAmountColor}`}>
            {fmt(remaining)} left
          </p>

          <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-0.5 text-[10px] font-semibold text-white/45">
            Remaining
          </span>
        </div>

        <p className="mt-2 max-w-[28rem] text-xs font-medium leading-relaxed text-white/80">
          {message}
        </p>

        <p className="mt-1 text-[11px] leading-relaxed text-white/54">
          {hasDeclaredBudget
            ? planIsComplete
              ? "Your monthly budget is fully assigned and ready for planned expense logging."
              : `${fmt(unallocated)} still unallocated from your declared budget.`
            : "Your money needs a monthly plan before it disappears."}
        </p>
      </div>

      <div className="mb-2">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/72">
          <span>Monthly progress</span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div className="relative h-3 overflow-hidden rounded-full border border-cyan-100/14 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div
            className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 opacity-40" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/66">
          <span>{fmt(spent)}</span>
          <span>{fmt(allocated)}</span>
        </div>
      </div>
    </>
  );
}
