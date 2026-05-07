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
  const isExpanded = expandedFinanceCard === "wallets";

  const handleWalletToggle = () => {
    if (isExpanded) {
      toggleFinanceDetails?.("wallets");
      return;
    }

    toggleFinanceDetails?.("wallets", {
      autoExpand: true,
      forceOpen: true,
    });
  };

  return (
    <div
      className="h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        const button = event.target?.closest?.("button");
        const label = String(button?.textContent || "").toLowerCase();

        if (
          label.includes("show details") ||
          label.includes("hide details")
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleWalletToggle();
        }
      }}
    >
      <WalletCard
        wallets={data.wallets}
        walletMoney={data.walletMoney}
        walletPreviewTransactions={data.walletPreviewTransactions}
        expanded={isExpanded}
        onToggleDetails={handleWalletToggle}
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
