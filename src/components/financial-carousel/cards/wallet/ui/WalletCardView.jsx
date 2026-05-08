import WalletCard from "@/components/WalletCard";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

const DETAIL_KEY = "wallets";

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
  const isExpanded = expandedFinanceCard === DETAIL_KEY;

  const handleWalletToggle = () => {
    toggleExpandedFinanceCard({
      detailKey: DETAIL_KEY,
      isExpanded,
      toggleFinanceDetails,
    });
  };

  return (
    <div
      className="h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        if (stopCapturedDetailsToggle(event)) {
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
