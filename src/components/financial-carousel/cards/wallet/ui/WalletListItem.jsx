import { Edit3 } from 'lucide-react';
import { fmt } from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';
import WalletActionButtons from '@/components/financial-carousel/cards/wallet/ui/WalletActionButtons';

const glassPanel = 'border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm';
const softButton = 'rounded-xl border border-cyan-100/15 bg-white/[0.055] text-white/85 transition hover:border-cyan-100/25 hover:bg-white/10 hover:text-white disabled:opacity-50';

export default function WalletListItem({
  wallet,
  index,
  financeActionLoading = false,
  openEditWallet,
  onAddMoney,
  onTransferMoney,
  onMoveWallet,
  onDeleteWallet,
}) {
  return (
    <div key={wallet.id || `${wallet.name}-${index}`} className={`rounded-2xl p-3 ${glassPanel}`}>
      <div className='flex items-center justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold text-white'>{wallet.name || 'Wallet'}</p>
          <p className='mt-1 text-xs uppercase tracking-[0.16em] text-white/45'>{wallet.type || 'wallet'}</p>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <p className='text-sm font-bold text-white'>{fmt(wallet.balance || 0)}</p>
          <button
            type='button'
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openEditWallet(wallet);
            }}
            disabled={financeActionLoading}
            className={`${softButton} flex h-8 w-8 items-center justify-center`}
            aria-label='Edit wallet'
          >
            <Edit3 className='h-3.5 w-3.5' />
          </button>
        </div>
      </div>

      <WalletActionButtons
        wallet={wallet}
        financeActionLoading={financeActionLoading}
        onAddMoney={onAddMoney}
        onTransferMoney={onTransferMoney}
        onMoveWallet={onMoveWallet}
        onDeleteWallet={onDeleteWallet}
      />
    </div>
  );
}
