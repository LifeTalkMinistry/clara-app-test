import { useMemo } from "react";

export default function useDashboardFinancePreviewState({
  wallets = [],
  walletTransactions = [],
  savingsGoals = [],
} = {}) {
  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const safeWalletTransactions = Array.isArray(walletTransactions)
    ? walletTransactions
    : [];
  const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];

  const topWallet = useMemo(() => safeWallets[0] || null, [safeWallets]);

  const walletPreviewTransactions = useMemo(
    () => safeWalletTransactions.slice(0, 2),
    [safeWalletTransactions]
  );

  const primarySavingsGoal = useMemo(
    () => safeSavingsGoals[0] || null,
    [safeSavingsGoals]
  );

  return {
    topWallet,
    walletPreviewTransactions,
    primarySavingsGoal,
  };
}
