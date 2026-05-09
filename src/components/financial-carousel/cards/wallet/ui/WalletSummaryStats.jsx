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
    <div className='grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]'>
      <div className='flex min-h-0 flex-col justify-center pb-[clamp(0.75rem,2.2svh,1.6rem)]'>
        <p
          className={`text-[clamp(2.45rem,10vw,3.2rem)] font-black leading-none tracking-[-0.05em] ${status.text}`}
        >
          {fmt(walletMoney)}
        </p>

        <p className='mt-[clamp(0.45rem,1.15svh,0.8rem)] line-clamp-2 min-h-[18px] max-w-[28rem] text-[clamp(0.75rem,2.35vw,0.9rem)] font-semibold leading-relaxed text-white/84'>
          {message}
        </p>
      </div>

      <div className='grid grid-cols-3 gap-[clamp(0.5rem,1.8vw,0.7rem)]'>
        <div
          className={`rounded-2xl px-[clamp(0.6rem,2vw,0.8rem)] py-[clamp(0.65rem,1.7svh,0.95rem)] text-center ${glassPanel}`}
        >
          <p className='text-[clamp(0.95rem,3vw,1.08rem)] font-black leading-none text-white'>
            {walletCount}
          </p>
          <p className='mt-[clamp(0.3rem,0.85svh,0.55rem)] text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>
            Wallets
          </p>
        </div>

        <div
          className={`rounded-2xl px-[clamp(0.6rem,2vw,0.8rem)] py-[clamp(0.65rem,1.7svh,0.95rem)] text-center ${glassPanel}`}
        >
          <p className='truncate text-[clamp(0.95rem,3vw,1.08rem)] font-black leading-none text-white'>
            {topWallet?.name || 'None'}
          </p>
          <p className='mt-[clamp(0.3rem,0.85svh,0.55rem)] text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>
            Primary
          </p>
        </div>

        <div
          className={`rounded-2xl px-[clamp(0.6rem,2vw,0.8rem)] py-[clamp(0.65rem,1.7svh,0.95rem)] text-center ${glassPanel}`}
        >
          <p className='text-[clamp(0.95rem,3vw,1.08rem)] font-black leading-none text-white'>
            {activityCount}
          </p>
          <p className='mt-[clamp(0.3rem,0.85svh,0.55rem)] text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>
            Recent
          </p>
        </div>
      </div>
    </div>
  );
}
