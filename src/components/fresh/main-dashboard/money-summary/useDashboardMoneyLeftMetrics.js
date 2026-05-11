import { useEffect, useMemo, useState } from "react";
import {
  firstValidNumber,
  getPHMonthKey,
  getTransactionDate,
  normalizeLower,
  INCOME_TRANSACTION_TYPES,
} from "@/utils/dashboard/dashboardHelpers";
import {
  getDebtObligations,
  summarizeDebtObligations,
  toDebtNumber,
} from "@/lib/debtObligationStore";

const getLocalUserId = (user) =>
  String(user?.id || user?.email || "local-user").trim() || "local-user";

export default function useDashboardMoneyLeftMetrics({
  expenses = [],
  walletTransactions = [],
  user = null,
} = {}) {
  const localUserId = useMemo(() => getLocalUserId(user), [user]);
  const [debtObligations, setDebtObligations] = useState([]);

  useEffect(() => {
    let active = true;

    const loadDebtObligations = async () => {
      try {
        const records = await getDebtObligations(localUserId);
        if (active) setDebtObligations(records || []);
      } catch (error) {
        console.warn("CLARA money-left debt pressure refresh failed:", error);
        if (active) setDebtObligations([]);
      }
    };

    loadDebtObligations();

    if (typeof window !== "undefined") {
      window.addEventListener("clara:debt-obligations-updated", loadDebtObligations);
    }

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("clara:debt-obligations-updated", loadDebtObligations);
      }
    };
  }, [localUserId]);

  const thisMonthSpent = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
      const expenseDate = getTransactionDate(expense);
      if (!expenseDate) return sum;

      return getPHMonthKey(expenseDate) === currentMonthKey
        ? sum + Number(expense.amount || 0)
        : sum;
    }, 0);
  }, [expenses]);

  const thisMonthIncome = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return (Array.isArray(walletTransactions) ? walletTransactions : []).reduce(
      (sum, transaction) => {
        const type = normalizeLower(transaction?.type || transaction?.transaction_type);
        if (!INCOME_TRANSACTION_TYPES.has(type)) return sum;

        const date = getTransactionDate(transaction);
        if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;

        return sum + firstValidNumber(transaction?.amount);
      },
      0
    );
  }, [walletTransactions]);

  const debtPressureSummary = useMemo(
    () => summarizeDebtObligations(debtObligations, { income: thisMonthIncome }),
    [debtObligations, thisMonthIncome]
  );

  const monthlyObligationPressure = toDebtNumber(debtPressureSummary.monthlyDebt);
  const totalDebtObligationBalance = toDebtNumber(debtPressureSummary.totalDebt);
  const activeDebtObligationCount = Number(debtPressureSummary.activeCount || 0);
  const debtPressureRatio = toDebtNumber(debtPressureSummary.debtRatio);
  const grossMoneyLeftThisMonth = thisMonthIncome - thisMonthSpent;
  const moneyLeftThisMonth = grossMoneyLeftThisMonth - monthlyObligationPressure;
  const safeMoneyLeftThisMonth = moneyLeftThisMonth;

  return {
    thisMonthSpent,
    thisMonthIncome,
    grossMoneyLeftThisMonth,
    moneyLeftThisMonth,
    safeMoneyLeftThisMonth,
    monthlyObligationPressure,
    totalDebtObligationBalance,
    activeDebtObligationCount,
    debtPressureRatio,
    debtObligations,
    debtPressureSummary,
  };
}
