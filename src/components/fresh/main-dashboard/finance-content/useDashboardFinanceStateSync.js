import { useEffect } from "react";
import { getWalletDisplayBalance } from "@/utils/dashboard/dashboardHelpers";

export const CLARA_EMERGENCY_RESERVE_WALLET_ID = "clara-emergency-reserve-wallet";

export default function useDashboardFinanceStateSync({
  cacheKey,
  financeWallets = [],
  financeWalletTransactions = [],
  financeTransfers = [],
  financeBudgets = [],
  financeSavingsGoals = [],
  financeExpenses = [],
  financeEmergencyFund = null,
  setWallets,
  setWalletTransactions,
  setTransfers,
  setBudgets,
  setSavingsGoals,
  setEmergencyFund,
  setExpenses,
  setPendingExpenses,
  setOfflineReady,
  setWalletMoney,
  setLoading,
  onCacheUpdate,
}) {
  useEffect(() => {
    const safeWallets = Array.isArray(financeWallets)
      ? financeWallets.filter(
          (wallet) =>
            wallet?.id !== CLARA_EMERGENCY_RESERVE_WALLET_ID &&
            wallet?.wallet_id !== CLARA_EMERGENCY_RESERVE_WALLET_ID &&
            !wallet?.isEmergencyReserveWallet &&
            !wallet?.protected_reserve
        )
      : [];

    const safeWalletTransactions = Array.isArray(financeWalletTransactions)
      ? financeWalletTransactions
      : [];

    const safeTransfers = Array.isArray(financeTransfers) ? financeTransfers : [];
    const safeBudgets = Array.isArray(financeBudgets) ? financeBudgets : [];

    const safeSavingsGoals = Array.isArray(financeSavingsGoals)
      ? financeSavingsGoals
      : [];

    const safeExpenses = Array.isArray(financeExpenses) ? financeExpenses : [];

    const safePendingExpenses = safeExpenses.filter(
      (item) => item?.pending_sync || item?.sync_status === "pending" || item?.local_only
    );

    const nextWalletMoney = safeWallets.reduce(
      (sum, wallet) => sum + getWalletDisplayBalance(wallet),
      0
    );

    // IMPORTANT:
    // Emergency Fund reserve should NOT exist inside global wallet state.
    // It causes wallet cards and wallet carousels to flicker.
    // The reserve wallet should only be injected locally into the Manual Log dropdown.

    setWallets(safeWallets);
    setWalletTransactions(safeWalletTransactions);
    setTransfers(safeTransfers);
    setBudgets(safeBudgets);
    setSavingsGoals(safeSavingsGoals);
    setEmergencyFund(financeEmergencyFund || null);
    setExpenses(safeExpenses);
    setPendingExpenses(safePendingExpenses);
    setOfflineReady(true);
    setWalletMoney(nextWalletMoney);
    setLoading(false);

    if (typeof onCacheUpdate === "function") {
      onCacheUpdate({
        key: cacheKey,
        loaded: true,
        walletMoney: nextWalletMoney,
        wallets: safeWallets,
        walletTransactions: safeWalletTransactions,
        transfers: safeTransfers,
        budgets: safeBudgets,
        savingsGoals: safeSavingsGoals,
        emergencyFund: financeEmergencyFund || null,
        expenses: safeExpenses,
        pendingExpenses: safePendingExpenses,
        offlineReady: true,
      });
    }
  }, [
    cacheKey,
    financeBudgets,
    financeEmergencyFund,
    financeExpenses,
    financeSavingsGoals,
    financeTransfers,
    financeWalletTransactions,
    financeWallets,
    onCacheUpdate,
    setBudgets,
    setEmergencyFund,
    setExpenses,
    setLoading,
    setOfflineReady,
    setPendingExpenses,
    setSavingsGoals,
    setTransfers,
    setWalletMoney,
    setWalletTransactions,
    setWallets,
  ]);
}
