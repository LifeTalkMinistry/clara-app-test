import { WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/context/AuthContext";
import useInvestmentCardLogic, {
  fmt,
} from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import { getFinanceItemHierarchyTone } from "@/components/financial-carousel/shared/financeItemHierarchy";
import IncomeSourceAddMoneyModal from "@/components/financial-carousel/cards/investment/ui/IncomeSourceAddMoneyModal";
import IncomeSourceCreateModal from "@/components/financial-carousel/cards/investment/ui/IncomeSourceCreateModal";
import {
  EmptyIncomeSourcesPreview,
  getSourceIn,
  getSourceNet,
  IncomeRecentActivityPreview,
  IncomeSourceActionMenu,
  IncomeSourceCreateButton,
  IncomeSourcePreviewRow,
  IncomeSourceRemovalModal,
  isIncomeSourceInteractiveTarget,
} from "@/components/financial-carousel/cards/investment/ui/IncomeHubExpandedSurfaces";
import {
  deleteIncomeSource,
  getIncomeHubLocalUserId,
} from "@/lib/incomeHubRepository";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";

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
            <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">{tile.label}</p>
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
  incomeSources: incomeSourcesProp,
  incomeData,
  refreshData,
  isActive = true,
  isNearby = true,
  performanceMode = "full",
  financeCardController = null,
}) {
  const { user } = useAuth();
  const isExpanded = expandedFinanceCard === DETAIL_KEY;
  const localUserId = getIncomeHubLocalUserId(user);
  const [incomeActionMenu, setIncomeActionMenu] = useState({ source: null, anchorElement: null });
  const [incomeSourceModal, setIncomeSourceModal] = useState({ type: null, source: null });
  const [sourceFormModal, setSourceFormModal] = useState({ open: false, source: null });
  const [removalSource, setRemovalSource] = useState(null);
  const [removalSaving, setRemovalSaving] = useState(false);
  const [removalError, setRemovalError] = useState("");
  const incomeActionMenuRef = useRef(null);

  const closeIncomeActionMenu = useCallback(() => {
    setIncomeActionMenu({ source: null, anchorElement: null });
  }, []);

  const toggleIncomeActionMenu = useCallback((source, anchorElement) => {
    setIncomeActionMenu((current) => (
      current.source?.id === source?.id
        ? { source: null, anchorElement: null }
        : { source, anchorElement }
    ));
  }, []);

  const handleInvestmentToggle = () => {
    closeIncomeActionMenu();
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
    incomeSources: incomeSourcesProp,
    incomeData,
    refreshData,
    isActive,
    isNearby,
    performanceMode,
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

  const sourceHierarchy = useMemo(() => {
    const totalPositiveMoneyIn = incomeSources.reduce(
      (sum, source) => sum + Math.max(getSourceIn(source), 0),
      0
    );
    const totalPositiveNet = incomeSources.reduce(
      (sum, source) => sum + Math.max(getSourceNet(source), 0),
      0
    );
    const useNetFallback = totalPositiveMoneyIn <= 0;

    return {
      getTone(source) {
        const amount = useNetFallback ? Math.max(getSourceNet(source), 0) : Math.max(getSourceIn(source), 0);
        const denominator = useNetFallback ? totalPositiveNet : totalPositiveMoneyIn;
        return getFinanceItemHierarchyTone(amount, denominator);
      },
    };
  }, [incomeSources]);

  useEffect(() => {
    const { source, anchorElement } = incomeActionMenu;
    if (!source || !anchorElement || typeof window === "undefined") return undefined;

    const closeMenuFromOutside = (event) => {
      if (anchorElement.contains(event.target) || incomeActionMenuRef.current?.contains(event.target)) return;
      closeIncomeActionMenu();
    };

    const closeMenuFromEscape = (event) => {
      if (event.key === "Escape") closeIncomeActionMenu();
    };

    window.addEventListener("pointerdown", closeMenuFromOutside, true);
    window.addEventListener("keydown", closeMenuFromEscape, true);
    return () => {
      window.removeEventListener("pointerdown", closeMenuFromOutside, true);
      window.removeEventListener("keydown", closeMenuFromEscape, true);
    };
  }, [closeIncomeActionMenu, incomeActionMenu]);

  useEffect(() => {
    if (!incomeActionMenu.source) return;
    const selectedSourceStillExists = incomeSources.some(
      (source) => source.id === incomeActionMenu.source.id
    );
    if (!isExpanded || !selectedSourceStillExists) closeIncomeActionMenu();
  }, [closeIncomeActionMenu, incomeActionMenu.source, incomeSources, isExpanded]);

  useEffect(() => {
    if (incomeSourceModal.type || sourceFormModal.open || removalSource) closeIncomeActionMenu();
  }, [closeIncomeActionMenu, incomeSourceModal.type, removalSource, sourceFormModal.open]);

  const sourceCount = readiness?.sourceCount || incomeSources.length || 0;
  const incomeSourceTitle = `${sourceCount} Income Source${sourceCount === 1 ? "" : "s"}`;
  const mainValue = readiness?.totalGenerated > 0 ? fmt(readiness.totalGenerated) : "Set source";

  const openCreateIncomeSourceModal = () => {
    closeIncomeActionMenu();
    setSourceFormModal({ open: true, source: null });
  };

  const closeSourceFormModal = () => {
    setSourceFormModal({ open: false, source: null });
  };

  const handleSourceAction = (source, action) => {
    closeIncomeActionMenu();

    if (action === "add_money" || action === "transfer_money") {
      setIncomeSourceModal({ type: action, source });
      return;
    }
    if (action === "edit_income_source") {
      setSourceFormModal({ open: true, source });
      return;
    }
    if (action === "delete_income_source") {
      setRemovalError("");
      setRemovalSource(source);
    }
  };

  const closeRemovalModal = () => {
    if (removalSaving) return;
    setRemovalError("");
    setRemovalSource(null);
  };

  const confirmRemoveIncomeSource = async () => {
    if (!removalSource?.id) return;
    try {
      setRemovalSaving(true);
      setRemovalError("");
      await deleteIncomeSource(localUserId, removalSource.id);
      setRemovalSource(null);
    } catch (error) {
      console.error("CLARA income source removal error:", error);
      setRemovalError(error?.message || "Unable to remove this income source. Please try again.");
    } finally {
      setRemovalSaving(false);
    }
  };

  const handleRootClickCapture = (event) => {
    const isExpandToggle = Boolean(event.target?.closest?.('[data-clara-finance-expand-toggle="true"]'));
    if (isExpandToggle) {
      closeIncomeActionMenu();
      return;
    }
    if (isIncomeSourceInteractiveTarget(event.target)) return;
    if (incomeActionMenu.source) {
      event.stopPropagation();
      closeIncomeActionMenu();
    }
  };

  return (
    <>
      <div className="h-full min-h-[inherit] flex flex-col" onClickCapture={handleRootClickCapture}>
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
                          <p className="min-w-0 truncate text-base font-semibold leading-tight tracking-tight text-white">{title || "Income Hub"}</p>
                          <p className="mt-1 truncate whitespace-nowrap text-[10.5px] font-semibold leading-none text-cyan-50/55">{subtitle || "Where your money comes from"}</p>
                        </div>
                        <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone.status}`}>{statusLabel || "Set up"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
                    <p className={`truncate text-[31px] font-bold leading-none tracking-[-0.045em] ${tone.value}`}>{mainValue}</p>
                    <p className="mt-2 text-sm font-semibold leading-tight text-white/76">{description || "Track where your money comes from."}</p>
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
                  <p className={`truncate text-[34px] font-black leading-none tracking-[-0.045em] ${tone.value}`}>{incomeSourceTitle}</p>
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
                    {incomeSources.length ? (
                      <>
                        <div className="space-y-2.5">
                          {incomeSources.map((source, index) => (
                            <IncomeSourcePreviewRow
                              key={source.id || source.income_source_id || `${source.name || "source"}-${index}`}
                              source={source}
                              tone={sourceHierarchy.getTone(source)}
                              menuOpen={incomeActionMenu.source?.id === source.id}
                              onToggleMenu={toggleIncomeActionMenu}
                            />
                          ))}
                        </div>
                        <IncomeSourceCreateButton onCreateIncomeSource={openCreateIncomeSourceModal} />
                        <IncomeRecentActivityPreview sources={incomeSources} />
                      </>
                    ) : (
                      <EmptyIncomeSourcesPreview onCreateIncomeSource={openCreateIncomeSourceModal} />
                    )}
                    <div aria-hidden="true" className="h-5 shrink-0" />
                  </FinanceCardExpandedPanel>
                </div>
              </div>
            </div>
          )}
        </FinanceCardShell>
      </div>

      {incomeActionMenu.source && incomeActionMenu.anchorElement && typeof document !== "undefined"
        ? createPortal(
          <IncomeSourceActionMenu
            source={incomeActionMenu.source}
            anchorElement={incomeActionMenu.anchorElement}
            menuRef={incomeActionMenuRef}
            onAction={handleSourceAction}
            onClose={closeIncomeActionMenu}
          />,
          document.body
        )
        : null}

      {incomeSourceModal.type ? (
        <IncomeSourceAddMoneyModal
          open
          mode={incomeSourceModal.type}
          source={incomeSourceModal.source}
          financeController={financeCardController}
          onClose={() => setIncomeSourceModal({ type: null, source: null })}
        />
      ) : null}

      {sourceFormModal.open ? (
        <IncomeSourceCreateModal
          open
          source={sourceFormModal.source}
          onClose={closeSourceFormModal}
        />
      ) : null}

      {removalSource ? (
        <IncomeSourceRemovalModal
          open
          source={removalSource}
          saving={removalSaving}
          error={removalError}
          onClose={closeRemovalModal}
          onConfirm={confirmRemoveIncomeSource}
        />
      ) : null}
    </>
  );
}
