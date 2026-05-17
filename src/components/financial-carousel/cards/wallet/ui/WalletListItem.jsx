import { useState } from 'react';
import { Edit3, MoreHorizontal, ArrowUpDown, Trash2, Wallet } from 'lucide-react';
import { fmt } from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';

const cardStyle =
  'relative overflow-hidden rounded-[28px] border border-[#d9d39f]/45 bg-[#4b493f]/92 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl';

const menuButton =
  'flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d39f]/18 bg-white/[0.04] text-[#ece6b2] transition hover:bg-white/[0.08]';

const actionButton =
  'flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-white/82 transition hover:bg-white/[0.08]';

export default function WalletListItem({
  wallet,
  index,
  financeActionLoading = false,
  openEditWallet,
  onMoveWallet,
  onDeleteWallet,
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      key={wallet.id || `${wallet.name}-${index}`}
      className={cardStyle}
    >
      <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%,rgba(0,0,0,0.08)_100%)]' />

      <div className='relative flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <div className='flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-[22px] border border-[#d9d39f]/40 bg-[#f1eedf] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'>
            <Wallet className='h-10 w-10 text-slate-500' />
          </div>

          <div className='min-w-0'>
            <p className='truncate text-[15px] font-bold tracking-[-0.02em] text-[#f6efb8]'>
              {wallet.name || 'Wallet'}
            </p>

            <div className='mt-1 flex items-center gap-2'>
              <span className='text-[14px] font-bold text-[#f6efb8]'>
                Balance:
              </span>

              <span className='text-[16px] font-black tracking-[-0.03em] text-[#7ce08e]'>
                {fmt(wallet.balance || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className='relative shrink-0'>
          <button
            type='button'
            disabled={financeActionLoading}
            onClick={() => setShowMenu((prev) => !prev)}
            className={menuButton}
            aria-label='Wallet options'
          >
            <MoreHorizontal className='h-5 w-5' />
          </button>

          {showMenu ? (
            <div className='absolute right-0 top-11 z-20 w-52 rounded-[24px] border border-white/10 bg-[#22211d]/96 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl'>
              <button
                type='button'
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowMenu(false);
                  openEditWallet(wallet);
                }}
                className={actionButton}
              >
                <Edit3 className='h-4 w-4 text-cyan-200' />
                Edit / Rename
              </button>

              <button
                type='button'
                onClick={() => {
                  setShowMenu(false);
                  onMoveWallet?.(wallet, 'up');
                }}
                className={actionButton}
              >
                <ArrowUpDown className='h-4 w-4 text-amber-200' />
                Move Priority
              </button>

              <button
                type='button'
                onClick={() => {
                  setShowMenu(false);
                  onDeleteWallet?.(wallet);
                }}
                className='flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10'
              >
                <Trash2 className='h-4 w-4' />
                Delete Wallet
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
