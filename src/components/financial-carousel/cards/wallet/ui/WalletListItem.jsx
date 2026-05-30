import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  MoreHorizontal,
  Plus,
  Repeat2,
  Trash2,
} from 'lucide-react';
import { fmt } from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';
import { getWalletProviderFromWallet } from '@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry';

const cardStyle =
  'relative rounded-[24px] border border-white/[0.08] bg-black/[0.13] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_10px_26px_rgba(0,0,0,0.16)] backdrop-blur-xl';
const menuButton =
  'relative z-[120] flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-white/[0.055] text-white/78 transition hover:border-white/28 hover:bg-white/[0.10] hover:text-white disabled:opacity-50';
const actionButton =
  'flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-white/94 transition hover:bg-white/[0.10] disabled:opacity-50';

function toWalletNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const number = typeof value === 'number' ? value : Number(String(value).replace(/[₱,\s]/g, ''));
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function stopWalletGesture(event) {
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

function stopWalletAction(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

function WalletProviderIcon({ provider }) {
  return (
    <div
      className='flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border border-white/12 text-[11px] font-black tracking-[-0.04em] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_rgba(0,0,0,0.16)]'
      style={{
        background: provider.iconBg,
        color: provider.iconTextColor,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 20px rgba(0,0,0,0.16), 0 0 22px ${provider.accent}30`,
      }}
      aria-hidden='true'
    >
      {provider.iconText}
    </div>
  );
}

function ProtectedLayer({ title, amount, tone = 'emerald' }) {
  const dotClass = tone === 'cyan'
    ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.75)]'
    : 'bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.75)]';
  const textClass = tone === 'cyan' ? 'text-cyan-100/82' : 'text-emerald-100/78';
  const amountClass = tone === 'cyan' ? 'text-cyan-100' : 'text-emerald-100';

  return (
    <div className='rounded-2xl border border-white/[0.055] bg-black/[0.10] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]'>
      <div className='flex items-center gap-2'>
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${textClass}`}>
          {title}
        </span>
      </div>
      <p className='mt-2 text-[11px] font-bold text-white/58'>
        Protected: <span className={amountClass}>{fmt(amount)}</span>
      </p>
    </div>
  );
}

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
  const [showMenu, setShowMenu] = useState(false);
  const walletId = wallet?.id ?? wallet?.wallet_id ?? wallet?.local_id;
  const provider = getWalletProviderFromWallet(wallet);
  const walletBalance = toWalletNumber(
    wallet?.balance,
    wallet?.derived_balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.starting_balance
  );
  const emergencyProtectedAmount = toWalletNumber(
    wallet?.emergencyProtectedAmount,
    wallet?.emergency_protected_amount,
    wallet?.protectedEmergencyAmount,
    wallet?.protected_emergency_amount
  );
  const savingsProtectedAmount = toWalletNumber(
    wallet?.savingsProtectedAmount,
    wallet?.savings_protected_amount,
    wallet?.protectedSavingsAmount,
    wallet?.protected_savings_amount
  );
  const totalProtectedAmount = toWalletNumber(
    wallet?.totalProtectedAmount,
    wallet?.total_protected_amount,
    emergencyProtectedAmount + savingsProtectedAmount
  );
  const hasEmergencyAllocation = emergencyProtectedAmount > 0;
  const hasSavingsAllocation = savingsProtectedAmount > 0;
  const hasProtectedAllocation = totalProtectedAmount > 0;
  const spendableBalance = hasProtectedAllocation
    ? toWalletNumber(
        wallet?.spendableBalance,
        wallet?.spendable_balance,
        wallet?.walletSpendableBalance,
        wallet?.wallet_spendable_balance,
        Math.max(walletBalance - totalProtectedAmount, 0)
      )
    : walletBalance;

  const handleAction = (event, action) => {
    stopWalletAction(event);
    setShowMenu(false);
    if (financeActionLoading) return;
    action?.();
  };

  return (
    <div
      key={walletId || wallet?.name || `wallet-${index}`}
      className={`${cardStyle} ${showMenu ? 'z-[90]' : 'z-0'}`}
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.045), 0 10px 26px rgba(0,0,0,0.16), 0 0 18px ${provider.accent}14` }}
    >
      <div className='pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_36%,rgba(0,0,0,0.10)_100%)]' />
      <div
        className='pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full opacity-70'
        style={{ background: provider.accent, boxShadow: `0 0 16px ${provider.accent}` }}
      />

      <div className='relative flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <WalletProviderIcon provider={provider} />
          <div className='min-w-0'>
            <p className='truncate text-[14px] font-black tracking-[-0.02em] text-white/90'>
              {wallet.name || provider.defaultWalletName || provider.label || 'Wallet'}
            </p>
            <p className='mt-1 text-[12px] font-bold leading-none text-white/58'>
              Balance:{' '}
              <span className='text-[14px] font-black tracking-[-0.025em] text-emerald-200'>
                {fmt(walletBalance)}
              </span>
            </p>

            {hasProtectedAllocation ? (
              <div className='mt-2 space-y-2 rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.055] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]'>
                {hasEmergencyAllocation ? (
                  <ProtectedLayer title='Includes Emergency Fund' amount={emergencyProtectedAmount} />
                ) : null}
                {hasSavingsAllocation ? (
                  <ProtectedLayer title='Includes Savings Goals' amount={savingsProtectedAmount} tone='cyan' />
                ) : null}
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-2 text-[11px] font-bold text-white/58'>
                  <span>
                    Total Protected:{' '}
                    <span className='text-emerald-100'>{fmt(totalProtectedAmount)}</span>
                  </span>
                  <span>
                    Spendable:{' '}
                    <span className='text-cyan-100'>{fmt(spendableBalance)}</span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className='relative shrink-0'>
          <button
            type='button'
            disabled={financeActionLoading}
            onPointerDownCapture={stopWalletGesture}
            onMouseDownCapture={stopWalletGesture}
            onTouchStartCapture={stopWalletGesture}
            onClick={(event) => {
              stopWalletAction(event);
              setShowMenu((prev) => !prev);
            }}
            className={menuButton}
            aria-expanded={showMenu}
            aria-label='Wallet options'
          >
            <MoreHorizontal className='h-4.5 w-4.5' />
          </button>

          {showMenu ? (
            <div
              className='absolute right-0 top-10 z-[140] w-48 rounded-[22px] border border-white/[0.18] bg-[rgba(12,18,45,0.96)] p-1.5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl ring-1 ring-white/[0.06]'
              onPointerDownCapture={stopWalletGesture}
              onMouseDownCapture={stopWalletGesture}
              onTouchStartCapture={stopWalletGesture}
            >
              <button type='button' onClick={(event) => handleAction(event, () => openEditWallet?.(wallet))} className={actionButton}>
                <Edit3 className='h-3.5 w-3.5 text-cyan-200' />
                Edit / Rename
              </button>
              <button type='button' onClick={(event) => handleAction(event, () => onAddMoney?.(wallet))} className={actionButton}>
                <Plus className='h-3.5 w-3.5 text-emerald-200' />
                Add Money
              </button>
              <button type='button' onClick={(event) => handleAction(event, () => onTransferMoney?.(wallet))} className={actionButton}>
                <Repeat2 className='h-3.5 w-3.5 text-sky-200' />
                Transfer
              </button>
              <div className='my-1 h-px bg-white/12' />
              <button type='button' disabled={!walletId} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, -1))} className={actionButton}>
                <ArrowUp className='h-3.5 w-3.5 text-amber-200' />
                Move Up
              </button>
              <button type='button' disabled={!walletId} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, 1))} className={actionButton}>
                <ArrowDown className='h-3.5 w-3.5 text-amber-200' />
                Move Down
              </button>
              <div className='my-1 h-px bg-white/12' />
              <button type='button' disabled={!walletId} onClick={(event) => handleAction(event, () => onDeleteWallet?.(walletId))} className='flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-rose-100 transition hover:bg-rose-500/14 disabled:opacity-50'>
                <Trash2 className='h-3.5 w-3.5 text-rose-200' />
                Delete Wallet
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
