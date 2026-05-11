import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";
import {
  DEFAULT_DEBT_OBLIGATION_ID,
  getDebtObligations,
  summarizeDebtObligations,
  toDebtNumber,
  upsertDebtObligation,
} from "@/lib/debtObligationStore";

export const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

export const toNumber = toDebtNumber;

export const clampProgress = (value) =>
  Math.max(0, Math.min(Number(value) || 0, 100));

export const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
  { value: "installment", label: "Installment" },
  { value: "mortgage", label: "Mortgage" },
  { value: "personal_debt", label: "Personal Debt" },
  { value: "other", label: "Other" },
];

export const getDebtTypeLabel = (value) =>
  DEBT_TYPES.find((type) => type.value === value)?.label || "Credit Card";

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
  const { user: authUser } = useAuth();
  const {
    totalIncome = 0,
    totalExpenses = 0,
    totalWalletBalance = 0,
  } = useFinancialData(authUser);

  const [localExpanded, setLocalExpanded] = useState(false);
  const [debtType, setDebtType] = useState("installment");
  const [totalDebtInput, setTotalDebtInput] = useState("");
  const [monthlyDebtInput, setMonthlyDebtInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [debtObligations, setDebtObligations] = useState([]);
  const [savingDebt, setSavingDebt] = useState(false);
  const [debtLoadError, setDebtLoadError] = useState(null);

  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;

  const data = item?.data || {};
  const localUserId = String(authUser?.id || authUser?.email || "local-user");

  const loadDebtObligations = useCallback(async () => {
    try {
      const records = await getDebtObligations(localUserId);
      setDebtObligations(records || []);
      setDebtLoadError(null);
      return records || [];
    } catch (error) {
      console.error("Failed to load CLARA debt obligations:", error);
      setDebtLoadError(error);
      return [];
    }
  }, [localUserId]);

  useEffect(() => {
    loadDebtObligations();
  }, [loadDebtObligations]);

  const income = toDebtNumber(totalIncome);
  const expenses = toDebtNumber(totalExpenses);
  const walletBalance = toDebtNumber(totalWalletBalance);

  const debtSummary = useMemo(
    () => summarizeDebtObligations(debtObligations, { income }),
    [debtObligations, income]
  );

  const totalDebt = toDebtNumber(debtSummary.totalDebt || data.totalDebt || 0);
  const monthlyDebt = toDebtNumber(debtSummary.monthlyDebt || data.monthlyDebt || 0);
  const activeDebtCount = debtSummary.activeCount || 0;

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
  const monthlyLeftover = Math.max(0, income - expenses - monthlyDebt);
  const payoffMonths =
    monthlyDebt > 0 && totalDebt > 0 ? Math.ceil(totalDebt / monthlyDebt) : 0;

  const description =
    totalDebt <= 0
      ? "No active debt recorded. Keep your cash flow protected."
      : debtRatio > 40
        ? "Debt pressure is high. Build a payoff plan before adding new spending."
        : "Your obligations are trackable. Keep payments aligned with income.";

  return {
    state: {
      isExpanded,
      debtType,
      totalDebtInput,
      monthlyDebtInput,
      interestInput,
      debtObligations,
      activeDebtCount,
      savingDebt,
      debtLoadError,
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
      handleToggleDetails: () => {
        if (isControlled) {
          onToggleDetails?.();
          return;
        }
        setLocalExpanded((value) => !value);
      },
      handleAskClara: () => {
        if (typeof window === "undefined") return;

        window.dispatchEvent(
          new CustomEvent("clara:open-ai-chat", {
            detail: {
              source: "obligation-debt-card",
              prompt: `Review my debt situation. I owe ${fmt(totalDebt)} with a monthly obligation of ${fmt(monthlyDebt)}. My income is ${fmt(income)}, expenses are ${fmt(expenses)}, and wallet balance is ${fmt(walletBalance)}. Tell me if this is safe.`,
            },
          })
        );
      },
      reloadDebtObligations: loadDebtObligations,
      handleSaveDebtObligation: async () => {
        setSavingDebt(true);

        try {
          await upsertDebtObligation(localUserId, {
            id: DEFAULT_DEBT_OBLIGATION_ID,
            debtType,
            totalDebt: toDebtNumber(totalDebtInput),
            monthlyDebt: toDebtNumber(monthlyDebtInput),
            interestRate: toDebtNumber(interestInput),
          });

          await loadDebtObligations();

          return {
            success: true,
            message: "Obligation saved successfully.",
          };
        } catch (error) {
          return {
            success: false,
            message: error?.message || "Failed to save obligation.",
          };
        } finally {
          setSavingDebt(false);
        }
      },
    },
  };
}
