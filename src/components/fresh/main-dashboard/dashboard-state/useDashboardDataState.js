import { useState } from "react";

export default function useDashboardDataState({
  initialCache = {},
  hasInitialFinanceCache = false,
  financeDataLoading = false,
} = {}) {
  const [tasks, setTasks] = useState(initialCache.tasks);
  const [submissions, setSubmissions] = useState(initialCache.submissions);
  const [programRecord, setProgramRecord] = useState(initialCache.programRecord);
  const [survivalExpense, setSurvivalExpense] = useState(initialCache.survivalExpense);
  const [walletMoney, setWalletMoney] = useState(initialCache.walletMoney);
  const [wallets, setWallets] = useState(
    Array.isArray(initialCache.wallets) ? initialCache.wallets : []
  );
  const [walletTransactions, setWalletTransactions] = useState(
    Array.isArray(initialCache.walletTransactions) ? initialCache.walletTransactions : []
  );
  const [transfers, setTransfers] = useState(
    Array.isArray(initialCache.transfers) ? initialCache.transfers : []
  );
  const [budgets, setBudgets] = useState(
    Array.isArray(initialCache.budgets) ? initialCache.budgets : []
  );
  const [savingsGoals, setSavingsGoals] = useState(
    Array.isArray(initialCache.savingsGoals) ? initialCache.savingsGoals : []
  );
  const [emergencyFund, setEmergencyFund] = useState(initialCache.emergencyFund || null);
  const [expenses, setExpenses] = useState(
    Array.isArray(initialCache.expenses) ? initialCache.expenses : []
  );
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [offlineReady, setOfflineReady] = useState(true);
  const [loading, setLoading] = useState(
    !hasInitialFinanceCache && !initialCache.loaded && financeDataLoading
  );

  const [profileData, setProfileData] = useState(initialCache.profileData);
  const [latestEnrollment, setLatestEnrollment] = useState(initialCache.latestEnrollment);
  const [guardChecked, setGuardChecked] = useState(initialCache.guardChecked);

  return {
    tasks,
    setTasks,
    submissions,
    setSubmissions,
    programRecord,
    setProgramRecord,
    survivalExpense,
    setSurvivalExpense,
    walletMoney,
    setWalletMoney,
    wallets,
    setWallets,
    walletTransactions,
    setWalletTransactions,
    transfers,
    setTransfers,
    budgets,
    setBudgets,
    savingsGoals,
    setSavingsGoals,
    emergencyFund,
    setEmergencyFund,
    expenses,
    setExpenses,
    pendingExpenses,
    setPendingExpenses,
    offlineReady,
    setOfflineReady,
    loading,
    setLoading,
    profileData,
    setProfileData,
    latestEnrollment,
    setLatestEnrollment,
    guardChecked,
    setGuardChecked,
  };
}
