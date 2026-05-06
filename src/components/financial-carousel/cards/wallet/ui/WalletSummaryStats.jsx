import { fmt } from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';

const glassPanel = 'border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm';

export default function WalletSummaryStats({
  walletMoney = 0,
  walletCount = 0,
  walletPreviewTransactions = [],
  topWallet,
  status,
  message,
}) {
  return (
    <>
      <div className='mb-3'>
        <p className={`text-[32px] font-bold leading-none ${status.text}`}>{fmt(walletMoney)}</p>
        <p className='mt-2 line-clamp-1 min-h-[20px] max-w-[28rem] text-xs font-medium leading-relaxed text-white/82'>{message}</p>
        <p className='mt-1 text-[11px] text-white/56'>Total money spread across your wallet system.</p>
      </div>

      <div className='mb-3 grid grid-cols-3 gap-2'>
        <div className={`rounded-2xl px-2.5 py-2 text-center ${glassPanel}`}>
          <p className='mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50'>Wallets</p>
          <p className='text-xs font-bold text-white'>{walletCount}</p>
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
    </>
  );
}
