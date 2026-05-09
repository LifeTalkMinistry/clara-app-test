import useDashboardFinancePreviewState from "@/components/fresh/main-dashboard/finance-content/useDashboardFinancePreviewState";
import useDashboardBudgetPreviewState from "@/components/fresh/main-dashboard/finance-content/useDashboardBudgetPreviewState";
import useDashboardSavingsPreviewState from "@/components/fresh/main-dashboard/finance-content/useDashboardSavingsPreviewState";

export default function useDashboardFinanceOverviewState({
  wallets = [],
  walletTransactions = [],
  budgets = [],
  expenses = [],
  savingsGoals = [],
} = {}) {
  const financePreview = useDashboardFinancePreviewState({
    wallets,
    walletTransactions,
    savingsGoals,
  });

  const budgetPreview = useDashboardBudgetPreviewState({
    budgets,
    expenses,
  });

  const savingsPreview = useDashboardSavingsPreviewState({
    savingsGoals,
  });

  return {
    ...financePreview,
    ...budgetPreview,
    ...savingsPreview,
  };
}
