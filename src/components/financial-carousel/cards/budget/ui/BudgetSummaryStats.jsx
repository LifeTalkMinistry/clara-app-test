import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

export default function BudgetSummaryStats({
  remaining = 0,
  spent = 0,
  progress = 0,
  status,
  remainingAmountColor,
  hasDeclaredBudget = false,
}) {
  const roundedProgress = Math.round(progress);
  const statusLabel = status?.label || (hasDeclaredBudget ? "Healthy" : "No Plan");
  const summaryTiles = [
    {
      label: "Spent",
      value: fmt(spent),
    },
    {
      label: "Used",
      value: `${roundedProgress}%`,
      valueClassName: status?.text,
    },
    {
      label: "Status",
      value: statusLabel,
      valueClassName: status?.text,
    },
  ];

  return (
    <>
      <div className="mb-3">
        <p
          className={`text-[32px] font-bold leading-none tracking-[-0.045em] ${
            hasDeclaredBudget ? remainingAmountColor : "text-white/94"
          }`}
        >
          {fmt(remaining)}
        </p>

        <p className="mt-2 text-sm font-semibold leading-tight text-white/76">
          Available to spend this month.
        </p>
      </div>

      <div className="mb-1 overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm">
        <div className="grid grid-cols-3 divide-x divide-white/[0.055]">
          {summaryTiles.map((tile) => (
            <div
              key={tile.label}
              className="relative px-2.5 py-2.5 text-center"
            >
              <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
              <p
                className={`truncate text-[13px] font-black leading-none tracking-[-0.03em] ${
                  tile.valueClassName || "text-white/88"
                }`}
              >
                {tile.value}
              </p>
              <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">
                {tile.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
