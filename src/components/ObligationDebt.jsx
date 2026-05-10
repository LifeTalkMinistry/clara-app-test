import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";

import useDebtCardLogic, {
  DEBT_TYPES,
  fmt,
} from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";

const tileClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/35";

export default function ObligationDebt({
  item = null,
  expanded = false,
  onToggleDetails,
}) {
  const { state, computed, handlers } = useDebtCardLogic({
    item,
    expanded,
    onToggleDetails,
  });

  const {
    isExpanded,
    debtType,
    totalDebtInput,
    monthlyDebtInput,
    interestInput,
  } = state;

  const {
    tone,
    totalDebt,
    monthlyDebt,
    debtRatio,
    riskLevel,
    statusLabel,
    smartFeedback,
    monthlyLeftover,
    payoffMonths,
    description,
  } = computed;

  const {
    setDebtType,
    setTotalDebtInput,
    setMonthlyDebtInput,
    setInterestInput,
    handlePlanPayoff,
    handleAskClara,
    handleToggleDetails,
  } = handlers;

  const summaryTiles = [
    {
      label: "Monthly",
      value: fmt(monthlyDebt),
    },
    {
      label: "Ratio",
      value: `${debtRatio.toFixed(0)}%`,
      valueClassName:
        debtRatio >= 50
          ? "text-rose-300"
          : debtRatio >= 30
            ? "text-amber-300"
            : "text-emerald-300",
    },
    {
      label: "Status",
      value: riskLevel,
      valueClassName:
        riskLevel === "Debt free"
          ? "text-emerald-300"
          : riskLevel === "Moderate"
            ? "text-amber-300"
            : riskLevel === "High"
              ? "text-rose-300"
              : "text-cyan-300",
    },
  ];

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border text-white shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.10)] transition-all duration-200 ${tone.border}`}
    >
      <div className="absolute inset-0" style={{ background: tone.background }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_31%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.20),transparent_33%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.02)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/16 to-black/30" />
      <div className="pointer-events-none absolute bottom-[-135px] right-[-92px] h-[230px] w-[230px] rounded-full bg-violet-400/[0.09] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-4">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0">
            <div className="mb-3 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${tone.iconShell}`}
              >
                <ShieldAlert className={`h-4 w-4 ${tone.icon}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-white">
                      Debt / Obligations
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-white/76">
                      Track what you owe.
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone.status}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${tone.value}`}>
                {fmt(totalDebt)}
              </p>

              <p className="mt-2 text-sm font-semibold leading-tight text-white/82">
                {totalDebt > 0
                  ? "Total active obligations."
                  : "No active debt recorded."}
              </p>
            </div>

            <div className="mb-1 grid grid-cols-3 gap-2">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className={tileClass}>
                  <p
                    className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${tile.valueClassName || "text-white/92"}`}
                  >
                    {tile.value}
                  </p>
                  <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
                    {tile.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-white/6 pt-2">
            <button
              type="button"
              onClick={handleToggleDetails}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:bg-white/10"
            >
              <span>{isExpanded ? "Hide details" : "Show details"}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Debt
                </p>
                <p className="truncate text-sm font-bold text-white">
                  {fmt(totalDebt)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Monthly
                </p>
                <p className="truncate text-sm font-bold text-white">
                  {fmt(monthlyDebt)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Risk
                </p>
                <p className="truncate text-sm font-bold text-white">
                  {riskLevel}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Debt type
              </label>
              <select
                value={debtType}
                onChange={(event) => setDebtType(event.target.value)}
                className={inputClass}
              >
                {DEBT_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                    className="bg-slate-950"
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Total debt
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalDebtInput}
                  onChange={(event) => setTotalDebtInput(event.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Monthly payment
                </label>
                <input
                  type="number"
                  min="0"
                  value={monthlyDebtInput}
                  onChange={(event) => setMonthlyDebtInput(event.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Interest rate
              </label>
              <input
                type="number"
                min="0"
                value={interestInput}
                onChange={(event) => setInterestInput(event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />

              <p className="mt-1.5 text-[11px] font-medium text-white/60">
                {smartFeedback}
                {payoffMonths > 0
                  ? ` • Around ${payoffMonths} month${payoffMonths === 1 ? "" : "s"} remaining.`
                  : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-[11px] font-medium leading-relaxed text-white/70">
              Remaining after expenses:{" "}
              <span className="font-semibold text-white">
                {fmt(monthlyLeftover)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePlanPayoff}
                className="flex items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Plan payoff
              </button>

              <button
                type="button"
                onClick={handleAskClara}
                className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
              >
                Ask CLARA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
