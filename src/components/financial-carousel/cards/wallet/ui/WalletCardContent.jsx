import { Plus } from 'lucide-react';
import WalletListItem from '@/components/financial-carousel/cards/wallet/ui/WalletListItem';
import WalletRecentActivity from '@/components/financial-carousel/cards/wallet/ui/WalletRecentActivity';
import WalletEmptyState from '@/components/financial-carousel/cards/wallet/ui/WalletEmptyState';
import WalletHeader from '@/components/financial-carousel/cards/wallet/ui/WalletHeader';
import WalletSummaryStats from '@/components/financial-carousel/cards/wallet/ui/WalletSummaryStats';
import WalletExpandToggle from '@/components/financial-carousel/cards/wallet/ui/WalletExpandToggle';

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
    <>
      <div className='pointer-events-none absolute -left-28 -top-32 h-72 w-72 rounded-full bg-cyan-300/25 blur-[86px]' />
      <div className='pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-purple-500/25 blur-[92px]' />
      <div className='pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/12 blur-[84px]' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,220,0.30),transparent_34%),radial-gradient(circle_at_top_right,rgba(126,34,206,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.04)_100%)]' />
      <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-black/12 via-black/8 to-black/26' />
      <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_35%,transparent_100%)]' />
      <div className='pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10' />

      <div className='relative z-10 flex h-full min-h-0 flex-col p-4'>
        <div className='flex min-h-0 flex-1 flex-col justify-between'>
          <div>
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

          <WalletExpandToggle
            expanded={expanded}
            onToggleDetails={onToggleDetails}
          />
        </div>

        {expanded && (
          <div className='mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-cyan-200/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(0,255,220,0.04)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
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

            <div className='grid grid-cols-1 gap-2'>
              <button type='button' onClick={onCreateWallet} className='flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(0,255,220,0.10)] transition hover:bg-cyan-300/15'>
                <Plus className='h-4 w-4' />
                Create Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
