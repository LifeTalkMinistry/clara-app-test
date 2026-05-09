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
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex-1 min-h-0'>
        <div className='mb-[clamp(0.75rem,2svh,1.25rem)]'>
          <p
            className={`text-[clamp(2.2rem,8vw,2.8rem)] font-black leading-none tracking-[-0.045em] ${status.text}`}
          >
            {fmt(walletMoney)}
          </p>

          <p className='mt-[clamp(0.45rem,1svh,0.7rem)] line-clamp-2 min-h-[18px] max-w-[28rem] text-[clamp(0.72rem,2.2vw,0.82rem)] font-semibold leading-relaxed text-white/84'>
            {message}
          </p>
        </div>
      </div>

      <div className='mt-auto grid grid-cols-3 gap-[clamp(0.45rem,1.6vw,0.65rem)]'>
        <div
          className={`rounded-2xl px-[clamp(0.55rem,2vw,0.75rem)] py-[clamp(0.6rem,1.5svh,0.85rem)] text-center ${glassPanel}`}
        >
          <p className='text-[clamp(0.9rem,3vw,1rem)] font-black leading-none text-white'>
            {walletCount}
          </p>
          <p className='mt-[clamp(0.3rem,0.8svh,0.5rem)] text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>
            Wallets
          </p>
        </div>

        <div
          className={`rounded-2xl px-[clamp(0.55rem,2vw,0.75rem)] py-[clamp(0.6rem,1.5svh,0.85rem)] text-center ${glassPanel}`}
        >
          <p className='truncate text-[clamp(0.9rem,3vw,1rem)] font-black leading-none text-white'>
            {topWallet?.name || 'None'}
          </p>
          <p className='mt-[clamp(0.3rem,0.8svh,0.5rem)] text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>
            Primary
          </p>
        </div>

        <div
          className={`rounded-2xl px-[clamp(0.55rem,2vw,0.75rem)] py-[clamp(0.6rem,1.5svh,0.85rem)] text-center ${glassPanel}`}
        >
          <p className='text-[clamp(0.9rem,3vw,1rem)] font-black leading-none text-white'>
            {activityCount}
          </p>
          <p className='mt-[clamp(0.3rem,0.8svh,0.5rem)] text-[9px] font-bold uppercase tracking-[0.16em] text-white/45'>
            Recent
          </p>
        </div>
      </div>
    </div>
  );
}
