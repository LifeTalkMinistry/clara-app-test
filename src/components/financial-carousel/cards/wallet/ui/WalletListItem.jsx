import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  MoreHorizontal,
  Plus,
  Repeat2,
  Trash2,
} from 'lucide-react';
import {
  fmt,
  getWalletBalanceTone,
} from '@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic';
import { getWalletProviderFromWallet } from '@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry';

const cardStyle =
  'relative rounded-[20px] border px-3 py-3.5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-px';
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

function WalletProviderIcon({ provider, tone }) {
  return (
    <div
      className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-[11px] font-black tracking-[-0.04em]'
      style={{
        background: provider.iconBg,
        color: provider.iconTextColor,
        borderColor: `rgb(${tone.rgb} / 0.22)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 18px rgba(0,0,0,0.16), 0 0 16px ${provider.accent}20`,
      }}
      aria-hidden='true'
    >
      {provider.iconText}
    </div>
  );
}

function ProtectedRow({ title, amount, cyan = false }) {
  const dot = cyan
    ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.70)]'
    : 'bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.70)]';
  const label = cyan ? 'text-cyan-100/76' : 'text-emerald-100/76';
  const value = cyan ? 'text-cyan-100' : 'text-emerald-100';

  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='flex min-w-0 items-center gap-2'>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className={`truncate text-[10px] font-black uppercase tracking-[0.12em] ${label}`}>
          {title}
        </span>
      </div>
      <span className={`shrink-0 text-[11px] font-black ${value}`}>{fmt(amount)}</span>
    </div>
  );
}

export default function WalletListItem({
  wallet,
  index,
  walletCount = 0,
  financeActionLoading = false,
  openEditWallet,
  onAddMoney,
  onTransferMoney,
  onMoveWallet,
  onDeleteWallet,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const walletId = wallet?.id ?? wallet?.wallet_id ?? wallet?.local_id;
  const provider = getWalletProviderFromWallet(wallet);
  const walletBalance = toWalletNumber(
    wallet?.walletBalance,
    wallet?.balance,
    wallet?.derived_balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.starting_balance
  );
  const walletTone = getWalletBalanceTone({
    balance: walletBalance,
    balanceShare: wallet?.balanceShare ?? wallet?.balance_share,
    totalWalletBalance: wallet?.totalWalletBalance ?? wallet?.total_wallet_balance,
  });
  const isNegative = walletBalance < 0;
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
  const requiresBalanceTransferBeforeDelete =
    walletBalance > 0.000001 && !hasProtectedAllocation;

  const updateMenuPosition = () => {
    if (typeof window === 'undefined') return;

    const trigger = menuButtonRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth || 192;
    const menuHeight = menuRef.current?.offsetHeight || 284;
    const viewportPadding = 12;
    const gap = 8;
    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, triggerRect.right - menuWidth)
    );
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const top = spaceBelow >= menuHeight
      ? triggerRect.bottom + gap
      : Math.max(viewportPadding, triggerRect.top - menuHeight - gap);

    setMenuPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!showMenu) return;
    updateMenuPosition();
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu || typeof window === 'undefined') return undefined;

    const handleViewportChange = () => updateMenuPosition();
    const handleOutsidePointer = (event) => {
      if (menuButtonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) {
        return;
      }
      setShowMenu(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowMenu(false);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu]);

  const handleAction = (event, action) => {
    stopWalletAction(event);
    setShowMenu(false);
    if (!financeActionLoading) action?.();
  };

  const actionMenu = showMenu && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          className='fixed z-[9999] max-h-[calc(100vh-24px)] w-48 overflow-y-auto rounded-[22px] border border-white/[0.18] bg-[rgba(12,18,45,0.98)] p-1.5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-1 ring-white/[0.06]'
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onPointerDownCapture={stopWalletGesture}
          onMouseDownCapture={stopWalletGesture}
          onTouchStartCapture={stopWalletGesture}
          role='menu'
          aria-label='Wallet actions'
        >
          <button type='button' onClick={(event) => handleAction(event, () => openEditWallet?.(wallet))} className={actionButton} role='menuitem'>
            <Edit3 className='h-3.5 w-3.5 text-cyan-200' /> Edit / Rename
          </button>
          <button type='button' onClick={(event) => handleAction(event, () => onAddMoney?.(wallet))} className={actionButton} role='menuitem'>
            <Plus className='h-3.5 w-3.5 text-emerald-200' /> Add Money
          </button>
          <button type='button' onClick={(event) => handleAction(event, () => onTransferMoney?.(wallet))} className={actionButton} role='menuitem'>
            <Repeat2 className='h-3.5 w-3.5 text-sky-200' /> Transfer
          </button>
          <div className='my-1 h-px bg-white/12' />
          <button type='button' disabled={!walletId || index <= 0} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, -1))} className={actionButton} role='menuitem'>
            <ArrowUp className='h-3.5 w-3.5 text-amber-200' /> Move Up
          </button>
          <button type='button' disabled={!walletId || index >= walletCount - 1} onClick={(event) => handleAction(event, () => onMoveWallet?.(walletId, 1))} className={actionButton} role='menuitem'>
            <ArrowDown className='h-3.5 w-3.5 text-amber-200' /> Move Down
          </button>
          <div className='my-1 h-px bg-white/12' />
          <button
            type='button'
            disabled={!walletId}
            onClick={(event) =>
              handleAction(
                event,
                () =>
                  requiresBalanceTransferBeforeDelete
                    ? onTransferMoney?.(wallet)
                    : onDeleteWallet?.(wallet)
              )
            }
            className={
              requiresBalanceTransferBeforeDelete
                ? 'flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-sky-100 transition hover:bg-sky-500/14 disabled:opacity-50'
                : 'flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-rose-100 transition hover:bg-rose-500/14 disabled:opacity-50'
            }
            role='menuitem'
          >
            {requiresBalanceTransferBeforeDelete ? (
              <>
                <Repeat2 className='h-3.5 w-3.5 text-sky-200' /> Transfer Before Delete
              </>
            ) : (
              <>
                <Trash2 className='h-3.5 w-3.5 text-rose-200' /> Delete Wallet
              </>
            )}
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <article
      key={walletId || wallet?.name || `wallet-${index}`}
      className={`${cardStyle} ${showMenu ? 'z-[90]' : 'z-0'}`}
      style={{
        borderColor: `rgb(${walletTone.rgb} / 0.22)`,
        background: `radial-gradient(circle at 10% 0%, rgb(${walletTone.rgb} / 0.11), transparent 38%), linear-gradient(145deg, rgba(8,20,38,0.97), rgba(8,13,31,0.985))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 26px rgba(0,0,0,0.22), 0 0 22px rgb(${walletTone.rgb} / 0.05)`,
      }}
    >
      <div className='pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]'>
        <div
          className='absolute inset-x-5 top-0 h-px'
          style={{ background: `linear-gradient(90deg, transparent, rgb(${walletTone.rgb} / 0.40), transparent)` }}
        />
        <div
          className='absolute -right-10 -top-12 h-24 w-24 rounded-full blur-3xl'
          style={{ backgroundColor: `rgb(${walletTone.rgb} / 0.08)` }}
        />
      </div>
      <div
        className='pointer-events-none absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full'
        style={{
          backgroundColor: `rgb(${walletTone.rgb})`,
          boxShadow: `0 0 14px rgb(${walletTone.rgb} / 0.30)`,
        }}
      />

      <div className='relative grid grid-cols-[48px_minmax(0,1fr)_32px] items-start gap-3'>
        <WalletProviderIcon provider={provider} tone={walletTone} />

        <div className='min-w-0 pt-0.5'>
          <p className='truncate text-[14px] font-black tracking-[-0.02em] text-white/92'>
            {wallet.name || provider.defaultWalletName || provider.label || 'Wallet'}
          </p>
          <p
            className='mt-1.5 truncate text-[20px] font-black leading-none tracking-[-0.04em]'
            style={{ color: isNegative ? 'rgb(251 113 133)' : `rgb(${walletTone.rgb})` }}
          >
            {fmt(walletBalance)}
          </p>
          <p className={`mt-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${isNegative ? 'text-rose-200/82' : 'text-white/38'}`}>
            {isNegative ? 'Negative balance' : 'Current balance'}
          </p>
        </div>

        <div className='relative shrink-0'>
          <button
            ref={menuButtonRef}
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
            aria-haspopup='menu'
            aria-label='Wallet options'
          >
            <MoreHorizontal className='h-4.5 w-4.5' />
          </button>
        </div>
      </div>

      {actionMenu}

      {hasProtectedAllocation ? (
        <div className='relative mt-3 space-y-2.5 rounded-2xl border border-white/[0.055] bg-black/[0.18] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'>
          {emergencyProtectedAmount > 0 ? (
            <ProtectedRow title='Emergency Fund protected' amount={emergencyProtectedAmount} />
          ) : null}
          {savingsProtectedAmount > 0 ? (
            <ProtectedRow title='Savings Goals protected' amount={savingsProtectedAmount} cyan />
          ) : null}
          <div className='flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2.5'>
            <span className='text-[10px] font-black uppercase tracking-[0.14em] text-white/42'>Spendable</span>
            <span className='text-[12px] font-black text-cyan-100'>{fmt(spendableBalance)}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
