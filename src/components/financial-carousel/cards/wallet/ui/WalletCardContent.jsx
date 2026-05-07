import WalletListItem from '@/components/financial-carousel/cards/wallet/ui/WalletListItem';
import WalletRecentActivity from '@/components/financial-carousel/cards/wallet/ui/WalletRecentActivity';
import WalletEmptyState from '@/components/financial-carousel/cards/wallet/ui/WalletEmptyState';
import WalletHeader from '@/components/financial-carousel/cards/wallet/ui/WalletHeader';
import WalletSummaryStats from '@/components/financial-carousel/cards/wallet/ui/WalletSummaryStats';
import FinanceCardExpandButton from '@/components/financial-carousel/shared/FinanceCardExpandButton';
import FinanceCardExpandedPanel from '@/components/financial-carousel/shared/FinanceCardExpandedPanel';
import WalletCreateButton from '@/components/financial-carousel/cards/wallet/ui/WalletCreateButton';

export default function WalletCardContent({
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
  topWallet,
  status,
  message,
  visibleWallets = [],
  visibleTransactions = [],
  openEditWallet,
}) {
  return (
    <div className='relative z-10 flex h-full min-h-0 flex-col p-4 pb-5'>
      <div className={`${expanded ? 'shrink-0' : 'flex-1'} flex min-h-0 flex-col justify-between gap-2`}>
        <div className='min-h-0'>
          <WalletHeader walletCount={wallets.length} />

          <WalletSummaryStats
            walletMoney={walletMoney}
            walletCount={wallets.length}
            walletPreviewTransactions={walletPreviewTransactions}
            topWallet={topWallet}
            status={status}
            message={message}
          />
        </div>

        <div className='shrink-0 pb-0.5'>
          <FinanceCardExpandButton
            detailKey='wallets'
            expanded={expanded}
            onToggleDetails={onToggleDetails}
          />
        </div>
      </div>

      {expanded && (
        <FinanceCardExpandedPanel>
          {wallets.length ? (
            <div className='space-y-2'>
              {visibleWallets.map((wallet, index) => (
                <WalletListItem
                  key={wallet.id || `${wallet.name}-${index}`}
                  wallet={wallet}
                  index={index}
                  financeActionLoading={financeActionLoading}
                  openEditWallet={openEditWallet}
                  onAddMoney={onAddMoney}
                  onTransferMoney={onTransferMoney}
                  onMoveWallet={onMoveWallet}
                  onDeleteWallet={onDeleteWallet}
                />
              ))}

              <WalletRecentActivity transactions={visibleTransactions} />
            </div>
          ) : (
            <WalletEmptyState />
          )}

          <WalletCreateButton onCreateWallet={onCreateWallet} />
        </FinanceCardExpandedPanel>
      )}
    </div>
  );
}
