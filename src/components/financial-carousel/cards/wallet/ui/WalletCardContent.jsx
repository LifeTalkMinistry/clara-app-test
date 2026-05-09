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

  if (!expanded) {
    return (
      <div className='relative z-10 flex h-full min-h-0 flex-col p-[clamp(0.875rem,3.2vw,1rem)] pb-[clamp(0.9rem,1.8svh,1.1rem)]'>
        <div className='flex h-full min-h-0 flex-col gap-[clamp(0.45rem,0.95svh,0.7rem)]'>
          <div className='flex min-h-0 flex-1 flex-col justify-center'>
            <WalletHeader walletCount={walletCount} />

            <div className='min-h-0 flex-1 pt-[clamp(0.7rem,2.6svh,1.35rem)]'>
              <WalletSummaryStats
                walletMoney={walletMoney}
                walletCount={walletCount}
                walletPreviewTransactions={walletPreviewTransactions}
                topWallet={topWallet}
                status={status}
                message={message}
              />
            </div>
          </div>

          <FinanceCardExpandButton
            detailKey='wallets'
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            collapsedLabel='View Wallets'
            expandedLabel='Hide Wallets'
          />
        </div>
      </div>
    );
  }

  return (
    <div className='relative z-10 flex h-full min-h-0 flex-col p-[clamp(0.875rem,3.2vw,1rem)] pb-[clamp(0.9rem,1.8svh,1.1rem)]'>
      <div className='flex min-h-0 flex-1 flex-col gap-[clamp(0.625rem,1.4svh,0.85rem)]'>
        <div className='mb-[clamp(0.5rem,1.5svh,0.85rem)] shrink-0'>
          <p
            className={`text-[clamp(2rem,8vw,2.25rem)] font-black leading-none tracking-[-0.045em] ${status.text}`}
          >
            {fmt(walletMoney)}
          </p>

          <p className='mt-[clamp(0.45rem,1svh,0.65rem)] text-xs font-semibold leading-relaxed text-white/76'>
            Total available across your wallet system.
          </p>
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
      </div>
    </div>
  );
}
