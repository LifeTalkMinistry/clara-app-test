const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export function getWalletData(source = {}) {
  return {
    wallets: Array.isArray(source.wallets) ? source.wallets : [],
    transactions: Array.isArray(source.transactions)
      ? source.transactions
      : Array.isArray(source.walletTransactions)
        ? source.walletTransactions
        : [],
    transfers: Array.isArray(source.transfers) ? source.transfers : [],
  };
}

export function getWalletBalance(wallet, transactions = [], transfers = []) {
  const storedBalance = wallet?.balance ?? wallet?.current_balance ?? wallet?.wallet_balance;

  if (storedBalance !== null && storedBalance !== undefined) {
    return toNumber(storedBalance);
  }

  const walletId = String(wallet?.id || "");
  const deposits = transactions
    .filter((t) => String(t.wallet_id) === walletId && ["income", "add"].includes(t.type))
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const expenses = transactions
    .filter((t) => String(t.wallet_id) === walletId && t.type === "expense")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const transfersIn = transactions
    .filter((t) => String(t.wallet_id) === walletId && t.type === "transfer_in")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const transfersOut = transactions
    .filter((t) => String(t.wallet_id) === walletId && t.type === "transfer_out")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const legacyTransfersIn = transfers
    .filter((t) => String(t.wallet_id) === walletId && t.type === "transfer_in")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const legacyTransfersOut = transfers
    .filter((t) => String(t.wallet_id) === walletId && t.type === "transfer_out")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  return (
    toNumber(wallet?.starting_balance) +
    deposits -
    expenses +
    transfersIn -
    transfersOut +
    legacyTransfersIn -
    legacyTransfersOut
  );
}

export function getTotalBalance(source = {}) {
  const { wallets, transactions, transfers } = getWalletData(source);

  return wallets.reduce(
    (sum, wallet) => sum + getWalletBalance(wallet, transactions, transfers),
    0
  );
}
