import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import useFinancialData from '@/hooks/useFinancialData';
import WalletCardContent from '@/components/financial-carousel/cards/wallet/ui/WalletCardContent';

function toNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const number = typeof value === 'number' ? value : Number(String(value).replace(/[₱,\s]/g, ''));
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function firstValue(source, keys = [], fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function getEmergencyAmount(emergencyFund) {
  return toNumber(
    firstValue(emergencyFund, [
      'protectedBalance',
      'protected_balance',
      'reserveBalance',
      'reserve_balance',
      'savedAmount',
      'saved_amount',
      'currentAmount',
      'current_amount',
      'amount',
      'balance',
      'moneyLeft',
    ], 0)
  );
}

function getEmergencyStorageWalletId(emergencyFund) {
  return String(
    firstValue(emergencyFund, [
      'storageWalletId',
      'storage_wallet_id',
      'linkedWalletId',
      'linked_wallet_id',
      'reserveWalletId',
      'reserve_wallet_id',
      'walletId',
      'wallet_id',
    ], '') || ''
  ).trim();
}

function getEmergencyStorageWalletName(emergencyFund) {
  return String(
    firstValue(emergencyFund, [
      'storageWalletName',
      'storage_wallet_name',
      'linkedWalletName',
      'linked_wallet_name',
      'reserveWalletName',
      'reserve_wallet_name',
      'walletName',
      'wallet_name',
    ], '') || ''
  ).trim();
}

function getWalletId(wallet) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.local_id || '').trim();
}

function getWalletName(wallet) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || '').trim();
}

function getWalletBalance(wallet) {
  return toNumber(
    wallet?.balance,
    wallet?.derived_balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.starting_balance
  );
}

function isActiveWallet(wallet) {
  return Boolean(
    wallet &&
      getWalletId(wallet) &&
      !wallet?.is_archived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  );
}

function syncEmergencyProtection({ rows = [], allWallets = [], emergencyFund = null }) {
  const activeWallets = (Array.isArray(allWallets) ? allWallets : []).filter(isActiveWallet);
  const protectedAmount = getEmergencyAmount(emergencyFund);
  const storageWalletId = getEmergencyStorageWalletId(emergencyFund);
  const storageWalletName = getEmergencyStorageWalletName(emergencyFund);
  const storageWallet =
    activeWallets.find((wallet) => getWalletId(wallet) === storageWalletId) ||
    (!storageWalletId && storageWalletName
      ? activeWallets.find((wallet) => getWalletName(wallet) === storageWalletName)
      : null);
  const activeStorageId = storageWallet ? getWalletId(storageWallet) : '';
  const activeStorageName = storageWallet ? getWalletName(storageWallet) : '';

  return (Array.isArray(rows) ? rows : []).map((wallet) => {
    const walletId = getWalletId(wallet);
    const walletName = getWalletName(wallet);
    const isStorageWallet =
      protectedAmount > 0 &&
      Boolean(storageWallet) &&
      (walletId === activeStorageId || (!walletId && activeStorageName && walletName === activeStorageName));
    const walletBalance = getWalletBalance(wallet);
    const derivedProtectedAmount = isStorageWallet
      ? Math.min(protectedAmount, Math.max(walletBalance, 0))
      : 0;
    const spendableBalance = Math.max(walletBalance - derivedProtectedAmount, 0);

    return {
      ...wallet,
      emergencyProtectedAmount: derivedProtectedAmount,
      emergency_protected_amount: derivedProtectedAmount,
      protectedEmergencyAmount: derivedProtectedAmount,
      protected_emergency_amount: derivedProtectedAmount,
      spendableBalance,
      spendable_balance: spendableBalance,
      walletSpendableBalance: spendableBalance,
      wallet_spendable_balance: spendableBalance,
      hasEmergencyFundAllocation: derivedProtectedAmount > 0,
      has_emergency_fund_allocation: derivedProtectedAmount > 0,
      emergencyFundLinkedWalletId: derivedProtectedAmount > 0 ? activeStorageId : null,
      emergency_fund_linked_wallet_id: derivedProtectedAmount > 0 ? activeStorageId : null,
      emergencyFundLabel: derivedProtectedAmount > 0 ? 'Includes Emergency Fund' : '',
      emergency_fund_label: derivedProtectedAmount > 0 ? 'Includes Emergency Fund' : '',
    };
  });
}

export default function WalletCardContentSynced(props) {
  const { user } = useAuth();
  const { emergencyFund, refreshData } = useFinancialData(user);

  useEffect(() => {
    if (typeof refreshData !== 'function') return undefined;

    refreshData();

    if (!props.expanded) return undefined;

    const intervalId = window.setInterval(() => {
      refreshData();
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [props.expanded, refreshData]);

  const syncedVisibleWallets = useMemo(
    () => syncEmergencyProtection({
      rows: props.visibleWallets,
      allWallets: props.wallets,
      emergencyFund,
    }),
    [props.visibleWallets, props.wallets, emergencyFund]
  );

  return <WalletCardContent {...props} visibleWallets={syncedVisibleWallets} />;
}
