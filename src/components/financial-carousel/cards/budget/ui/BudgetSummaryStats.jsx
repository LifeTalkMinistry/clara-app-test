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
  const statusLabel = status?.label || (hasDeclaredBudget ? "Healthy" : "No Plan");
  const remainingMessage = hasDeclaredBudget
    ? `Out of your ${fmt(declared)} budget.`
    : "Create this cycle’s spending plan first.";
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
      <div className="mb-4">
        <p
          className={`text-[clamp(1.95rem,8vw,2.25rem)] font-black leading-none tracking-[-0.055em] drop-shadow-[0_10px_26px_rgba(0,0,0,0.22)] ${
            hasDeclaredBudget
              ? remainingAmountColor
              : "text-teal-50 drop-shadow-[0_0_16px_rgba(153,246,228,0.13)]"
          }`}
        >
          {fmt(remaining)}{hasDeclaredBudget ? " Left" : ""}
        </p>

        <p className="mt-2.5 max-w-[92%] text-[13px] font-semibold leading-snug text-white/72">
          {remainingMessage}
        </p>
      </div>

      <div className="mb-1 overflow-hidden rounded-[24px] border border-cyan-100/[0.10] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_14px_28px_rgba(0,0,0,0.16),0_0_24px_rgba(103,232,249,0.035)] backdrop-blur-xl">
        <div className="grid grid-cols-3 divide-x divide-white/[0.07]">
          {summaryTiles.map((tile) => (
            <div
              key={tile.label}
              className="relative min-w-0 px-2.5 py-3 text-center"
            >
              <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
              <p
                className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${
                  tile.valueClassName || "text-white/90"
                }`}
              >
                {tile.value}
              </p>
              <p className="mt-1.5 truncate text-[8px] font-black uppercase tracking-[0.16em] text-white/40">
                {tile.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}