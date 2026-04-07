const WALLET_KEY = "clara_wallets";
const TXN_KEY = "clara_wallet_transactions";
const TRANSFER_KEY = "clara_transfers";

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

// 🔥 SINGLE SOURCE OF TRUTH
export function getWalletData() {
  const wallets = safeRead(WALLET_KEY);
  const transactions = safeRead(TXN_KEY);
  const transfers = safeRead(TRANSFER_KEY);

  return { wallets, transactions, transfers };
}

// 🔥 CORE BALANCE CALCULATION (same as Wallets.jsx)
export function getWalletBalance(wallet, transactions, transfers) {
  const deposits = transactions
    .filter((t) => t.wallet_id === wallet.id)
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const transfersIn = transfers
    .filter((t) => t.wallet_id === wallet.id && t.type === "transfer_in")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const transfersOut = transfers
    .filter((t) => t.wallet_id === wallet.id && t.type === "transfer_out")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  return (
    Number(wallet.starting_balance || 0) +
    deposits +
    transfersIn -
    transfersOut
  );
}

// 🔥 TOTAL MONEY (THIS FIXES DASHBOARD)
export function getTotalBalance() {
  const { wallets, transactions, transfers } = getWalletData();

  return wallets.reduce(
    (sum, w) => sum + getWalletBalance(w, transactions, transfers),
    0
  );
}