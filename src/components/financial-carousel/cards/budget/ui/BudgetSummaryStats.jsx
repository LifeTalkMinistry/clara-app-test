import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

export default function BudgetSummaryStats({
  declared = 0,
  remaining = 0,
  spent = 0,
  allocated = 0,
  progress = 0,
  status,
  remainingAmountColor,
  hasDeclaredBudget = false,
}) {
  const roundedProgress = Math.round(progress);
  const hasNoSpendingLogged = hasDeclaredBudget && Number(spent || 0) <= 0;

  return (
    <>
      <div className="mb-3">
        <p
          className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${
            hasDeclaredBudget ? status.text : "text-white/95"
          }`}
        >
          {fmt(declared)}
        </p>

        <p className={`mt-2 text-sm font-semibold leading-tight ${remainingAmountColor}`}>
          {fmt(remaining)} left this month.
        </p>

        <p className="mt-3 text-[12px] leading-relaxed text-white/68">
          {hasNoSpendingLogged
            ? "No spending activity yet."
            : `${fmt(spent)} already used from your monthly budget.`}
        </p>
      </div>

      <div className="mb-1">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/62">
          <span>Budget usage</span>
          <span>{roundedProgress}%</span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full border border-white/10 bg-black/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {hasDeclaredBudget && roundedProgress <= 0 ? (
            <span className="absolute left-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-cyan-100/75 shadow-[0_0_10px_rgba(103,232,249,0.28)]" />
          ) : null}

          <div
            className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-white/52">
          <span>{fmt(spent)} spent</span>
          <span>{fmt(allocated)} budget</span>
        </div>
      </div>
    </>
  );
}
