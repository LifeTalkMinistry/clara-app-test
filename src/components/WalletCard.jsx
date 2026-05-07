import useWalletCardLogic from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';
import EditWalletModal from '@/components/financial-carousel/cards/wallet/modal/EditWalletModal';
import WalletCardContent from '@/components/financial-carousel/cards/wallet/ui/WalletCardContent';
import FinanceCardShell from '@/components/financial-carousel/shared/FinanceCardShell';

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
    <FinanceCardShell
      cardKey="wallet"
      expanded={expanded}
      ringClass={status.ring}
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
    </FinanceCardShell>
  );
}
