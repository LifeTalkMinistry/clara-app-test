import { transferBetweenWallets } from "@/lib/financeRepository";
import { getFinanceLocalUserId } from "@/lib/ai-command/finance-context";
import { formatPeso } from "@/lib/ai-command/command-parser";

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const norm = (value) => String(value || "").trim().toLowerCase();
const key = (value) => norm(value).replace(/[^a-z0-9]/g, "");
const walletName = (wallet) => wallet?.name || wallet?.wallet_name || "Wallet";
const walletBalance = (wallet) => toNumber(wallet?.balance ?? wallet?.derived_balance ?? wallet?.current_balance ?? wallet?.wallet_balance ?? 0);

function findWallet(wallets = [], label = "") {
  const wanted = norm(label);
  const wantedKey = key(label);
  const wallet =
    wallets.find((item) => norm(walletName(item)) === wanted) ||
    wallets.find((item) => key(walletName(item)) === wantedKey) ||
    wallets.find((item) => norm(walletName(item)).includes(wanted)) ||
    wallets.find((item) => wanted.includes(norm(walletName(item)))) ||
    null;

  return wallet ? { ...wallet, name: walletName(wallet), balance: walletBalance(wallet) } : null;
}

function makeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function runLocalWalletMove({ command, user, financeSnapshot }) {
  const data = command?.parsedData || {};
  const amount = toNumber(data.amount);
  const wallets = Array.isArray(financeSnapshot?.wallets) ? financeSnapshot.wallets : [];
  const fromWallet = findWallet(wallets, data.fromWallet);
  const toWallet = findWallet(wallets, data.toWallet);
  const names = wallets.map(walletName).slice(0, 6).join(", ");

  if (!amount || amount <= 0) {
    return { success: false, intent: command?.intent, errorCode: "INVALID_AMOUNT", message: "I need a valid amount first." };
  }

  if (!fromWallet || !toWallet) {
    return {
      success: false,
      intent: command?.intent,
      errorCode: "WALLET_NOT_FOUND",
      message: `I could not find ${!fromWallet ? data.fromWallet || "the source wallet" : data.toWallet || "the destination wallet"}. Available wallets: ${names}.`,
    };
  }

  if (String(fromWallet.id) === String(toWallet.id)) {
    return { success: false, intent: command?.intent, errorCode: "SAME_WALLET", message: "Choose two different wallets for this move." };
  }

  if (amount > fromWallet.balance) {
    return {
      success: false,
      intent: command?.intent,
      errorCode: "INSUFFICIENT_BALANCE",
      message: `${fromWallet.name} only has ${formatPeso(fromWallet.balance)} available. Try a lower amount or choose another wallet.`,
    };
  }

  const localUserId = getFinanceLocalUserId(user);
  const result = await transferBetweenWallets(localUserId, {
    id: makeId("transfer"),
    transfer_group_id: makeId("transfer_group"),
    amount,
    from_wallet_id: fromWallet.id,
    to_wallet_id: toWallet.id,
    notes: data.notes || `CLARA move from ${fromWallet.name} to ${toWallet.name}`,
    created_at: new Date().toISOString(),
    source: "ai_command",
  });

  if (typeof window !== "undefined") {
    ["clara-finance-updated", "clara-wallets-updated", "clara-wallet-transactions-updated"].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
  }

  return {
    success: true,
    intent: command?.intent,
    message: `Transferred ${formatPeso(amount)} from ${fromWallet.name} to ${toWallet.name}. ${fromWallet.name} is now ${formatPeso(fromWallet.balance - amount)} and ${toWallet.name} is now ${formatPeso(toWallet.balance + amount)}.`,
    result,
  };
}
