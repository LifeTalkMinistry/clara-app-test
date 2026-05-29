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

export const clampProgress = (value) =>
  Math.max(0, Math.min(Number(value) || 0, 100));

export const INVESTMENT_TYPES = [
  { value: "business", label: "Business" },
  { value: "skill_education", label: "Skill / Education" },
  { value: "equipment", label: "Equipment" },
  { value: "side_hustle", label: "Side hustle" },
  { value: "digital_product", label: "Digital product" },
  { value: "stocks_funds", label: "Stocks / Funds" },
  { value: "crypto", label: "Crypto" },
  { value: "time_deposit", label: "Time deposit" },
  { value: "other", label: "Other" },
];

export const RISK_LEVELS = ["Low", "Medium", "High"];
export const TIME_HORIZONS = ["1 month", "3–6 months", "6–12 months", "1 year+"];

export const INVESTMENT_READINESS = Object.freeze({
  NOT_READY: "not_ready",
  IDEA_ONLY: "idea_only",
  READY_TO_TEST: "ready_to_test",
  ACTIVE_TEST: "active_test",
  PAUSE_INVESTING: "pause_investing",
});

export const getInvestmentToneClasses = () => ({
  border: "border-cyan-300/20",
  iconShell:
    "border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
  icon: "text-cyan-100",
  status:
    "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
  value: "text-cyan-100",
  bar: "from-cyan-300 via-blue-300 to-violet-300",
  accent: "bg-blue-300/14",
  focus: "focus:border-cyan-300/35",
  primaryButton:
    "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/15",
  background:
    "radial-gradient(circle at -16% -22%, rgba(20,184,166,0.22), transparent 46%), radial-gradient(circle at 69% 112%, rgba(99,102,241,0.20), transparent 58%), linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.96) 48%, rgba(37,13,74,0.96))",
});

const getDataValue = (data, keys, fallback = null) => {
  for (const key of keys) {
    const value = data?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const getEmergencyValue = (emergencyFund, keys, fallback = 0) => {
  for (const key of keys) {
    const value = emergencyFund?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const getRecordDate = (record) =>
  new Date(record?.date || record?.created_at || record?.createdAt || record?.updatedAt || 0);

const isThisMonth = (record) => {
  const date = getRecordDate(record);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const getBudgetAmount = (budget) =>
  toNumber(
    budget?.amount ??
      budget?.limit ??
      budget?.allocated ??
      budget?.allocated_amount ??
      budget?.monthly_amount ??
      budget?.budgetAmount ??
      0
  );

const getSavingsRemaining = (goal) => {
  const target = toNumber(goal?.target_amount ?? goal?.targetAmount ?? goal?.target ?? 0);
  const saved = toNumber(goal?.saved_amount ?? goal?.savedAmount ?? goal?.saved ?? 0);
  return Math.max(0, target - saved);
};

const getRiskMultiplier = (riskLevel, stableBehavior) => {
  const normalized = String(riskLevel || "Low").toLowerCase();

  if (normalized === "high") return stableBehavior ? 0.15 : 0.08;
  if (normalized === "medium") return stableBehavior ? 0.12 : 0.07;
  return stableBehavior ? 0.08 : 0.05;
};

const getRiskRangeMultiplier = (riskLevel, stableBehavior) => {
  const normalized = String(riskLevel || "Low").toLowerCase();

  if (normalized === "high") return stableBehavior ? [0.15, 0.2] : [0.05, 0.08];
  if (normalized === "medium") return stableBehavior ? [0.1, 0.15] : [0.05, 0.07];
  return [0.05, stableBehavior ? 0.1 : 0.06];
};

const roundDownHundred = (value) => Math.max(0, Math.floor(toNumber(value) / 100) * 100);

export function buildInvestmentReadiness({
  data = {},
  emergencyFund = null,
  totalExpenses = 0,
  totalIncome = 0,
  totalWalletBalance = 0,
  expenses = [],
  budgets = [],
  savingsGoals = [],
  riskLevel = "Low",
  hasDraftIdea = false,
  hasActivePlan = false,
} = {}) {
  const emergencySaved = toNumber(
    getEmergencyValue(
      emergencyFund,
      ["savedAmount", "saved_amount", "amount", "balance", "moneyLeft"],
      0
    )
  );

  const emergencyExpense = toNumber(
    getEmergencyValue(
      emergencyFund,
      [
        "survivalExpense",
        "survival_expense",
        "monthlyExpense",
        "monthly_expense",
        "monthlySurvivalExpense",
        "monthly_survival_expense",
      ],
      0
    )
  );

  const explicitTarget = toNumber(
    getEmergencyValue(emergencyFund, ["targetAmount", "target_amount", "target"], 0)
  );
  const emergencyTargetMonths = toNumber(
    getEmergencyValue(emergencyFund, ["targetMonths", "target_months", "months_target"], 3)
  );
  const emergencyTarget = explicitTarget || emergencyExpense * emergencyTargetMonths;
  const emergencySetup = Boolean(emergencyFund && (emergencyExpense > 0 || emergencyTarget > 0));
  const emergencyReady = emergencyTarget > 0 && emergencySaved >= emergencyTarget;

  const monthExpenses = (Array.isArray(expenses) ? expenses : []).filter(isThisMonth);
  const monthlyExpensesTotal = monthExpenses.reduce(
    (sum, expense) => sum + toNumber(expense?.amount),
    0
  );
  const unplannedExpenses = monthExpenses.filter(
    (expense) => String(expense?.planning_status || "").toLowerCase() === "unplanned"
  );
  const unplannedExpenseTotal = unplannedExpenses.reduce(
    (sum, expense) => sum + toNumber(expense?.amount),
    0
  );
  const unplannedCount = unplannedExpenses.length;

  const budgetTotal = (Array.isArray(budgets) ? budgets : []).reduce(
    (sum, budget) => sum + getBudgetAmount(budget),
    0
  );
  const budgetMissing = budgetTotal <= 0;
  const budgetRemaining = Math.max(0, budgetTotal - monthlyExpensesTotal);
  const budgetBalanced = !budgetMissing && budgetRemaining >= 0;

  const activeSavingsRemaining = (Array.isArray(savingsGoals) ? savingsGoals : []).reduce(
    (sum, goal) => sum + getSavingsRemaining(goal),
    0
  );

  const monthlyLeftover = Math.max(0, toNumber(totalIncome) - toNumber(totalExpenses));
  const walletAfterEmergency = Math.max(0, toNumber(totalWalletBalance) - Math.max(emergencyTarget, 0));
  const walletAfterPriorities = Math.max(
    0,
    walletAfterEmergency - Math.min(activeSavingsRemaining, Math.max(walletAfterEmergency * 0.5, 0))
  );

  const protectedSurplus = Math.max(
    0,
    Math.min(walletAfterPriorities, budgetRemaining || walletAfterPriorities, monthlyLeftover || walletAfterPriorities)
  );

  const recentUnplannedHigh = unplannedCount >= 3 || unplannedExpenseTotal > monthlyLeftover * 0.35;
  const stableBehavior = !recentUnplannedHigh && monthlyLeftover > 0 && budgetBalanced;
  const riskMultiplier = getRiskMultiplier(riskLevel, stableBehavior);
  const [minMultiplier, maxMultiplier] = getRiskRangeMultiplier(riskLevel, stableBehavior);

  const blockers = [];
  if (!emergencySetup) blockers.push("Set up your emergency protection first.");
  if (emergencySetup && !emergencyReady) blockers.push("Complete your emergency protection before funding investment risk.");
  if (budgetMissing) blockers.push("Create a balanced budget before testing investment money.");
  if (!budgetMissing && !budgetBalanced) blockers.push("Balance your budget first.");
  if (protectedSurplus <= 0) blockers.push("There is no protected surplus available yet.");
  if (recentUnplannedHigh) blockers.push("Recent unplanned spending suggests stabilizing first.");

  const hardBlocked = !emergencySetup || !emergencyReady || !budgetBalanced || protectedSurplus <= 0;

  const safeRangeMin = hardBlocked ? 0 : roundDownHundred(protectedSurplus * minMultiplier);
  const safeRangeMax = hardBlocked ? 0 : roundDownHundred(protectedSurplus * maxMultiplier || protectedSurplus * riskMultiplier);
  const safeToInvest = Math.max(0, safeRangeMax);

  let readinessStatus = INVESTMENT_READINESS.NOT_READY;

  if (hasActivePlan && !hardBlocked && !recentUnplannedHigh) {
    readinessStatus = INVESTMENT_READINESS.ACTIVE_TEST;
  } else if (hasActivePlan && (hardBlocked || recentUnplannedHigh)) {
    readinessStatus = INVESTMENT_READINESS.PAUSE_INVESTING;
  } else if (hasDraftIdea && hardBlocked) {
    readinessStatus = INVESTMENT_READINESS.IDEA_ONLY;
  } else if (!hardBlocked && safeToInvest > 0 && !recentUnplannedHigh) {
    readinessStatus = INVESTMENT_READINESS.READY_TO_TEST;
  }

  const dataOverride = getDataValue(data, ["safeToInvest", "availableToInvest"], null);
  const finalSafeToInvest = dataOverride !== null && !hardBlocked ? roundDownHundred(dataOverride) : safeToInvest;

  return {
    readinessStatus,
    emergencySaved,
    emergencyExpense,
    emergencyTarget,
    emergencySetup,
    emergencyReady,
    monthlyLeftover,
    budgetTotal,
    budgetRemaining,
    budgetBalanced,
    budgetMissing,
    protectedSurplus,
    activeSavingsRemaining,
    recentUnplannedHigh,
    unplannedCount,
    unplannedExpenseTotal,
    safeRangeMin: finalSafeToInvest ? safeRangeMin : 0,
    safeRangeMax: finalSafeToInvest,
    safeToInvest: finalSafeToInvest,
    blockers,
    stableBehavior,
  };
}

const getStatusMeta = (readinessStatus, safeToInvest) => {
  switch (readinessStatus) {
    case INVESTMENT_READINESS.READY_TO_TEST:
      return {
        title: "Ready to test",
        subtitle: "Start small and protect your base.",
        badge: "Ready",
        mainLabel: `${fmt(safeToInvest)} safe test range`,
        statusValue: "Ready",
        description:
          "CLARA found a small test range from protected surplus. Keep your emergency fund untouched.",
        primaryAction: "Start Investment Plan",
        secondaryAction: "Ask CLARA First",
      };
    case INVESTMENT_READINESS.ACTIVE_TEST:
      return {
        title: "Active test",
        subtitle: "Track the idea without risking your foundation.",
        badge: "Active",
        mainLabel: "Active test",
        statusValue: "Active",
        description: "Track calmly, review before adding more, and measure the result.",
        primaryAction: "Review with CLARA",
        secondaryAction: "Pause Plan",
      };
    case INVESTMENT_READINESS.PAUSE_INVESTING:
      return {
        title: "Pause investing",
        subtitle: "Protect your base first.",
        badge: "Pause",
        mainLabel: "Pause investing",
        statusValue: "Pause",
        description:
          "Your base changed. CLARA recommends pausing this plan until your protection layer is stable again.",
        primaryAction: "Review my finances first",
        secondaryAction: "Keep idea saved",
      };
    case INVESTMENT_READINESS.IDEA_ONLY:
      return {
        title: "Idea saved",
        subtitle: "Save the plan, do not fund yet.",
        badge: "Idea only",
        mainLabel: "Idea only",
        statusValue: "Idea only",
        description:
          "You can keep the idea here, but CLARA will not recommend funding it until your protection base is ready.",
        primaryAction: "Ask CLARA to Review",
        secondaryAction: "Edit Idea",
      };
    case INVESTMENT_READINESS.NOT_READY:
    default:
      return {
        title: "Not ready",
        subtitle: "Build protection first.",
        badge: "Wait",
        mainLabel: "Not ready",
        statusValue: "Wait",
        description:
          "CLARA is keeping this at ₱0 for now because your emergency protection should come first.",
        primaryAction: "Ask CLARA First",
        secondaryAction: "Save as Future Plan",
      };
  }
};

export default function useInvestmentCardLogic({
  item = null,
  expanded = false,
  onToggleDetails,
} = {}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [investmentType, setInvestmentType] = useState("business");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [riskLevel, setRiskLevel] = useState("Low");
  const [timeHorizon, setTimeHorizon] = useState("3–6 months");

  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;

  const { user } = useAuth();
  const {
    emergencyFund,
    totalExpenses = 0,
    totalIncome = 0,
    totalWalletBalance = 0,
    expenses = [],
    budgets = [],
    savingsGoals = [],
  } = useFinancialData(user);

  const data = item?.data || {};
  const tone = getInvestmentToneClasses(item?.tone || data.tone || "gold");
  const title = data.title || "Investment Readiness";
  const subtitle = data.subtitle || "Decide before you invest.";

  const selectedType =
    INVESTMENT_TYPES.find((type) => type.value === investmentType)?.label || "Business";

  const plannedValue = toNumber(plannedAmount);
  const hasDraftIdea = Boolean(plannedValue > 0 || data.hasDraftIdea || data.ideaReason);
  const hasActivePlan = Boolean(data.hasActivePlan || data.status === "active_test");

  const readiness = useMemo(
    () =>
      buildInvestmentReadiness({
        data,
        emergencyFund,
        totalExpenses,
        totalIncome,
        totalWalletBalance,
        expenses,
        budgets,
        savingsGoals,
        riskLevel,
        hasDraftIdea,
        hasActivePlan,
      }),
    [
      data,
      emergencyFund,
      totalExpenses,
      totalIncome,
      totalWalletBalance,
      expenses,
      budgets,
      savingsGoals,
      riskLevel,
      hasDraftIdea,
      hasActivePlan,
    ]
  );

  const statusMeta = getStatusMeta(readiness.readinessStatus, readiness.safeToInvest);
  const canSafelyInvest = readiness.safeToInvest > 0 && readiness.readinessStatus === INVESTMENT_READINESS.READY_TO_TEST;

  const readinessProgress = clampProgress(
    getDataValue(
      data,
      ["readiness", "readinessProgress"],
      readiness.emergencyReady
        ? canSafelyInvest
          ? 100
          : 80
        : readiness.emergencyTarget > 0
          ? (readiness.emergencySaved / readiness.emergencyTarget) * 100
          : 0
    )
  );

  const amountStatus = (() => {
    if (readiness.safeToInvest <= 0) {
      return "Save this as an idea for now. CLARA does not recommend funding it yet.";
    }

    if (plannedValue > readiness.safeToInvest) {
      return "This is above your current safe test range. Consider lowering the amount or waiting.";
    }

    if (plannedValue > 0) {
      return "This fits your current test range. Keep your emergency fund untouched.";
    }

    return "A conservative safe test range is available from protected surplus.";
  })();

  const dispatchInvestmentPrompt = (prompt, extra = {}) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "investment-card",
          prompt,
          investmentContext: {
            readinessStatus: readiness.readinessStatus,
            safeRange: {
              min: readiness.safeRangeMin,
              max: readiness.safeToInvest,
            },
            emergencyFundStatus: {
              setup: readiness.emergencySetup,
              ready: readiness.emergencyReady,
              saved: readiness.emergencySaved,
              target: readiness.emergencyTarget,
              monthlySurvivalExpense: readiness.emergencyExpense,
            },
            walletBalance: totalWalletBalance,
            budgetStatus: {
              balanced: readiness.budgetBalanced,
              remaining: readiness.budgetRemaining,
              total: readiness.budgetTotal,
            },
            recentSpendingSummary: {
              totalExpenses,
              monthlyLeftover: readiness.monthlyLeftover,
              unplannedCount: readiness.unplannedCount,
              unplannedTotal: readiness.unplannedExpenseTotal,
            },
            selectedInvestmentType: selectedType,
            amountUserWantsToTest: plannedValue,
            riskLevel,
            timeHorizon,
            warningsTriggered: readiness.blockers,
            recommendedAction: statusMeta.primaryAction,
            ...extra,
          },
        },
      })
    );
  };

  const handlePlanInvestment = () => {
    dispatchInvestmentPrompt(
      `Review this investment idea as a behavioral money coach. Type: ${selectedType}. Amount I want to test: ${
        plannedValue > 0 ? fmt(plannedValue) : "not set yet"
      }. Current CLARA readiness status: ${statusMeta.title}. Safe test range: ${fmt(readiness.safeToInvest)}. Do not recommend specific assets. Help me decide whether this should be an idea only, a small test, or paused.`,
      { action: "review_plan" }
    );
  };

  const handleAskClara = () => {
    dispatchInvestmentPrompt(
      `Can I test money for ${selectedType} right now? Check my budget, wallet balance, emergency fund, and recent spending behavior first. If I am not ready, explain why this should stay as an idea only.`,
      { action: "ask_first" }
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
      investmentType,
      plannedAmount,
      riskLevel,
      timeHorizon,
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
      canSafelyInvest,
      safeToInvest: readiness.safeToInvest,
      safeRangeMin: readiness.safeRangeMin,
      selectedType,
      amountStatus,
      statOneLabel: data.statOneLabel || "Safe test range",
      statOneValue: data.statOneValue || (readiness.safeToInvest ? fmt(readiness.safeToInvest) : "₱0"),
      statTwoLabel: data.statTwoLabel || "Plan type",
      statTwoValue: data.statTwoValue || selectedType,
      statThreeLabel: data.statThreeLabel || "Status",
      statThreeValue: data.statThreeValue || statusMeta.statusValue,
      readinessStatus: readiness.readinessStatus,
      statusMeta,
      readiness,
    },
    handlers: {
      setInvestmentType,
      setPlannedAmount,
      setRiskLevel,
      setTimeHorizon,
      handlePlanInvestment,
      handleAskClara,
      handleToggleDetails,
    },
  };
}
