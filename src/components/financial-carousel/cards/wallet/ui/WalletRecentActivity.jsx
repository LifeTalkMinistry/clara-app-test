import { useMemo, useState } from 'react';
import { ArrowLeftRight, ChevronDown } from 'lucide-react';
import {
  fmt,
  getHistoryAmountPrefix,
  getHistoryTypeLabel,
  formatHistoryDate,
} from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';

const glassPanel =
  'border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm';

const isTransferTransaction = (item) => {
  const type = String(item?.type || '').trim().toLowerCase();
  return type === 'transfer_in' || type === 'transfer_out';
};

export default function WalletRecentActivity({ transactions = [] }) {
  const [expanded, setExpanded] = useState(false);
  const transferTransactions = useMemo(
    () => (Array.isArray(transactions) ? transactions.filter(isTransferTransaction) : []),
    [transactions]
  );

  if (!transferTransactions.length) return null;

  const transferCountLabel = `${transferTransactions.length} ${
    transferTransactions.length === 1 ? 'transfer' : 'transfers'
  }`;

  return (
    <div className={`overflow-hidden rounded-2xl ${glassPanel}`}>
      <button
        type='button'
        aria-expanded={expanded}
        aria-controls='wallet-transfer-history-list'
        onClick={() => setExpanded((current) => !current)}
        className='flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200/45'
      >
        <span className='grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/14 bg-cyan-300/[0.07] text-cyan-100/78'>
          <ArrowLeftRight className='h-4 w-4' />
        </span>

        <span className='min-w-0 flex-1'>
          <span className='block text-xs font-semibold uppercase tracking-[0.18em] text-white/78'>
            Transfer history
          </span>
          <span className='mt-1 block text-[10px] font-medium text-white/42'>
            {transferCountLabel}
          </span>
        </span>

        <span className='grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.045] text-white/58'>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {expanded ? (
        <div
          id='wallet-transfer-history-list'
          className='max-h-[280px] space-y-2 overflow-y-auto border-t border-white/[0.055] px-3 py-3 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        >
          {transferTransactions.map((item, index) => (
            <div
              key={item.id || `${item.type}-${index}`}
              className='flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2.5'
            >
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium text-white'>
                  {getHistoryTypeLabel(item.type)}
                </p>
                <p className='mt-1 text-xs text-white/45'>
                  {formatHistoryDate(item.transaction_date || item.date || item.created_at)}
                </p>
              </div>
              <p className='shrink-0 text-sm font-bold text-white'>
                {getHistoryAmountPrefix(item.type)}
                {fmt(item.amount || 0)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
