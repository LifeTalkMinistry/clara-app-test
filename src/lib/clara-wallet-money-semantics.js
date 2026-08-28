import { isSavingsGoalActive } from "./savingsGoalLifecycle.js";

const EMERGENCY_AMOUNT_KEYS = [
  "protectedBalance",
  "protected_balance",
  "reserveBalance",
  "reserve_balance",
  "savedAmount",
  "saved_amount",
  "currentAmount",
  "current_amount",
  "amount",
  "balance",
  "moneyLeft",
];

const EMERGENCY_WALLET_ID_KEYS = [
  "storageWalletId",
  "storage_wallet_id",
  "linkedWalletId",
  "linked_wallet_id",
  "reserveWalletId",
  "reserve_wallet_id",
  "sourceWalletId",
  "source_wallet_id",
  "walletId",
  "wallet_id",
];

const EMERGENCY_WALLET_NAME_KEYS = [
  "storageWalletName",
  "storage_wallet_name",
  "linkedWalletName",
  "linked_wallet_name",
  "reserveWalletName",
  "reserve_wallet_name",
  "sourceWalletName",
  "source_wallet_name",
  "walletName",
  "wallet_name",
];

const SAVINGS_WALLET_ID_KEYS = [
  "wallet_id",
  "walletId",
  "savedInWalletId",
  "saved_in_wallet_id",
  "storageWalletId",
  "storage_wallet_id",
  "linkedWalletId",
  "linked_wallet_id",
];

const SAVINGS_AMOUNT_KEYS = [
  "saved_amount",
  "savedAmount",
  "current_saved_amount",
  "currentSavedAmount",
  "current_amount",
  "currentAmount",
  "saved",
  "amount_saved",
  "amountSaved",
  "amount",
  "balance",
];

const CURRENT_BALANCE_KEYS = [
  "currentBalance",
  "balance",
  "current_balance",
  "wallet_balance",
  "derived_balance",
  "walletBalance",
  "available_balance",
  "starting_balance",
];

const EXPLICIT_SPENDABLE_KEYS = [
  "spendableBalance",
  "spendable_balance",
  "walletSpendableBalance",
  "wallet_spendable_balance",
];

const EXPLICIT_PROTECTED_KEYS = [
  "totalProtectedAmount",
  "total_protected_amount",
];

const OTHER_PROTECTED_KEYS = [
  "otherProtectedAmount",
  "other_protected_amount",
  "otherReservedAmount",
  "other_reserved_amount",  "reservedAmount",  "reserved_amount",  "protectedAmount",  "protected_amount",
];

const MONEY_LENT_TYPES = new Set(["money_lent", "money-lent", "lent", "receivable"]);

function toMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  const amount = toMoney(value);
  return Math.round(amount * 100) / 100;
}

function firstDefinedValue(source, keys = [], fallback = null) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function firstNumber(source, keys = []) {
  return toMoney(firstDefinedValue(source, keys, 0));
}

function firstText(source, keys = []) {
  const value = firstDefinedValue(source, keys, "");
  return String(value || "").trim();
}

export function getWalletId(wallet = {}) {
  return String(
    wallet?.id ?? wallet?.wallet_id ?? wallet?.walletId ?? wallet?.local_id ?? ""
  ).trim();
}

export function getWalletName(wallet = {}) {
  return String(
    wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || ""
  ).trim();
}

export function getWalletType(wallet = {}) {
  return String(wallet?.type || wallet?.wallet_type || wallet?.walletType || "")
    .trim()
    .toLowerCase();
}

export function isMoneyLentWallet(wallet = {}) {
  return MONEY_LENT_TYPES.has(getWalletType(wallet));
}

export function isActiveWalletForMoneySemantics(wallet) {
  return Boolean(
    wallet &&
      getWalletId(wallet) &&
      !wallet?.is_archived &&
      !wallet?.isArchived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  );
}

export function getWalletCurrentBalance(wallet = {}) {
  return firstNumber(wallet, CURRENT_BALANCE_KEYS);
}

export function getWalletUnavailableBalance(wallet = {}) {
  return isMoneyLentWallet(wallet) ? Math.max(getWalletCurrentBalance(wallet), 0) : 0;
}

function getSavingsGoalWalletId(goal = {}) {
  return firstText(goal, SAVINGS_WALLET_ID_KEYS);
}

function getSavingsGoalSavedAmount(goal = {}) {
  return Math.max(firstNumber(goal, SAVINGS_AMOUNT_KEYS), 0);
}

function getEmergencyProtectedAmount(emergencyFund = null) {
  return Math.max(firstNumber(emergencyFund, EMERGENCY_AMOUNT_KEYS), 0);
}

function resolveEmergencyStorageWallet({ wallet, emergencyFund, wallets = [] } = {}) {
  if (!wallet || !emergencyFund) return null;

  const candidates = (Array.isArray(wallets) && wallets.length ? wallets : [wallet]).filter(
    isActiveWalletForMoneySemantics
  );
  const linkedWalletId = firstText(emergencyFund, EMERGENCY_WALLET_ID_KEYS);
  const linkedWalletName = firstText(emergencyFund, EMERGENCY_WALLET_NAME_KEYS);

  if (linkedWalletId) {
    return candidates.find((candidate) => getWalletId(candidate) === linkedWalletId) || null;
  }

  if (linkedWalletName) {
    return candidates.find((candidate) => getWalletName(candidate) === linkedWalletName) || null;
  }

  return null;
}

export function getWalletProtectedAmounts({
  wallet = {},
  emergencyFund = null,
  savingsGoals = [],
  wallets = [],
} = {}) {
  const currentBalance = roundMoney(Math.max(getWalletCurrentBalance(wallet), 0));
  const moneyLent = isMoneyLentWallet(wallet);
  const walletId = getWalletId(wallet);
  const emergencyStorageWallet = resolveEmergencyStorageWallet({
    wallet,
    emergencyFund,
    wallets,
  });
  const emergencyStorageWalletId = emergencyStorageWallet
    ? getWalletId(emergencyStorageWallet)
    : "";
  const isEmergencyStorageWallet = Boolean(
    !moneyLent && emergencyStorageWalletId && walletId === emergencyStorageWalletId
  );

  const emergencyProtectedAmount = isEmergencyStorageWallet
    ? Math.min(getEmergencyProtectedAmount(emergencyFund), currentBalance)
    : 0;

  const activeSavingsGoals = moneyLent
    ? []
    : (Array.isArray(savingsGoals) ? savingsGoals : [])
        .filter(isSavingsGoalActive)
        .filter((goal) => walletId && getSavingsGoalWalletId(goal) === walletId);

  const requestedSavingsProtectedAmount = activeSavingsGoals.reduce(
    (sum, goal) => sum + getSavingsGoalSavedAmount(goal),
    0
  );
  const savingsProtectedAmount = Math.min(
    requestedSavingsProtectedAmount,
    Math.max(currentBalance - emergencyProtectedAmount, 0)
  );
  const requestedOtherProtectedAmount = Math.max(firstNumber(wallet, OTHER_PROTECTED_KEYS), 0);
  const otherProtectedAmount = moneyLent
    ? 0
    : Math.min(
        requestedOtherProtectedAmount,
        Math.max(currentBalance - emergencyProtectedAmount - savingsProtectedAmount, 0)
      );
  const totalProtectedAmount = roundMoney(
    emergencyProtectedAmount + savingsProtectedAmount + otherProtectedAmount
  );
  const unavailableAmount = moneyLent ? currentBalance : 0;

  return {
    currentBalance,
    emergencyProtectedAmount: roundMoney(emergencyProtectedAmount),
    savingsProtectedAmount: roundMoney(savingsProtectedAmount),
    otherProtectedAmount: roundMoney(otherProtectedAmount),
    totalProtectedAmount,
    unavailableAmount,
    moneyLentUnavailableAmount: unavailableAmount,
    isMoneyLent: moneyLent,
    savingsGoalCount: activeSavingsGoals.length,
    isEmergencyStorageWallet,
    emergencyFundLinkedWalletId: isEmergencyStorageWallet
      ? emergencyStorageWalletId
      : null,
  };
}

export function getWalletMoneySemantics({
  wallet = {},
  emergencyFund = null,
  savingsGoals = [],
  wallets = [],
} = {}) {
  const protectedAmounts = getWalletProtectedAmounts({
    wallet,
    emergencyFund,
    savingsGoals,
    wallets,
  });

  return {
    ...protectedAmounts,
    spendableBalance: protectedAmounts.isMoneyLent
      ? 0
      : roundMoney(
          Math.max(
            protectedAmounts.currentBalance - protectedAmounts.totalProtectedAmount,
            0
          )
        ),
  };
}

export function getWalletSpendableBalance(walletOrContext = {}) {
  if (walletOrContext && Object.prototype.hasOwnProperty.call(walletOrContext, "wallet")) {
    return getWalletMoneySemantics(walletOrContext).spendableBalance;
  }

  const wallet = walletOrContext || {};
  if (isMoneyLentWallet(wallet)) return 0;

  const explicitSpendable = firstDefinedValue(wallet, EXPLICIT_SPENDABLE_KEYS, null);
  if (explicitSpendable !== null) return roundMoney(Math.max(toMoney(explicitSpendable), 0));

  const protectedAmount = Math.max(firstNumber(wallet, EXPLICIT_PROTECTED_KEYS), 0);
  return roundMoney(Math.max(getWalletCurrentBalance(wallet) - protectedAmount, 0));
}

export function syncWalletProtectedAllocations({
  rows = [],
  allWallets = [],
  emergencyFund = null,
  savingsGoals = [],
} = {}) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const walletSystem = Array.isArray(allWallets) && allWallets.length
    ? allWallets
    : sourceRows;

  return sourceRows.map((wallet) => {
    const semantics = getWalletMoneySemantics({
      wallet,
      emergencyFund,
      savingsGoals,
      wallets: walletSystem,
    });

    return {
      ...wallet,
      currentBalance: semantics.currentBalance,
      currentBalanceReadOnly: semantics.currentBalance,
      emergencyProtectedAmount: semantics.emergencyProtectedAmount,
      emergency_protected_amount: semantics.emergencyProtectedAmount,
      protectedEmergencyAmount: semantics.emergencyProtectedAmount,
      protected_emergency_amount: semantics.emergencyProtectedAmount,
      savingsProtectedAmount: semantics.savingsProtectedAmount,
      savings_protected_amount: semantics.savingsProtectedAmount,
      protectedSavingsAmount: semantics.savingsProtectedAmount,
      protected_savings_amount: semantics.savingsProtectedAmount,
      otherProtectedAmount: semantics.otherProtectedAmount,
      other_protected_amount: semantics.otherProtectedAmount,
      totalProtectedAmount: semantics.totalProtectedAmount,
      total_protected_amount: semantics.totalProtectedAmount,
      unavailableAmount: semantics.unavailableAmount,
      unavailable_amount: semantics.unavailableAmount,
      moneyLentUnavailableAmount: semantics.moneyLentUnavailableAmount,
      money_lent_unavailable_amount: semantics.moneyLentUnavailableAmount,
      isMoneyLent: semantics.isMoneyLent,
      is_money_lent: semantics.isMoneyLent,
      isSpendable: !semantics.isMoneyLent,
      is_spendable: !semantics.isMoneyLent,
      spendabilityStatus: semantics.isMoneyLent ? "blocked" : wallet?.spendabilityStatus,
      spendability_status: semantics.isMoneyLent ? "blocked" : wallet?.spendability_status,
      spendabilityBlockReason: semantics.isMoneyLent
        ? "Money Lent is owned by you but currently held by someone else."
        : wallet?.spendabilityBlockReason,
      spendability_block_reason: semantics.isMoneyLent
        ? "Money Lent is owned by you but currently held by someone else."
        : wallet?.spendability_block_reason,
      savingsGoalCount: semantics.savingsGoalCount,
      savings_goal_count: semantics.savingsGoalCount,
      spendableBalance: semantics.spendableBalance,
      spendable_balance: semantics.spendableBalance,
      walletSpendableBalance: semantics.spendableBalance,
      wallet_spendable_balance: semantics.spendableBalance,
      hasEmergencyFundAllocation: semantics.emergencyProtectedAmount > 0,
      has_emergency_fund_allocation: semantics.emergencyProtectedAmount > 0,
      isEmergencyFundStorageWallet: semantics.isEmergencyStorageWallet,
      is_emergency_fund_storage_wallet: semantics.isEmergencyStorageWallet,
      hasSavingsGoalAllocation: semantics.savingsGoalCount > 0,
      has_savings_goal_allocation: semantics.savingsGoalCount > 0,
      emergencyFundLinkedWalletId: semantics.emergencyFundLinkedWalletId,
      emergency_fund_linked_wallet_id: semantics.emergencyFundLinkedWalletId,
      emergencyFundLabel:
        semantics.emergencyProtectedAmount > 0 ? "Includes Emergency Fund" : "",
      emergency_fund_label:
        semantics.emergencyProtectedAmount > 0 ? "Includes Emergency Fund" : "",
      savingsGoalLabel:
        semantics.savingsGoalCount > 0 ? "Includes Savings Goals" : "",
      savings_goal_label:
        semantics.savingsGoalCount > 0 ? "Includes Savings Goals" : "",
    };
  });
}

export function getWalletTotals(wallets = []) {
  return (Array.isArray(wallets) ? wallets : [])
    .filter(isActiveWalletForMoneySemantics)
    .reduce(
      (totals, wallet) => {
        const currentBalance = roundMoney(Math.max(getWalletCurrentBalance(wallet), 0));
        const unavailableAmount = isMoneyLentWallet(wallet) ? currentBalance : Math.max(
          firstNumber(wallet, ["unavailableAmount", "unavailable_amount", "moneyLentUnavailableAmount", "money_lent_unavailable_amount"]),
          0
        );
        const emergencyProtectedAmount = Math.max(
          firstNumber(wallet, ["emergencyProtectedAmount", "emergency_protected_amount"]),
          0
        );
        const savingsProtectedAmount = Math.max(
          firstNumber(wallet, ["savingsProtectedAmount", "savings_protected_amount"]),
          0
        );
        const otherProtectedAmount = Math.max(
          firstNumber(wallet, ["otherProtectedAmount", "other_protected_amount"]),
          0
        );
        const totalProtectedAmount = Math.max(
          firstNumber(wallet, EXPLICIT_PROTECTED_KEYS),
          0
        );
        const spendableBalance = isMoneyLentWallet(wallet)
          ? 0
          : Math.max(
              toMoney(firstDefinedValue(wallet, EXPLICIT_SPENDABLE_KEYS, 0)),
              0
            );

        return {
          currentBalance: roundMoney(totals.currentBalance + currentBalance),
          availableBalance: roundMoney(totals.availableBalance + spendableBalance),
          unavailableAmount: roundMoney(totals.unavailableAmount + unavailableAmount),
          moneyLentUnavailableAmount: roundMoney(totals.moneyLentUnavailableAmount + unavailableAmount),
          emergencyProtectedAmount:
            totals.emergencyProtectedAmount + emergencyProtectedAmount,
          savingsProtectedAmount:
            totals.savingsProtectedAmount + savingsProtectedAmount,
          otherProtectedAmount:
            totals.otherProtectedAmount + otherProtectedAmount,
          totalProtectedAmount: roundMoney(totals.totalProtectedAmount + totalProtectedAmount),
          spendableBalance: roundMoney(totals.spendableBalance + spendableBalance),
        };
      },
      {
        currentBalance: 0,
        availableBalance: 0,
        unavailableAmount: 0,
        moneyLentUnavailableAmount: 0,
        emergencyProtectedAmount: 0,
        savingsProtectedAmount: 0,
        otherProtectedAmount: 0,
        totalProtectedAmount: 0,
        spendableBalance: 0,
      }
    );
}

export function buildCanonicalWalletState({
  wallets = [],
  emergencyFund = null,
  savingsGoals = [],
} = {}) {
  const normalizedWallets = syncWalletProtectedAllocations({
    rows: wallets,
    allWallets: wallets,
    emergencyFund,
    savingsGoals,
  });

  return {
    wallets: normalizedWallets,
    walletTotals: getWalletTotals(normalizedWallets),
  };
}

export function getTotalWalletCurrentBalance(wallets = []) {
  return getWalletTotals(wallets).currentBalance;
}

export function getTotalWalletSpendableBalance({
  wallets = [],
  emergencyFund = null,
  savingsGoals = [],
} = {}) {
  return buildCanonicalWalletState({ wallets, emergencyFund, savingsGoals }).walletTotals
    .spendableBalance;
}

export function getTotalWalletUnavailableBalance({
  wallets = [],
  emergencyFund = null,
  savingsGoals = [],
} = {}) {
  return buildCanonicalWalletState({ wallets, emergencyFund, savingsGoals }).walletTotals
    .unavailableAmount;
}
