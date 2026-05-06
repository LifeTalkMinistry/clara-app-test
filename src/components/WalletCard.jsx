import useWalletCardLogic from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';
import EditWalletModal from '@/components/financial-carousel/cards/wallet/modal/EditWalletModal';
import WalletCardContent from '@/components/financial-carousel/cards/wallet/ui/WalletCardContent';

export default function WalletCard({
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onCreateWallet,
  onMoveWallet,
  onDeleteWallet,
  onAddMoney,
  onTransferMoney,
  onEditWallet,
}) {
  const {
    editingWallet,
    editForm,
    setEditForm,
    isSavingWalletEdit,
    topWallet,
    status,
    message,
    visibleWallets,
    visibleTransactions,
    openEditWallet,
    closeEditWallet,
    handleSaveWalletEdit,
  } = useWalletCardLogic({
    wallets,
    walletMoney,
    walletPreviewTransactions,
    expanded,
    onEditWallet,
  });

  return (
    <div
      className={`clara-finance-bubble-card clara-finance-bubble-wallet relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-[30px] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(6,48,66,0.96),rgba(7,20,48,0.94)_48%,rgba(37,13,74,0.94))] shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_42px_rgba(0,255,220,0.10),0_0_62px_rgba(126,34,206,0.12)] backdrop-blur-2xl transition-all duration-200 ${status.ring}`}
    >
      <WalletCardContent
        wallets={wallets}
        walletMoney={walletMoney}
        walletPreviewTransactions={walletPreviewTransactions}
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        financeActionLoading={financeActionLoading}
        onCreateWallet={onCreateWallet}
        onMoveWallet={onMoveWallet}
        onDeleteWallet={onDeleteWallet}
        onAddMoney={onAddMoney}
        onTransferMoney={onTransferMoney}
        topWallet={topWallet}
        status={status}
        message={message}
        visibleWallets={visibleWallets}
        visibleTransactions={visibleTransactions}
        openEditWallet={openEditWallet}
      />

      <EditWalletModal
        editingWallet={editingWallet}
        editForm={editForm}
        setEditForm={setEditForm}
        isSavingWalletEdit={isSavingWalletEdit}
        closeEditWallet={closeEditWallet}
        handleSaveWalletEdit={handleSaveWalletEdit}
      />
    </div>
  );
}
