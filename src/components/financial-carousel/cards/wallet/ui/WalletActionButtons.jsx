import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const softButton = 'rounded-xl border border-cyan-100/15 bg-white/[0.055] text-white/85 transition hover:border-cyan-100/25 hover:bg-white/10 hover:text-white disabled:opacity-50';

export default function WalletActionButtons({
  wallet,
  financeActionLoading = false,
  onAddMoney,
  onTransferMoney,
  onMoveWallet,
  onDeleteWallet,
}) {
  return (
    <div className='mt-3 flex flex-wrap gap-2'>
      <button
        type='button'
        onClick={() => onAddMoney?.(wallet)}
        disabled={financeActionLoading}
        className={`${softButton} px-3 py-2 text-xs font-semibold`}
      >
        Add
      </button>

      <button
        type='button'
        onClick={() => onTransferMoney?.(wallet)}
        disabled={financeActionLoading}
        className={`${softButton} px-3 py-2 text-xs font-semibold`}
      >
        Transfer
      </button>

      <button
        type='button'
        onClick={() => onMoveWallet?.(wallet.id, -1)}
        disabled={financeActionLoading}
        className={`${softButton} p-2`}
        aria-label='Move wallet up'
      >
        <ArrowUp className='h-4 w-4' />
      </button>

      <button
        type='button'
        onClick={() => onMoveWallet?.(wallet.id, 1)}
        disabled={financeActionLoading}
        className={`${softButton} p-2`}
        aria-label='Move wallet down'
      >
        <ArrowDown className='h-4 w-4' />
      </button>

      <button
        type='button'
        onClick={() => onDeleteWallet?.(wallet.id)}
        disabled={financeActionLoading}
        className='rounded-xl border border-rose-300/20 bg-rose-500/10 p-2 text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50'
        aria-label='Delete wallet'
      >
        <Trash2 className='h-4 w-4' />
      </button>
    </div>
  );
}
