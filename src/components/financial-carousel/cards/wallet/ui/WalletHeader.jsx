import { WalletCards } from 'lucide-react';

export default function WalletHeader({ walletCount = 0 }) {
  return (
    <div className='flex items-start gap-[clamp(0.8rem,3vw,1rem)]'>
      <div className='flex h-[clamp(3rem,11vw,3.45rem)] w-[clamp(3rem,11vw,3.45rem)] shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.07] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_22px_rgba(0,255,220,0.12)] backdrop-blur-sm'>
        <WalletCards className='h-[clamp(1.2rem,4.4vw,1.35rem)] w-[clamp(1.2rem,4.4vw,1.35rem)]' />
      </div>

      <div className='min-w-0 flex-1 pt-0.5'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1 pr-2'>
            <p className='text-[clamp(1.12rem,4vw,1.28rem)] font-semibold leading-tight tracking-tight text-white'>
              Wallets
            </p>

            <p className='mt-[clamp(0.2rem,0.65svh,0.38rem)] max-w-[15rem] text-[clamp(0.78rem,2.65vw,0.92rem)] font-medium leading-[1.42] text-white/78'>
              Track your available money across accounts
            </p>
          </div>

          <span className='shrink-0 rounded-full border border-cyan-200/15 bg-white/[0.07] px-[clamp(0.72rem,2.6vw,0.9rem)] py-[clamp(0.32rem,0.9svh,0.45rem)] text-[clamp(0.75rem,2.25vw,0.84rem)] font-semibold text-white/80 backdrop-blur-sm'>
            {walletCount} {walletCount === 1 ? 'Wallet' : 'Wallets'}
          </span>
        </div>
      </div>
    </div>
  );
}
