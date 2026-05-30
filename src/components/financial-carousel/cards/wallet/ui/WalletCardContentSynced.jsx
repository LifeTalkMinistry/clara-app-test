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

function isActiveGoal(goal) {
  return Boolean(goal && !goal?.deletedAt && !goal?.deleted_at);
}

function getGoalWalletId(goal) {
  return String(
    goal?.wallet_id ||
      goal?.walletId ||
      goal?.savedInWalletId ||
      goal?.saved_in_wallet_id ||
      goal?.storageWalletId ||
      goal?.storage_wallet_id ||
      ''
  ).trim();
}

function getGoalSavedAmount(goal) {
  return toNumber(
    goal?.saved_amount,
    goal?.savedAmount,
    goal?.current_amount,
    goal?.currentAmount,
    goal?.amount,
    goal?.balance
  );
}

function getSavingsProtectedAmountForWallet(wallet, savingsGoals = []) {
  const walletId = getWalletId(wallet);
  if (!walletId) return 0;

  return (Array.isArray(savingsGoals) ? savingsGoals : [])
    .filter(isActiveGoal)
    .filter((goal) => getGoalWalletId(goal) === walletId)
    .reduce((sum, goal) => sum + getGoalSavedAmount(goal), 0);
}

function syncProtectedAllocations({ rows = [], allWallets = [], emergencyFund = null, savingsGoals = [] }) {
  const activeWallets = (Array.isArray(allWallets) ? allWallets : []).filter(isActiveWallet);
  const emergencyAmount = getEmergencyAmount(emergencyFund);
  const storageWalletId = getEmergencyStorageWalletId(emergencyFund);
  const storageWalletName = getEmergencyStorageWalletName(emergencyFund);
  const emergencyWallet =
    activeWallets.find((wallet) => getWalletId(wallet) === storageWalletId) ||
    (!storageWalletId && storageWalletName
      ? activeWallets.find((wallet) => getWalletName(wallet) === storageWalletName)
      : null);
  const emergencyWalletId = emergencyWallet ? getWalletId(emergencyWallet) : '';
  const emergencyWalletName = emergencyWallet ? getWalletName(emergencyWallet) : '';

  return (Array.isArray(rows) ? rows : []).map((wallet) => {
    const walletId = getWalletId(wallet);
    const walletName = getWalletName(wallet);
    const walletBalance = getWalletBalance(wallet);
    const isEmergencyStorageWallet =
      emergencyAmount > 0 &&
      Boolean(emergencyWallet) &&
      (walletId === emergencyWalletId || (!walletId && emergencyWalletName && walletName === emergencyWalletName));
    const emergencyProtectedAmount = isEmergencyStorageWallet
      ? Math.min(emergencyAmount, Math.max(walletBalance, 0))
      : 0;
    const rawSavingsProtectedAmount = getSavingsProtectedAmountForWallet(wallet, savingsGoals);
    const savingsProtectedAmount = Math.min(rawSavingsProtectedAmount, Math.max(walletBalance - emergencyProtectedAmount, 0));
    const totalProtectedAmount = emergencyProtectedAmount + savingsProtectedAmount;
    const spendableBalance = Math.max(walletBalance - totalProtectedAmount, 0);

    return {
      ...wallet,
      emergencyProtectedAmount,
      emergency_protected_amount: emergencyProtectedAmount,
      protectedEmergencyAmount: emergencyProtectedAmount,
      protected_emergency_amount: emergencyProtectedAmount,
      savingsProtectedAmount,
      savings_protected_amount: savingsProtectedAmount,
      protectedSavingsAmount: savingsProtectedAmount,
      protected_savings_amount: savingsProtectedAmount,
      totalProtectedAmount,
      total_protected_amount: totalProtectedAmount,
      spendableBalance,
      spendable_balance: spendableBalance,
      walletSpendableBalance: spendableBalance,
      wallet_spendable_balance: spendableBalance,
      hasEmergencyFundAllocation: emergencyProtectedAmount > 0,
      has_emergency_fund_allocation: emergencyProtectedAmount > 0,
      hasSavingsGoalAllocation: savingsProtectedAmount > 0,
      has_savings_goal_allocation: savingsProtectedAmount > 0,
      emergencyFundLinkedWalletId: emergencyProtectedAmount > 0 ? emergencyWalletId : null,
      emergency_fund_linked_wallet_id: emergencyProtectedAmount > 0 ? emergencyWalletId : null,
      emergencyFundLabel: emergencyProtectedAmount > 0 ? 'Includes Emergency Fund' : '',
      emergency_fund_label: emergencyProtectedAmount > 0 ? 'Includes Emergency Fund' : '',
      savingsGoalLabel: savingsProtectedAmount > 0 ? 'Includes Savings Goals' : '',
      savings_goal_label: savingsProtectedAmount > 0 ? 'Includes Savings Goals' : '',
    };
  });
}

export default function WalletCardContentSynced(props) {
  const { user } = useAuth();
  const { emergencyFund, savingsGoals, refreshData } = useFinancialData(user);

  useEffect(() => {
    if (typeof refreshData !== 'function') return undefined;
    refreshData();
    if (!props.expanded) return undefined;
    const intervalId = window.setInterval(() => refreshData(), 900);
    return () => window.clearInterval(intervalId);
  }, [props.expanded, refreshData]);

  const syncedVisibleWallets = useMemo(
    () => syncProtectedAllocations({
      rows: props.visibleWallets,
      allWallets: props.wallets,
      emergencyFund,
      savingsGoals,
    }),
    [props.visibleWallets, props.wallets, emergencyFund, savingsGoals]
  );

  return <WalletCardContent {...props} visibleWallets={syncedVisibleWallets} />;
}
