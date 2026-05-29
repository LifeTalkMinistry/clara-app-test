import { useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";

export const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

export const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

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

const getRecordDate = (record) =>
  new Date(record?.date || record?.transaction_date || record?.created_at || record?.createdAt || record?.updatedAt || 0);

const isThisMonth = (record) => {
  const date = getRecordDate(record);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const isIncomeTransaction = (txn) => {
  const type = String(txn?.type || txn?.transaction_type || "").toLowerCase();
  return ["income", "add", "cash_in", "add_income", "add_funds"].includes(type);
};

const getIncomeSourceName = (txn) =>
  String(txn?.source_type || txn?.source || txn?.notes || "Income").trim() || "Income";

export function buildInvestmentReadiness({ transactions = [], totalIncome = 0 } = {}) {
  const incomeTransactions = (Array.isArray(transactions) ? transactions : []).filter(
    (txn) => !txn?.deletedAt && !txn?.deleted_at && isIncomeTransaction(txn)
  );
  const monthlyIncomeTransactions = incomeTransactions.filter(isThisMonth);
  const sourceTotals = new Map();

  incomeTransactions.forEach((txn) => {
    const name = getIncomeSourceName(txn);
    const existing = sourceTotals.get(name) || 0;
    sourceTotals.set(name, existing + toNumber(txn?.amount));
  });

  const sourceCount = sourceTotals.size;
  const monthlyGenerated = monthlyIncomeTransactions.reduce((sum, txn) => sum + toNumber(txn?.amount), 0);
  const totalGenerated = incomeTransactions.reduce((sum, txn) => sum + toNumber(txn?.amount), 0) || toNumber(totalIncome);
  const topSource = [...sourceTotals.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  const mainSourceShare = topSource && totalGenerated > 0 ? clampProgress((topSource[1] / totalGenerated) * 100) : 0;

  return {
    readinessStatus: INVESTMENT_READINESS.READY_TO_TEST,
    sourceCount,
    monthlyGenerated,
    totalGenerated,
    topSourceName: topSource?.[0] || "No source yet",
    topSourceAmount: topSource?.[1] || 0,
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

  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;

  const { user } = useAuth();
  const { totalIncome = 0, walletTransactions = [] } = useFinancialData(user);

  const data = item?.data || {};
  const tone = getInvestmentToneClasses(item?.tone || data.tone || "cyan");
  const title = data.title || "Income Hub";
  const subtitle = data.subtitle || "Where your money comes from before it enters your wallets.";

  const readiness = useMemo(
    () =>
      buildInvestmentReadiness({
        transactions: walletTransactions,
        totalIncome,
      }),
    [walletTransactions, totalIncome]
  );

  const statusMeta = getStatusMeta(readiness.sourceCount);
  const readinessProgress = readiness.sourceCount > 0 ? 100 : 20;
  const selectedType = readiness.topSourceName;
  const safeToInvest = readiness.monthlyGenerated;
  const safeRangeMin = 0;
  const amountStatus =
    readiness.sourceCount > 0
      ? `Top source: ${readiness.topSourceName}. This source represents about ${Math.round(readiness.mainSourceShare)}% of tracked income.`
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
            monthlyGenerated: readiness.monthlyGenerated,
            totalGenerated: readiness.totalGenerated,
            topSourceName: readiness.topSourceName,
            topSourceAmount: readiness.topSourceAmount,
            mainSourceShare: readiness.mainSourceShare,
            ...extra,
          },
        },
      })
    );
  };

  const handlePlanInvestment = () => {
    dispatchInvestmentPrompt(
      `Review my income sources as a behavioral money coach. I have ${readiness.sourceCount} tracked income sources. This month, tracked money in is ${fmt(readiness.monthlyGenerated)}. My top source is ${readiness.topSourceName}. Help me understand income dependency and what source I should protect or grow next.`,
      { action: "review_income_hub" }
    );
  };

  const handleAskClara = () => {
    dispatchInvestmentPrompt(
      `Help me understand where my money comes from. Check my income source pattern, whether I depend too much on one source, and what I should track next.`,
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
      statOneLabel: data.statOneLabel || "This month",
      statOneValue: data.statOneValue || fmt(readiness.monthlyGenerated),
      statTwoLabel: data.statTwoLabel || "Top source",
      statTwoValue: data.statTwoValue || readiness.topSourceName,
      statThreeLabel: data.statThreeLabel || "Status",
      statThreeValue: data.statThreeValue || statusMeta.statusValue,
      readinessStatus: readiness.readinessStatus,
      statusMeta,
      readiness,
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
