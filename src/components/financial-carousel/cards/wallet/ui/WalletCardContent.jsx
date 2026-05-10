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
      <div className='relative z-10 flex h-full min-h-0 flex-col p-4 pb-4'>
        <div className='flex min-h-0 flex-col gap-3'>
          <div className='min-h-0'>
            <WalletHeader walletCount={walletCount} />

            <WalletSummaryStats
              walletMoney={walletMoney}
              walletCount={walletCount}
              walletPreviewTransactions={walletPreviewTransactions}
              topWallet={topWallet}
              status={status}
              message={message}
            />
          </div>

          <div className='shrink-0 border-t border-white/6 pt-2'>
            <FinanceCardExpandButton
              detailKey='wallets'
              expanded={expanded}
              onToggleDetails={onToggleDetails}
              collapsedLabel='View Wallets'
              expandedLabel='Hide Wallets'
              className='border-white/10 bg-white/[0.055] py-3 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.12)]'
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative z-10 flex h-full min-h-0 flex-col overflow-hidden p-[clamp(0.875rem,3.2vw,1rem)] pb-[clamp(0.9rem,1.8svh,1.1rem)]'>
      <div className='flex shrink-0 flex-col gap-[clamp(0.625rem,1.4svh,0.85rem)]'>
        <div className='shrink-0'>
          <p
            className={`text-[clamp(2rem,8vw,2.25rem)] font-black leading-none tracking-[-0.045em] ${status.text}`}
          >
            {fmt(walletMoney)}
          </p>

          <p className='mt-[clamp(0.45rem,1svh,0.65rem)] text-xs font-semibold leading-relaxed text-white/76'>
            Total available across your wallet system.
          </p>
        </div>

        <div className='shrink-0 border-t border-white/6 pt-2'>
          <FinanceCardExpandButton
            detailKey='wallets'
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            collapsedLabel='View Wallets'
            expandedLabel='Hide Wallets'
            className='border-white/10 bg-white/[0.055] py-3 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.12)]'
          />
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden pt-3'>
        <FinanceCardExpandedPanel className='h-full overflow-y-auto pr-1'>
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
