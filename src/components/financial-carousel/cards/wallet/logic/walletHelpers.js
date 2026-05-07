export const walletTypes = [
  "cash",
  "bank",
  "ewallet",
  "savings",
  "credit",
  "investment",
  "custom",
];

export const legacyWalletTypeMap = {
  gcash: "ewallet",
  maya: "ewallet",
  credit_card: "credit",
  other: "custom",
};

export const walletTypeLabels = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-wallet",
  savings: "Savings",
  credit: "Credit",
  investment: "Investment",
  custom: "Custom",
};

export const walletIcons = {
  cash: "💵",
  bank: "🏦",
  ewallet: "📱",
  savings: "🏆",
  credit: "💳",
  investment: "📈",
  custom: "💰",
};

export const normalizeWalletType = (type) => {
  const normalized = String(type || "cash").trim().toLowerCase();
  return legacyWalletTypeMap[normalized] || (walletTypes.includes(normalized) ? normalized : "custom");
};

export const getWalletTypeLabel = (type) => {
  const normalized = normalizeWalletType(type);
  return walletTypeLabels[normalized] || "Wallet";
};

export const getWalletIcon = (type, fallback = "💰") => {
  const normalized = normalizeWalletType(type);
  return walletIcons[normalized] || fallback;
};

export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const getHistoryTypeLabel = (type) => {
  switch (String(type || "").toLowerCase()) {
    case "add":
      return "Added Money";
    case "income":
      return "Income";
    case "transfer_in":
      return "Transfer In";
    case "transfer_out":
      return "Transfer Out";
    case "expense":
      return "Expense";
    case "reset":
      return "Reset";
    case "savings_goal":
      return "Savings Goal";
    default:
      return String(type || "Transaction")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
  }
};

export const getHistoryAmountPrefix = (type) => {
  const normalized = String(type || "").toLowerCase();
  return ["transfer_out", "expense", "reset", "savings_goal"].includes(normalized)
    ? "-"
    : "+";
};
