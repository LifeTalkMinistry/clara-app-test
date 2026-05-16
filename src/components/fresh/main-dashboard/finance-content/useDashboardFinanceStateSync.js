import { useEffect } from "react";
import { getWalletDisplayBalance } from "@/utils/dashboard/dashboardHelpers";

export const CLARA_EMERGENCY_RESERVE_WALLET_ID = "clara-emergency-reserve-wallet";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getEmergencyReserveBalance(emergencyFund) {
  return toNumber(
    emergencyFund?.protectedBalance ??
      emergencyFund?.protected_balance ??
      emergencyFund?.reserveBalance ??
      emergencyFund?.reserve_balance ??
      emergencyFund?.savedAmount ??
      emergencyFund?.saved_amount ??
      emergencyFund?.amount ??
      emergencyFund?.balance ??
      emergencyFund?.moneyLeft ??
      0
  );
}

function buildEmergencyReserveWallet(emergencyFund) {
  const balance = getEmergencyReserveBalance(emergencyFund);

  if (!emergencyFund || balance <= 0) {
    return null;
  }

  return {
    id: CLARA_EMERGENCY_RESERVE_WALLET_ID,
    wallet_id: CLARA_EMERGENCY_RESERVE_WALLET_ID,
    name: "Emergency Fund 🔒",
    title: "Emergency Fund 🔒",
    label: "Emergency Fund 🔒",
    type: "protected_reserve",
    wallet_type: "protected_reserve",
    protected_reserve: true,
    isEmergencyReserveWallet: true,
    balance,
    current_balance: balance,
    wallet_balance: balance,
    available_balance: balance,
    starting_balance: balance,
    emergencyFundId: emergencyFund?.id || null,
    emergency_fund_id: emergencyFund?.id || null,
    source: "clara_protected_reserve",
    sort_order: 9999,
  };
}

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
    const baseWallets = Array.isArray(financeWallets)
      ? financeWallets.filter(
          (wallet) =>
            wallet?.id !== CLARA_EMERGENCY_RESERVE_WALLET_ID &&
            wallet?.wallet_id !== CLARA_EMERGENCY_RESERVE_WALLET_ID &&
            !wallet?.isEmergencyReserveWallet
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

    const nextWalletMoney = baseWallets.reduce(
      (sum, wallet) => sum + getWalletDisplayBalance(wallet),
      0
    );

    const emergencyReserveWallet = buildEmergencyReserveWallet(financeEmergencyFund);

    const visibleWallets = emergencyReserveWallet
      ? [...baseWallets, emergencyReserveWallet]
      : baseWallets;

    setWallets(visibleWallets);
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
        wallets: visibleWallets,
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
