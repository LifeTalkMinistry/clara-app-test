import { useMemo, useState } from "react";

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

export const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "personal_debt", label: "Personal Debt" },
  { value: "other", label: "Other" },
];

export const debtTone = {
  border: "border-cyan-300/25",
  iconShell:
    "border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_18px_rgba(34,211,238,0.16)]",
  icon: "text-cyan-200",
  status:
    "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
  value: "text-white",
  bar: "from-cyan-300 via-blue-400 to-violet-400",
  accent: "bg-cyan-300/20",
  background:
    "radial-gradient(circle at top left, rgba(34,211,238,0.34), transparent 30%), radial-gradient(circle at 48% 30%, rgba(30,58,138,0.42), transparent 42%), radial-gradient(circle at bottom right, rgba(124,58,237,0.34), transparent 34%), linear-gradient(135deg, rgba(4,24,38,0.98), rgba(6,12,31,0.98) 48%, rgba(30,10,54,0.96))",
};

export default function useDebtCardLogic({
  item = null,
  expanded = false,
  onToggleDetails,
} = {}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [debtType, setDebtType] = useState("credit_card");
  const [totalDebtInput, setTotalDebtInput] = useState("");
  const [monthlyDebtInput, setMonthlyDebtInput] = useState("");
  const [interestInput, setInterestInput] = useState("");

  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;

  const {
    totalIncome = 0,
    totalExpenses = 0,
    totalWalletBalance = 0,
  } = useFinancialData();

  const data = item?.data || {};

  const totalDebt = toNumber(totalDebtInput || data.totalDebt || data.amount || 0);
  const monthlyDebt = toNumber(
    monthlyDebtInput || data.monthlyDebt || data.monthlyPayment || 0
  );
  const income = toNumber(totalIncome);
  const expenses = toNumber(totalExpenses);
  const walletBalance = toNumber(totalWalletBalance);

  const selectedType =
    DEBT_TYPES.find((type) => type.value === debtType)?.label || "Credit Card";

  const debtRatio = useMemo(() => {
    if (income <= 0) return monthlyDebt > 0 ? 100 : 0;
    return (monthlyDebt / income) * 100;
  }, [income, monthlyDebt]);

  const riskLevel =
    totalDebt <= 0
      ? "Debt free"
      : debtRatio < 20
        ? "Healthy"
        : debtRatio <= 40
          ? "Moderate"
          : "Risk";

  const statusLabel =
    totalDebt <= 0 ? "No debt" : debtRatio > 40 ? "At risk" : "Active";

  const smartFeedback =
    totalDebt <= 0
      ? "Debt free"
      : debtRatio > 40
        ? "High pressure"
        : debtRatio >= 20
          ? "Controlled, but needs attention"
          : "Controlled";

  const pressureProgress = clampProgress(totalDebt <= 0 ? 0 : debtRatio);
  const monthlyLeftover = Math.max(0, income - expenses);
  const payoffMonths =
    monthlyDebt > 0 && totalDebt > 0 ? Math.ceil(totalDebt / monthlyDebt) : 0;

  const description =
    totalDebt <= 0
      ? "No active debt recorded. Keep your cash flow protected."
      : debtRatio > 40
        ? "Debt pressure is high. Build a payoff plan before adding new spending."
        : "Your obligations are trackable. Keep payments aligned with income.";

  const dispatchDebtPrompt = (prompt) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "obligation-debt-card",
          prompt,
          debtType,
          totalDebt,
          monthlyDebt,
          debtRatio,
          riskLevel,
        },
      })
    );
  };

  const handlePlanPayoff = () => {
    dispatchDebtPrompt(
      `Help me plan a debt payoff strategy. Debt type: ${selectedType}. Total debt: ${fmt(
        totalDebt
      )}. Monthly payment: ${fmt(monthlyDebt)}. Debt ratio: ${debtRatio.toFixed(
        1
      )}%. Current status: ${riskLevel}.`
    );
  };

  const handleAskClara = () => {
    dispatchDebtPrompt(
      `Review my debt situation. I owe ${fmt(totalDebt)} with a monthly obligation of ${fmt(
        monthlyDebt
      )}. My income is ${fmt(income)}, expenses are ${fmt(
        expenses
      )}, and wallet balance is ${fmt(walletBalance)}. Tell me if this is safe.`
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
      isExpanded,
      debtType,
      totalDebtInput,
      monthlyDebtInput,
      interestInput,
    },
    computed: {
      tone: debtTone,
      totalDebt,
      monthlyDebt,
      debtRatio,
      riskLevel,
      statusLabel,
      smartFeedback,
      pressureProgress,
      monthlyLeftover,
      payoffMonths,
      description,
    },
    handlers: {
      setDebtType,
      setTotalDebtInput,
      setMonthlyDebtInput,
      setInterestInput,
      handlePlanPayoff,
      handleAskClara,
      handleToggleDetails,
    },
  };
}
