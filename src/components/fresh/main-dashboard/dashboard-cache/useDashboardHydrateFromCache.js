import { useCallback } from "react";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";

export default function useDashboardHydrateFromCache({
  financeDataLoading = false,
  hasLoadedDashboardRef,
  setTasks,
  setSubmissions,
  setProgramRecord,
  setSurvivalExpense,
  setWalletMoney,
  setWallets,
  setWalletTransactions,
  setTransfers,
  setBudgets,
  setSavingsGoals,
  setExpenses,
  setPendingExpenses,
  setOfflineReady,
  setProfileData,
  setLatestEnrollment,
  setGuardChecked,
  setNickname,
  setReminderTime,
  setFinancialGoal,
  setLoading,
} = {}) {
  return useCallback(
    (nextCache = {}) => {
      setTasks(nextCache.tasks);
      setSubmissions(nextCache.submissions);
      setProgramRecord(nextCache.programRecord);
      setSurvivalExpense(nextCache.survivalExpense);
      setWalletMoney(nextCache.walletMoney);
      setWallets(nextCache.wallets);
      setWalletTransactions(nextCache.walletTransactions);
      setTransfers(nextCache.transfers || []);
      setBudgets(nextCache.budgets);
      setSavingsGoals(nextCache.savingsGoals);
      setExpenses(nextCache.expenses);
      setPendingExpenses(nextCache.pendingExpenses || []);
      setOfflineReady(Boolean(nextCache.offlineReady));
      setProfileData(nextCache.profileData);
      setLatestEnrollment(nextCache.latestEnrollment);
      setGuardChecked(nextCache.guardChecked);
      setNickname(nextCache.nickname);
      setReminderTime(nextCache.reminderTime);
      setFinancialGoal(nextCache.financialGoal);

      if (hasLoadedDashboardRef?.current !== undefined) {
        hasLoadedDashboardRef.current = nextCache.loaded;
      }

      setLoading(
        !nextCache.loaded && !hasDashboardFinanceContent(nextCache) && financeDataLoading
      );
    },
    [
      financeDataLoading,
      hasLoadedDashboardRef,
      setBudgets,
      setExpenses,
      setFinancialGoal,
      setGuardChecked,
      setLatestEnrollment,
      setLoading,
      setOfflineReady,
      setPendingExpenses,
      setProfileData,
      setProgramRecord,
      setReminderTime,
      setSavingsGoals,
      setSubmissions,
      setSurvivalExpense,
      setTasks,
      setTransfers,
      setWalletMoney,
      setWalletTransactions,
      setWallets,
      setNickname,
    ]
  );
}
