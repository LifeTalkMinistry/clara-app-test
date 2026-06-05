import { ChevronDown, MoreHorizontal, WalletCards } from "lucide-react";
import { useState } from "react";
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

function toIncomeNumber(value) {
  const number = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function getSourceIn(source) {
  return toIncomeNumber(source?.totalMoneyIn ?? source?.total_money_in);
}

function getSourceOut(source) {
  return toIncomeNumber(source?.totalMoneyOut ?? source?.total_money_out);
}

function getSourceNet(source) {
  return toIncomeNumber(source?.currentBalance ?? source?.current_balance ?? getSourceIn(source) - getSourceOut(source));
}

function getSourceActivityDate(source) {
  return source?.lastActivityAt || source?.last_activity_at || source?.updatedAt || source?.updated_at || source?.createdAt || source?.created_at || null;
}

function formatIncomeActivityDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function IncomeSourcePreviewRow({ source }) {
  const net = getSourceNet(source);
  const initial = String(source?.name || "I").trim().slice(0, 1).toUpperCase() || "I";

  return (
    <div className="relative overflow-visible rounded-2xl border border-white/[0.06] bg-black/[0.10] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="absolute left-0 top-3 h-[calc(100%-24px)] w-[3px] rounded-full bg-emerald-300/70" />
      <div className="flex items-center gap-3 pl-1.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-400/10 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black leading-tight text-white">{source?.name || "Income Source"}</p>
          <p className="mt-1 text-[11px] font-bold leading-none text-white/66">Net: {fmt(net)}</p>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.055] text-white/78"
          aria-label={`${source?.name || "Income source"} actions`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}

function buildIncomeActivityItems(sources = []) {
  return (Array.isArray(sources) ? sources : [])
    .map((source) => {
      const moneyIn = getSourceIn(source);
      const moneyOut = getSourceOut(source);
      const date = getSourceActivityDate(source);
      const wasUpdated = source?.updatedAt || source?.updated_at;

      if (moneyOut > 0) {
        return {
          id: `${source.id}-out`,
          title: "Transfer to Wallet",
          date,
          amount: moneyOut,
          prefix: "-",
          amountClassName: "text-rose-100",
        };
      }

      if (moneyIn > 0) {
        return {
          id: `${source.id}-in`,
          title: "Added Money",
          date,
          amount: moneyIn,
          prefix: "+",
          amountClassName: "text-emerald-100",
        };
      }

      return {
        id: `${source.id}-source`,
        title: wasUpdated ? "Updated Source" : "Created Source",
        date,
        amount: null,
        prefix: "",
        amountClassName: "text-white/70",
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 3);
}

function IncomeRecentActivityPreview({ sources = [] }) {
  const [expanded, setExpanded] = useState(false);
  const items = buildIncomeActivityItems(sources);

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-cyan-100/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Recent activity</span>
        <ChevronDown className={`h-4 w-4 text-white/58 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                <p className="mt-1 text-xs text-white/45">{formatIncomeActivityDate(item.date)}</p>
              </div>

              {item.amount !== null ? (
                <p className={`shrink-0 text-sm font-bold ${item.amountClassName}`}>
                  {item.prefix}{fmt(item.amount || 0)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
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

  const sourceCount = readiness?.sourceCount || incomeSources.length || 0;
  const incomeSourceTitle = `${sourceCount} Income Source${sourceCount === 1 ? "" : "s"}`;
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
                  {incomeSourceTitle}
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
                <FinanceCardExpandedPanel className="h-full overflow-y-auto pr-1">
                  <div className="rounded-[24px] border border-white/[0.055] bg-black/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                    {incomeSources.length ? (
                      <div className="space-y-3">
                        <div className="max-h-[286px] space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.24)_transparent]">
                          {incomeSources.map((source) => (
                            <IncomeSourcePreviewRow key={source.id} source={source} />
                          ))}
                        </div>
                        <IncomeRecentActivityPreview sources={incomeSources} />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/[0.055] bg-white/[0.035] px-3.5 py-3 text-center text-[12px] font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                        Create an income source to start tracking money coming in.
                      </div>
                    )}
                  </div>

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
