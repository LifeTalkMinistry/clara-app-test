import {
  WalletCards,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fmt,
  getHistoryAmountPrefix,
  getHistoryTypeLabel,
  formatHistoryDate,
} from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';
import WalletListItem from '@/components/financial-carousel/cards/wallet/ui/WalletListItem';

const glassPanel = 'border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm';

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
            <div className='mb-3 flex items-start gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.07] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_22px_rgba(0,255,220,0.12)] backdrop-blur-sm'>
                <WalletCards className='h-4 w-4' />
              </div>

              <div className='min-w-0 flex-1'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='text-base font-semibold tracking-tight text-white'>Wallets</p>
                    <p className='mt-0.5 text-[11px] font-medium text-white/78'>Track your available money across accounts</p>
                  </div>

                  <span className='shrink-0 rounded-full border border-cyan-200/15 bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm'>
                    {wallets.length} {wallets.length === 1 ? 'Wallet' : 'Wallets'}
                  </span>
                </div>
              </div>
            </div>

            <div className='mb-3'>
              <p className={`text-[32px] font-bold leading-none ${status.text}`}>{fmt(walletMoney)}</p>
              <p className='mt-2 line-clamp-1 min-h-[20px] max-w-[28rem] text-xs font-medium leading-relaxed text-white/82'>{message}</p>
              <p className='mt-1 text-[11px] text-white/56'>Total money spread across your wallet system.</p>
            </div>

            <div className='mb-3 grid grid-cols-3 gap-2'>
              <div className={`rounded-2xl px-2.5 py-2 text-center ${glassPanel}`}>
                <p className='mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50'>Wallets</p>
                <p className='text-xs font-bold text-white'>{wallets.length}</p>
              </div>

              <div className={`rounded-2xl px-2.5 py-2 text-center ${glassPanel}`}>
                <p className='mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50'>Top Wallet</p>
                <p className='truncate text-xs font-bold text-white'>{topWallet?.name || 'None'}</p>
              </div>

              <div className={`rounded-2xl px-2.5 py-2 text-center ${glassPanel}`}>
                <p className='mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50'>Activity</p>
                <p className='text-xs font-bold text-white'>{walletPreviewTransactions.length}</p>
              </div>
            </div>
          </div>

          <button
            type='button'
            onClick={onToggleDetails}
            className='flex w-full items-center justify-between rounded-2xl border border-cyan-200/15 bg-white/[0.055] px-3 py-2.5 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/25 hover:bg-white/10'
          >
            <span className='font-medium'>{expanded ? 'Hide details' : 'Show details'}</span>
            {expanded ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
          </button>
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

                {!!visibleTransactions.length && (
                  <div className={`rounded-2xl p-3 ${glassPanel}`}>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/70'>Recent activity</p>
                    <div className='mt-3 space-y-2'>
                      {visibleTransactions.map((item, index) => (
                        <div key={item.id || `${item.type}-${index}`} className='flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2'>
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium text-white'>{getHistoryTypeLabel(item.type)}</p>
                            <p className='mt-1 text-xs text-white/45'>{formatHistoryDate(item.transaction_date || item.date || item.created_at)}</p>
                          </div>
                          <p className='shrink-0 text-sm font-bold text-white'>{getHistoryAmountPrefix(item.type)}{fmt(item.amount || 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className='rounded-2xl border border-dashed border-cyan-200/20 bg-white/[0.045] p-4 text-center'>
                <WalletCards className='mx-auto h-8 w-8 text-cyan-100/35' />
                <p className='mt-3 text-sm font-semibold text-white'>No wallets yet</p>
                <p className='mt-2 text-sm leading-6 text-white/58'>Create your first wallet so your money is organized and easier to track.</p>
              </div>
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
