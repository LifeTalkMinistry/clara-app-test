import {
  getWalletSpendableBalance as getCanonicalWalletSpendableBalance,
  syncWalletProtectedAllocations,
} from "./clara-wallet-money-semantics.js";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return clean(value).toLowerCase();
}

function explicitFalse(value) {
  return value === false || value === 0 || lower(value) === "false" || lower(value) === "no" || lower(value) === "blocked";
}

function explicitTrue(value) {
  return value === true || value === 1 || lower(value) === "true" || lower(value) === "yes";
}

function walletId(value = {}) {
  return clean(value.id || value.wallet_id || value.walletId || value.local_id || value.localId || value.uuid || value.name || "");
}

function walletName(value = {}) {
  return clean(value.name || value.wallet_name || value.walletName || value.label || value.title || "Wallet") || "Wallet";
}

function walletBalance(value = {}) {
  return toNumber(value.currentBalance ?? value.balance ?? value.current_balance ?? value.wallet_balance ?? value.derived_balance ?? value.starting_balance ?? 0);
}

function walletReservedBalance(value = {}) {
  return Math.max(toNumber(value.totalProtectedAmount ?? value.total_protected_amount ?? 0), 0);
}

function walletSpendableBalance(value = {}) {
  return getCanonicalWalletSpendableBalance(value);
}

function isActiveWallet(value = {}) {
  if (!walletId(value)) return false;
  if (value.deletedAt || value.deleted_at) return false;
  if (value.is_archived === true || explicitTrue(value.archived)) return false;
  if (explicitFalse(value.active) || explicitFalse(value.is_active) || explicitFalse(value.isActive)) return false;
  if (["archived", "deleted", "closed", "inactive"].includes(lower(value.status))) return false;
  return true;
}

function getWalletSpendability(value = {}) {
  const status = lower(value.spendabilityStatus || value.spendability_status);
  if (status === "blocked") {
    return {
      status: "blocked",
      reason: clean(value.spendabilityBlockReason || value.spendability_block_reason || "Wallet is blocked for spending."),
    };
  }
  if (status === "eligible") return { status: "eligible", reason: "" };

  if (
    explicitFalse(value.is_spendable) ||
    explicitFalse(value.isSpendable) ||
    explicitTrue(value.is_protected) ||
    explicitTrue(value.isProtected) ||
    explicitTrue(value.protected)
  ) {
    return {
      status: "blocked",
      reason: clean(value.protectionReason || value.protection_reason || "Wallet is explicitly blocked for spending."),
    };
  }

  return { status: "eligible", reason: "" };
}

function isProtectedWallet(value = {}) {
  return getWalletSpendability(value).status === "blocked";
}

function walletProtectionReason(value = {}) {
  return getWalletSpendability(value).reason;
}

function getWalletBreakdown(context = {}, amount = 0) {
  const target = Math.max(toNumber(amount), 0);
  const rawWallets = Array.isArray(context.wallets) ? context.wallets : [];
  const wallets = syncWalletProtectedAllocations({
    rows: rawWallets,
    allWallets: rawWallets,
    emergencyFund: context.emergencyFund || null,
    savingsGoals: Array.isArray(context.savingsGoals) ? context.savingsGoals : [],
  });

  return wallets.filter(isActiveWallet).map((wallet) => {
    const id = walletId(wallet);
    const name = walletName(wallet);
    const currentBalance = walletBalance(wallet);
    const totalProtectedAmount = walletReservedBalance(wallet);
    const spendableBalance = walletSpendableBalance(wallet);
    const spendability = getWalletSpendability(wallet);
    const blocked = spendability.status === "blocked";

    return {
      id,
      name,
      rawBalance: currentBalance,
      currentBalance,
      reservedAmount: totalProtectedAmount,
      totalProtectedAmount,
      spendable: spendableBalance,
      spendableBalance,
      protected: blocked,
      spendabilityStatus: spendability.status,
      spendabilityBlockReason: spendability.reason,
      enough: Boolean(id) && !blocked && spendableBalance >= target,
      protectionReason: spendability.reason,
      raw: wallet,
    };
  });
}

export function getWalletOptions(context = {}, amount = 0) {
  return getWalletBreakdown(context, amount)
    .filter((wallet) => wallet.spendabilityStatus === "eligible" && wallet.spendableBalance > 0)
    .map((wallet) => ({ id: wallet.id, name: wallet.name, balance: wallet.spendableBalance, enough: wallet.enough }));
}

export function getEligibleSpendableTotal(context = {}) {
  return getWalletBreakdown(context, 0)
    .filter((wallet) => wallet.spendabilityStatus === "eligible")
    .reduce((sum, wallet) => sum + wallet.spendableBalance, 0);
}

export function getProtectedMoneyNeeded(context = {}, amount = 0) {
  const target = Math.max(toNumber(amount), 0);
  const wallets = getWalletBreakdown(context, target);
  const eligible = wallets.filter((wallet) => wallet.spendabilityStatus === "eligible");
  const eligibleTotal = eligible.reduce((sum, wallet) => sum + wallet.spendableBalance, 0);
  if (eligibleTotal >= target) return null;

  const protectedAmount = wallets.reduce((sum, wallet) => sum + wallet.totalProtectedAmount, 0);
  if (eligibleTotal + protectedAmount < target) return null;

  return {
    amountNeeded: Math.max(target - eligibleTotal, 0),
    protectedAmount,
    eligibleTotal,
  };
}

export {
  getWalletBreakdown,
  getWalletSpendability,
  isActiveWallet,
  isProtectedWallet,
  walletBalance,
  walletId,
  walletName,
  walletProtectionReason,
  walletReservedBalance,
  walletSpendableBalance,
};
