import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  firstValidNumber,
  getPHMonthKey,
  getTransactionDate,
  normalizeLower,
  INCOME_TRANSACTION_TYPES,
} from "@/utils/dashboard/dashboardHelpers";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  getDebtObligations,
  isDebtLinkedExpense,
  summarizeDebtObligations,
  toDebtNumber,
} from "@/lib/debtObligationStore";

const firstOwnerIdentity = (...collections) => {
  for (const collection of collections) {
    for (const record of Array.isArray(collection) ? collection : []) {
      const identity =
        record?.user_id || record?.userId || record?.user_email || record?.userEmail;
      if (identity) return String(identity).trim();
    }
  }
  return "";
};

const getLocalUserId = (user, expenses, walletTransactions) => {
  const identity = String(
    user?.id ||
      user?.email ||
      firstOwnerIdentity(walletTransactions, expenses) ||
      "local-user"
  ).trim() || "local-user";
  return getEffectiveDemoFinanceLocalUserId(identity);
};

export default function useDashboardMoneyLeftMetrics({
  expenses = [],
  walletTransactions = [],
  user = null,
} = {}) {
  const { user: authUser } = useAuth();
  const effectiveUser = user || authUser || null;
  const localUserId = useMemo(
    () => getLocalUserId(effectiveUser, expenses, walletTransactions),
    [effectiveUser, expenses, walletTransactions]
  );
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

  const currentMonthKey = getPHMonthKey();

  const thisMonthSpent = useMemo(
    () =>
      (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
        const expenseDate = getTransactionDate(expense);
        if (!expenseDate || getPHMonthKey(expenseDate) !== currentMonthKey) return sum;
        return sum + Math.abs(Number(expense.amount || 0));
      }, 0),
    [currentMonthKey, expenses]
  );

  const thisMonthDebtPayments = useMemo(
    () =>
      (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
        const expenseDate = getTransactionDate(expense);
        if (!expenseDate || getPHMonthKey(expenseDate) !== currentMonthKey) return sum;
        if (!isDebtLinkedExpense(expense, debtObligations)) return sum;
        return sum + Math.abs(firstValidNumber(expense?.amount));
      }, 0),
    [currentMonthKey, debtObligations, expenses]
  );

  const thisMonthIncome = useMemo(
    () =>
      (Array.isArray(walletTransactions) ? walletTransactions : []).reduce(
        (sum, transaction) => {
          const type = normalizeLower(transaction?.type || transaction?.transaction_type);
          if (!INCOME_TRANSACTION_TYPES.has(type)) return sum;

          const date = getTransactionDate(transaction);
          if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;

          return sum + firstValidNumber(transaction?.amount);
        },
        0
      ),
    [currentMonthKey, walletTransactions]
  );

  const debtPressureSummary = useMemo(
    () => summarizeDebtObligations(debtObligations, { income: thisMonthIncome }),
    [debtObligations, thisMonthIncome]
  );

  const scheduledMonthlyObligation = toDebtNumber(debtPressureSummary.monthlyDebt);
  const monthlyObligationPressure = Math.max(
    scheduledMonthlyObligation - thisMonthDebtPayments,
    0
  );
  const totalDebtObligationBalance = toDebtNumber(debtPressureSummary.totalDebt);
  const activeDebtObligationCount = Number(debtPressureSummary.activeCount || 0);
  const debtPressureRatio = toDebtNumber(debtPressureSummary.debtRatio);
  const grossMoneyLeftThisMonth = thisMonthIncome - thisMonthSpent;
  const moneyLeftThisMonth = grossMoneyLeftThisMonth - monthlyObligationPressure;
  const safeMoneyLeftThisMonth = moneyLeftThisMonth;

  return {
    thisMonthSpent,
    thisMonthIncome,
    thisMonthDebtPayments,
    grossMoneyLeftThisMonth,
    moneyLeftThisMonth,
    safeMoneyLeftThisMonth,
    scheduledMonthlyObligation,
    monthlyObligationPressure,
    totalDebtObligationBalance,
    activeDebtObligationCount,
    debtPressureRatio,
    debtObligations,
    debtPressureSummary,
  };
}
