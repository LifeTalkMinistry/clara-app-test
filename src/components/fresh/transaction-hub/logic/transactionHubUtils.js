import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  PiggyBank,
  WalletCards,
} from "lucide-react";

export const FILTERS = [
  ["all", "All Transactions"],
  ["expense", "Expenses"],
  ["income", "Income"],
  ["transfer", "Transfers"],
  ["savings", "Savings"],
  ["wallet", "Wallet"],
];

export const DEFAULT_THEME = {
  primary:
    "border-[color:var(--clara-theme-border,rgba(148,163,184,0.24))] bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.08))] text-[color:var(--clara-theme-text,rgba(241,245,249,0.9))]",
  primaryText: "text-[color:var(--clara-theme-text,rgba(241,245,249,0.9))]",
  border: "border-[color:var(--clara-theme-border,rgba(148,163,184,0.2))]",
  glow: "shadow-[0_0_22px_var(--clara-theme-glow,rgba(148,163,184,0.08))]",
  glowSoft:
    "shadow-[0_0_30px_var(--clara-theme-glow,rgba(148,163,184,0.07))]",
  orb: "bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.08))]",
  focus:
    "focus:border-[color:var(--clara-theme-border,rgba(148,163,184,0.32))] focus:shadow-[0_0_20px_var(--clara-theme-glow,rgba(148,163,184,0.08))]",
};

export const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const cleanNumber = (value) => {
  const n = Number(String(value ?? "0").replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

export const parseDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (!hasValue(value)) return new Date();

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const monthKey = (value) => {
  const d = parseDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const formatTime = (value) =>
  parseDate(value).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });

export const formatDateOnly = (value) =>
  parseDate(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const titleCase = (value) =>
  String(value || "Transaction")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const isJsonLike = (value) => {
  const text = String(value || "").trim();
  return (
    text.startsWith("{") ||
    text.startsWith("[") ||
    /"[\w-]+"\s*:/.test(text) ||
    /previous_balance|budget_category|wallet_id/i.test(text)
  );
};

export const isDeletedRecord = (item) =>
  Boolean(
    item?.deletedAt ||
      item?.deleted_at ||
      item?.isDeleted ||
      item?.is_deleted ||
      normalizeText(item?.status) === "deleted"
  );

export const getFirstValue = (item, keys = []) => {
  for (const key of keys) {
    if (hasValue(item?.[key])) return item[key];
  }
  return "";
};

export const getLast12Months = () => {
  const now = new Date();

  return Array.from({ length: 12 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - index, 1);

    return {
      key: monthKey(d),
      label: d.toLocaleDateString("en-PH", {
        month: "short",
        year: "numeric",
      }),
    };
  });
};

export function isEmergencyFundAllocation(item = {}) {
  const raw = item?.raw || item || {};
  const text = [
    raw.title,
    raw.name,
    raw.category,
    raw.budget_category,
    raw.budgetCategory,
    raw.reason,
    raw.notes,
    raw.note,
    raw.description,
    raw.type,
    raw.source_type,
    raw.sourceType,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return Boolean(
    raw.emergency_fund_transaction_id ||
      raw.emergencyFundTransactionId ||
      raw.emergency_fund_id ||
      raw.emergencyFundId ||
      text.includes("emergency fund allocation") ||
      text.includes("moved to emergency fund") ||
      text.includes("emergency allocation")
  );
}

export const getGroup = (item) => {
  if (isEmergencyFundAllocation(item)) return "savings";
  if (item?.__activityGroup) return item.__activityGroup;

  const type = normalizeText(item?.type);
  const category = normalizeText(item?.category);
  const sourceType = normalizeText(item?.source_type || item?.sourceType);

  if (type.includes("transfer") || sourceType.includes("transfer")) {
    return "transfer";
  }

  if (
    type.includes("saving") ||
    category.includes("saving") ||
    sourceType.includes("saving") ||
    type.includes("emergency") ||
    category.includes("emergency") ||
    sourceType.includes("emergency")
  ) {
    return "savings";
  }

  if (
    type.includes("income") ||
    type.includes("deposit") ||
    type.includes("credit") ||
    type.includes("add") ||
    sourceType.includes("income") ||
    sourceType.includes("deposit")
  ) {
    return "income";
  }

  if (
    type.includes("expense") ||
    type.includes("debit") ||
    type.includes("cashout") ||
    type.includes("withdraw") ||
    sourceType.includes("expense")
  ) {
    return "expense";
  }

  return "wallet";
};

export const isLinkedExpenseWalletTransaction = (item) => {
  const type = normalizeText(item?.type);
  const sourceType = normalizeText(item?.source_type || item?.sourceType);

  return (
    type === "expense" ||
    sourceType === "expense" ||
    hasValue(item?.expense_id) ||
    hasValue(item?.expenseId)
  );
};

export const getStableDedupeKey = (item, group, source, fallback) => {
  const expenseId = getFirstValue(item, ["expense_id", "expenseId"]);
  if (expenseId) return `expense:${expenseId}`;

  const transferId = getFirstValue(item, [
    "transfer_group_id",
    "transferGroupId",
    "transfer_id",
    "transferId",
  ]);
  if (transferId) return `transfer:${transferId}`;

  const savingsId = getFirstValue(item, [
    "savings_transaction_id",
    "savingsTransactionId",
    "savings_goal_id",
    "savingsGoalId",
  ]);
  if (savingsId) return `savings:${savingsId}`;

  const emergencyId = getFirstValue(item, [
    "emergency_fund_transaction_id",
    "emergencyFundTransactionId",
    "emergency_fund_id",
    "emergencyFundId",
  ]);
  if (emergencyId) return `emergency:${emergencyId}`;

  const transactionId = getFirstValue(item, [
    "transaction_id",
    "transactionId",
    "wallet_transaction_id",
    "walletTransactionId",
  ]);
  if (transactionId) return `${group}:transaction:${transactionId}`;

  const localId = getFirstValue(item, ["local_id", "localId"]);
  if (localId) return `${group}:local:${localId}`;

  const id = getFirstValue(item, ["id"]);
  if (id) return `${group}:${source}:id:${id}`;

  return fallback;
};

export const getEditableRawId = (item) =>
  getFirstValue(item?.raw || item || {}, [
    "id",
    "transfer_group_id",
    "transferGroupId",
    "group_id",
    "groupId",
    "reference_id",
    "referenceId",
    "local_id",
    "localId",
    "transaction_id",
    "transactionId",
    "wallet_transaction_id",
    "walletTransactionId",
    "transfer_id",
    "transferId",
  ]);

export const getEditableWalletId = (item) =>
  getFirstValue(item?.raw || item || {}, [
    "wallet_id",
    "walletId",
    "from_wallet_id",
    "fromWalletId",
    "source_wallet_id",
    "sourceWalletId",
  ]);

export const getEditableTransferFromWalletId = (item) =>
  getFirstValue(item?.raw || item || {}, [
    "from_wallet_id",
    "fromWalletId",
    "source_wallet_id",
    "sourceWalletId",
    "wallet_id",
    "walletId",
  ]);

export const getEditableTransferToWalletId = (item) =>
  getFirstValue(item?.raw || item || {}, [
    "to_wallet_id",
    "toWalletId",
    "destination_wallet_id",
    "destinationWalletId",
    "related_wallet_id",
    "relatedWalletId",
  ]);

export const toInputDate = (value) => {
  const d = parseDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export const buildEditFormFromTransaction = (item) => ({
  id: getEditableRawId(item),
  title: item?.title || "",
  amount: String(Math.abs(cleanNumber(item?.amount || item?.signedAmount || 0))),
  category: item?.category || "",
  walletId: getEditableWalletId(item),
  fromWalletId: getEditableTransferFromWalletId(item),
  toWalletId: getEditableTransferToWalletId(item),
  note: item?.note || "",
  date: toInputDate(item?.date || new Date()),
});

export const getSignedAmountByGroup = (group, amount) => {
  const safeAmount = Math.abs(cleanNumber(amount));

  if (group === "expense") return -safeAmount;
  if (group === "savings") return -safeAmount;
  if (group === "income") return safeAmount;
  if (group === "transfer") return 0;

  return cleanNumber(amount);
};

export const getIcon = (group) => {
  if (group === "expense") return ArrowUpRight;
  if (group === "income") return ArrowDownLeft;
  if (group === "transfer") return ArrowLeftRight;
  if (group === "savings") return PiggyBank;
  return WalletCards;
};

export const getToneClasses = (group, signedAmount = 0) => {
  if (group === "expense") {
    return {
      glow: "bg-rose-300/8",
      border: "border-rose-200/14",
      icon: "bg-rose-300/8 text-rose-50/82 shadow-[0_0_20px_rgba(251,113,133,0.08)]",
      amount: "text-rose-50/88",
      rail: "bg-rose-200/35",
    };
  }

  if (group === "income") {
    return {
      glow: "bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.08))]",
      border: "border-[color:var(--clara-theme-border,rgba(148,163,184,0.18))]",
      icon: "bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.08))] text-[color:var(--clara-theme-text,rgba(241,245,249,0.88))] shadow-[0_0_20px_var(--clara-theme-glow,rgba(148,163,184,0.08))]",
      amount: "text-[color:var(--clara-theme-text,rgba(241,245,249,0.9))]",
      rail: "bg-[color:var(--clara-theme-line,rgba(148,163,184,0.34))]",
    };
  }

  if (group === "transfer") {
    return {
      glow:
        "bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.08))]",
      border:
        "border-[color:var(--clara-theme-secondary-border,rgba(125,211,252,0.16))]",
      icon:
        "bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.08))] text-sky-50/82 shadow-[0_0_20px_var(--clara-theme-secondary-glow,rgba(125,211,252,0.08))]",
      amount: "text-sky-50/82",
      rail:
        "bg-[color:var(--clara-theme-secondary-line,rgba(125,211,252,0.32))]",
    };
  }

  if (group === "savings") {
    return {
      glow: "bg-violet-300/8",
      border: "border-violet-200/14",
      icon:
        "bg-violet-300/8 text-violet-50/82 shadow-[0_0_20px_rgba(167,139,250,0.08)]",
      amount: "text-violet-50/88",
      rail: "bg-violet-200/34",
    };
  }

  return {
    glow:
      signedAmount >= 0
        ? "bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))]"
        : "bg-rose-300/7",
    border: "border-white/10",
    icon: "bg-white/[0.07] text-white/72",
    amount: signedAmount >= 0 ? "text-white/88" : "text-rose-50/85",
    rail: "bg-white/22",
  };
};

export const startOfDay = (dateValue) => {
  const d = parseDate(dateValue);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const daysBetween = (dateValue) => {
  const today = startOfDay(new Date());
  const target = startOfDay(dateValue);

  return Math.floor((today.getTime() - target.getTime()) / 86400000);
};

export const getTimelineKey = (dateValue) => {
  const diff = daysBetween(dateValue);

  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff >= 2 && diff <= 6) return "thisWeek";

  return "earlier";
};

export const TIMELINE_GROUPS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
];

export const getBudgetCategory = (item) =>
  normalizeText(
    item?.category || item?.budget_category || item?.name || item?.title
  );

export const getBudgetAmount = (budget) =>
  cleanNumber(
    budget?.allocated_amount ||
      budget?.allocatedAmount ||
      budget?.amount ||
      budget?.limit ||
      budget?.budget ||
      budget?.target_amount ||
      budget?.targetAmount
  );

export const getBudgetMonthKey = (budget) => {
  const explicitMonth =
    budget?.month ||
    budget?.month_key ||
    budget?.monthKey ||
    budget?.period ||
    budget?.budget_month ||
    budget?.budgetMonth;

  if (hasValue(explicitMonth)) {
    const text = String(explicitMonth).trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    return monthKey(text);
  }

  const date =
    budget?.range_start ||
    budget?.rangeStart ||
    budget?.start_date ||
    budget?.startDate ||
    budget?.created_at ||
    budget?.createdAt ||
    new Date();

  return monthKey(date);
};

export function getTimelineStats(items) {
  const expenses = items
    .filter((item) => item.group === "expense")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  const savings = items
    .filter((item) => item.group === "savings")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  const income = items
    .filter((item) => item.group === "income")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  return {
    spent: expenses + savings,
    income,
    total: income - expenses - savings,
    count: items.length,
  };
}
