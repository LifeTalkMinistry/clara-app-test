import { fmt } from '@/components/financial-carousel/cards/wallet/logic/walletFormatting';

const glassPanel = 'border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm';

export default function WalletSummaryStats({
  walletMoney = 0,
  walletCount = 0,
  walletPreviewTransactions = [],
  topWallet,
  status,
  message,
}) {
  const activityCount = walletPreviewTransactions.length;

  return (
    <>
      <div className='mb-4'>
        <p className={`text-[38px] font-black leading-none tracking-[-0.045em] ${status.text}`}>
          {fmt(walletMoney)}
        </p>

        <p className='mt-3 line-clamp-1 min-h-[18px] max-w-[28rem] text-[13px] font-semibold leading-relaxed text-white/84'>
          {message}
        </p>
      </div>

      <div className='mb-3 grid grid-cols-3 gap-2'>
        <div className={`rounded-2xl px-2.5 py-2.5 text-center ${glassPanel}`}>
          <p className='text-sm font-black leading-none text-white'>{walletCount}</p>
          <p className='mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>Wallets</p>
        </div>

        <div className={`rounded-2xl px-2.5 py-2.5 text-center ${glassPanel}`}>
          <p className='truncate text-sm font-black leading-none text-white'>{topWallet?.name || 'None'}</p>
          <p className='mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>Primary</p>
        </div>

        <div className={`rounded-2xl px-2.5 py-2.5 text-center ${glassPanel}`}>
          <p className='text-sm font-black leading-none text-white'>{activityCount}</p>
          <p className='mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>Recent</p>
        </div>
      </div>

      <div className='mb-2 rounded-2xl border border-cyan-100/10 bg-white/[0.035] px-3 py-2'>
        <p className='text-[11px] font-medium leading-relaxed text-cyan-50/72'>
          {topWallet?.name
            ? `${topWallet.name} is currently your strongest wallet.`
            : 'Your wallet system is ready for smarter tracking.'}
        </p>
      </div>
    </>
  );
}
