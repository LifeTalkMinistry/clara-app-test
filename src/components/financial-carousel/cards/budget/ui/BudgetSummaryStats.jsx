import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

export default function BudgetSummaryStats({
  declared = 0,
  remaining = 0,
  spent = 0,
  progress = 0,
  status,
  remainingAmountColor,
  hasDeclaredBudget = false,
}) {
  const roundedProgress = Math.round(progress);
  const hasNoSpendingLogged = hasDeclaredBudget && Number(spent || 0) <= 0;
  const summaryTiles = [
    {
      label: "Spent",
      value: fmt(spent),
    },
    {
      label: "Plan",
      value: fmt(declared),
    },
    {
      label: "Used",
      value: `${roundedProgress}%`,
      valueClassName: status?.text,
    },
  ];

  return (
    <>
      <div className="mb-3">
        <p
          className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${
            hasDeclaredBudget ? remainingAmountColor : "text-white/95"
          }`}
        >
          {fmt(remaining)}
        </p>

        <p className="mt-2 text-sm font-semibold leading-tight text-white/82">
          Available to spend this month.
        </p>

        <p className="mt-3 text-[12px] leading-relaxed text-white/68">
          {hasNoSpendingLogged
            ? "No spending activity yet."
            : `${fmt(spent)} already used from your monthly plan.`}
        </p>
      </div>

      <div className="mb-1 grid grid-cols-3 gap-2">
        {summaryTiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
          >
            <p
              className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${
                tile.valueClassName || "text-white/92"
              }`}
            >
              {tile.value}
            </p>
            <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
              {tile.label}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
