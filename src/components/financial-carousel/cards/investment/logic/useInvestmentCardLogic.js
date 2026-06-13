import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
  toIncomeHubNumber,
} from "@/lib/incomeHubRepository";
import { formatMoneyWithVisibility } from "@/utils/moneyVisibilityPreference";

const formatPhpAmount = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatIncomeSourceCount = (count) => `${count} source${count === 1 ? "" : "s"}`;

const createIncomeSourceCountValue = (count) => ({
  __incomeHubSourceCountValue: true,
  sourceCount: Number(count) || 0,
  valueOf() {
    return this.sourceCount;
  },
  toString() {
    return formatIncomeSourceCount(this.sourceCount);
  },
});

const isIncomeSourceCountValue = (value) =>
  Boolean(value && typeof value === "object" && value.__incomeHubSourceCountValue);

export const fmt = (value) => {
  if (isIncomeSourceCountValue(value)) return formatIncomeSourceCount(value.sourceCount);
  return formatMoneyWithVisibility(value, formatPhpAmount);
};

export const toNumber = (value) => toIncomeHubNumber(value);
export const clampProgress = (value) => Math.max(0, Math.min(Number(value) || 0, 100));

const getIncomeToneClasses = () => ({
  border: "border-cyan-300/20",
  iconShell: "border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
  icon: "text-cyan-100",
  status: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
  value: "text-cyan-100",
  bar: "from-cyan-300 via-blue-300 to-violet-300",
  accent: "bg-blue-300/14",
  focus: "focus:border-cyan-300/35",
  primaryButton: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/15",
  background:
    "radial-gradient(circle at -16% -22%, rgba(20,184,166,0.22), transparent 46%), radial-gradient(circle at 69% 112%, rgba(99,102,241,0.20), transparent 58%), linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.96) 48%, rgba(37,13,74,0.96))",
});

const getSourceMoneyIn = (source) => toIncomeHubNumber(source?.totalMoneyIn ?? source?.total_money_in);
const getSourceMoneyOut = (source) => toIncomeHubNumber(source?.totalMoneyOut ?? source?.total_money_out);
const getSourceNet = (source) =>
  toIncomeHubNumber(source?.currentBalance ?? source?.current_balance ?? getSourceMoneyIn(source) - getSourceMoneyOut(source));

const buildIncomeSummary = (sources = []) => {
  const incomeSources = (Array.isArray(sources) ? sources : []).filter(
    (source) => !source?.deletedAt && !source?.deleted_at
  );
  const sourceCount = incomeSources.length;
  const totalMoneyIn = incomeSources.reduce((sum, source) => sum + getSourceMoneyIn(source), 0);
  const totalOut = incomeSources.reduce((sum, source) => sum + getSourceMoneyOut(source), 0);
  const netGenerated = incomeSources.reduce((sum, source) => sum + getSourceNet(source), 0);
  const topSource = [...incomeSources].sort((a, b) => getSourceMoneyIn(b) - getSourceMoneyIn(a))[0] || null;
  const topSourceAmount = topSource ? getSourceMoneyIn(topSource) : 0;
  const mainSourceShare = topSource && totalMoneyIn > 0 ? clampProgress((topSourceAmount / totalMoneyIn) * 100) : 0;

  return {
    readinessStatus: "ready_to_test",
    sourceCount,
    monthlyGenerated: totalMoneyIn,
    totalGenerated: createIncomeSourceCountValue(sourceCount),
    totalMoneyIn,
    totalOut,
    netGenerated,
    topSourceName: topSource?.name || "No source yet",
    topSourceAmount,
    mainSourceShare,
    blockers: [],
  };
};

const getStatusMeta = (sourceCount) => {
  if (sourceCount > 1) {
    return {
      badge: `${sourceCount} sources`,
      mainLabel: "Income sources",
      statusValue: "Mapped",
      description: "Track where money comes from.",
    };
  }
  if (sourceCount === 1) {
    return {
      badge: "1 source",
      mainLabel: "Income sources",
      statusValue: "Tracked",
      description: "Track where money comes from.",
    };
  }
  return {
    badge: "Set up",
    mainLabel: "Income sources",
    statusValue: "Empty",
    description: "Add your first income source.",
  };
};

const pickParentIncomeSources = ({ incomeSourcesProp, data, parentIncomeData }) => {
  if (Array.isArray(incomeSourcesProp)) return incomeSourcesProp;
  if (Array.isArray(data?.incomeSources)) return data.incomeSources;
  if (Array.isArray(parentIncomeData?.incomeSources)) return parentIncomeData.incomeSources;
  if (Array.isArray(parentIncomeData?.sources)) return parentIncomeData.sources;
  return null;
};

export default function useInvestmentCardLogic({
  item = null,
  expanded = false,
  onToggleDetails,
  incomeSources: incomeSourcesProp,
  incomeData: incomeDataProp,
  refreshData: refreshDataProp,
  isActive = true,
  isNearby = true,
  performanceMode = "full",
  locked = false,
} = {}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [localIncomeSources, setLocalIncomeSources] = useState([]);
  const mountedRef = useRef(false);
  const localLoadInFlightRef = useRef(false);
  const parentRefreshInFlightRef = useRef(false);
  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;
  const { user } = useAuth();
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const data = item?.data || {};
  const parentIncomeData = incomeDataProp || data.incomeData || null;
  const parentIncomeSources = pickParentIncomeSources({ incomeSourcesProp, data, parentIncomeData });
  const hasParentIncomeSources = Array.isArray(parentIncomeSources);
  const incomeSources = hasParentIncomeSources ? parentIncomeSources : localIncomeSources;
  const refreshData = typeof refreshDataProp === "function"
    ? refreshDataProp
    : typeof data.refreshData === "function"
      ? data.refreshData
      : null;
  const canRunLocalFallback =
    !hasParentIncomeSources &&
    !item?.locked &&
    !locked &&
    performanceMode !== "lite" &&
    data.performanceMode !== "lite" &&
    (isActive || isNearby || data.isActiveSlide || data.isNearbySlide);

  const loadIncomeHubSources = useCallback(async () => {
    if (localLoadInFlightRef.current || hasParentIncomeSources) return;
    localLoadInFlightRef.current = true;
    try {
      const sources = await getIncomeSources(localUserId);
      if (mountedRef.current) setLocalIncomeSources(sources);
    } catch (error) {
      console.error("CLARA Income Hub card load error:", error);
      if (mountedRef.current) setLocalIncomeSources([]);
    } finally {
      localLoadInFlightRef.current = false;
    }
  }, [hasParentIncomeSources, localUserId]);

  const requestParentRefresh = useCallback(() => {
    if (!refreshData || parentRefreshInFlightRef.current) return;
    parentRefreshInFlightRef.current = true;
    Promise.resolve(refreshData())
      .catch((error) => console.error("CLARA Income Hub parent refresh error:", error))
      .finally(() => {
        parentRefreshInFlightRef.current = false;
      });
  }, [refreshData]);

  // Performance rule:
  // Income Hub should prefer dashboard-provided income data.
  // Do not independently load income sources when parent data is already available.
  // Local loading is fallback-only and should be gated by active/nearby carousel state.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (canRunLocalFallback) loadIncomeHubSources();
  }, [canRunLocalFallback, loadIncomeHubSources]);

  const shouldListenForIncomeEvents =
    (hasParentIncomeSources && typeof refreshData === "function") || canRunLocalFallback;

  useEffect(() => {
    if (typeof window === "undefined" || !shouldListenForIncomeEvents) return undefined;
    const handleIncomeUpdated = () => {
      if (hasParentIncomeSources && typeof refreshData === "function") {
        requestParentRefresh();
        return;
      }
      if (canRunLocalFallback) loadIncomeHubSources();
    };
    window.addEventListener("clara-income-hub-updated", handleIncomeUpdated);
    window.addEventListener("clara-finance-updated", handleIncomeUpdated);
    return () => {
      window.removeEventListener("clara-income-hub-updated", handleIncomeUpdated);
      window.removeEventListener("clara-finance-updated", handleIncomeUpdated);
    };
  }, [
    shouldListenForIncomeEvents,
    hasParentIncomeSources,
    refreshData,
    requestParentRefresh,
    canRunLocalFallback,
    loadIncomeHubSources,
  ]);

  const tone = getIncomeToneClasses();
  const title = data.title || "Income Hub";
  const subtitle = data.subtitle || "Where your money comes from";
  const readiness = useMemo(() => buildIncomeSummary(incomeSources), [incomeSources]);
  const statusMeta = getStatusMeta(readiness.sourceCount);
  const amountStatus = readiness.sourceCount > 0
    ? `Top source: ${readiness.topSourceName}. This source represents about ${Math.round(readiness.mainSourceShare)}% of Income Hub money in.`
    : "Add your salary, business, side hustle, allowance, or freelance source first.";

  const dispatchIncomeHubPrompt = (prompt, extra = {}) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("clara:open-ai-chat", {
      detail: {
        source: "income-hub-card",
        prompt,
        incomeHubContext: {
          sourceCount: readiness.sourceCount,
          totalMoneyIn: readiness.totalMoneyIn,
          totalMoneyOut: readiness.totalOut,
          netIncome: readiness.netGenerated,
          topSourceName: readiness.topSourceName,
          topSourceAmount: readiness.topSourceAmount,
          mainSourceShare: readiness.mainSourceShare,
          sources: incomeSources,
          ...extra,
        },
      },
    }));
  };

  const handlePlanInvestment = () => {
    dispatchIncomeHubPrompt("Review my Income Hub sources and summarize what is currently tracked.", {
      action: "review_income_hub",
    });
  };

  const handleAskClara = () => {
    dispatchIncomeHubPrompt("Help me understand my Income Hub sources.", {
      action: "ask_income_hub",
    });
  };

  const handleToggleDetails = () => {
    if (isControlled) {
      onToggleDetails?.();
      return;
    }
    setLocalExpanded((value) => !value);
  };

  return {
    state: {
      isExpanded,
    },
    computed: {
      tone,
      title,
      subtitle,
      statusLabel: data.statusLabel || statusMeta.badge,
      mainLabel: data.mainLabel || statusMeta.mainLabel,
      description: statusMeta.description,
      readinessProgress: readiness.sourceCount > 0 ? 100 : 20,
      selectedType: readiness.topSourceName,
      amountStatus,
      statOneLabel: data.statOneLabel || "Money in",
      statOneValue: data.statOneValue || fmt(readiness.totalMoneyIn),
      statTwoLabel: data.statTwoLabel || "Top source",
      statTwoValue: data.statTwoValue || (readiness.sourceCount > 0 ? readiness.topSourceName : "None"),
      statThreeLabel: data.statThreeLabel || "Status",
      statThreeValue: data.statThreeValue || statusMeta.statusValue,
      readinessStatus: readiness.readinessStatus,
      statusMeta,
      readiness,
      incomeSources,
    },
    handlers: {
      setInvestmentType: () => {},
      setPlannedAmount: () => {},
      setRiskLevel: () => {},
      setTimeHorizon: () => {},
      handlePlanInvestment,
      handleAskClara,
      handleToggleDetails,
    },
  };
}
