import { WalletCards } from "lucide-react";
import useInvestmentCardLogic, {
  fmt,
} from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

const DETAIL_KEY = "investmentFund";

const glowLayers = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-sky-500/[0.09] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-purple-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(103,232,249,0.105),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(124,58,237,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/[0.055]",
];

const expandButtonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

function SummaryTiles({ statOneLabel, statOneValue, statTwoLabel, statTwoValue, statThreeLabel, statThreeValue, tone }) {
  const tiles = [
    { label: statOneLabel, value: statOneValue, valueClassName: "text-emerald-200" },
    { label: statTwoLabel, value: statTwoValue },
    { label: statThreeLabel, value: statThreeValue, valueClassName: tone.value },
  ];

  return (
    <div className="mb-1 overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm">
      <div className="grid grid-cols-3 divide-x divide-white/[0.055]">
        {tiles.map((tile) => (
          <div key={tile.label} className="relative px-2.5 py-2.5 text-center">
            <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
            <p className={`truncate text-[13px] font-black leading-none tracking-[-0.03em] ${tile.valueClassName || "text-white/88"}`}>
              {tile.value}
            </p>
            <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">
              {tile.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvestmentCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  const isExpanded = expandedFinanceCard === DETAIL_KEY;

  const handleInvestmentToggle = () => {
    toggleExpandedFinanceCard({
      detailKey: DETAIL_KEY,
      isExpanded,
      toggleFinanceDetails,
    });
  };

  const { computed, handlers } = useInvestmentCardLogic({
    item,
    expanded: isExpanded,
    onToggleDetails: handleInvestmentToggle,
  });

  const {
    tone,
    title,
    subtitle,
    statusLabel,
    statOneLabel,
    statOneValue,
    statTwoLabel,
    statTwoValue,
    statThreeLabel,
    statThreeValue,
    description,
    readiness = {},
    incomeSources = [],
  } = computed;

  const mainValue = readiness?.totalGenerated > 0 ? fmt(readiness.totalGenerated) : "Set source";

  return (
    <div
      className="h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        if (stopCapturedDetailsToggle(event)) {
          handleInvestmentToggle();
        }
      }}
    >
      <FinanceCardShell
        cardKey="investmentFund"
        expanded={isExpanded}
        roundedClass="rounded-3xl"
        glowLayerClassNames={glowLayers}
        surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]"
        shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]"
      >
        {!isExpanded ? (
          <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
            <div className="relative flex min-h-0 flex-col gap-4">
              <div className="min-h-0 rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm">
                    <WalletCards className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="min-w-0 truncate text-base font-semibold leading-tight tracking-tight text-white">
                          {title || "Income Hub"}
                        </p>
                        <p className="mt-1 truncate whitespace-nowrap text-[10.5px] font-semibold leading-none text-cyan-50/55">
                          {subtitle || "Where your money comes from"}
                        </p>
                      </div>

                      <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone.status}`}>
                        {statusLabel || "Set up"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
                  <p className={`truncate text-[31px] font-bold leading-none tracking-[-0.045em] ${tone.value}`}>
                    {mainValue}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-tight text-white/76">
                    {description || "Track where your money comes from."}
                  </p>

                  <div className="mt-3">
                    <SummaryTiles
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
              </div>

              <div className="shrink-0 border-t border-white/[0.035] pt-3">
                <FinanceCardExpandButton
                  detailKey={DETAIL_KEY}
                  expanded={false}
                  onToggleDetails={handlers.handleToggleDetails}
                  collapsedLabel="View income sources"
                  expandedLabel="Hide income sources"
                  className={expandButtonClass}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
            <div className="relative flex min-h-0 flex-1 flex-col gap-4">
              <div className="shrink-0">
                <p className={`truncate text-[34px] font-black leading-none tracking-[-0.045em] ${tone.value}`}>
                  {mainValue}
                </p>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-white/68">
                  {description || "Track and review your income sources."}
                </p>
              </div>

              <div className="shrink-0 border-t border-white/[0.035] pt-3">
                <FinanceCardExpandButton
                  detailKey={DETAIL_KEY}
                  expanded={true}
                  onToggleDetails={handlers.handleToggleDetails}
                  collapsedLabel="View income sources"
                  expandedLabel="Hide income sources"
                  className={expandButtonClass}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-hidden pt-1">
                <FinanceCardExpandedPanel className="h-full space-y-3 overflow-y-auto pr-1">
                  <div className="rounded-2xl border border-white/[0.045] bg-black/[0.105] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                      Income sources
                    </p>
                    <p className="mt-2 text-[13px] font-semibold leading-5 text-white/68">
                      {incomeSources.length
                        ? `${incomeSources.length} source${incomeSources.length > 1 ? "s" : ""} tracked in Income Hub.`
                        : "Create an income source to begin mapping where your money starts."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlers.handlePlanInvestment}
                    className="w-full rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.08] px-4 py-3 text-sm font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:bg-cyan-400/[0.13]"
                  >
                    Ask CLARA About Income
                  </button>

                  <div aria-hidden="true" className="h-5 shrink-0" />
                </FinanceCardExpandedPanel>
              </div>
            </div>
          </div>
        )}
      </FinanceCardShell>
    </div>
  );
}
