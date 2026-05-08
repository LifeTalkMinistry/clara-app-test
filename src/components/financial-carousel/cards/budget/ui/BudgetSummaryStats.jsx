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
      <div className="mb-[clamp(8px,1.4dvh,12px)]">
        <p className={`text-[clamp(29px,7.8vw,32px)] font-bold leading-none ${hasDeclaredBudget ? status.text : "text-white/95"}`}>
          {fmt(declared)}
        </p>

        <p className={`mt-[clamp(4px,0.8dvh,6px)] text-sm font-bold leading-tight ${remainingAmountColor}`}>
          {fmt(remaining)} left
        </p>

        <p className="mt-[clamp(6px,1.1dvh,10px)] max-w-[28rem] text-xs font-medium leading-snug text-white/82">
          {message}
        </p>

        <p className="mt-[clamp(2px,0.6dvh,4px)] text-[11px] leading-snug text-white/56">
          {hasDeclaredBudget
            ? planIsComplete
              ? "Your monthly budget is fully assigned and ready for planned expense logging."
              : `${fmt(unallocated)} still unallocated from your declared budget.`
            : "Your money needs a monthly plan before it disappears."}
        </p>
      </div>

      <div className="mb-[clamp(8px,1.4dvh,12px)]">
        <div className="mb-[clamp(5px,0.9dvh,6px)] flex items-center justify-between text-[11px] font-medium text-white/75">
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

        <div className="mt-[clamp(6px,1dvh,8px)] flex items-center justify-between text-[11px] font-medium text-white/70">
          <span>{fmt(spent)}</span>
          <span>{fmt(allocated)}</span>
        </div>
      </div>
    </>
  );
}
