import { Plus, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";

import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import useInvestmentCardLogic, { fmt } from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";

const expandButtonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const INCOME_HUB_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-sky-500/[0.09] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-purple-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(103,232,249,0.105),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(124,58,237,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/[0.055]",
];

function IncomeHubHeader({ title, statusLabel, tone }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm">
        <WalletCards className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-base font-semibold tracking-tight text-white">{title}</p>

          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone.status}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function IncomeSummaryStats({ mainLabel, statOneLabel, statOneValue, statTwoLabel, statTwoValue, statThreeLabel, statThreeValue, tone }) {
  const summaryTiles = [
    { label: statOneLabel, value: statOneValue, valueClassName: "text-emerald-200" },
    { label: statTwoLabel, value: statTwoValue },
    { label: statThreeLabel, value: statThreeValue, valueClassName: tone.value },
  ];

  return (
    <>
      <div className="mb-3">
        <p className={`text-[31px] font-bold leading-none tracking-[-0.045em] ${tone.value}`}>{mainLabel}</p>
      </div>

      <div className="mb-1 overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm">
        <div className="grid grid-cols-3 divide-x divide-white/[0.055]">
          {summaryTiles.map((tile) => (
            <div key={tile.label} className="relative px-2.5 py-2.5 text-center">
              <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
              <p className={`flex min-h-[1rem] items-center justify-center truncate text-[13px] font-black leading-none tracking-[-0.03em] ${tile.valueClassName || "text-white/88"}`}>
                {tile.value}
              </p>
              <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="shrink-0 border-t border-white/[0.035] pt-3">
      <FinanceCardExpandButton
        detailKey="investmentFund"
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        collapsedLabel="View income sources"
        expandedLabel="Hide income sources"
        className={expandButtonClass}
      />
    </div>
  );
}

function EmptyIncomeSources({ onOpenIncomeHub }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/[0.055] bg-white/[0.035] px-3.5 py-3 text-center text-[12px] font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        Create an income source to start tracking money coming in.
      </div>

      <div className="flex min-h-[164px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.035] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <WalletCards className="h-8 w-8 text-white/30" />
        <p className="mt-4 text-sm font-black text-white/88">No income sources yet</p>
        <p className="mt-2 max-w-[230px] text-[12px] font-semibold leading-5 text-white/66">
          Add Salary, Business, Side Hustle, Allowance, or Freelance as your source of money.
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenIncomeHub}
        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-black text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/[0.07]"
      >
        <Plus className="h-4 w-4" />
        Create Income Source
      </button>
    </div>
  );
}

function ActiveIncomeSources({ readiness, onOpenIncomeHub }) {
  const topSourceName = readiness?.topSourceName || "No source yet";
  const sourceCount = readiness?.sourceCount || 0;
  const totalGenerated = readiness?.totalGenerated || 0;
  const totalOut = readiness?.totalOut || 0;
  const netGenerated = readiness?.netGenerated || 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/[0.055] bg-white/[0.035] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Top source</p>
            <p className="mt-1 truncate text-sm font-black text-white/88">{topSourceName}</p>
          </div>
          <span className="shrink-0 rounded-full border border-cyan-300/18 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
            {sourceCount} source{sourceCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.055] bg-black/[0.08] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="px-2 py-3">
          <p className="truncate text-[12px] font-black text-emerald-200">{fmt(totalGenerated)}</p>
          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/34">Money in</p>
        </div>
        <div className="border-x border-white/[0.055] px-2 py-3">
          <p className="truncate text-[12px] font-black text-rose-200">{fmt(totalOut)}</p>
          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/34">Money out</p>
        </div>
        <div className="px-2 py-3">
          <p className="truncate text-[12px] font-black text-white/88">{fmt(netGenerated)}</p>
          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/34">Net</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenIncomeHub}
        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-black text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/[0.07]"
      >
        Open Income Hub
      </button>
    </div>
  );
}

export default function InvestmentCard({ item = null, expanded = false, onToggleDetails }) {
  const navigate = useNavigate();
  const { state, computed, handlers } = useInvestmentCardLogic({ item, expanded, onToggleDetails });

  const { isExpanded } = state;
  const {
    tone,
    title,
    statusLabel,
    mainLabel,
    readiness,
    statOneLabel,
    statOneValue,
    statTwoLabel,
    statTwoValue,
    statThreeLabel,
    statThreeValue,
  } = computed;
  const { handleToggleDetails } = handlers;

  const openIncomeHub = () => {
    navigate("/investment-plan", { state: { source: "income-hub-card" } });
  };

  const sourceCount = readiness?.sourceCount || 0;

  return (
    <FinanceCardShell
      cardKey="investmentFund"
      expanded={isExpanded}
      ringClass="shadow-[0_0_24px_rgba(34,211,238,0.08),0_0_46px_rgba(88,28,135,0.07)]"
      roundedClass="rounded-3xl"
      glowLayerClassNames={INCOME_HUB_GLOW_LAYERS}
      surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]"
      shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]"
    >
      {!isExpanded ? (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.48]">
            <div className="absolute -left-20 top-[-58px] h-40 w-40 rounded-full bg-cyan-400/[0.065] blur-3xl" />
            <div className="absolute bottom-[-104px] right-[-82px] h-48 w-48 rounded-full bg-violet-500/[0.10] blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),transparent_30%,rgba(0,0,0,0.16)_100%)]" />
          </div>

          <div className="relative flex min-h-0 flex-col gap-4">
            <div className="min-h-0 rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]">
              <IncomeHubHeader title={title} statusLabel={statusLabel} tone={tone} />

              <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
                <IncomeSummaryStats
                  mainLabel={mainLabel}
                  statOneLabel={statOneLabel}
                  statOneValue={statOneValue}
                  statTwoLabel={statTwoLabel}
                  statTwoValue={statTwoValue}
                  statThreeLabel={statThreeLabel}
                  statThreeValue={statThreeValue}
                  tone={tone}
                />
              </div>
            </div>

            <ExpandButtonRow expanded={false} onToggleDetails={handleToggleDetails} />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.42]">
            <div className="absolute -left-24 top-[-70px] h-48 w-48 rounded-full bg-cyan-400/[0.06] blur-3xl" />
            <div className="absolute bottom-[-130px] right-[-110px] h-60 w-60 rounded-full bg-violet-500/[0.10] blur-3xl" />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col gap-4">
            <div className="shrink-0">
              <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${tone.value}`}>{mainLabel}</p>
            </div>

            <ExpandButtonRow expanded={true} onToggleDetails={handleToggleDetails} />

            <div className="min-h-0 flex-1 overflow-hidden pt-1">
              <FinanceCardExpandedPanel className="h-full overflow-y-auto pr-1">
                <div className="rounded-[24px] border border-white/[0.055] bg-black/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                  {sourceCount === 0 ? (
                    <EmptyIncomeSources onOpenIncomeHub={openIncomeHub} />
                  ) : (
                    <ActiveIncomeSources readiness={readiness} onOpenIncomeHub={openIncomeHub} />
                  )}
                </div>

                <div aria-hidden="true" className="h-5 shrink-0" />
              </FinanceCardExpandedPanel>
            </div>
          </div>
        </div>
      )}
    </FinanceCardShell>
  );
}
