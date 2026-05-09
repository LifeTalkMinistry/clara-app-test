import { WalletCards } from 'lucide-react';

export default function WalletHeader({ walletCount = 0 }) {
  return (
    <div className='flex min-h-[clamp(4.2rem,13svh,6.2rem)] items-center gap-[clamp(0.7rem,2.8vw,0.95rem)]'>
      <div className='flex h-[clamp(2.7rem,10.5vw,3.15rem)] w-[clamp(2.7rem,10.5vw,3.15rem)] shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.07] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_22px_rgba(0,255,220,0.12)] backdrop-blur-sm'>
        <WalletCards className='h-[clamp(1.05rem,4vw,1.2rem)] w-[clamp(1.05rem,4vw,1.2rem)]' />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1 pr-2'>
            <p className='text-[clamp(1.02rem,3.8vw,1.18rem)] font-semibold leading-tight tracking-tight text-white'>
              Wallets
            </p>

            <p className='mt-[clamp(0.18rem,0.65svh,0.38rem)] max-w-[14rem] text-[clamp(0.72rem,2.45vw,0.84rem)] font-medium leading-[1.45] text-white/78'>
              Track your available money across accounts
            </p>
          </div>

          <span className='shrink-0 rounded-full border border-cyan-200/15 bg-white/[0.07] px-[clamp(0.62rem,2.4vw,0.82rem)] py-[clamp(0.28rem,0.95svh,0.42rem)] text-[clamp(0.7rem,2.15vw,0.8rem)] font-semibold text-white/80 backdrop-blur-sm'>
            {walletCount} {walletCount === 1 ? 'Wallet' : 'Wallets'}
          </span>
        </div>
      </div>
    </div>
  );
}
