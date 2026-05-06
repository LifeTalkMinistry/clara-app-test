import WalletCard from "@/components/WalletCard";

export default function WalletCardView({
  data = {},
  expandedFinanceCard,
  toggleFinanceDetails,
  financeActionLoading,
  onCreateWallet,
  onMoveWallet,
  onDeleteWallet,
  onAddMoney,
  onTransferMoney,
  onEditWallet,
}) {
  return (
    <div className="h-full min-h-[inherit] flex flex-col">
      <WalletCard
        wallets={data.wallets}
        walletMoney={data.walletMoney}
        walletPreviewTransactions={data.walletPreviewTransactions}
        expanded={expandedFinanceCard === "wallets"}
        onToggleDetails={() => toggleFinanceDetails?.("wallets")}
        financeActionLoading={financeActionLoading}
        onCreateWallet={onCreateWallet}
        onMoveWallet={onMoveWallet}
        onDeleteWallet={onDeleteWallet}
        onAddMoney={onAddMoney}
        onTransferMoney={onTransferMoney}
        onEditWallet={onEditWallet}
      />
    </div>
  );
}
