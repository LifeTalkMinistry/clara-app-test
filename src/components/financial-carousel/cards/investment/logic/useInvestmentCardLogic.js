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
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "time_deposit", label: "Time Deposit" },
  { value: "other", label: "Other" },
];

export const getInvestmentToneClasses = (tone = "gold") => {
  const claraInvestmentTone = {
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
  };

  const toneMap = {
    emerald: {
      border: "border-emerald-300/20",
      iconShell:
        "border-emerald-300/25 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.14)]",
      icon: "text-emerald-200",
      status:
        "border-emerald-300/25 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.12)]",
      value: "text-emerald-200",
      bar: "from-emerald-300 via-emerald-400 to-green-300",
      accent: "bg-emerald-300/14",
      focus: "focus:border-emerald-300/35",
      primaryButton:
        "border-emerald-300/25 bg-emerald-500/10 text-emerald-100 transition hover:bg-emerald-500/15",
      background:
        "radial-gradient(circle at -16% -22%, rgba(16,185,129,0.22), transparent 46%), radial-gradient(circle at 69% 112%, rgba(20,184,166,0.18), transparent 58%), linear-gradient(135deg, rgba(4,25,24,0.98), rgba(3,14,24,0.99))",
    },
    teal: {
      border: "border-teal-300/20",
      iconShell:
        "border-teal-300/25 bg-teal-400/10 shadow-[0_0_18px_rgba(45,212,191,0.14)]",
      icon: "text-teal-200",
      status:
        "border-teal-300/25 bg-teal-500/15 text-teal-200 shadow-[0_0_18px_rgba(45,212,191,0.12)]",
      value: "text-teal-200",
      bar: "from-teal-300 via-cyan-300 to-emerald-300",
      accent: "bg-teal-300/14",
      focus: "focus:border-teal-300/35",
      primaryButton:
        "border-teal-300/25 bg-teal-500/10 text-teal-100 transition hover:bg-teal-500/15",
      background:
        "radial-gradient(circle at -16% -22%, rgba(45,212,191,0.22), transparent 46%), radial-gradient(circle at 69% 112%, rgba(56,189,248,0.18), transparent 58%), linear-gradient(135deg, rgba(4,23,30,0.98), rgba(3,14,24,0.99))",
    },
    blue: claraInvestmentTone,
    gold: claraInvestmentTone,
    rose: {
      border: "border-rose-300/20",
      iconShell:
        "border-rose-300/25 bg-rose-400/10 shadow-[0_0_18px_rgba(251,113,133,0.12)]",
      icon: "text-rose-200",
      status:
        "border-rose-300/25 bg-rose-500/15 text-rose-200 shadow-[0_0_18px_rgba(251,113,133,0.10)]",
      value: "text-rose-100",
      bar: "from-rose-300 via-pink-300 to-violet-300",
      accent: "bg-rose-300/14",
      focus: "focus:border-rose-300/35",
      primaryButton:
        "border-rose-300/25 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/15",
      background:
        "radial-gradient(circle at -16% -22%, rgba(251,113,133,0.18), transparent 46%), radial-gradient(circle at 69% 112%, rgba(124,58,237,0.18), transparent 58%), linear-gradient(135deg, rgba(40,12,18,0.96), rgba(3,14,24,0.99))",
    },
  };

  return toneMap[tone] || claraInvestmentTone;
};

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

export default function useInvestmentCardLogic({
  item = null,
  expanded = false,
  onToggleDetails,
} = {}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [investmentType, setInvestmentType] = useState("business");
  const [plannedAmount, setPlannedAmount] = useState("");

  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;

  const { user } = useAuth();
  const {
    emergencyFund,
    totalExpenses = 0,
    totalIncome = 0,
    totalWalletBalance = 0,
  } = useFinancialData(user);

  const data = item?.data || {};
  const tone = getInvestmentToneClasses(item?.tone || data.tone || "gold");

  const title = data.title || item?.label || "Investment Fund";
  const subtitle = data.subtitle || "Decide before you invest.";

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
      ["survivalExpense", "survival_expense", "monthlyExpense", "monthly_expense"],
      0
    )
  );
  const emergencyTargetMonths = toNumber(
    getEmergencyValue(
      emergencyFund,
      ["targetMonths", "target_months", "months_target"],
      3
    )
  );

  const emergencyTarget = emergencyExpense * emergencyTargetMonths;
  const emergencyReady = emergencyTarget > 0 && emergencySaved >= emergencyTarget;
  const monthlyLeftover = Math.max(0, toNumber(totalIncome) - toNumber(totalExpenses));

  const safeToInvest = useMemo(() => {
    const dataOverride = getDataValue(data, ["safeToInvest", "availableToInvest"], null);

    if (dataOverride !== null) return Math.max(0, toNumber(dataOverride));
    if (!emergencyReady) return 0;

    const walletAfterProtection = Math.max(
      0,
      toNumber(totalWalletBalance) - Math.max(emergencyTarget, emergencySaved)
    );
    const conservativeWalletShare = walletAfterProtection * 0.12;
    const conservativeLeftoverShare = monthlyLeftover * 0.4;
    const fallbackFromReadiness = Math.max(0, emergencySaved - emergencyTarget) * 0.12;
    const estimate = Math.max(
      0,
      Math.min(
        conservativeWalletShare || fallbackFromReadiness,
        conservativeLeftoverShare || conservativeWalletShare || fallbackFromReadiness
      )
    );

    return Math.max(0, Math.floor(estimate / 100) * 100);
  }, [data, emergencyReady, emergencySaved, emergencyTarget, monthlyLeftover, totalWalletBalance]);

  const plannedValue = toNumber(plannedAmount);
  const canSafelyInvest = emergencyReady && safeToInvest > 0;
  const readinessProgress = clampProgress(
    getDataValue(
      data,
      ["readiness", "readinessProgress"],
      emergencyReady
        ? 100
        : emergencyTarget > 0
          ? (emergencySaved / emergencyTarget) * 100
          : 0
    )
  );
  const selectedType =
    INVESTMENT_TYPES.find((type) => type.value === investmentType)?.label ||
    "Business";
  const amountStatus =
    plannedValue > 0 && safeToInvest > 0
      ? plannedValue <= safeToInvest
        ? "Within safe starter range"
        : "Above recommended starter range"
      : canSafelyInvest
        ? "Recommended starter amount available"
        : emergencyReady
          ? "Add extra money before investing"
          : "Build protection first";
  const statusLabel =
    data.statusLabel || data.ctaLabel || (canSafelyInvest ? "Ready" : emergencyReady ? "Protected" : "Not ready");
  const mainLabel =
    data.mainLabel || (canSafelyInvest ? `${fmt(safeToInvest)} safe to start` : emergencyReady ? "Protected" : "Not ready");
  const description =
    data.description ||
    (canSafelyInvest
      ? "CLARA recommends this as a cautious starter amount, not your full available money. Your emergency fund stays protected."
      : emergencyReady
        ? "Your emergency fund is protected. Add extra wallet room before investing so protection stays untouched."
        : "Build your emergency fund first before investing.");

  const statOneLabel = data.statOneLabel || "Safe Range";
  const statOneValue = data.statOneValue || (canSafelyInvest ? fmt(safeToInvest) : "₱0");
  const statTwoLabel = data.statTwoLabel || "Type";
  const statTwoValue = data.statTwoValue || selectedType;
  const statThreeLabel = data.statThreeLabel || "Status";
  const statThreeValue = data.statThreeValue || (canSafelyInvest ? "Ready" : emergencyReady ? "Protected" : "Not ready");

  const dispatchInvestmentPrompt = (prompt) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "investment-card",
          prompt,
          investmentType,
          plannedAmount: plannedValue,
          safeToInvest,
        },
      })
    );
  };

  const handlePlanInvestment = () => {
    dispatchInvestmentPrompt(
      `Help me plan an investment. Type: ${selectedType}. Amount I want to invest: ${
        plannedValue > 0 ? fmt(plannedValue) : "not set yet"
      }. CLARA says my recommended safe starter amount is ${fmt(safeToInvest)}.`
    );
  };

  const handleAskClara = () => {
    dispatchInvestmentPrompt(
      `Can I invest ${
        plannedValue > 0 ? fmt(plannedValue) : "money"
      } right now in ${selectedType}? Check my budget, wallet balance, emergency fund, and spending behavior first.`
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
      isExpanded,
    },
    computed: {
      tone,
      title,
      subtitle,
      statusLabel,
      mainLabel,
      description,
      readinessProgress,
      canSafelyInvest,
      safeToInvest,
      selectedType,
      amountStatus,
      statOneLabel,
      statOneValue,
      statTwoLabel,
      statTwoValue,
      statThreeLabel,
      statThreeValue,
    },
    handlers: {
      setInvestmentType,
      setPlannedAmount,
      handlePlanInvestment,
      handleAskClara,
      handleToggleDetails,
    },
  };
}
