import { useMemo } from "react";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";

export default function useDashboardVisibleFinanceData({
  wallets = [],
  expenses = [],
  budgets = [],
  savingsGoals = [],
  walletTransactions = [],
  emergencyFund = null,
  walletMoney = 0,
} = {}) {
  return useMemo(
    () =>
      hasDashboardFinanceContent({
        wallets,
        expenses,
        budgets,
        savingsGoals,
        walletTransactions,
        emergencyFund,
        walletMoney,
      }),
    [budgets, emergencyFund, expenses, savingsGoals, walletMoney, walletTransactions, wallets]
  );
}
