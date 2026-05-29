import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
  toIncomeHubNumber,
} from "@/lib/incomeHubRepository";

export const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

export const toNumber = (value) => toIncomeHubNumber(value);

export const clampProgress = (value) => Math.max(0, Math.min(Number(value) || 0, 100));

export const INVESTMENT_READINESS = Object.freeze({
  NOT_READY: "not_ready",
  IDEA_ONLY: "idea_only",
  READY_TO_TEST: "ready_to_test",
  ACTIVE_TEST: "active_test",
  PAUSE_INVESTING: "pause_investing",
});

export const getInvestmentToneClasses = () => ({
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

export function buildInvestmentReadiness({ sources = [] } = {}) {
  const incomeSources = (Array.isArray(sources) ? sources : []).filter(
    (source) => !source?.deletedAt && !source?.deleted_at
  );

  const sourceCount = incomeSources.length;
  const totalGenerated = incomeSources.reduce((sum, source) => sum + getSourceMoneyIn(source), 0);
  const totalOut = incomeSources.reduce((sum, source) => sum + getSourceMoneyOut(source), 0);
  const netGenerated = incomeSources.reduce((sum, source) => sum + getSourceNet(source), 0);
  const topSource = [...incomeSources].sort((a, b) => getSourceMoneyIn(b) - getSourceMoneyIn(a))[0] || null;
  const topSourceAmount = topSource ? getSourceMoneyIn(topSource) : 0;
  const mainSourceShare = topSource && totalGenerated > 0 ? clampProgress((topSourceAmount / totalGenerated) * 100) : 0;

  return {
    readinessStatus: INVESTMENT_READINESS.READY_TO_TEST,
    sourceCount,
    monthlyGenerated: totalGenerated,
    totalGenerated,
    totalOut,
    netGenerated,
    topSourceName: topSource?.name || "No source yet",
    topSourceAmount,
    mainSourceShare,
    blockers: [],
  };
}

const getStatusMeta = (sourceCount) => {
  if (sourceCount > 1) {
    return {
      title: "Income mapped",
      subtitle: "Track every place where money comes from.",
      badge: `${sourceCount} sources`,
      mainLabel: "Income sources",
      statusValue: "Mapped",
      description: "CLARA can now compare salary, business, side hustle, and other income sources.",
      primaryAction: "Open Income Hub",
      secondaryAction: "Ask CLARA About Income",
    };
  }

  if (sourceCount === 1) {
    return {
      title: "One source tracked",
      subtitle: "Add more sources as they appear.",
      badge: "1 source",
      mainLabel: "Income sources",
      statusValue: "Tracked",
      description: "CLARA can see where your money starts before it enters your wallets.",
      primaryAction: "Open Income Hub",
      secondaryAction: "Ask CLARA About Income",
    };
  }

  return {
    title: "Income Hub",
    subtitle: "Where your money comes from.",
    badge: "Set up",
    mainLabel: "Income sources",
    statusValue: "Empty",
    description: "Start with salary, business, side hustle, allowance, or freelance income.",
    primaryAction: "Open Income Hub",
    secondaryAction: "Ask CLARA About Income",
  };
};

export default function useInvestmentCardLogic({ item = null, expanded = false, onToggleDetails } = {}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [incomeSources, setIncomeSources] = useState([]);

  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;

  const { user } = useAuth();
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);

  useEffect(() => {
    let alive = true;

    async function loadIncomeHubSources() {
      try {
        const sources = await getIncomeSources(localUserId);
        if (alive) setIncomeSources(sources);
      } catch (error) {
        console.error("CLARA Income Hub card load error:", error);
        if (alive) setIncomeSources([]);
      }
    }

    loadIncomeHubSources();

    if (typeof window !== "undefined") {
      window.addEventListener("clara-income-hub-updated", loadIncomeHubSources);
      window.addEventListener("clara-finance-updated", loadIncomeHubSources);
    }

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("clara-income-hub-updated", loadIncomeHubSources);
        window.removeEventListener("clara-finance-updated", loadIncomeHubSources);
      }
    };
  }, [localUserId]);

  const data = item?.data || {};
  const tone = getInvestmentToneClasses(item?.tone || data.tone || "cyan");
  const title = data.title || "Income Hub";
  const subtitle = data.subtitle || "Where your money comes from before it enters your wallets.";

  const readiness = useMemo(
    () =>
      buildInvestmentReadiness({
        sources: incomeSources,
      }),
    [incomeSources]
  );

  const statusMeta = getStatusMeta(readiness.sourceCount);
  const readinessProgress = readiness.sourceCount > 0 ? 100 : 20;
  const selectedType = readiness.topSourceName;
  const safeToInvest = readiness.totalGenerated;
  const safeRangeMin = 0;
  const amountStatus =
    readiness.sourceCount > 0
      ? `Top source: ${readiness.topSourceName}. This source represents about ${Math.round(readiness.mainSourceShare)}% of Income Hub money in.`
      : "Add your salary, business, side hustle, allowance, or freelance source first.";

  const dispatchInvestmentPrompt = (prompt, extra = {}) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "income-hub-card",
          prompt,
          incomeHubContext: {
            sourceCount: readiness.sourceCount,
            totalMoneyIn: readiness.totalGenerated,
            totalMoneyOut: readiness.totalOut,
            netIncome: readiness.netGenerated,
            topSourceName: readiness.topSourceName,
            topSourceAmount: readiness.topSourceAmount,
            mainSourceShare: readiness.mainSourceShare,
            sources: incomeSources,
            ...extra,
          },
        },
      })
    );
  };

  const handlePlanInvestment = () => {
    dispatchInvestmentPrompt(
      `Review my Income Hub as a behavioral money coach. I have ${readiness.sourceCount} tracked income sources. Income Hub money in is ${fmt(readiness.totalGenerated)}, money out is ${fmt(readiness.totalOut)}, and net is ${fmt(readiness.netGenerated)}. My top source is ${readiness.topSourceName}. Help me understand income dependency and what source I should protect or grow next.`,
      { action: "review_income_hub" }
    );
  };

  const handleAskClara = () => {
    dispatchInvestmentPrompt(
      `Help me understand where my money comes from based only on my Income Hub sources. Check whether I depend too much on one source and what I should track next.`,
      { action: "ask_income_hub" }
    );
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
      investmentType: "income_hub",
      plannedAmount: "",
      riskLevel: "",
      timeHorizon: "",
      isExpanded,
    },
    computed: {
      tone,
      title,
      subtitle,
      statusLabel: data.statusLabel || statusMeta.badge,
      mainLabel: data.mainLabel || statusMeta.mainLabel,
      description: statusMeta.description,
      readinessProgress,
      canSafelyInvest: true,
      safeToInvest,
      safeRangeMin,
      selectedType,
      amountStatus,
      statOneLabel: data.statOneLabel || "Money in",
      statOneValue: data.statOneValue || fmt(readiness.totalGenerated),
      statTwoLabel: data.statTwoLabel || "Top source",
      statTwoValue: data.statTwoValue || readiness.topSourceName,
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
