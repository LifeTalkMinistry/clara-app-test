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
  /\bwallet\s+balance\b/,
  /\bcurrent\s+balance\b/,
  /\brecorded\s+balance\b/,
  /\bavailable\s+money\b/,
  /\bavailable\s+to\s+spend\b/,
  /\bcan\s+i\s+spend\b/,
  /\bhow\s+much\s+can\s+i\s+spend\b/,
  /\bmoney\s+safe\s+to\s+use\b/,
  /\bsafe\s+to\s+use\b/,
  /\bspendable\s+money\b/,
  /\bprotected\s+money\b/,
  /\bprotected\b/,
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
  const number = Number(String(value ?? "0").replace(/php/gi, "").replace(/[₱,\s]/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const number = toNumber(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
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
    wallet.currentBalance,
    wallet.balance,
    wallet.current_balance,
    wallet.wallet_balance,
    wallet.derived_balance,
    wallet.starting_balance
  ) ?? 0;
}

function getWalletProtectedBalance(wallet = {}) {
  return firstNumber(wallet.totalProtectedAmount, wallet.total_protected_amount) ?? 0;
}

function getWalletSpendableBalance(wallet = {}) {
  return firstNumber(
    wallet.spendableBalance,
    wallet.spendable_balance,
    wallet.walletSpendableBalance,
    wallet.wallet_spendable_balance
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

function detectWalletMoneyConcept(message = "") {
  const text = normalizeText(message);
  if (/\b(protected|protection|reserved)\b/.test(text)) return "protected";
  if (/\b(spendable|available to spend|safe to use|safe money|money i can spend|can i spend|can spend|how much can i spend)\b/.test(text)) {
    return "spendable";
  }
  if (/\b(current balance|recorded balance|wallet balance|money is in|money in my|currently in)\b/.test(text)) {
    return "current";
  }
  return "current";
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
        currentBalance: getWalletBalance(wallet),
        protectedBalance: getWalletProtectedBalance(wallet),
        spendableBalance: getWalletSpendableBalance(wallet),
      }));

    const walletTotals = context.walletTotals || context.canonicalFinancialState?.walletTotals || null;
    return {
      connected: true,
      wallets,
      currentBalance: firstNumber(walletTotals?.currentBalance) ?? wallets.reduce((sum, wallet) => sum + wallet.currentBalance, 0),
      protectedBalance: firstNumber(walletTotals?.totalProtectedAmount) ?? wallets.reduce((sum, wallet) => sum + wallet.protectedBalance, 0),
      spendableBalance: firstNumber(walletTotals?.spendableBalance) ?? (
        wallets.every((wallet) => wallet.spendableBalance !== null && wallet.spendableBalance !== undefined)
          ? wallets.reduce((sum, wallet) => sum + wallet.spendableBalance, 0)
          : null
      ),
      walletCount: wallets.length,
      source: "wallets",
    };
  }

  const walletCard = getWalletCardSnapshot(context);
  if (walletCard) {
    const currentBalance = parsePesoText(walletCard.primaryValue);
    const walletCount = Number(walletCard.recordCount || 0);
    return {
      connected: true,
      wallets: [],
      currentBalance,
      protectedBalance: null,
      spendableBalance: null,
      walletCount: Number.isFinite(walletCount) ? walletCount : 0,
      source: "dashboardCardsLiveSnapshot",
    };
  }

  return {
    connected: false,
    wallets: [],
    currentBalance: 0,
    protectedBalance: null,
    spendableBalance: null,
    walletCount: 0,
    source: "missing",
  };
}

function findRequestedWallet(message = "", wallets = []) {
  const text = normalizeText(message);
  if (!text) return { wallet: null, label: "" };

  const matchedWallet = wallets.find((wallet) => {
    const name = normalizeText(wallet.name);
    return name && (text.includes(name) || name.includes(text.replace(/\b(show|check|my|wallet|balance|how much|in|from|can|spend)\b/g, "").trim()));
  });

  if (matchedWallet) return { wallet: matchedWallet, label: matchedWallet.name };

  const knownTerm = KNOWN_WALLET_TERMS.find((term) => new RegExp(`\\b${term.key}\\b`).test(text));
  if (!knownTerm) return { wallet: null, label: "" };

  const wallet = wallets.find((entry) => normalizeText(entry.name).includes(knownTerm.key)) || null;
  return { wallet, label: knownTerm.label };
}

function walletCurrentLine(wallet, index) {
  return `${index + 1}. ${wallet.name} — ${peso(wallet.currentBalance)}`;
}

function buildWalletListReply(summary) {
  const visibleWallets = summary.wallets.slice(0, 6);
  const moreCount = Math.max(summary.wallets.length - visibleWallets.length, 0);
  const lines = visibleWallets.map(walletCurrentLine).join("\n");
  const moreLine = moreCount > 0 ? `\nPlus ${moreCount} more wallet(s).` : "";

  return `I checked your CLARA Wallets. You have ${peso(summary.currentBalance)} recorded across ${summary.walletCount} wallet(s).\n\nWallets I can see:\n${lines}${moreLine}`;
}

function buildWalletCardFallbackReply(summary) {
  if (summary.walletCount > 0) {
    return `I checked your CLARA Wallets. Wallet Hub shows ${peso(summary.currentBalance)} recorded across ${summary.walletCount} wallet(s), but detailed wallet facts are not loaded in this chat yet.`;
  }
  return "I checked your CLARA Wallets, but I don’t see any saved wallets yet.";
}

function conceptValue(wallet, concept) {
  if (concept === "protected") return wallet.protectedBalance;
  if (concept === "spendable") return wallet.spendableBalance;
  return wallet.currentBalance;
}

function conceptLabel(concept) {
  if (concept === "protected") return "protected";
  if (concept === "spendable") return "spendable";
  return "currently recorded";
}

export function buildWalletDirectReply(message = "", context = {}) {
  if (!detectWalletQuery(message)) return "";

  const summary = summarizeWallets(context);
  const concept = detectWalletMoneyConcept(message);
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
    const value = conceptValue(requested.wallet, concept);
    if (value === null || value === undefined) {
      return `I checked your CLARA Wallets. ${requested.wallet.name} is loaded, but its canonical ${conceptLabel(concept)} amount is not available in this chat context yet.`;
    }
    return `I checked your CLARA Wallets. ${requested.wallet.name} has ${peso(value)} ${conceptLabel(concept)}.`;
  }

  if (concept === "spendable") {
    if (summary.spendableBalance === null || summary.spendableBalance === undefined) {
      return "I checked your CLARA Wallets, but canonical spendable totals are not loaded in this chat context yet.";
    }
    return `I checked your CLARA Wallets. You have ${peso(summary.spendableBalance)} spendable across your active wallets.`;
  }
  if (concept === "protected") {
    if (summary.protectedBalance === null || summary.protectedBalance === undefined) {
      return "I checked your CLARA Wallets, but canonical protected totals are not loaded in this chat context yet.";
    }
    return `I checked your CLARA Wallets. ${peso(summary.protectedBalance)} is protected across your active wallets.`;
  }

  return buildWalletListReply(summary);
}

export {
  detectWalletMoneyConcept,
  detectWalletQuery,
  getWalletBalance,
  getWalletId,
  getWalletName,
  getWalletProtectedBalance,
  getWalletSpendableBalance,
  isActiveWallet,
  normalizeText,
  peso,
  summarizeWallets,
  toNumber,
};
