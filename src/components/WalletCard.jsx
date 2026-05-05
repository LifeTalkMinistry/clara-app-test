import { useMemo, useState } from 'react';
import {
  WalletCards,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
} from 'lucide-react';
import useUserRole from '../hooks/useUserRole';
import useFinancialData from '../hooks/useFinancialData';

const walletTypes = ['cash', 'gcash', 'bank', 'maya', 'credit_card', 'other'];

const walletIcons = {
  cash: '💵',
  gcash: '📱',
  bank: '🏦',
  maya: '💜',
  credit_card: '💳',
  other: '💰',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getHistoryTypeLabel = (type) => {
  switch (String(type || '').toLowerCase()) {
    case 'add':
      return 'Added Money';
    case 'income':
      return 'Income';
    case 'transfer_in':
      return 'Transfer In';
    case 'transfer_out':
      return 'Transfer Out';
    case 'expense':
      return 'Expense';
    case 'reset':
      return 'Reset';
    case 'savings_goal':
      return 'Savings Goal';
    default:
      return String(type || 'Transaction')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const getHistoryAmountPrefix = (type) => {
  const normalized = String(type || '').toLowerCase();
  return ['transfer_out', 'expense', 'reset', 'savings_goal'].includes(normalized) ? '-' : '+';
};

const formatHistoryDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

function getWalletStatus(walletCount, walletMoney) {
  if (walletCount === 0) {
    return {
      label: 'Empty',
      text: 'text-white/95',
      badge: 'bg-white/8 text-white/75 border border-white/10',
      ring: 'shadow-[0_0_24px_rgba(52,211,153,0.08)]',
    };
  }

  if (walletMoney > 0) {
    return {
      label: 'Active',
      text: 'text-emerald-200',
      badge: 'bg-emerald-400/15 text-emerald-100 border border-emerald-300/25',
      ring: 'shadow-[0_0_34px_rgba(0,255,220,0.14)]',
    };
  }

  return {
    label: 'Ready',
    text: 'text-cyan-200',
    badge: 'bg-cyan-400/15 text-cyan-100 border border-cyan-300/25',
    ring: 'shadow-[0_0_34px_rgba(34,211,238,0.13)]',
  };
}

function getWalletMessage(topWallet, walletCount) {
  if (!walletCount) return 'Create your first wallet to organize your money.';
  if (topWallet) return `${topWallet.name || 'Top wallet'} currently holds ${fmt(topWallet.balance || 0)}.`;
  return 'Your wallets are ready for tracking and movement.';
}

const glassPanel = 'border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm';
const softButton = 'rounded-xl border border-cyan-100/15 bg-white/[0.055] text-white/85 transition hover:border-cyan-100/25 hover:bg-white/10 hover:text-white disabled:opacity-50';

export default function WalletCard({
  wallets = [],
  walletMoney = 0,
  walletPreviewTransactions = [],
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onCreateWallet,
  onMoveWallet,
  onDeleteWallet,
  onAddMoney,
  onTransferMoney,
  onEditWallet,
}) {
  const { user } = useUserRole();
  const { updateWallet, refreshData } = useFinancialData(user);
  const [editingWallet, setEditingWallet] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: 'cash' });
  const [isSavingWalletEdit, setIsSavingWalletEdit] = useState(false);

  const topWallet = wallets[0] || null;
  const status = getWalletStatus(wallets.length, walletMoney);
  const message = getWalletMessage(topWallet, wallets.length);

  const visibleWallets = useMemo(() => (expanded ? wallets : wallets.slice(0, 2)), [wallets, expanded]);
  const visibleTransactions = useMemo(
    () => (expanded ? walletPreviewTransactions : walletPreviewTransactions.slice(0, 2)),
    [walletPreviewTransactions, expanded]
  );

  const openEditWallet = (wallet) => {
    if (!wallet) return;
    onEditWallet?.(wallet);
    setEditingWallet(wallet);
    setEditForm({
      name: wallet?.name || wallet?.wallet_name || '',
      type: wallet?.type || 'cash',
    });
  };

  const closeEditWallet = () => {
    if (isSavingWalletEdit) return;
    setEditingWallet(null);
    setEditForm({ name: '', type: 'cash' });
  };

  const handleSaveWalletEdit = async () => {
    if (!editingWallet?.id) return;

    const nextName = String(editForm.name || '').trim();
    if (!nextName) {
      alert('Please enter a wallet name.');
      return;
    }

    if (typeof updateWallet !== 'function') {
      alert('Wallet editing is not available yet.');
      return;
    }

    try {
      setIsSavingWalletEdit(true);
      const nextType = editForm.type || editingWallet?.type || 'other';

      await updateWallet(editingWallet.id, {
        name: nextName,
        wallet_name: nextName,
        type: nextType,
        icon: walletIcons[nextType] || editingWallet?.icon || '💰',
        updated_at: new Date().toISOString(),
      });

      await refreshData?.();
      closeEditWallet();
    } catch (error) {
      alert(error?.message || 'Failed to update wallet.');
    } finally {
      setIsSavingWalletEdit(false);
    }
  };

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-[30px] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(6,48,66,0.96),rgba(7,20,48,0.94)_48%,rgba(37,13,74,0.94))] shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_42px_rgba(0,255,220,0.10),0_0_62px_rgba(126,34,206,0.12)] backdrop-blur-2xl transition-all duration-200 ${status.ring}`}
    >
      <div className='pointer-events-none absolute -left-28 -top-32 h-72 w-72 rounded-full bg-cyan-300/25 blur-[86px]' />
      <div className='pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-purple-500/25 blur-[92px]' />
      <div className='pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/12 blur-[84px]' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,220,0.30),transparent_34%),radial-gradient(circle_at_top_right,rgba(126,34,206,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.04)_100%)]' />
      <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-black/12 via-black/8 to-black/26' />
      <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_35%,transparent_100%)]' />
      <div className='pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10' />

      <div className='relative z-10 flex h-full min-h-0 flex-col p-4'>
        <div className='flex min-h-0 flex-1 flex-col justify-between'>
          <div>
            <div className='mb-3 flex items-start gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.07] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_22px_rgba(0,255,220,0.12)] backdrop-blur-sm'>
                <WalletCards className='h-4 w-4' />
              </div>

              <div className='min-w-0 flex-1'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='text-base font-semibold tracking-tight text-white'>Wallets</p>
                    <p className='mt-0.5 text-[11px] font-medium text-white/78'>Track your available money across accounts</p>
                  </div>

                  <span className='shrink-0 rounded-full border border-cyan-200/15 bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm'>
                    {wallets.length} {wallets.length === 1 ? 'Wallet' : 'Wallets'}
                  </span>
                </div>
              </div>
            </div>

            <div className='mb-3'>
              <p className={`text-[32px] font-bold leading-none ${status.text}`}>{fmt(walletMoney)}</p>
              <p className='mt-2 line-clamp-1 min-h-[20px] max-w-[28rem] text-xs font-medium leading-relaxed text-white/82'>{message}</p>
              <p className='mt-1 text-[11px] text-white/56'>Total money spread across your wallet system.</p>
            </div>

            <div className='mb-3 grid grid-cols-3 gap-2'>
              <div className={`rounded-2xl px-2.5 py-2 text-center ${glassPanel}`}>
                <p className='mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50'>Wallets</p>
                <p className='text-xs font-bold text-white'>{wallets.length}</p>
              </div>

              <div className={`rounded-2xl px-2.5 py-2 text-center ${glassPanel}`}>
                <p className='mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50'>Top Wallet</p>
                <p className='truncate text-xs font-bold text-white'>{topWallet?.name || 'None'}</p>
              </div>

              <div className={`rounded-2xl px-2.5 py-2 text-center ${glassPanel}`}>
                <p className='mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50'>Activity</p>
                <p className='text-xs font-bold text-white'>{walletPreviewTransactions.length}</p>
              </div>
            </div>
          </div>

          <button
            type='button'
            onClick={onToggleDetails}
            className='flex w-full items-center justify-between rounded-2xl border border-cyan-200/15 bg-white/[0.055] px-3 py-2.5 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/25 hover:bg-white/10'
          >
            <span className='font-medium'>{expanded ? 'Hide details' : 'Show details'}</span>
            {expanded ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
          </button>
        </div>

        {expanded && (
          <div className='mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-cyan-200/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(0,255,220,0.04)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {wallets.length ? (
              <div className='space-y-2'>
                {visibleWallets.map((wallet, index) => (
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

                    <div className='mt-3 flex flex-wrap gap-2'>
                      <button type='button' onClick={() => onAddMoney?.(wallet)} disabled={financeActionLoading} className={`${softButton} px-3 py-2 text-xs font-semibold`}>Add</button>
                      <button type='button' onClick={() => onTransferMoney?.(wallet)} disabled={financeActionLoading} className={`${softButton} px-3 py-2 text-xs font-semibold`}>Transfer</button>
                      <button type='button' onClick={() => onMoveWallet?.(wallet.id, -1)} disabled={financeActionLoading} className={`${softButton} p-2`} aria-label='Move wallet up'><ArrowUp className='h-4 w-4' /></button>
                      <button type='button' onClick={() => onMoveWallet?.(wallet.id, 1)} disabled={financeActionLoading} className={`${softButton} p-2`} aria-label='Move wallet down'><ArrowDown className='h-4 w-4' /></button>
                      <button type='button' onClick={() => onDeleteWallet?.(wallet.id)} disabled={financeActionLoading} className='rounded-xl border border-rose-300/20 bg-rose-500/10 p-2 text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50' aria-label='Delete wallet'><Trash2 className='h-4 w-4' /></button>
                    </div>
                  </div>
                ))}

                {!!visibleTransactions.length && (
                  <div className={`rounded-2xl p-3 ${glassPanel}`}>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/70'>Recent activity</p>
                    <div className='mt-3 space-y-2'>
                      {visibleTransactions.map((item, index) => (
                        <div key={item.id || `${item.type}-${index}`} className='flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2'>
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium text-white'>{getHistoryTypeLabel(item.type)}</p>
                            <p className='mt-1 text-xs text-white/45'>{formatHistoryDate(item.transaction_date || item.date || item.created_at)}</p>
                          </div>
                          <p className='shrink-0 text-sm font-bold text-white'>{getHistoryAmountPrefix(item.type)}{fmt(item.amount || 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className='rounded-2xl border border-dashed border-cyan-200/20 bg-white/[0.045] p-4 text-center'>
                <WalletCards className='mx-auto h-8 w-8 text-cyan-100/35' />
                <p className='mt-3 text-sm font-semibold text-white'>No wallets yet</p>
                <p className='mt-2 text-sm leading-6 text-white/58'>Create your first wallet so your money is organized and easier to track.</p>
              </div>
            )}

            <div className='grid grid-cols-1 gap-2'>
              <button type='button' onClick={onCreateWallet} className='flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(0,255,220,0.10)] transition hover:bg-cyan-300/15'>
                <Plus className='h-4 w-4' />
                Create Wallet
              </button>
            </div>
          </div>
        )}
      </div>

      {editingWallet && (
        <div className='fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 px-4 py-5 backdrop-blur-sm sm:items-center'>
          <div className='w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(6,48,66,0.98),rgba(7,20,48,0.96)_48%,rgba(37,13,74,0.96))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(0,255,220,0.14)]'>
            <div className='relative border-b border-white/10 px-5 py-5'>
              <button type='button' onClick={closeEditWallet} disabled={isSavingWalletEdit} className='absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-50' aria-label='Close edit wallet'>
                <X className='h-4 w-4' />
              </button>

              <div className='pr-12'>
                <div className='mb-3 inline-flex items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/85'>Wallet setup</div>
                <h3 className='text-xl font-bold tracking-tight text-white'>Edit wallet</h3>
                <p className='mt-2 text-sm leading-6 text-white/65'>Update the name and type of this money container.</p>
              </div>
            </div>

            <div className='space-y-5 px-5 py-5'>
              <div className='rounded-[26px] border border-cyan-200/15 bg-gradient-to-br from-cyan-300/[0.12] via-white/[0.045] to-purple-500/[0.12] p-4'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-white/45'>Current wallet</p>
                    <p className='mt-2 truncate text-lg font-bold text-white'>{editForm.name.trim() || editingWallet?.name || 'Untitled wallet'}</p>
                    <p className='mt-1 text-sm capitalize text-white/55'>{(editForm.type || 'cash').replaceAll('_', ' ')}</p>
                  </div>
                  <div className='text-3xl'>{walletIcons[editForm.type] || '💰'}</div>
                </div>
              </div>

              <div className='space-y-2'>
                <p className='text-sm font-semibold text-white/86'>Wallet name</p>
                <input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} placeholder='e.g. GCash, Cash, Payroll' className='h-12 w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-400/20' />
              </div>

              <div className='space-y-2'>
                <p className='text-sm font-semibold text-white/86'>Wallet type</p>
                <div className='grid grid-cols-3 gap-2'>
                  {walletTypes.map((type) => (
                    <button key={type} type='button' onClick={() => setEditForm((prev) => ({ ...prev, type }))} className={`rounded-2xl border px-2.5 py-3 text-center text-xs font-bold capitalize transition active:scale-[0.98] ${editForm.type === type ? 'border-cyan-300/45 bg-cyan-300/15 text-cyan-50 shadow-[0_0_26px_rgba(0,255,220,0.14)]' : 'border-white/10 bg-white/[0.045] text-white/58 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/80'}`}>
                      <span className='mb-1 block text-lg leading-none'>{walletIcons[type] || '💰'}</span>
                      <span>{type.replaceAll('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className='rounded-2xl border border-white/10 bg-white/[0.04] p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-sm text-white/60'>Balance stays unchanged</p>
                  <p className='text-sm font-bold text-white'>{fmt(toNumber(editingWallet?.balance))}</p>
                </div>
              </div>

              <button type='button' onClick={handleSaveWalletEdit} disabled={isSavingWalletEdit} className='min-h-[54px] w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-teal-400 to-emerald-500 text-sm font-bold text-slate-950 shadow-[0_14px_34px_rgba(0,255,220,0.24)] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'>
                {isSavingWalletEdit ? 'Saving...' : 'Save wallet'}
              </button>

              <button type='button' onClick={closeEditWallet} disabled={isSavingWalletEdit} className='h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] text-sm font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50'>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
