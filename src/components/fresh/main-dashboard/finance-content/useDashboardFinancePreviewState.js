import { useMemo } from "react";

const isTransferTransaction = (transaction) => {
  const type = String(transaction?.type || "").trim().toLowerCase();
  return type === "transfer_in" || type === "transfer_out";
};

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
    () => safeWalletTransactions.filter(isTransferTransaction).slice(0, 8),
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
