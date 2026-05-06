import { Plus } from 'lucide-react';

export default function WalletCreateButton({ onCreateWallet }) {
  return (
    <div className='grid grid-cols-1 gap-2'>
      <button
        type='button'
        onClick={onCreateWallet}
        className='flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(0,255,220,0.10)] transition hover:bg-cyan-300/15'
      >
        <Plus className='h-4 w-4' />
        Create Wallet
      </button>
    </div>
  );
}
