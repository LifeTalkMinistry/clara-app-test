import { ChevronDown, MoreHorizontal, Pencil, Plus, Repeat2, Trash2, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import useInvestmentCardLogic, {
  fmt,
} from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import IncomeSourceAddMoneyModal from "@/components/financial-carousel/cards/investment/ui/IncomeSourceAddMoneyModal";
import IncomeSourceCreateModal from "@/components/financial-carousel/cards/investment/ui/IncomeSourceCreateModal";
import {
  deleteIncomeSource,
  getIncomeHubLocalUserId,
  getIncomeSourceRemovalPlan,
} from "@/lib/incomeHubRepository";
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

const incomeMenuButtonClass =
  "relative z-[130] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/[0.055] text-white/78 transition hover:border-white/28 hover:bg-white/[0.10] hover:text-white disabled:opacity-50";

const incomeMenuActionClass =
  "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-white/94 transition hover:bg-white/[0.10] disabled:opacity-50";

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

function stopIncomeSourceGesture(event) {
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

function stopIncomeSourceAction(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

function isIncomeSourceInteractiveTarget(target) {
  return Boolean(target?.closest?.('[data-income-source-interactive="true"]'));
}

function dispatchIncomeSourceRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("clara-income-hub-updated"));
  window.dispatchEvent(new Event("clara-finance-updated"));
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

function IncomeSourcePreviewRow({ source, menuOpen, onToggleMenu, onAction }) {
  const net = getSourceNet(source);
  const initial = String(source?.name || "I").trim().slice(0, 1).toUpperCase() || "I";

  const handleMenuAction = (event, action) => {
    stopIncomeSourceAction(event);
    onAction(source, action);
  };

  return (
    <div className={`relative overflow-visible rounded-2xl border border-white/[0.06] bg-black/[0.10] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${menuOpen ? "z-[95]" : "z-0"}`}>
      <div className="absolute left-0 top-3 h-[calc(100%-24px)] w-[3px] rounded-full bg-emerald-300/70" />
      <div className="flex items-center gap-3 pl-1.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-400/10 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black leading-tight text-white">{source?.name || "Income Source"}</p>
          <p className="mt-1 text-[11px] font-bold leading-none text-white/66">Net: {fmt(net)}</p>
        </div>

        <div className="relative shrink-0" data-income-source-interactive="true">
          <button
            type="button"
            onPointerDownCapture={stopIncomeSourceGesture}
            onMouseDownCapture={stopIncomeSourceGesture}
            onTouchStartCapture={stopIncomeSourceGesture}
            onClick={(event) => {
              stopIncomeSourceAction(event);
              onToggleMenu(source.id);
            }}
            className={incomeMenuButtonClass}
            aria-expanded={menuOpen}
            aria-label={`Open ${source?.name || "income source"} actions`}
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 top-10 z-[170] w-52 rounded-[22px] border border-white/[0.18] bg-[rgba(12,18,45,0.96)] p-1.5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.45)] ring-1 ring-cyan-200/10 backdrop-blur-xl"
              onClick={stopIncomeSourceAction}
              onPointerDownCapture={stopIncomeSourceGesture}
              onMouseDownCapture={stopIncomeSourceGesture}
              onTouchStartCapture={stopIncomeSourceGesture}
              data-income-source-interactive="true"
            >
              <button
                type="button"
                onClick={(event) => handleMenuAction(event, "add_money")}
                className={incomeMenuActionClass}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-200" />
                Add Money
              </button>

              <button
                type="button"
                onClick={(event) => handleMenuAction(event, "transfer_money")}
                className={incomeMenuActionClass}
              >
                <Repeat2 className="h-3.5 w-3.5 text-sky-200" />
                Transfer Money
              </button>

              <button
                type="button"
                onClick={(event) => handleMenuAction(event, "delete_income_source")}
                className={`${incomeMenuActionClass} text-rose-100 hover:bg-rose-500/10`}
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-200" />
                Delete
              </button>

              <button
                type="button"
                onClick={(event) => handleMenuAction(event, "edit_income_source")}
                className={incomeMenuActionClass}
              >
                <Pencil className="h-3.5 w-3.5 text-cyan-100" />
                Edit
              </button>
            </div>
          ) : null}
        </div>
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
        data-income-source-interactive="true"
        onClick={(event) => {
          stopIncomeSourceAction(event);
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

function IncomeSourceCreateButton({ onCreateIncomeSource }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        stopIncomeSourceAction(event);
        onCreateIncomeSource?.();
      }}
      data-income-source-interactive="true"
      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-black text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-cyan-200/18 hover:bg-white/[0.07]"
    >
      <Plus className="h-4 w-4 text-cyan-100" />
      Add income source
    </button>
  );
}

function EmptyIncomeSourcesPreview({ onCreateIncomeSource }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/[0.055] bg-white/[0.035] px-3.5 py-3 text-center text-[12px] font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        Create an income source to start tracking money coming in.
      </div>
      <IncomeSourceCreateButton onCreateIncomeSource={onCreateIncomeSource} />
    </div>
  );
}

function IncomeSourceRemovalModal({ source, open, saving, onClose, onConfirm }) {
  if (!open || !source) return null;

  const removalPlan = getIncomeSourceRemovalPlan(source);
  const isBlocked = removalPlan.type === "blocked_balance";
  const primaryLabel = isBlocked ? "Close" : removalPlan.primaryLabel;

  return (
    <div
      className="fixed inset-0 z-[160] flex min-h-[100svh] items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(15,23,42,0.45),rgba(2,6,23,0.78)_55%,rgba(2,6,23,0.92))] px-4 py-5 backdrop-blur-[16px]"
      onClick={() => {
        if (!saving) onClose?.();
      }}
    >
      <div
        className="w-full max-w-[390px] rounded-[32px] border border-white/[0.14] bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.10),transparent_38%),linear-gradient(135deg,rgba(5,31,48,0.98),rgba(8,16,42,0.995)_50%,rgba(35,15,67,0.995))] p-4 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_42px_rgba(244,63,94,0.06)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">Income source safety</p>
            <h3 className="mt-2 text-[25px] font-black leading-tight tracking-[-0.045em] text-white">{removalPlan.title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-sm font-black text-white">{source.name}</p>
          <p className="mt-1 text-xs font-semibold text-white/55">Current balance: {fmt(getSourceNet(source))}</p>
        </div>

        <p className="mt-4 text-[13px] font-semibold leading-6 text-white/68">{removalPlan.message}</p>

        <div className="mt-5 grid grid-cols-[0.84fr_1.16fr] gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/76 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-55"
          >
            {removalPlan.secondaryLabel}
          </button>

          <button
            type="button"
            onClick={isBlocked ? onClose : onConfirm}
            disabled={saving}
            className={`rounded-2xl px-4 py-3 text-sm font-black text-white transition disabled:opacity-55 ${
              removalPlan.danger && !isBlocked
                ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_10px_30px_rgba(244,63,94,0.24)]"
                : "bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 shadow-[0_10px_30px_rgba(34,211,238,0.18)]"
            }`}
          >
            {saving ? "Saving..." : primaryLabel}
          </button>
        </div>
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
  const { user } = useAuth();
  const isExpanded = expandedFinanceCard === DETAIL_KEY;
  const localUserId = getIncomeHubLocalUserId(user);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [incomeSourceModal, setIncomeSourceModal] = useState({ type: null, source: null });
  const [sourceFormModal, setSourceFormModal] = useState({ open: false, source: null });
  const [removalSource, setRemovalSource] = useState(null);
  const [removalSaving, setRemovalSaving] = useState(false);

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

  useEffect(() => {
    if (!openMenuId || typeof window === "undefined") return undefined;

    const closeMenuFromOutside = (event) => {
      if (isIncomeSourceInteractiveTarget(event.target)) return;
      setOpenMenuId(null);
    };

    const closeMenuFromEscape = (event) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };

    window.addEventListener("pointerdown", closeMenuFromOutside, true);
    window.addEventListener("keydown", closeMenuFromEscape, true);

    return () => {
      window.removeEventListener("pointerdown", closeMenuFromOutside, true);
      window.removeEventListener("keydown", closeMenuFromEscape, true);
    };
  }, [openMenuId]);

  const sourceCount = readiness?.sourceCount || incomeSources.length || 0;
  const incomeSourceTitle = `${sourceCount} Income Source${sourceCount === 1 ? "" : "s"}`;
  const mainValue = readiness?.totalGenerated > 0 ? fmt(readiness.totalGenerated) : "Set source";

  const openCreateIncomeSourceModal = () => {
    setOpenMenuId(null);
    setSourceFormModal({ open: true, source: null });
  };

  const closeSourceFormModal = () => {
    setSourceFormModal({ open: false, source: null });
  };

  const handleSourceAction = (source, action) => {
    setOpenMenuId(null);

    if (action === "add_money" || action === "transfer_money") {
      setIncomeSourceModal({ type: action, source });
      return;
    }

    if (action === "edit_income_source") {
      setSourceFormModal({ open: true, source });
      return;
    }

    if (action === "delete_income_source") {
      setRemovalSource(source);
    }
  };

  const closeRemovalModal = () => {
    if (removalSaving) return;
    setRemovalSource(null);
  };

  const confirmRemoveIncomeSource = async () => {
    if (!removalSource?.id) return;

    try {
      setRemovalSaving(true);
      await deleteIncomeSource(localUserId, removalSource.id);
      setRemovalSource(null);
      dispatchIncomeSourceRefresh();
    } catch (error) {
      console.error("CLARA income source removal error:", error);
    } finally {
      setRemovalSaving(false);
    }
  };

  const handleRootClickCapture = (event) => {
    if (isIncomeSourceInteractiveTarget(event.target)) return;

    if (openMenuId) {
      event.stopPropagation();
      setOpenMenuId(null);
      return;
    }

    if (stopCapturedDetailsToggle(event)) {
      handleInvestmentToggle();
    }
  };

  return (
    <>
      <div
        className="h-full min-h-[inherit] flex flex-col"
        onClickCapture={handleRootClickCapture}
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
                              <IncomeSourcePreviewRow
                                key={source.id}
                                source={source}
                                menuOpen={openMenuId === source.id}
                                onToggleMenu={(sourceId) => setOpenMenuId((current) => (current === sourceId ? null : sourceId))}
                                onAction={handleSourceAction}
                              />
                            ))}
                          </div>
                          <IncomeSourceCreateButton onCreateIncomeSource={openCreateIncomeSourceModal} />
                          <IncomeRecentActivityPreview sources={incomeSources} />
                        </div>
                      ) : (
                        <EmptyIncomeSourcesPreview onCreateIncomeSource={openCreateIncomeSourceModal} />
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

      <IncomeSourceAddMoneyModal
        open={incomeSourceModal.type === "add_money" || incomeSourceModal.type === "transfer_money"}
        mode={incomeSourceModal.type}
        source={incomeSourceModal.source}
        onClose={() => setIncomeSourceModal({ type: null, source: null })}
      />

      <IncomeSourceCreateModal
        open={sourceFormModal.open}
        source={sourceFormModal.source}
        onClose={closeSourceFormModal}
      />

      <IncomeSourceRemovalModal
        open={Boolean(removalSource)}
        source={removalSource}
        saving={removalSaving}
        onClose={closeRemovalModal}
        onConfirm={confirmRemoveIncomeSource}
      />
    </>
  );
}
