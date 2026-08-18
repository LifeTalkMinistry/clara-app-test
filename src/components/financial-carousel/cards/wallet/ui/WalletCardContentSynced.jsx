import { useMemo } from "react";
import WalletCardContent from "@/components/financial-carousel/cards/wallet/ui/WalletCardContent";
import { syncWalletProtectedAllocations } from "@/lib/clara-wallet-money-semantics";

function isTransferTransaction(transaction) {
  const type = String(transaction?.type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return type === "transfer_in" || type === "transfer_out";
}

// Compatibility export for older callers. The finance-layer helper is the only
// implementation and authority for protected/spendable wallet semantics.
export const syncProtectedAllocations = syncWalletProtectedAllocations;

export default function WalletCardContentSynced({ emergencyFund = null, savingsGoals = [], ...props }) {
  const syncedVisibleWallets = useMemo(
    () =>
      syncWalletProtectedAllocations({
        rows: props.visibleWallets,
        allWallets: props.wallets,
        emergencyFund,
        savingsGoals,
      }),
    [props.visibleWallets, props.wallets, emergencyFund, savingsGoals]
  );

  const syncedVisibleTransactions = useMemo(
    () =>
      (Array.isArray(props.visibleTransactions) ? props.visibleTransactions : []).filter(
        isTransferTransaction
      ),
    [props.visibleTransactions]
  );

  const syncedWalletPreviewTransactions = useMemo(
    () =>
      (Array.isArray(props.walletPreviewTransactions)
        ? props.walletPreviewTransactions
        : []
      ).filter(isTransferTransaction),
    [props.walletPreviewTransactions]
  );

  return (
    <WalletCardContent
      {...props}
      walletPreviewTransactions={syncedWalletPreviewTransactions}
      visibleWallets={syncedVisibleWallets}
      visibleTransactions={syncedVisibleTransactions}
    />
  );
}
