import { buildClaraFinanceSnapshot } from "@/lib/clara-local-brain";

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
    : null;
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactKey(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
}

function walletName(wallet = {}) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.label || "Wallet").trim();
}

function walletBalance(wallet = {}) {
  return wallet?.balance ?? wallet?.current_balance ?? wallet?.wallet_balance ?? wallet?.available_balance ?? null;
}

function getWallets(snapshot = {}) {
  const walletBalances = Array.isArray(snapshot.walletBalances) ? snapshot.walletBalances : [];
  const wallets = Array.isArray(snapshot.wallets) ? snapshot.wallets : [];
  const source = walletBalances.length ? walletBalances : wallets;

  return source
    .map((wallet) => ({
      ...wallet,
      name: walletName(wallet),
      balance: walletBalance(wallet),
    }))
    .filter((wallet) => wallet.name && wallet.balance !== null && wallet.balance !== undefined);
}

function isPrimaryWalletQuestion(text = "") {
  return text.includes("primary wallet") || text.includes("main wallet") || text.includes("first wallet") || text.includes("top wallet");
}

function isBalanceQuestion(text = "") {
  return (
    text.includes("how much") ||
    text.includes("balance") ||
    text.includes("money left") ||
    text.includes("current money") ||
    text.includes("currently have") ||
    text.includes("available money") ||
    text.includes("check my money") ||
    isPrimaryWalletQuestion(text)
  );
}

function findRequestedWallet(prompt = "", wallets = []) {
  const text = normalizeText(prompt);
  const compact = compactKey(prompt);

  for (const wallet of wallets) {
    const name = normalizeText(wallet.name);
    const key = compactKey(wallet.name);
    if (!key) continue;

    const exactWord = text.split(" ").includes(name);
    const compactMatch = key.length > 1 && compact.includes(key);
    const singleLetterMatch = key.length === 1 && text.split(" ").includes(key);

    if (exactWord || compactMatch || singleLetterMatch) return wallet;
  }

  return null;
}

export function buildContextualFinanceReply(prompt, context) {
  const text = normalizeText(prompt);

  if (text.includes("talk to clara context mode is active")) return "";
  if (!isBalanceQuestion(text)) return "";

  const snapshot = buildClaraFinanceSnapshot(context || {});
  const wallets = getWallets(snapshot);
  const primaryWallet = wallets[0] || null;
  const requestedWallet = isPrimaryWalletQuestion(text)
    ? primaryWallet
    : findRequestedWallet(prompt, wallets);

  if (requestedWallet) {
    const amount = formatMoney(requestedWallet.balance);
    if (!amount) return `I found ${requestedWallet.name}, but I cannot calculate its balance clearly yet.`;

    return isPrimaryWalletQuestion(text)
      ? `Your primary wallet is ${requestedWallet.name}, and it currently has ${amount}.`
      : `${requestedWallet.name} currently has ${amount}.`;
  }

  const total = snapshot.availableMoney ?? snapshot.totalWalletBalance ?? snapshot.totalBalance;
  const totalText = formatMoney(total);

  if (!totalText) {
    return snapshot.hasAnyData
      ? "I can see your finance data, but I cannot calculate the wallet total clearly yet. Open your wallet card and refresh once."
      : "I do not see wallet data yet. Add a wallet first, then I can answer your current money accurately.";
  }

  const breakdown = wallets
    .slice(0, 5)
    .map((wallet) => `${wallet.name}: ${formatMoney(wallet.balance)}`)
    .join(", ");

  return `You currently have ${totalText} available across your wallets.${breakdown ? ` That includes ${breakdown}.` : ""}`;
}
