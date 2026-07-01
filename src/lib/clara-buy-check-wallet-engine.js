function cleanWalletValue(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toWalletNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function walletId(value = {}) {
  return cleanWalletValue(value.id ?? value.wallet_id ?? value.walletId ?? value.key ?? value.uuid ?? "");
}

function walletName(value = {}) {
  return cleanWalletValue(value.name || value.wallet_name || value.title || value.label || value.type || "Wallet");
}

function walletBalance(value = {}) {
  return toWalletNumber(value.derived_balance ?? value.balance ?? value.current_balance ?? value.wallet_balance ?? value.available_balance ?? value.starting_balance ?? 0);
}

function walletReservedBalance(value = {}) {
  return Math.max(0, toWalletNumber(
    value.reserved_balance ?? value.reservedBalance ?? value.reserved_amount ?? value.reservedAmount ??
    value.protected_balance ?? value.protectedBalance ?? value.protected_amount ?? value.protectedAmount ?? 0,
  ));
}

function explicitTrue(value) {
  return value === true || value === 1 || String(value ?? "").toLowerCase() === "true";
}

function explicitFalse(value) {
  return value === false || value === 0 || String(value ?? "").toLowerCase() === "false";
}

function isProtectedWallet(value = {}) {
  if (explicitTrue(value.is_protected ?? value.isProtected ?? value.protected)) return true;
  if ((value.is_spendable !== undefined || value.isSpendable !== undefined) && explicitFalse(value.is_spendable ?? value.isSpendable)) return true;
  const metadata = `${value.purpose || ""} ${value.wallet_type || value.walletType || ""} ${value.type || ""}`.toLowerCase();
  if (/\b(emergency|reserve|savings?|goal|investment)\b/.test(metadata)) return true;
  return /\b(emergency|reserve|savings?|goal)\b/.test(walletName(value).toLowerCase());
}

function walletSpendableBalance(value = {}) {
  if (isProtectedWallet(value)) return 0;
  const explicit = value.available_to_spend ?? value.availableToSpend ?? value.spendable_balance ?? value.spendableBalance;
  if (explicit !== undefined && explicit !== null && explicit !== "") return Math.max(0, toWalletNumber(explicit));
  return Math.max(0, walletBalance(value) - walletReservedBalance(value));
}

function getWalletBreakdown(context = {}, amount = 0) {
  const target = toWalletNumber(amount);
  const seen = new Set();
  const wallets = (Array.isArray(context.wallets) ? context.wallets : []).map((wallet) => {
    const id = walletId(wallet);
    const name = walletName(wallet);
    const key = id || name.toLowerCase();
    if (!key || seen.has(key)) return null;
    seen.add(key);
    const grossBalance = Math.max(0, walletBalance(wallet));
    const reservedBalance = Math.min(grossBalance, walletReservedBalance(wallet));
    const protectedWallet = isProtectedWallet(wallet);
    const spendableBalance = walletSpendableBalance(wallet);
    return {
      id,
      name,
      grossBalance,
      reservedBalance,
      spendableBalance,
      protected: protectedWallet,
      enough: Boolean(id) && !protectedWallet && spendableBalance >= target,
      protectionReason: protectedWallet ? "protected_wallet" : reservedBalance > 0 ? "reserved_balance" : "none",
    };
  }).filter(Boolean);

  const eligibleFundingWallets = wallets.filter((wallet) => !wallet.protected && wallet.spendableBalance > 0);
  const spendableTotal = eligibleFundingWallets.reduce((sum, wallet) => sum + wallet.spendableBalance, 0);
  const largestEligibleBalance = eligibleFundingWallets.reduce((largest, wallet) => Math.max(largest, wallet.spendableBalance), 0);
  const protectedTotal = wallets.filter((wallet) => wallet.protected).reduce((sum, wallet) => sum + wallet.grossBalance, 0);
  const reservedAmount = wallets.reduce((sum, wallet) => sum + wallet.reservedBalance, 0);

  return {
    wallets,
    eligibleFundingWallets,
    spendableTotal,
    largestEligibleBalance,
    fundingWalletCount: eligibleFundingWallets.filter((wallet) => wallet.spendableBalance >= target).length,
    combinedEnough: spendableTotal >= target,
    individualEnough: largestEligibleBalance >= target,
    protectedTotal,
    reservedAmount,
    protectedMoneyNeeded: largestEligibleBalance < target && spendableTotal < target && (protectedTotal > 0 || reservedAmount > 0),
  };
}

function getWalletOptions(context = {}, amount = 0) {
  return getWalletBreakdown(context, amount).eligibleFundingWallets
    .map((wallet) => ({ id: wallet.id, name: wallet.name, balance: wallet.spendableBalance, enough: wallet.enough }))
    .sort((left, right) => Number(right.enough) - Number(left.enough) || right.balance - left.balance);
}

export {
  cleanWalletValue,
  toWalletNumber,
  walletId,
  walletName,
  walletBalance,
  walletReservedBalance,
  walletSpendableBalance,
  isProtectedWallet,
  getWalletBreakdown,
  getWalletOptions,
};
