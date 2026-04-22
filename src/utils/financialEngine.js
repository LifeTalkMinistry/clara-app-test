const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

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
  const walletId = String(wallet?.id || "");
  const walletTransactions = transactions.filter((t) => String(t?.wallet_id || "") === walletId);
  const transactionTotal = walletTransactions.reduce(
    (sum, transaction) => sum + getSignedTransactionAmount(transaction),
    0
  );

  const legacyTransferTotal = transfers
    .filter((transfer) => String(transfer?.wallet_id || "") === walletId)
    .reduce((sum, transfer) => sum + getSignedTransactionAmount(transfer), 0);

  const hasTransactionLedger = walletTransactions.length > 0 || legacyTransferTotal !== 0;
  const startingBalance = toNumber(wallet?.starting_balance);

  if (startingBalance > 0 || hasTransactionLedger) {
    return startingBalance + transactionTotal + legacyTransferTotal;
  }

  return toNumber(wallet?.balance ?? wallet?.current_balance ?? wallet?.wallet_balance);
}

export function getTotalBalance(source = {}) {
  const { wallets, transactions, transfers } = getWalletData(source);

  return wallets.reduce(
    (sum, wallet) => sum + getWalletBalance(wallet, transactions, transfers),
    0
  );
}
