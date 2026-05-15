import { WalletCards } from 'lucide-react';

export default function WalletHeader({ walletCount = 0 }) {
  return (
    <div className='mb-3 flex items-start gap-3'>
      <div className='relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-100/[0.16] bg-[linear-gradient(145deg,rgba(255,255,255,0.088),rgba(34,211,238,0.052)_42%,rgba(0,0,0,0.045))] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(34,211,238,0.055),0_0_18px_rgba(34,211,238,0.105),0_8px_18px_rgba(0,0,0,0.16)] backdrop-blur-sm'>
        <div className='pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/30 to-transparent' />
        <div className='pointer-events-none absolute -left-3 -top-3 h-8 w-8 rounded-full bg-cyan-200/[0.10] blur-xl' />
        <WalletCards className='relative h-4 w-4 drop-shadow-[0_0_8px_rgba(165,243,252,0.18)]' />
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='text-base font-semibold tracking-tight text-white'>Wallets</p>
            <p className='mt-0.5 text-[11px] font-medium text-white/76'>
              Available across accounts
            </p>
          </div>

          <span className='relative shrink-0 overflow-hidden rounded-full border border-cyan-100/[0.14] bg-[linear-gradient(145deg,rgba(255,255,255,0.082),rgba(34,211,238,0.046)_48%,rgba(15,23,42,0.08))] px-2.5 py-1 text-[10px] font-semibold text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(34,211,238,0.045),0_0_14px_rgba(34,211,238,0.07),0_8px_18px_rgba(0,0,0,0.13)] backdrop-blur-sm'>
            <span className='pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/24 to-transparent' />
            <span className='relative'>
              {walletCount} {walletCount === 1 ? 'Wallet' : 'Wallets'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
