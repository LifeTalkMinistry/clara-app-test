import { useMemo } from "react";
import {
  firstValidNumber,
  getPHMonthKey,
  getTransactionDate,
  normalizeLower,
  INCOME_TRANSACTION_TYPES,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardMoneyLeftMetrics({
  expenses = [],
  walletTransactions = [],
} = {}) {
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

  const moneyLeftThisMonth = thisMonthIncome - thisMonthSpent;

  return {
    thisMonthSpent,
    thisMonthIncome,
    moneyLeftThisMonth,
  };
}
