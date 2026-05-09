import { WalletCards } from 'lucide-react';

export default function WalletHeader({ walletCount = 0 }) {
  return (
    <div className='flex items-start gap-[clamp(0.65rem,2.6vw,0.85rem)]'>
      <div className='flex h-[clamp(2.5rem,9.5vw,2.85rem)] w-[clamp(2.5rem,9.5vw,2.85rem)] shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.07] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_22px_rgba(0,255,220,0.12)] backdrop-blur-sm'>
        <WalletCards className='h-[clamp(1rem,3.8vw,1.15rem)] w-[clamp(1rem,3.8vw,1.15rem)]' />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1 pr-2'>
            <p className='text-[clamp(1rem,3.5vw,1.1rem)] font-semibold leading-tight tracking-tight text-white'>
              Wallets
            </p>

            <p className='mt-[clamp(0.14rem,0.45svh,0.25rem)] max-w-[14rem] text-[clamp(0.7rem,2.35vw,0.8rem)] font-medium leading-snug text-white/78'>
              Track your available money across accounts
            </p>
          </div>

          <span className='shrink-0 rounded-full border border-cyan-200/15 bg-white/[0.07] px-[clamp(0.6rem,2.3vw,0.78rem)] py-[clamp(0.25rem,0.75svh,0.35rem)] text-[clamp(0.68rem,2.1vw,0.76rem)] font-semibold text-white/80 backdrop-blur-sm'>
            {walletCount} {walletCount === 1 ? 'Wallet' : 'Wallets'}
          </span>
        </div>
      </div>
    </div>
  );
}
