import { useEffect, useMemo } from "react";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";

const BUDGET_PROTECTION_UPDATED_EVENT = "clara:budget-protection-settings-updated";

export default function useDashboardVisibleFinanceData({
  wallets = [],
  expenses = [],
  budgets = [],
  savingsGoals = [],
  walletTransactions = [],
  emergencyFund = null,
  walletMoney = 0,
} = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.__CLARA_BUDGET_PROTECTION_CONTEXT = {
      savingsGoals,
      emergencyFund,
    };
    window.dispatchEvent(new Event(BUDGET_PROTECTION_UPDATED_EVENT));
  }, [emergencyFund, savingsGoals]);

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