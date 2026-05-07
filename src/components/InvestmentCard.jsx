import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

import useInvestmentCardLogic, {
  fmt,
  INVESTMENT_TYPES,
} from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";

export default function InvestmentCard({
  item = null,
  expanded = false,
  onToggleDetails,
}) {
  const { state, computed, handlers } = useInvestmentCardLogic({
    item,
    expanded,
    onToggleDetails,
  });

  const { investmentType, plannedAmount, isExpanded } = state;

  const {
    tone,
    title,
    subtitle,
    statusLabel,
    mainLabel,
    description,
    readinessProgress,
    canSafelyInvest,
    safeToInvest,
    amountStatus,
    statOneLabel,
    statOneValue,
    statTwoLabel,
    statTwoValue,
    statThreeLabel,
    statThreeValue,
  } = computed;

  const {
    setInvestmentType,
    setPlannedAmount,
    handlePlanInvestment,
    handleAskClara,
    handleToggleDetails,
  } = handlers;

  return (
    <div
      className={`clara-finance-bubble-card clara-finance-bubble-investment relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border text-white shadow-2xl transition-all duration-200 ${tone.border}`}
    >
      <div className="absolute inset-0" style={{ background: tone.background }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/18 via-black/12 to-black/32" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-20 rounded-full bg-white/8 blur-3xl" />
      <div
        className={`pointer-events-none absolute right-5 top-24 h-24 w-24 rounded-full blur-3xl ${tone.accent}`}
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
        <div className={`${isExpanded ? "shrink-0" : "flex-1"} flex min-h-0 flex-col justify-between`}>
          <div>
            <div className="mb-3 flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${tone.iconShell}`}
              >
                <TrendingUp className={`h-4 w-4 ${tone.icon}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-white">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-white/82">
                      {subtitle}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${tone.status}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3 pr-8">
              <p className={`text-[30px] font-bold leading-none ${tone.value}`}>
                {mainLabel}
              </p>

              <p className="mt-2 max-w-[28rem] overflow-hidden text-xs font-medium leading-relaxed text-white/82 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {description}
              </p>
            </div>

            <div className={`${isExpanded ? "mb-2" : "mb-3"}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-white/75">
                <span>Readiness</span>
                <span className="truncate text-right">
                  {canSafelyInvest ? "Ready" : "Build protection"}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
                <div
                  className={`relative h-full rounded-full bg-gradient-to-r ${tone.bar} transition-all duration-500`}
                  style={{ width: `${readinessProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-40" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
                <span>Safe: {canSafelyInvest ? fmt(safeToInvest) : "₱0"}</span>
                <span>Status: {canSafelyInvest ? "Ready" : "Not ready"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleDetails}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/82 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
          >
            <span className="font-medium">
              {isExpanded ? "Hide details" : "Show details"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
              {[
                [statOneLabel, statOneValue],
                [statTwoLabel, statTwoValue],
                [statThreeLabel, statThreeValue],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2.5 backdrop-blur-[2px]"
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    {label}
                  </p>
                  <p className="truncate text-sm font-bold text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Investment type
              </label>
              <select
                value={investmentType}
                onChange={(event) => setInvestmentType(event.target.value)}
                className={`w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition ${tone.focus}`}
              >
                {INVESTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value} className="bg-slate-950">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Money to invest
              </label>
              <input
                type="number"
                min="0"
                value={plannedAmount}
                onChange={(event) => setPlannedAmount(event.target.value)}
                placeholder="0"
                className={`w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 ${tone.focus}`}
              />
              <p className="mt-1.5 text-[11px] font-medium text-white/60">
                {amountStatus}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePlanInvestment}
                className={`flex items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-semibold ${tone.primaryButton}`}
              >
                Plan Investment
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
