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

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const getTransactionTime = (transaction) =>
  parseDateValue(transaction?.created_at || transaction?.updated_at || transaction?.date)?.getTime() ?? 0;

const getTransactionDetails = (transaction) => {
  const details = transaction?.details;

  if (!details) return null;
  if (typeof details === "object") return details;

  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
};

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

const getWalletId = (wallet) => String(wallet?.id || "");

const getWalletTransactions = (wallet, transactions = [], transfers = []) => {
  const walletId = getWalletId(wallet);

  if (!walletId) return [];

  return [
    ...transactions.filter((transaction) => String(transaction?.wallet_id || "") === walletId),
    ...transfers.filter((transfer) => String(transfer?.wallet_id || "") === walletId),
  ];
};

const getLatestTransactionNextBalance = (wallet, transactions = [], transfers = []) => {
  const latestTransaction = getWalletTransactions(wallet, transactions, transfers)
    .map((transaction) => ({
      transaction,
      time: getTransactionTime(transaction),
      details: getTransactionDetails(transaction),
    }))
    .filter((item) => hasValue(item.details?.next_balance))
    .sort((a, b) => b.time - a.time)[0];

  if (!latestTransaction) return null;

  return toNumber(latestTransaction.details.next_balance);
};

const getUnappliedDeltaAfterWalletUpdate = (wallet, transactions = [], transfers = []) => {
  const updatedAt = parseDateValue(wallet?.updated_at)?.getTime();

  if (!updatedAt) return 0;

  return getWalletTransactions(wallet, transactions, transfers)
    .filter((transaction) => getTransactionTime(transaction) > updatedAt)
    .reduce((sum, transaction) => sum + getSignedTransactionAmount(transaction), 0);
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
  const walletTransactions = getWalletTransactions(wallet, transactions, transfers);
  const transactionTotal = walletTransactions.reduce(
    (sum, transaction) => sum + getSignedTransactionAmount(transaction),
    0
  );

  return toNumber(wallet?.starting_balance) + transactionTotal;
}

export function getWalletBalance(wallet, transactions = [], transfers = []) {
  const storedBalance = getStoredWalletBalance(wallet);

  if (storedBalance !== null) {
    const latestRecordedBalance = getLatestTransactionNextBalance(wallet, transactions, transfers);

    if (latestRecordedBalance !== null && latestRecordedBalance !== storedBalance) {
      return latestRecordedBalance;
    }

    const unappliedDelta = getUnappliedDeltaAfterWalletUpdate(wallet, transactions, transfers);

    if (unappliedDelta !== 0) {
      return storedBalance + unappliedDelta;
    }

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
