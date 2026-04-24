const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const hasValue = (value) => value !== null && value !== undefined && value !== "";

const normalizeType = (value) => String(value || "").trim().toLowerCase();

const getSignedTransactionAmount = (transaction) => {
  const amount = toNumber(transaction?.amount);
  const type = normalizeType(transaction?.type || transaction?.transaction_type || transaction?.kind);

  if (
    [
      "expense",
      "transfer_out",
      "savings_goal",
      "savings_transfer",
      "reset",
      "debit",
      "withdrawal",
    ].includes(type)
  ) {
    return -amount;
  }

  if (
    [
      "income",
      "add",
      "cash_in",
      "deposit",
      "transfer_in",
      "opening_balance",
      "credit",
    ].includes(type)
  ) {
    return amount;
  }

  return 0;
};

const getStoredWalletBalance = (wallet) => {
  if (hasValue(wallet?.balance)) return toNumber(wallet.balance);
  if (hasValue(wallet?.current_balance)) return toNumber(wallet.current_balance);
  if (hasValue(wallet?.wallet_balance)) return toNumber(wallet.wallet_balance);
  if (hasValue(wallet?.available_balance)) return toNumber(wallet.available_balance);
  return null;
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

export function getWalletLedgerBalance(wallet, transactions = [], transfers = []) {
  const walletId = String(wallet?.id || "");
  const walletTransactions = transactions.filter((t) => String(t?.wallet_id || "") === walletId);
  const transactionTotal = walletTransactions.reduce(
    (sum, transaction) => sum + getSignedTransactionAmount(transaction),
    0
  );

  const legacyTransferTotal = transfers
    .filter((transfer) => String(transfer?.wallet_id || "") === walletId)
    .reduce((sum, transfer) => sum + getSignedTransactionAmount(transfer), 0);

  return toNumber(wallet?.starting_balance) + transactionTotal + legacyTransferTotal;
}

export function getWalletBalance(wallet, transactions = [], transfers = []) {
  const storedBalance = getStoredWalletBalance(wallet);

  if (storedBalance !== null) {
    return storedBalance;
  }

  return getWalletLedgerBalance(wallet, transactions, transfers);
}

export function getTotalBalance(source = {}) {
  const { wallets, transactions, transfers } = getWalletData(source);

  return wallets.reduce(
    (sum, wallet) => sum + getWalletBalance(wallet, transactions, transfers),
    0
  );
}
