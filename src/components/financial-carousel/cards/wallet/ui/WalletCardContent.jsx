import WalletListItem from '@/components/financial-carousel/cards/wallet/ui/WalletListItem';
import WalletRecentActivity from '@/components/financial-carousel/cards/wallet/ui/WalletRecentActivity';
import WalletEmptyState from '@/components/financial-carousel/cards/wallet/ui/WalletEmptyState';
import WalletHeader from '@/components/financial-carousel/cards/wallet/ui/WalletHeader';
import WalletSummaryStats from '@/components/financial-carousel/cards/wallet/ui/WalletSummaryStats';
import FinanceCardExpandButton from '@/components/financial-carousel/shared/FinanceCardExpandButton';
import FinanceCardExpandedPanel from '@/components/financial-carousel/shared/FinanceCardExpandedPanel';
import WalletCreateButton from '@/components/financial-carousel/cards/wallet/ui/WalletCreateButton';
import { fmt } from '@/components/financial-carousel/cards/wallet/logic/walletFormatting';

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
  expandedMessage,
  visibleWallets = [],
  visibleTransactions = [],
  openEditWallet,
}) {
  const walletCount = visibleWallets.length || wallets.filter((wallet) => !wallet?.is_archived).length;

  return (
    <div className='relative z-10 flex h-full min-h-0 flex-col p-[clamp(0.875rem,3.5vw,1rem)] pb-[clamp(1rem,2svh,1.25rem)]'>
      <div
        className={`flex min-h-0 flex-col ${
          expanded
            ? 'flex-1 gap-[clamp(0.625rem,1.4svh,0.85rem)]'
            : 'shrink-0 gap-[clamp(0.875rem,1.8svh,1.05rem)]'
        }`}
      >
        <div className='flex min-h-0 flex-col gap-[clamp(0.625rem,1.5svh,0.9rem)]'>
          {!expanded && <WalletHeader walletCount={walletCount} />}

          {!expanded ? (
            <div className='min-h-0'>
              <WalletSummaryStats
                walletMoney={walletMoney}
                walletCount={walletCount}
                walletPreviewTransactions={walletPreviewTransactions}
                topWallet={topWallet}
                status={status}
                message={message}
              />
            </div>
          ) : (
            <div className='mb-[clamp(0.5rem,1.5svh,0.85rem)]'>
              <p
                className={`text-[clamp(2rem,8vw,2.25rem)] font-black leading-none tracking-[-0.045em] ${status.text}`}
              >
                {fmt(walletMoney)}
              </p>

              <p className='mt-[clamp(0.45rem,1svh,0.65rem)] text-xs font-semibold leading-relaxed text-white/76'>
                Total available across your wallet system.
              </p>
            </div>
          )}
        </div>

        <div className='shrink-0'>
          <FinanceCardExpandButton
            detailKey='wallets'
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            collapsedLabel='View Wallets'
            expandedLabel='Hide Wallets'
          />
        </div>
      </div>

      {!expanded && <div className='min-h-0 flex-1' aria-hidden='true' />}

      {expanded && (
        <FinanceCardExpandedPanel>
          <div className='mb-3 rounded-2xl border border-cyan-100/15 bg-white/[0.045] px-3 py-2.5 text-xs font-medium leading-5 text-white/68'>
            {expandedMessage}
          </div>

          {visibleWallets.length ? (
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
