import { WalletCards } from 'lucide-react';

export default function WalletEmptyState() {
  return (
    <div className='rounded-2xl border border-dashed border-cyan-200/20 bg-white/[0.045] p-4 text-center'>
      <WalletCards className='mx-auto h-8 w-8 text-cyan-100/35' />
      <p className='mt-3 text-sm font-semibold text-white'>No wallets yet</p>
      <p className='mt-2 text-sm leading-6 text-white/58'>Create your first wallet so your money is organized and easier to track.</p>
    </div>
  );
}
