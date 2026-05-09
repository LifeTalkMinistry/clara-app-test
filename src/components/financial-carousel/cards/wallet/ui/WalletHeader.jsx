import { WalletCards } from 'lucide-react';

export default function WalletHeader({ walletCount = 0 }) {
  return (
    <div className='mb-3 flex items-start gap-3'>
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm'>
        <WalletCards className='h-4 w-4' />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='text-base font-semibold tracking-tight text-white'>Wallets</p>
            <p className='mt-0.5 text-[11px] font-medium text-white/76'>
              Available across accounts
            </p>
          </div>

          <span className='shrink-0 rounded-full border border-cyan-200/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm'>
            {walletCount} {walletCount === 1 ? 'Wallet' : 'Wallets'}
          </span>
        </div>
      </div>
    </div>
  );
}
