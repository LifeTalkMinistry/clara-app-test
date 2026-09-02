import { useCallback, useEffect, useMemo, useState } from "react";

import {
  firstValidNumber,
  getPHMonthKey,
  getTransactionDate,
  normalizeLower,
  INCOME_TRANSACTION_TYPES,
} from "@/utils/dashboard/dashboardHelpers";
import { financeRepository } from "@/lib/financeRepository";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  DEFAULT_DEBT_OBLIGATION_ID,
  getDebtObligations,
  isDebtLinkedExpense,
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

// First-level obligation taxonomy is intentionally worker-centered. Debt is one
// branch of financial commitments rather than the default assumption for every bill.
export const OBLIGATION_TYPES = [
  { value: "housing_rent", label: "Housing / Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "family_support", label: "Family Support" },
  { value: "transportation", label: "Transportation" },
  { value: "insurance", label: "Insurance" },
  { value: "education", label: "Education" },
  { value: "debt", label: "Loan / Debt" },
  { value: "other", label: "Other" },
];

// Debt-specific labels remain available as the second level and for legacy records.
export const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
  { value: "installment", label: "Installment" },
  { value: "mortgage", label: "Mortgage" },
  { value: "personal_debt", label: "Personal Debt" },
  { value: "other_debt", label: "Other Debt" },
];

export const getDebtTypeLabel = (value) =>
  OBLIGATION_TYPES.find((type) => type.value === value)?.label ||
  DEBT_TYPES.find((type) => type.value === value)?.label ||
  (value === "other" ? "Other" : "Other");

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
  user = null,
  expanded = false,
  onToggleDetails,
} = {}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [debtType, setDebtType] = useState("installment");
  const [totalDebtInput, setTotalDebtInput] = useState("");
  const [monthlyDebtInput, setMonthlyDebtInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [debtObligations, setDebtObligations] = useState([]);
  const [localExpenseRecords, setLocalExpenseRecords] = useState([]);
  const [localWalletTransactions, setLocalWalletTransactions] = useState([]);
  const [savingDebt, setSavingDebt] = useState(false);
  const [debtLoadError, setDebtLoadError] = useState(null);

  const isControlled = typeof onToggleDetails === "function";
  const isExpanded = isControlled ? expanded : localExpanded;
  const data = item?.data || {};
  const localUserId = getEffectiveDemoFinanceLocalUserId(
    String(user?.id || user?.email || "local-user")
  );

  const loadDebtObligations = useCallback(async () => {
    try {
      const [records, storedExpenses, storedTransactions] = await Promise.all([
        getDebtObligations(localUserId),
        financeRepository.getExpenses(localUserId),
        financeRepository.getWalletTransactions(localUserId),
      ]);
      setDebtObligations(records || []);
      setLocalExpenseRecords(storedExpenses || []);
      setLocalWalletTransactions(storedTransactions || []);
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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refreshDebtCard = () => loadDebtObligations();
    window.addEventListener("clara:debt-obligations-updated", refreshDebtCard);
    window.addEventListener("clara-local-finance-updated", refreshDebtCard);
    return () => {
      window.removeEventListener("clara:debt-obligations-updated", refreshDebtCard);
      window.removeEventListener("clara-local-finance-updated", refreshDebtCard);
    };
  }, [loadDebtObligations]);

  const walletTransactions = Array.isArray(data.walletTransactions) && data.walletTransactions.length
    ? data.walletTransactions
    : localWalletTransactions;
  const expenseRecords = Array.isArray(data.expenses)
    ? data.expenses
    : localExpenseRecords;
  const currentMonthKey = getPHMonthKey();

  const income = useMemo(
    () =>
      walletTransactions.reduce((sum, transaction) => {
        const type = normalizeLower(transaction?.type || transaction?.transaction_type);
        if (!INCOME_TRANSACTION_TYPES.has(type)) return sum;
        const date = getTransactionDate(transaction);
        if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;
        return sum + firstValidNumber(transaction?.amount);
      }, 0),
    [currentMonthKey, walletTransactions]
  );

  const expenses = useMemo(
    () =>
      expenseRecords.reduce((sum, expense) => {
        const date = getTransactionDate(expense);
        if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;
        return sum + Math.abs(firstValidNumber(expense?.amount));
      }, 0),
    [currentMonthKey, expenseRecords]
  );

  const paidDebtThisMonth = useMemo(
    () =>
      expenseRecords.reduce((sum, expense) => {
        const date = getTransactionDate(expense);
        if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;
        if (!isDebtLinkedExpense(expense, debtObligations)) return sum;
        return sum + Math.abs(firstValidNumber(expense?.amount));
      }, 0),
    [currentMonthKey, debtObligations, expenseRecords]
  );

  // Keep parent-owned lifetime values available for the AI prompt only; debt pressure
  // itself is intentionally based on this month's income and spending.
  const lifetimeIncome = toDebtNumber(data.totalIncome || 0);
  const lifetimeExpenses = toDebtNumber(data.totalExpenses || 0);
  const walletBalance = toDebtNumber(data.totalWalletBalance || 0);

  const debtSummary = useMemo(
    () => summarizeDebtObligations(debtObligations, { income }),
    [debtObligations, income]
  );

  const totalDebt = toDebtNumber(debtSummary.totalDebt);
  const monthlyDebt = toDebtNumber(debtSummary.monthlyDebt);
  const remainingMonthlyDebt = Math.max(monthlyDebt - paidDebtThisMonth, 0);
  const activeDebtCount = Number(debtSummary.activeCount || 0);
  const debtRatio = toDebtNumber(debtSummary.debtRatio);
  const riskLevel = debtSummary.riskLevel || "Debt free";
  const hasActiveObligation = activeDebtCount > 0;
  const statusLabel = !hasActiveObligation
    ? "No debt"
    : riskLevel === "Risk"
      ? "At risk"
      : "Active";
  const smartFeedback = !hasActiveObligation
    ? "Debt free"
    : riskLevel === "Risk"
      ? "High pressure"
      : riskLevel === "Moderate"
        ? "Controlled, but needs attention"
        : "Controlled";
  const pressureProgress = clampProgress(hasActiveObligation ? debtRatio : 0);
  const monthlyLeftover = Math.max(0, income - expenses - remainingMonthlyDebt);
  const payoffMonths = debtSummary.payoffMonths || 0;
  const description = !hasActiveObligation
    ? "No active debt recorded. Keep your cash flow protected."
    : riskLevel === "Risk"
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
      remainingMonthlyDebt,
      paidDebtThisMonth,
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
              prompt: `Review my debt situation. I owe ${fmt(totalDebt)} with a scheduled monthly obligation of ${fmt(monthlyDebt)} and ${fmt(remainingMonthlyDebt)} still unpaid this month. My current-month income is ${fmt(income)}, current-month spending is ${fmt(expenses)}, wallet balance is ${fmt(walletBalance)}, and lifetime recorded totals are ${fmt(lifetimeIncome)} income and ${fmt(lifetimeExpenses)} expenses. Tell me if this is safe.`,
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
          return { success: true, message: "Obligation saved successfully." };
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
