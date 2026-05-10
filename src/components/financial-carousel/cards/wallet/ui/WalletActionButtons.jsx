import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const softButton = 'relative z-[120] pointer-events-auto rounded-xl border border-cyan-100/15 bg-white/[0.055] text-white/85 transition hover:border-cyan-100/25 hover:bg-white/10 hover:text-white disabled:opacity-50';

function stopWalletActionEvent(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

export default function WalletActionButtons({
  wallet,
  financeActionLoading = false,
  onAddMoney,
  onTransferMoney,
  onMoveWallet,
  onDeleteWallet,
}) {
  const walletId = wallet?.id ?? wallet?.wallet_id ?? wallet?.local_id;

  const handleAction = (event, action) => {
    stopWalletActionEvent(event);

    if (financeActionLoading) return;

    requestAnimationFrame(() => {
      action?.();
    });
  };

  return (
    <div
      className='relative z-[120] mt-3 flex flex-wrap gap-2 pointer-events-auto'
      onPointerDownCapture={stopWalletActionEvent}
      onMouseDownCapture={stopWalletActionEvent}
      onTouchStartCapture={stopWalletActionEvent}
    >
      <button
        type='button'
        onClick={(event) => handleAction(event, () => onAddMoney?.(wallet))}
        disabled={financeActionLoading}
        className={`${softButton} px-3 py-2 text-xs font-semibold`}
      >
        Add
      </button>

      <button
        type='button'
        onClick={(event) => handleAction(event, () => onTransferMoney?.(wallet))}
        disabled={financeActionLoading}
        className={`${softButton} px-3 py-2 text-xs font-semibold`}
      >
        Transfer
      </button>

      <button
        type='button'
        onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, -1))}
        disabled={financeActionLoading || !walletId}
        className={`${softButton} p-2`}
        aria-label='Move wallet up'
      >
        <ArrowUp className='h-4 w-4' />
      </button>

      <button
        type='button'
        onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, 1))}
        disabled={financeActionLoading || !walletId}
        className={`${softButton} p-2`}
        aria-label='Move wallet down'
      >
        <ArrowDown className='h-4 w-4' />
      </button>

      <button
        type='button'
        onClick={(event) => handleAction(event, () => onDeleteWallet?.(walletId))}
        disabled={financeActionLoading || !walletId}
        className='relative z-[120] pointer-events-auto rounded-xl border border-rose-300/20 bg-rose-500/10 p-2 text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50'
        aria-label='Delete wallet'
      >
        <Trash2 className='h-4 w-4' />
      </button>
    </div>
  );
}
