import {
  fmt,
  getHistoryAmountPrefix,
  getHistoryTypeLabel,
  formatHistoryDate,
} from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';

const glassPanel = 'border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm';

export default function WalletRecentActivity({ transactions = [] }) {
  if (!transactions.length) return null;

  return (
    <div className={`rounded-2xl p-3 ${glassPanel}`}>
      <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/70'>Recent activity</p>
      <div className='mt-3 space-y-2'>
        {transactions.map((item, index) => (
          <div
            key={item.id || `${item.type}-${index}`}
            className='flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2'
          >
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium text-white'>{getHistoryTypeLabel(item.type)}</p>
              <p className='mt-1 text-xs text-white/45'>
                {formatHistoryDate(item.transaction_date || item.date || item.created_at)}
              </p>
            </div>
            <p className='shrink-0 text-sm font-bold text-white'>
              {getHistoryAmountPrefix(item.type)}{fmt(item.amount || 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
