const PHYSICAL_WALLET_PATTERNS = [
  /\blost\s+(my\s+)?wallet\b/,
  /\b(leather|physical|real world|real)\s+wallet\b/,
  /\bwallet\s+(got\s+)?(stolen|snatched|missing)\b/,
  /\bstolen\s+wallet\b/,
  /\bwallet\s+(design|brand|brands|case|holder)\b/,
];

const WALLET_QUERY_PATTERNS = [
  /\bwallets?\b/,
  /\bmy\s+wallets?\b/,
  /\bclara\s+wallets?\b/,
  /\bsee\s+my\s+wallets?\b/,
  /\bwhy\s+(you\s+)?cant\s+see\s+my\s+wallet\b/,
  /\bwhy\s+(you\s+)?cannot\s+see\s+my\s+wallet\b/,
  /\bwallet\s+balance\b/,
  /\bavailable\s+money\b/,
  /\bavailable\s+across\s+accounts\b/,
  /\baccount\s+balances?\b/,
  /\bbalances?\b/,
  /\bmoney\s+safe\s+to\s+use\b/,
  /\bspendable\s+money\b/,
  /\bgcash\s+wallet\b/,
  /\bmaya\s+wallet\b/,
  /\bcash\s+wallet\b/,
  /\bbank\s+wallet\b/,
];

const KNOWN_WALLET_TERMS = [
  { key: "gcash", label: "GCash" },
  { key: "maya", label: "Maya" },
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const number = Number(
    String(value ?? "0")
      .replace(/php/gi, "")
      .replace(/[₱,\s]/g, "")
      .replace(/[^0-9.-]/g, "")
  );
  return Number.isFinite(number) ? number : 0;
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const number = toNumber(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function getWalletId(wallet = {}) {
  return String(wallet.id || wallet.wallet_id || wallet.walletId || wallet.local_id || "").trim();
}

function getWalletName(wallet = {}) {
  return String(wallet.name || wallet.wallet_name || wallet.title || wallet.label || "Wallet").trim() || "Wallet";
}

function getWalletBalance(wallet = {}) {
  return firstNumber(
    wallet.balance,
    wallet.derived_balance,
    wallet.current_balance,
    wallet.wallet_balance,
    wallet.available_balance,
    wallet.starting_balance
  );
}

function isActiveWallet(wallet) {
  if (!wallet || typeof wallet !== "object") return false;
  if (!getWalletId(wallet)) return false;
  if (wallet.deletedAt || wallet.deleted_at) return false;
  if (wallet.is_archived === true || normalizeText(wallet.is_archived) === "true") return false;
  return true;
}

function detectWalletQuery(message = "") {
  const text = normalizeText(message);
  if (!text) return false;
  if (PHYSICAL_WALLET_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (text.includes("wallet")) return true;
  return WALLET_QUERY_PATTERNS.some((pattern) => pattern.test(text));
}

function parsePesoText(value) {
  return toNumber(value);
}

function getWalletCardSnapshot(context = {}) {
  const cards = Array.isArray(context.dashboardCardsLiveSnapshot?.cards)
    ? context.dashboardCardsLiveSnapshot.cards
    : [];

  return cards.find((card) => card?.key === "wallet" || card?.type === "wallet") || null;
}

function summarizeWallets(context = {}) {
  const hasWalletList = Array.isArray(context.wallets);

  if (hasWalletList) {
    const wallets = context.wallets
      .filter(isActiveWallet)
      .map((wallet) => ({
        id: getWalletId(wallet),
        name: getWalletName(wallet),
        balance: getWalletBalance(wallet),
      }));

    return {
      connected: true,
      wallets,
      totalBalance: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
      walletCount: wallets.length,
      source: "wallets",
    };
  }

  const walletCard = getWalletCardSnapshot(context);
  if (walletCard) {
    const totalBalance = parsePesoText(walletCard.primaryValue);
    const walletCount = Number(walletCard.recordCount || 0);

    return {
      connected: true,
      wallets: [],
      totalBalance,
      walletCount: Number.isFinite(walletCount) ? walletCount : 0,
      source: "dashboardCardsLiveSnapshot",
    };
  }

  return {
    connected: false,
    wallets: [],
    totalBalance: 0,
    walletCount: 0,
    source: "missing",
  };
}

function findRequestedWallet(message = "", wallets = []) {
  const text = normalizeText(message);
  if (!text) return { wallet: null, label: "" };

  const matchedWallet = wallets.find((wallet) => {
    const name = normalizeText(wallet.name);
    return name && (text.includes(name) || name.includes(text.replace(/\b(show|check|my|wallet|balance|how much|in)\b/g, "").trim()));
  });

  if (matchedWallet) return { wallet: matchedWallet, label: matchedWallet.name };

  const knownTerm = KNOWN_WALLET_TERMS.find((term) => new RegExp(`\\b${term.key}\\b`).test(text));
  return { wallet: null, label: knownTerm?.label || "" };
}

function walletLine(wallet, index) {
  return `${index + 1}. ${wallet.name} — ${peso(wallet.balance)}`;
}

function buildWalletListReply(summary) {
  const visibleWallets = summary.wallets.slice(0, 6);
  const moreCount = Math.max(summary.wallets.length - visibleWallets.length, 0);
  const lines = visibleWallets.map(walletLine).join("\n");
  const moreLine = moreCount > 0 ? `\nPlus ${moreCount} more wallet(s).` : "";

  return `I checked your CLARA Wallets. You have ${peso(summary.totalBalance)} visible across ${summary.walletCount} wallet(s).\n\nWallets I can see:\n${lines}${moreLine}\n\nSo yes — inside CLARA, when you say “my wallet,” I treat that as your CLARA Wallets, not a physical wallet.`;
}

function buildWalletCardFallbackReply(summary) {
  if (summary.walletCount > 0) {
    return `I checked your CLARA Wallets. Wallet Hub shows ${peso(summary.totalBalance)} visible across ${summary.walletCount} wallet(s), but detailed wallet names are not loaded in this chat yet.`;
  }

  return "I checked your CLARA Wallets, but I don’t see any saved wallets yet.";
}

export function buildWalletDirectReply(message = "", context = {}) {
  if (!detectWalletQuery(message)) return "";

  const summary = summarizeWallets(context);
  const hasWalletData = summary.wallets.length > 0 || summary.walletCount > 0;

  if ((context.loading || context.refreshing) && !hasWalletData) {
    return "I’m still loading your CLARA wallet data. Try again in a moment.";
  }

  if (!summary.connected) {
    return "I checked CLARA’s Wallets context, but wallet data is not connected to this chat yet.";
  }

  if (!summary.wallets.length) {
    return summary.source === "dashboardCardsLiveSnapshot"
      ? buildWalletCardFallbackReply(summary)
      : "I checked your CLARA Wallets, but I don’t see any saved wallets yet.";
  }

  const requested = findRequestedWallet(message, summary.wallets);
  if (requested.label) {
    if (!requested.wallet) {
      return `I checked your CLARA Wallets, but I don’t see a ${requested.label} wallet saved yet.`;
    }

    return `I checked your CLARA Wallets. ${requested.wallet.name} shows ${peso(requested.wallet.balance)}.\n\nAcross all visible wallets, you have ${peso(summary.totalBalance)} across ${summary.walletCount} wallet(s).`;
  }

  return buildWalletListReply(summary);
}

export {
  detectWalletQuery,
  getWalletBalance,
  getWalletId,
  getWalletName,
  isActiveWallet,
  normalizeText,
  peso,
  summarizeWallets,
  toNumber,
};
