export const WALLET_PROVIDER_GROUPS = [
  {
    key: "traditional_banks",
    label: "Banks",
    description: "Common Philippine traditional banks.",
    providers: [
      { key: "bdo", label: "BDO", iconText: "BDO", walletType: "bank", defaultWalletName: "BDO Wallet", accent: "#facc15", iconBg: "#123f8c", iconTextColor: "#ffffff" },
      { key: "bpi", label: "BPI", iconText: "BPI", walletType: "bank", defaultWalletName: "BPI Wallet", accent: "#dc2626", iconBg: "#991b1b", iconTextColor: "#ffffff" },
      { key: "metrobank", label: "Metrobank", iconText: "MB", walletType: "bank", defaultWalletName: "Metrobank Wallet", accent: "#2563eb", iconBg: "#1d4ed8", iconTextColor: "#ffffff" },
      { key: "rcbc", label: "RCBC", iconText: "RC", walletType: "bank", defaultWalletName: "RCBC Wallet", accent: "#2563eb", iconBg: "#1e40af", iconTextColor: "#ffffff" },
      { key: "security_bank", label: "Security Bank", iconText: "SB", walletType: "bank", defaultWalletName: "Security Bank Wallet", accent: "#ef4444", iconBg: "#b91c1c", iconTextColor: "#ffffff" },
      { key: "unionbank", label: "UnionBank", iconText: "UB", walletType: "bank", defaultWalletName: "UnionBank Wallet", accent: "#f97316", iconBg: "#ea580c", iconTextColor: "#ffffff" },
      { key: "pnb", label: "PNB", iconText: "PNB", walletType: "bank", defaultWalletName: "PNB Wallet", accent: "#dc2626", iconBg: "#991b1b", iconTextColor: "#ffffff" },
      { key: "eastwest", label: "EastWest", iconText: "EW", walletType: "bank", defaultWalletName: "EastWest Wallet", accent: "#dc2626", iconBg: "#b91c1c", iconTextColor: "#ffffff" },
      { key: "chinabank", label: "China Bank", iconText: "CB", walletType: "bank", defaultWalletName: "China Bank Wallet", accent: "#dc2626", iconBg: "#991b1b", iconTextColor: "#ffffff" },
      { key: "landbank", label: "Landbank", iconText: "LB", walletType: "bank", defaultWalletName: "Landbank Wallet", accent: "#16a34a", iconBg: "#166534", iconTextColor: "#ffffff" },
      { key: "dbp", label: "DBP", iconText: "DBP", walletType: "bank", defaultWalletName: "DBP Wallet", accent: "#2563eb", iconBg: "#1d4ed8", iconTextColor: "#ffffff" },
      { key: "aub", label: "AUB", iconText: "AUB", walletType: "bank", defaultWalletName: "AUB Wallet", accent: "#2563eb", iconBg: "#1e3a8a", iconTextColor: "#ffffff" },
      { key: "psbank", label: "PSBank", iconText: "PS", walletType: "bank", defaultWalletName: "PSBank Wallet", accent: "#2563eb", iconBg: "#1d4ed8", iconTextColor: "#ffffff" },
      { key: "maybank", label: "Maybank", iconText: "MY", walletType: "bank", defaultWalletName: "Maybank Wallet", accent: "#facc15", iconBg: "#111827", iconTextColor: "#fde68a" },
      { key: "ctbc", label: "CTBC", iconText: "CT", walletType: "bank", defaultWalletName: "CTBC Wallet", accent: "#16a34a", iconBg: "#166534", iconTextColor: "#ffffff" },
    ],
  },
  {
    key: "digital_banks",
    label: "Digital Banks",
    description: "Digital banks and high-interest savings wallets.",
    providers: [
      { key: "seabank", label: "SeaBank", iconText: "Sea", walletType: "savings", defaultWalletName: "SeaBank Savings", accent: "#f97316", iconBg: "#f97316", iconTextColor: "#ffffff" },
      { key: "maya_bank", label: "Maya Bank", iconText: "M", walletType: "savings", defaultWalletName: "Maya Bank Savings", accent: "#22c55e", iconBg: "#16a34a", iconTextColor: "#ffffff" },
      { key: "gotyme", label: "GoTyme", iconText: "GT", walletType: "savings", defaultWalletName: "GoTyme Wallet", accent: "#facc15", iconBg: "#111827", iconTextColor: "#fde047" },
      { key: "tonik", label: "Tonik", iconText: "T", walletType: "savings", defaultWalletName: "Tonik Savings", accent: "#a855f7", iconBg: "#7e22ce", iconTextColor: "#ffffff" },
      { key: "cimb", label: "CIMB", iconText: "C", walletType: "savings", defaultWalletName: "CIMB Savings", accent: "#dc2626", iconBg: "#b91c1c", iconTextColor: "#ffffff" },
      { key: "uno", label: "UNO Digital Bank", iconText: "UNO", walletType: "savings", defaultWalletName: "UNO Savings", accent: "#2563eb", iconBg: "#1d4ed8", iconTextColor: "#ffffff" },
      { key: "uniondigital", label: "UnionDigital", iconText: "UD", walletType: "savings", defaultWalletName: "UnionDigital Wallet", accent: "#f97316", iconBg: "#ea580c", iconTextColor: "#ffffff" },
      { key: "komo", label: "Komo", iconText: "K", walletType: "savings", defaultWalletName: "Komo Savings", accent: "#38bdf8", iconBg: "#0284c7", iconTextColor: "#ffffff" },
      { key: "diskartech", label: "DiskarTech", iconText: "DT", walletType: "savings", defaultWalletName: "DiskarTech Wallet", accent: "#f97316", iconBg: "#ea580c", iconTextColor: "#ffffff" },
      { key: "maribank", label: "MariBank", iconText: "MB", walletType: "savings", defaultWalletName: "MariBank Savings", accent: "#f97316", iconBg: "#f97316", iconTextColor: "#ffffff" },
      { key: "ownbank", label: "OwnBank", iconText: "OB", walletType: "savings", defaultWalletName: "OwnBank Savings", accent: "#2563eb", iconBg: "#1d4ed8", iconTextColor: "#ffffff" },
      { key: "netbank", label: "NetBank", iconText: "NB", walletType: "savings", defaultWalletName: "NetBank Savings", accent: "#14b8a6", iconBg: "#0f766e", iconTextColor: "#ffffff" },
      { key: "ofbank", label: "OFBank", iconText: "OF", walletType: "savings", defaultWalletName: "OFBank Wallet", accent: "#2563eb", iconBg: "#1d4ed8", iconTextColor: "#ffffff" },
    ],
  },
  {
    key: "ewallets",
    label: "E-wallets / Fintech",
    description: "Mobile wallets and payment apps.",
    providers: [
      { key: "gcash", label: "GCash", iconText: "G", walletType: "ewallet", defaultWalletName: "GCash Wallet", accent: "#2563eb", iconBg: "#2563eb", iconTextColor: "#ffffff" },
      { key: "maya_wallet", label: "Maya Wallet", iconText: "M", walletType: "ewallet", defaultWalletName: "Maya Wallet", accent: "#22c55e", iconBg: "#16a34a", iconTextColor: "#ffffff" },
      { key: "grabpay", label: "GrabPay", iconText: "Grab", walletType: "ewallet", defaultWalletName: "GrabPay Wallet", accent: "#22c55e", iconBg: "#15803d", iconTextColor: "#ffffff" },
      { key: "shopeepay", label: "ShopeePay", iconText: "S", walletType: "ewallet", defaultWalletName: "ShopeePay Wallet", accent: "#f97316", iconBg: "#ea580c", iconTextColor: "#ffffff" },
      { key: "coinsph", label: "Coins.ph", iconText: "₿", walletType: "ewallet", defaultWalletName: "Coins.ph Wallet", accent: "#facc15", iconBg: "#ca8a04", iconTextColor: "#111827" },
      { key: "palawanpay", label: "PalawanPay", iconText: "PP", walletType: "ewallet", defaultWalletName: "PalawanPay Wallet", accent: "#facc15", iconBg: "#facc15", iconTextColor: "#111827" },
      { key: "cebuana", label: "Cebuana Lhuillier", iconText: "CL", walletType: "ewallet", defaultWalletName: "Cebuana Wallet", accent: "#facc15", iconBg: "#ca8a04", iconTextColor: "#111827" },
      { key: "mlhuillier", label: "MLhuillier", iconText: "ML", walletType: "ewallet", defaultWalletName: "MLhuillier Wallet", accent: "#dc2626", iconBg: "#b91c1c", iconTextColor: "#ffffff" },
    ],
  },
  {
    key: "other_wallets",
    label: "Other Wallets",
    description: "Offline or custom money containers.",
    providers: [
      { key: "cash", label: "Cash", iconText: "₱", walletType: "cash", defaultWalletName: "Cash Wallet", accent: "#22c55e", iconBg: "#166534", iconTextColor: "#ffffff" },
      { key: "savings", label: "Savings", iconText: "SV", walletType: "savings", defaultWalletName: "Savings Wallet", accent: "#14b8a6", iconBg: "#0f766e", iconTextColor: "#ffffff" },
      { key: "emergency_fund", label: "Emergency Fund", iconText: "EF", walletType: "savings", defaultWalletName: "Emergency Fund", accent: "#06b6d4", iconBg: "#0e7490", iconTextColor: "#ffffff" },
      { key: "investment", label: "Investment", iconText: "INV", walletType: "investment", defaultWalletName: "Investment Wallet", accent: "#a855f7", iconBg: "#7e22ce", iconTextColor: "#ffffff" },
      { key: "business", label: "Business", iconText: "BIZ", walletType: "business", defaultWalletName: "Business Wallet", accent: "#38bdf8", iconBg: "#0369a1", iconTextColor: "#ffffff" },
      { key: "travel", label: "Travel", iconText: "TR", walletType: "custom", defaultWalletName: "Travel Wallet", accent: "#f59e0b", iconBg: "#b45309", iconTextColor: "#ffffff" },
      { key: "custom", label: "Custom", iconText: "+", walletType: "custom", defaultWalletName: "Custom Wallet", accent: "#94a3b8", iconBg: "#334155", iconTextColor: "#ffffff" },
    ],
  },
];

export const WALLET_PROVIDERS = WALLET_PROVIDER_GROUPS.flatMap((group) =>
  group.providers.map((provider) => ({
    ...provider,
    categoryKey: group.key,
    categoryLabel: group.label,
  }))
);

export const DEFAULT_WALLET_PROVIDER_KEY = "cash";

export function getWalletProvider(providerKey, fallbackType = "cash") {
  const normalizedKey = String(providerKey || "").trim().toLowerCase();
  const exact = WALLET_PROVIDERS.find((provider) => provider.key === normalizedKey);

  if (exact) return exact;

  const normalizedType = String(fallbackType || "cash").trim().toLowerCase();
  return (
    WALLET_PROVIDERS.find((provider) => provider.walletType === normalizedType) ||
    WALLET_PROVIDERS.find((provider) => provider.key === DEFAULT_WALLET_PROVIDER_KEY) ||
    WALLET_PROVIDERS[0]
  );
}

export function getWalletProviderFromWallet(wallet = {}) {
  return getWalletProvider(
    wallet?.provider_key || wallet?.providerKey || wallet?.bank_key || wallet?.institution_key || wallet?.icon_key,
    wallet?.type
  );
}

export function buildWalletProviderPayload(providerKey) {
  const provider = getWalletProvider(providerKey);

  return {
    provider_key: provider.key,
    provider_label: provider.label,
    provider_category: provider.categoryKey,
    provider_category_label: provider.categoryLabel,
    provider_icon_text: provider.iconText,
    provider_accent: provider.accent,
    wallet_brand_color: provider.accent,
    icon_bg: provider.iconBg,
    icon_text_color: provider.iconTextColor,
  };
}

export function isLikelyProviderName(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;

  return WALLET_PROVIDERS.some((provider) =>
    [provider.label, provider.defaultWalletName]
      .map((text) => String(text || "").trim().toLowerCase())
      .includes(normalized)
  );
}
