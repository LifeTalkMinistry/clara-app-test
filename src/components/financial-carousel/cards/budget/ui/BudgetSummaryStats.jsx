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
      <div className="mb-3">
        <p className={`text-[32px] font-bold leading-none ${hasDeclaredBudget ? status.text : "text-white/95"}`}>
          {fmt(declared)}
        </p>

        <p className={`mt-1.5 text-sm font-bold leading-tight ${remainingAmountColor}`}>
          {fmt(remaining)} left
        </p>

        <p className="mt-2.5 max-w-[28rem] text-xs font-medium leading-relaxed text-white/82">
          {message}
        </p>

        <p className="mt-1 text-[11px] text-white/56">
          {hasDeclaredBudget
            ? planIsComplete
              ? "Your monthly budget is fully assigned and ready for planned expense logging."
              : `${fmt(unallocated)} still unallocated from your declared budget.`
            : "Your money needs a monthly plan before it disappears."}
        </p>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
          <span>Monthly progress</span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full border border-cyan-100/15 bg-black/20">
          <div
            className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/25 opacity-45" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
          <span>{fmt(spent)}</span>
          <span>{fmt(allocated)}</span>
        </div>
      </div>
    </>
  );
}
