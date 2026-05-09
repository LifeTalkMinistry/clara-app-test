import { useEffect } from "react";
import {
  DEBUG_FINANCE_DIAGNOSTICS,
  getPHMonthKey,
  getTransactionDate,
  getWalletDisplayBalance,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";

const toFinanceNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/[₱,\s]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

const getSignedLedgerAmount = (transaction) => {
  const type = normalizeLower(
    transaction?.type || transaction?.transaction_type || transaction?.kind
  );
  const amount = toFinanceNumber(transaction?.amount);

  if (
    [
      "expense",
      "transfer_out",
      "savings_goal",
      "savings_transfer",
      "reset",
      "debit",
      "withdrawal",
    ].includes(type)
  ) {
    return -amount;
  }

  if (
    [
      "income",
      "add",
      "cash_in",
      "deposit",
      "transfer_in",
      "opening_balance",
      "credit",
    ].includes(type)
  ) {
    return amount;
  }

  return 0;
};

const isExpenseType = (transaction) =>
  normalizeLower(transaction?.type || transaction?.transaction_type || transaction?.kind) ===
  "expense";

export default function useDashboardFinanceDiagnostics({
  claraAssistantContext,
  expenses = [],
  moneyLeftThisMonth = 0,
  thisMonthSpent = 0,
  walletMoney = 0,
  walletTransactions = [],
  wallets = [],
}) {
  useEffect(() => {
    if (!DEBUG_FINANCE_DIAGNOSTICS) return;

    const safeWallets = Array.isArray(wallets) ? wallets : [];
    const safeWalletTransactions = Array.isArray(walletTransactions)
      ? walletTransactions
      : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const currentMonthKey = getPHMonthKey();

    const normalizedWalletBalanceSum = safeWallets.reduce(
      (sum, wallet) => sum + toFinanceNumber(getWalletDisplayBalance(wallet)),
      0
    );
    const walletLedgerNetTotal = safeWalletTransactions.reduce(
      (sum, transaction) => sum + getSignedLedgerAmount(transaction),
      0
    );
    const expenseTableMonthlyRows = safeExpenses.filter((expense) => {
      const expenseDate = getTransactionDate(expense);
      return expenseDate && getPHMonthKey(expenseDate) === currentMonthKey;
    });
    const expenseTableMonthlySum = expenseTableMonthlyRows.reduce(
      (sum, expense) => sum + toFinanceNumber(expense?.amount),
      0
    );
    const walletTransactionExpenseMonthlyRows = safeWalletTransactions.filter((transaction) => {
      const transactionDate = getTransactionDate(transaction);
      return (
        isExpenseType(transaction) &&
        transactionDate &&
        getPHMonthKey(transactionDate) === currentMonthKey
      );
    });
    const walletTransactionExpenseMonthlySum = walletTransactionExpenseMonthlyRows.reduce(
      (sum, transaction) => sum + toFinanceNumber(transaction?.amount),
      0
    );
    const tolerance = 0.01;
    const differs = (a, b) => Math.abs(toFinanceNumber(a) - toFinanceNumber(b)) > tolerance;

    const walletSummaries = Array.isArray(claraAssistantContext?.wallets)
      ? claraAssistantContext.wallets.map((wallet) => ({
          id: wallet?.id,
          name: wallet?.name,
          balance: wallet?.balance,
        }))
      : [];

    const diagnostics = {
      walletTotals: {
        dashboardWalletMoney: toFinanceNumber(walletMoney),
        dashboardTotalMoneyLeft: toFinanceNumber(claraAssistantContext?.totalMoneyLeft),
        normalizedWalletBalanceSum,
        walletLedgerNetTotal,
        walletsLoaded: safeWallets.length,
      },
      monthlySpending: {
        dashboardThisMonthSpent: toFinanceNumber(thisMonthSpent),
        expenseTableMonthlySum,
        walletTransactionExpenseMonthlySum,
        expenseRowsThisMonth: expenseTableMonthlyRows.length,
        walletTransactionExpenseRowsThisMonth: walletTransactionExpenseMonthlyRows.length,
      },
      claraContext: {
        totalAvailableMoney: toFinanceNumber(claraAssistantContext?.totalMoneyLeft),
        monthlySpent: toFinanceNumber(claraAssistantContext?.totalExpensesThisMonth),
        walletCount: walletSummaries.length,
        walletSummaries,
        cashFlowRemaining: toFinanceNumber(moneyLeftThisMonth),
      },
      mismatchFlags: {
        walletMoneyDiffersFromWalletBalanceSum: differs(walletMoney, normalizedWalletBalanceSum),
        dashboardMonthlySpentDiffersFromExpenseTableMonthlySum: differs(
          thisMonthSpent,
          expenseTableMonthlySum
        ),
        walletTransactionExpenseTotalDiffersFromExpensesTableTotal: differs(
          walletTransactionExpenseMonthlySum,
          expenseTableMonthlySum
        ),
      },
    };

    console.groupCollapsed("CLARA Finance Diagnostics");
    console.table([diagnostics.walletTotals]);
    console.table([diagnostics.monthlySpending]);
    console.log("CLARA context:", diagnostics.claraContext);
    console.table([diagnostics.mismatchFlags]);

    Object.entries(diagnostics.mismatchFlags).forEach(([key, value]) => {
      if (value) {
        console.warn(`CLARA Finance Diagnostics mismatch: ${key}`, diagnostics);
      }
    });

    console.groupEnd();
  }, [
    claraAssistantContext,
    expenses,
    moneyLeftThisMonth,
    thisMonthSpent,
    walletMoney,
    walletTransactions,
    wallets,
  ]);
}
