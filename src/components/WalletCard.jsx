import useWalletCardLogic from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';
import EditWalletModal from '@/components/financial-carousel/cards/wallet/modal/EditWalletModal';
import WalletCardContent from '@/components/financial-carousel/cards/wallet/ui/WalletCardContent';
import FinanceCardShell from '@/components/financial-carousel/shared/FinanceCardShell';

const WALLET_GLOW_LAYERS = [
  'pointer-events-none absolute -left-[138px] -top-[150px] z-[1] h-[280px] w-[280px] rounded-full bg-cyan-300/[0.09] blur-[78px]',
  'pointer-events-none absolute -right-[126px] -top-[84px] z-[1] h-[260px] w-[260px] rounded-full bg-sky-400/[0.058] blur-[84px]',
  'pointer-events-none absolute bottom-[-214px] right-[-136px] z-[1] h-[310px] w-[310px] rounded-full bg-indigo-700/[0.09] blur-[94px]',
  'pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_10%_0%,rgba(103,232,249,0.132),transparent_32%),radial-gradient(circle_at_84%_96%,rgba(79,70,229,0.105),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]',
  'pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.062),rgba(255,255,255,0.014)_42%,transparent)]',
  'pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-cyan-100/[0.06]',
];

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
    activeWallets,
    topWallet,
    status,
    message,
    expandedMessage,
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
      glowLayerClassNames={WALLET_GLOW_LAYERS}
      surfaceClassName="!border-cyan-100/[0.075] !bg-[linear-gradient(135deg,rgba(4,35,49,0.92),rgba(5,17,40,0.955)_45%,rgba(18,13,55,0.915))]"
      shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.46),0_0_30px_rgba(34,211,238,0.07),0_0_52px_rgba(79,70,229,0.085)]"
    >
      <WalletCardContent
        wallets={activeWallets}
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
        expandedMessage={expandedMessage}
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
