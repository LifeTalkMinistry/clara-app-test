import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Receipt,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import { getWalletBalance } from "@/utils/financialEngine";

const categories = [
  "food",
  "transport",
  "housing",
  "utilities",
  "entertainment",
  "shopping",
  "health",
  "education",
  "personal",
  "other",
];

const needTypes = ["need", "want", "savings"];
const planningStatuses = ["planned", "unplanned", "undocumented"];

const LOCAL_FINANCE_VERSION = 1;
const LOCAL_FINANCE_PREFIX = "clara_local_finance_v1";
const LOCAL_FINANCE_LAST_KEY = `${LOCAL_FINANCE_PREFIX}:last`;


const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MINUTES = 8 * 60;

const pad = (n) => String(n).padStart(2, "0");

const parseSupabaseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const getPHParts = (value = new Date()) => {
  const date = parseSupabaseDate(value) || new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
};

const getPHDateString = (value = new Date()) => {
  const { year, month, day } = getPHParts(value);
  return `${year}-${pad(month)}-${pad(day)}`;
};

const phLocalPartsToUtcDate = ({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
}) => {
  const utcMillis =
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
    PH_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcMillis);
};

const parsePHDateOnlyToUtcDate = (dateValue, endOfDay = false) => {
  if (!dateValue) return null;

  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) return null;

  return phLocalPartsToUtcDate({
    year,
    month,
    day,
    hour: endOfDay ? 23 : 0,
    minute: endOfDay ? 59 : 0,
    second: endOfDay ? 59 : 0,
    millisecond: endOfDay ? 999 : 0,
  });
};

const getToday = () => getPHDateString();

const toDateOnly = (value) => {
  if (!value) return "";
  const d = parseSupabaseDate(value);
  if (!d) return "";
  return getPHDateString(d);
};

const toDateInputValue = (value) => {
  if (!value) return getToday();

  const d = parseSupabaseDate(value);
  if (d) return getPHDateString(d);

  const raw = String(value).slice(0, 10);
  return raw || getToday();
};

const formatLocalDateTime = (value) => {
  const d = parseSupabaseDate(value);
  if (!d) return "";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
};

const buildCreatedAtFromDate = (dateValue, baseTimeValue = null) => {
  const baseParts = baseTimeValue ? getPHParts(baseTimeValue) : getPHParts(new Date());

  if (!dateValue) {
    return phLocalPartsToUtcDate({
      year: baseParts.year,
      month: baseParts.month,
      day: baseParts.day,
      hour: baseParts.hour,
      minute: baseParts.minute,
      second: baseParts.second,
      millisecond: 0,
    }).toISOString();
  }

  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) {
    return phLocalPartsToUtcDate({
      year: baseParts.year,
      month: baseParts.month,
      day: baseParts.day,
      hour: baseParts.hour,
      minute: baseParts.minute,
      second: baseParts.second,
      millisecond: 0,
    }).toISOString();
  }

  return phLocalPartsToUtcDate({
    year,
    month,
    day,
    hour: baseParts.hour,
    minute: baseParts.minute,
    second: baseParts.second,
    millisecond: 0,
  }).toISOString();
};

const EMPTY_FORM = {
  amount: "",
  category: "food",
  wallet_id: "",
  date: getToday(),
  notes: "",
  need_type: "need",
  planning_status: "planned",
  unplanned_reason: "",
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeString = (value) => String(value ?? "").trim();

const normalizeNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizePlanningStatus = (value) => {
  const normalized = String(value || "planned").trim().toLowerCase();
  return planningStatuses.includes(normalized) ? normalized : "planned";
};

const isOwnedByUser = (item, user) => {
  if (!user) return false;

  const userEmail = normalizeString(user?.email).toLowerCase();
  const currentUserId = normalizeString(user?.id);

  const possibleEmails = [
    item?.created_by,
    item?.user_email,
    item?.owner_email,
    item?.email,
  ]
    .map((v) => normalizeString(v).toLowerCase())
    .filter(Boolean);

  const possibleUserIds = [item?.user_id, item?.owner_id, item?.profile_id]
    .map((v) => normalizeString(v))
    .filter(Boolean);

  if (userEmail && possibleEmails.includes(userEmail)) return true;
  if (currentUserId && possibleUserIds.includes(currentUserId)) return true;

  return false;
};

const sortByDateDesc = (a, b) => {
  const aTime = parseSupabaseDate(a?.created_at || a?.date || 0)?.getTime() ?? 0;
  const bTime = parseSupabaseDate(b?.created_at || b?.date || 0)?.getTime() ?? 0;
  return bTime - aTime;
};

const getTransactionDateObject = (txn) => {
  const exactRaw =
    txn?.created_at ||
    txn?.timestamp ||
    txn?.datetime ||
    txn?.updated_at ||
    txn?.date;

  if (exactRaw) {
    const exactDate = parseSupabaseDate(exactRaw);
    if (exactDate) return exactDate;
  }

  if (txn?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(txn.date))) {
    return parsePHDateOnlyToUtcDate(String(txn.date), false);
  }

  return null;
};

const getTransactionPHDateKey = (txn) => {
  const d = getTransactionDateObject(txn);
  if (!d) return "";
  return getPHDateString(d);
};

const getPHStartOfWeekDateString = (value = new Date()) => {
  const parts = getPHParts(value);
  const phTodayUtc = phLocalPartsToUtcDate({
    year: parts.year,
    month: parts.month,
    day: parts.day,
  });

  const pseudoLocal = new Date(
    phTodayUtc.getUTCFullYear(),
    phTodayUtc.getUTCMonth(),
    phTodayUtc.getUTCDate()
  );

  const day = pseudoLocal.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  pseudoLocal.setDate(pseudoLocal.getDate() + diff);

  return `${pseudoLocal.getFullYear()}-${pad(pseudoLocal.getMonth() + 1)}-${pad(
    pseudoLocal.getDate()
  )}`;
};

const getTransactionGroupLabel = (txn) => {
  const txnKey = getTransactionPHDateKey(txn);
  if (!txnKey) return "Older";

  const todayKey = getPHDateString();
  const startOfWeekKey = getPHStartOfWeekDateString(new Date());

  const nowParts = getPHParts(new Date());
  const startOfMonthKey = `${nowParts.year}-${pad(nowParts.month)}-01`;

  if (txnKey === todayKey) return "Today";
  if (txnKey >= startOfWeekKey) return "This Week";
  if (txnKey >= startOfMonthKey) return "This Month";
  return "Older";
};


const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const safeJsonParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getLocalFinanceKey = (userKey) =>
  `${LOCAL_FINANCE_PREFIX}:${normalizeString(userKey || "guest").toLowerCase() || "guest"}`;

const normalizeExpenseRow = (expense) => ({
  ...expense,
  id: String(expense?.id || generateId()),
  wallet_id: expense?.wallet_id ? String(expense.wallet_id) : "",
  amount: normalizeNumber(expense?.amount),
  date: toDateInputValue(expense?.date || expense?.created_at),
  category: expense?.category || "food",
  notes: expense?.notes || "",
  need_type: expense?.need_type || "need",
  planning_status: normalizePlanningStatus(expense?.planning_status),
  unplanned_reason: expense?.unplanned_reason || "",
  created_at: expense?.created_at || buildCreatedAtFromDate(expense?.date || getToday()),
  updated_at: expense?.updated_at || expense?.created_at || new Date().toISOString(),
  local_only: expense?.local_only ?? true,
});

const normalizeTransactionRow = (txn) => ({
  ...txn,
  id: String(txn?.id || generateId()),
  wallet_id: txn?.wallet_id ? String(txn.wallet_id) : "",
  amount: normalizeNumber(txn?.amount),
  type: normalizeTxnType(txn?.type),
  category: txn?.category || "other",
  notes: txn?.notes || "",
  need_type: txn?.need_type || null,
  planning_status: txn?.planning_status ? normalizePlanningStatus(txn.planning_status) : null,
  unplanned_reason: txn?.unplanned_reason || "",
  created_at: txn?.created_at || buildCreatedAtFromDate(txn?.date || getToday()),
  updated_at: txn?.updated_at || txn?.created_at || new Date().toISOString(),
  local_only: txn?.local_only ?? true,
});

const normalizeWalletRow = (wallet) => ({
  ...wallet,
  id: String(wallet?.id || generateId()),
  name: wallet?.name || wallet?.wallet_name || "Untitled Wallet",
  wallet_name: wallet?.wallet_name || wallet?.name || "Untitled Wallet",
  starting_balance: normalizeNumber(wallet?.starting_balance ?? wallet?.initial_balance ?? wallet?.balance),
  balance: normalizeNumber(wallet?.balance ?? wallet?.starting_balance ?? wallet?.initial_balance),
  created_at: wallet?.created_at || new Date().toISOString(),
  updated_at: wallet?.updated_at || wallet?.created_at || new Date().toISOString(),
  local_only: wallet?.local_only ?? true,
});

const readLocalArrayFallback = (keys = []) => {
  if (!isBrowser()) return [];

  for (const key of keys) {
    const parsed = safeJsonParse(window.localStorage.getItem(key), null);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    if (Array.isArray(parsed?.data)) return parsed.data;
  }

  return [];
};

const readLocalFinanceSnapshot = (key = null) => {
  if (!isBrowser()) {
    return createEmptyExpensesCache(key);
  }

  const storageKey = getLocalFinanceKey(key);
  const stored = safeJsonParse(window.localStorage.getItem(storageKey), null);
  const last = safeJsonParse(window.localStorage.getItem(LOCAL_FINANCE_LAST_KEY), null);
  const source = stored || (last?.key === key ? last : null) || {};

  const fallbackSuffix = normalizeString(key || "guest").toLowerCase();
  const legacyExpenses = readLocalArrayFallback([
    `clara_expenses:${fallbackSuffix}`,
    `clara_local_expenses:${fallbackSuffix}`,
    "clara_expenses",
    "clara_local_expenses",
  ]);
  const legacyWallets = readLocalArrayFallback([
    `clara_wallets:${fallbackSuffix}`,
    `clara_local_wallets:${fallbackSuffix}`,
    "clara_wallets",
    "clara_local_wallets",
  ]);
  const legacyTransactions = readLocalArrayFallback([
    `clara_wallet_transactions:${fallbackSuffix}`,
    `clara_transactions:${fallbackSuffix}`,
    `clara_local_transactions:${fallbackSuffix}`,
    "clara_wallet_transactions",
    "clara_transactions",
    "clara_local_transactions",
  ]);

  const expenses = (Array.isArray(source.expenses) ? source.expenses : legacyExpenses)
    .map(normalizeExpenseRow)
    .sort(sortByDateDesc);
  const transactions = (Array.isArray(source.transactions) ? source.transactions : legacyTransactions)
    .map(normalizeTransactionRow)
    .sort(sortByDateDesc);
  const wallets = normalizeWallets(
    (Array.isArray(source.wallets) ? source.wallets : legacyWallets).map(normalizeWalletRow),
    transactions
  );

  return {
    key,
    loaded: true,
    version: LOCAL_FINANCE_VERSION,
    updatedAt: source.updatedAt || source.updated_at || new Date().toISOString(),
    expenses,
    wallets,
    transactions,
  };
};

const writeLocalFinanceSnapshot = (key, snapshot) => {
  if (!isBrowser() || !key) return snapshot;

  const normalizedTransactions = (snapshot.transactions || [])
    .map(normalizeTransactionRow)
    .sort(sortByDateDesc);
  const normalizedExpenses = (snapshot.expenses || [])
    .map(normalizeExpenseRow)
    .sort(sortByDateDesc);
  const normalizedWallets = normalizeWallets(
    (snapshot.wallets || []).map(normalizeWalletRow),
    normalizedTransactions
  );

  const nextSnapshot = {
    key,
    loaded: true,
    version: LOCAL_FINANCE_VERSION,
    updatedAt: new Date().toISOString(),
    expenses: normalizedExpenses,
    wallets: normalizedWallets,
    transactions: normalizedTransactions,
  };

  window.localStorage.setItem(getLocalFinanceKey(key), JSON.stringify(nextSnapshot));
  window.localStorage.setItem(LOCAL_FINANCE_LAST_KEY, JSON.stringify(nextSnapshot));

  return nextSnapshot;
};

const upsertById = (items = [], item) => {
  const next = [...items];
  const index = next.findIndex((entry) => String(entry?.id) === String(item?.id));

  if (index >= 0) {
    next[index] = item;
    return next;
  }

  return [item, ...next];
};

const removeById = (items = [], id) =>
  items.filter((item) => String(item?.id) !== String(id));

const normalizeWallets = (wallets, transactions = []) => {
  return (wallets || []).map((wallet) => ({
    ...wallet,
    id: String(wallet.id),
    balance: getWalletBalance(wallet, transactions),
    derived_balance: getWalletBalance(wallet, transactions),
    name: wallet?.name || wallet?.wallet_name || "Untitled Wallet",
  }));
};

const normalizeTxnType = (type) => {
  const raw = String(type || "").trim().toLowerCase();
  if (!raw) return "other";
  if (raw === "cash_in") return "income";
  if (raw === "cashout") return "expense";
  return raw;
};

const getTxnDisplayType = (txn) => {
  const normalized = normalizeTxnType(txn?.type);

  if (normalized === "expense") return "expense";
  if (normalized === "income") return "income";
  if (
    normalized === "transfer" ||
    normalized === "transfer_in" ||
    normalized === "transfer_out"
  ) {
    return "transfer";
  }

  return normalized;
};

const getTxnAmountSign = (txn) => {
  const type = getTxnDisplayType(txn);
  if (type === "expense") return -1;
  if (type === "income") return 1;
  return 0;
};

const getTxnAmountColor = (txn) => {
  const type = getTxnDisplayType(txn);
  if (type === "expense") return "text-destructive";
  if (type === "income") return "text-emerald-400";
  return "text-sky-400";
};

const getTxnIcon = (txn) => {
  const type = getTxnDisplayType(txn);
  if (type === "expense") return ArrowUpRight;
  if (type === "income") return ArrowDownLeft;
  return ArrowLeftRight;
};

const getTxnIconWrapClass = (txn) => {
  const type = getTxnDisplayType(txn);
  if (type === "expense") return "bg-destructive/10";
  if (type === "income") return "bg-emerald-500/10";
  return "bg-sky-500/10";
};

const getTxnIconClass = (txn) => {
  const type = getTxnDisplayType(txn);
  if (type === "expense") return "text-destructive";
  if (type === "income") return "text-emerald-400";
  return "text-sky-400";
};

const formatTxnAmount = (txn, fmt) => {
  const amount = fmt(normalizeNumber(txn?.amount));
  const type = getTxnDisplayType(txn);

  if (type === "expense") return `-${amount}`;
  if (type === "income") return `+${amount}`;
  return amount;
};

const getTxnPrimaryLabel = (txn) => {
  const type = getTxnDisplayType(txn);

  if (type === "expense") {
    return txn?.category
      ? txn.category.charAt(0).toUpperCase() + txn.category.slice(1)
      : "Expense";
  }

  if (type === "income") {
    return txn?.category
      ? txn.category.charAt(0).toUpperCase() + txn.category.slice(1)
      : "Income";
  }

  if (type === "transfer") return "Transfer";

  return txn?.category
    ? txn.category.charAt(0).toUpperCase() + txn.category.slice(1)
    : "Transaction";
};

const getTxnSecondaryLabel = (txn, walletMap) => {
  const walletName = walletMap.get(String(txn?.wallet_id))?.name || "Unknown wallet";
  return walletName;
};

const createEmptyExpensesCache = (key = null) => ({
  key,
  loaded: false,
  expenses: [],
  wallets: [],
  transactions: [],
});

let expensesPageCache = createEmptyExpensesCache();

export default function Expenses() {
  const { user } = useUserRole();
  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const cacheKey = userId || userEmail || null;
  const initialCache =
    expensesPageCache.loaded && expensesPageCache.key === cacheKey
      ? expensesPageCache
      : createEmptyExpensesCache(cacheKey);

  const [expenses, setExpenses] = useState(initialCache.expenses);
  const [wallets, setWallets] = useState(initialCache.wallets);
  const [transactions, setTransactions] = useState(initialCache.transactions);

  const [loading, setLoading] = useState(!initialCache.loaded);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editMode, setEditMode] = useState("expense");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("recent");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const hasLoadedRef = useRef(false);

  const hydrateFromCache = useCallback((nextCache) => {
    setExpenses(nextCache.expenses);
    setWallets(nextCache.wallets);
    setTransactions(nextCache.transactions);
    hasLoadedRef.current = nextCache.loaded;
    setLoading(!nextCache.loaded);
  }, []);

  useEffect(() => {
    if (!cacheKey) {
      const emptyCache = createEmptyExpensesCache();
      expensesPageCache = emptyCache;
      hydrateFromCache(emptyCache);
      return;
    }

    if (expensesPageCache.loaded && expensesPageCache.key === cacheKey) {
      hydrateFromCache(expensesPageCache);
      return;
    }

    hasLoadedRef.current = false;
    setLoading(true);
  }, [cacheKey, hydrateFromCache]);

  const walletMap = useMemo(() => {
    const map = new Map();
    wallets.forEach((wallet) => {
      map.set(String(wallet.id), wallet);
    });
    return map;
  }, [wallets]);

  const selectedWallet = useMemo(() => {
    return walletMap.get(String(form.wallet_id)) || null;
  }, [walletMap, form.wallet_id]);

  const commitFinanceState = useCallback(
    (nextSnapshot, { emitEvents = true } = {}) => {
      const savedSnapshot = writeLocalFinanceSnapshot(cacheKey, nextSnapshot);
      expensesPageCache = savedSnapshot;
      hydrateFromCache(savedSnapshot);

      if (emitEvents && typeof window !== "undefined") {
        window.dispatchEvent(new Event("clara-expenses-updated"));
        window.dispatchEvent(new Event("clara-finance-updated"));
        window.dispatchEvent(new Event("clara-wallets-updated"));
        window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
        window.dispatchEvent(new Event("clara-local-finance-updated"));
      }

      return savedSnapshot;
    },
    [cacheKey, hydrateFromCache]
  );

  const loadData = useCallback(async () => {
    if (!cacheKey) {
      const emptyCache = createEmptyExpensesCache();
      expensesPageCache = emptyCache;
      hydrateFromCache(emptyCache);
      return emptyCache;
    }

    try {
      setLoading(!hasLoadedRef.current);
      const localSnapshot = readLocalFinanceSnapshot(cacheKey);
      expensesPageCache = localSnapshot;
      hydrateFromCache(localSnapshot);
      return localSnapshot;
    } catch (err) {
      console.error("Failed to load local transactions page data:", err);
      const emptyCache = createEmptyExpensesCache(cacheKey);
      expensesPageCache = emptyCache;
      hydrateFromCache(emptyCache);
      return emptyCache;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, hydrateFromCache]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!cacheKey || typeof window === "undefined") return undefined;

    const refreshLocalFinance = () => {
      loadData();
    };

    window.addEventListener("storage", refreshLocalFinance);
    window.addEventListener("clara-wallets-updated", refreshLocalFinance);
    window.addEventListener("clara-finance-imported", refreshLocalFinance);

    return () => {
      window.removeEventListener("storage", refreshLocalFinance);
      window.removeEventListener("clara-wallets-updated", refreshLocalFinance);
      window.removeEventListener("clara-finance-imported", refreshLocalFinance);
    };
  }, [cacheKey, loadData]);

  const findMatchingExpenseTxn = useCallback(
    (expense) => {
      return transactions.find((t) => {
        if (String(t.type || "").toLowerCase() !== "expense") return false;
        if (t.expense_id && String(t.expense_id) === String(expense.id)) return true;
        if (String(t.wallet_id) !== String(expense.wallet_id)) return false;
        if (normalizeNumber(t.amount) !== normalizeNumber(expense.amount)) return false;

        const txnTime = parseSupabaseDate(t.created_at || 0)?.getTime() ?? 0;
        const expenseTime = parseSupabaseDate(expense.created_at || expense.date || 0)?.getTime() ?? 0;

        if (Math.abs(txnTime - expenseTime) > 60 * 1000) return false;
        if ((t.notes || "") !== (expense.notes || "")) return false;
        if ((t.category || "") !== (expense.category || "")) return false;
        if ((t.need_type || "") !== (expense.need_type || "")) return false;
        if (
          normalizePlanningStatus(t.planning_status) !==
          normalizePlanningStatus(expense.planning_status)
        ) {
          return false;
        }

        return isOwnedByUser(t, user) || !t.created_by;
      });
    },
    [transactions, user]
  );

  const expenseIdByTxnId = useMemo(() => {
    const map = new Map();

    expenses.forEach((expense) => {
      const match = transactions.find((t) => {
        if (String(t.type || "").toLowerCase() !== "expense") return false;
        if (t.expense_id && String(t.expense_id) === String(expense.id)) return true;
        if (String(t.wallet_id) !== String(expense.wallet_id)) return false;
        if (normalizeNumber(t.amount) !== normalizeNumber(expense.amount)) return false;

        const txnTime = parseSupabaseDate(t.created_at || 0)?.getTime() ?? 0;
        const expenseTime = parseSupabaseDate(expense.created_at || expense.date || 0)?.getTime() ?? 0;

        if (Math.abs(txnTime - expenseTime) > 60 * 1000) return false;
        if ((t.notes || "") !== (expense.notes || "")) return false;
        if ((t.category || "") !== (expense.category || "")) return false;
        if ((t.need_type || "") !== (expense.need_type || "")) return false;
        if (
          normalizePlanningStatus(t.planning_status) !==
          normalizePlanningStatus(expense.planning_status)
        ) {
          return false;
        }

        return true;
      });

      if (match) {
        map.set(String(match.id), expense);
      }
    });

    return map;
  }, [expenses, transactions]);

  const handleFilterChange = (value) => {
    setFilter(value);
    if (value !== "recent") setShowAllRecent(true);
  };

  const openEditExpense = (exp) => {
    setError("");
    setEditMode("expense");
    setEditId(String(exp.id));
    setForm({
      amount: String(exp.amount ?? ""),
      category: exp.category || "food",
      wallet_id: exp.wallet_id ? String(exp.wallet_id) : "",
      date: toDateInputValue(exp.date || exp.created_at),
      notes: exp.notes || "",
      need_type: exp.need_type || "need",
      planning_status: normalizePlanningStatus(exp.planning_status),
      unplanned_reason: exp.unplanned_reason || "",
    });
    setOpen(true);
  };

  const openEditIncome = (txn) => {
    setError("");
    setEditMode("income");
    setEditId(String(txn.id));
    setForm({
      amount: String(txn.amount ?? ""),
      category: "other",
      wallet_id: txn.wallet_id ? String(txn.wallet_id) : "",
      date: toDateInputValue(txn.created_at || txn.date),
      notes: txn.notes || "",
      need_type: "need",
      planning_status: "planned",
      unplanned_reason: "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setEditId(null);
    setEditMode("expense");
    setError("");
    setForm({
      ...EMPTY_FORM,
      date: getToday(),
    });
  };

  const handleSubmit = async () => {
    setError("");

    if (!user?.email && !user?.id) {
      setError("User not found.");
      return;
    }

    const parsedAmount = normalizeNumber(form.amount);

    if (!parsedAmount || parsedAmount <= 0) {
      setError(`Enter a valid ${editMode === "income" ? "income" : "expense"} amount.`);
      return;
    }

    if (!form.wallet_id) {
      setError("Please select a wallet.");
      return;
    }

    const planningStatus = normalizePlanningStatus(form.planning_status);
    const unplannedReason = String(form.unplanned_reason || "").trim();

    if (editMode === "expense" && planningStatus === "unplanned" && !unplannedReason) {
      setError("Reason is required when an expense is unplanned.");
      return;
    }

    const targetWallet = walletMap.get(String(form.wallet_id));
    if (!targetWallet) {
      setError("Selected wallet not found.");
      return;
    }

    try {
      setSaving(true);

      let nextExpenses = [...expenses];
      let nextTransactions = [...transactions];
      const nextWallets = [...wallets];

      if (editId && editMode === "income") {
        const existingTxn = transactions.find((t) => String(t.id) === String(editId));
        if (!existingTxn) {
          setError("Income transaction not found.");
          return;
        }

        const updatedCreatedAt = buildCreatedAtFromDate(
          form.date,
          existingTxn.created_at || new Date()
        );

        const updatedTxn = normalizeTransactionRow({
          ...existingTxn,
          wallet_id: String(form.wallet_id),
          amount: parsedAmount,
          notes: form.notes || "",
          created_at: updatedCreatedAt,
          updated_at: new Date().toISOString(),
          local_only: true,
        });

        nextTransactions = upsertById(nextTransactions, updatedTxn);
      } else if (editId && editMode === "expense") {
        const oldExpense = expenses.find((e) => String(e.id) === String(editId));
        if (!oldExpense) {
          setError("Expense not found.");
          return;
        }

        const oldWallet = walletMap.get(String(oldExpense.wallet_id));
        if (!oldWallet) {
          setError("Original wallet not found.");
          return;
        }

        const sameWallet = String(oldExpense.wallet_id) === String(form.wallet_id);
        let availableBalance = normalizeNumber(targetWallet.balance);

        if (sameWallet) {
          availableBalance += normalizeNumber(oldExpense.amount);
        }

        if (parsedAmount > availableBalance) {
          setError("Not enough wallet balance for this expense.");
          return;
        }

        const updatedCreatedAt = buildCreatedAtFromDate(
          form.date,
          oldExpense.created_at || new Date()
        );

        const updatedExpense = normalizeExpenseRow({
          ...oldExpense,
          amount: parsedAmount,
          category: form.category,
          wallet_id: String(form.wallet_id),
          date: form.date || toDateOnly(updatedCreatedAt),
          notes: form.notes || "",
          need_type: form.need_type,
          planning_status: planningStatus,
          unplanned_reason: planningStatus === "unplanned" ? unplannedReason : "",
          created_at: updatedCreatedAt,
          updated_at: new Date().toISOString(),
          local_only: true,
        });

        const matchingTxn = findMatchingExpenseTxn(oldExpense);
        const updatedTxn = normalizeTransactionRow({
          ...(matchingTxn || {}),
          id: matchingTxn?.id || generateId(),
          wallet_id: String(form.wallet_id),
          amount: parsedAmount,
          type: "expense",
          category: form.category,
          need_type: form.need_type,
          planning_status: planningStatus,
          unplanned_reason: planningStatus === "unplanned" ? unplannedReason : "",
          expense_id: updatedExpense.id,
          notes: form.notes || "",
          created_at: updatedCreatedAt,
          updated_at: new Date().toISOString(),
          created_by: user.email ?? "",
          user_email: user.email ?? "",
          user_id: user.id ?? "",
          local_only: true,
        });

        nextExpenses = upsertById(nextExpenses, updatedExpense);
        nextTransactions = upsertById(nextTransactions, updatedTxn);
      } else {
        if (parsedAmount > normalizeNumber(targetWallet.balance)) {
          setError("Not enough wallet balance for this expense.");
          return;
        }

        const createdAt = buildCreatedAtFromDate(form.date);

        const newExpense = normalizeExpenseRow({
          id: generateId(),
          amount: parsedAmount,
          category: form.category,
          wallet_id: String(form.wallet_id),
          date: form.date || toDateOnly(createdAt),
          notes: form.notes || "",
          need_type: form.need_type,
          planning_status: planningStatus,
          unplanned_reason: planningStatus === "unplanned" ? unplannedReason : "",
          created_by: user.email ?? "",
          user_email: user.email ?? "",
          user_id: user.id ?? "",
          created_at: createdAt,
          updated_at: createdAt,
          local_only: true,
        });

        const newTxn = normalizeTransactionRow({
          id: generateId(),
          wallet_id: String(form.wallet_id),
          amount: parsedAmount,
          type: "expense",
          category: form.category,
          need_type: form.need_type,
          planning_status: planningStatus,
          unplanned_reason: planningStatus === "unplanned" ? unplannedReason : "",
          expense_id: newExpense.id,
          notes: form.notes || "",
          created_at: createdAt,
          updated_at: createdAt,
          created_by: user.email ?? "",
          user_email: user.email ?? "",
          user_id: user.id ?? "",
          local_only: true,
        });

        nextExpenses = upsertById(nextExpenses, newExpense);
        nextTransactions = upsertById(nextTransactions, newTxn);
      }

      commitFinanceState({
        key: cacheKey,
        loaded: true,
        expenses: nextExpenses,
        wallets: nextWallets,
        transactions: nextTransactions,
      });

      closeModal();
    } catch (err) {
      console.error("Failed to save local transaction:", err);
      setError(err?.message || "Failed to save transaction locally.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    setError("");

    try {
      setSaving(true);

      const expenseToDelete = expenses.find((e) => String(e.id) === String(id));
      if (!expenseToDelete) return;

      const wallet = walletMap.get(String(expenseToDelete.wallet_id));
      if (!wallet) {
        setError("Wallet not found.");
        return;
      }

      const matchingTxn = findMatchingExpenseTxn(expenseToDelete);
      const nextExpenses = removeById(expenses, expenseToDelete.id);
      const nextTransactions = matchingTxn
        ? removeById(transactions, matchingTxn.id)
        : transactions;

      commitFinanceState({
        key: cacheKey,
        loaded: true,
        expenses: nextExpenses,
        wallets,
        transactions: nextTransactions,
      });
    } catch (err) {
      console.error("Failed to delete local expense:", err);
      setError(err?.message || "Failed to delete expense locally.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIncome = async (txnId) => {
    setError("");

    try {
      setSaving(true);

      const incomeTxn = transactions.find((t) => String(t.id) === String(txnId));
      if (!incomeTxn) return;

      const wallet = walletMap.get(String(incomeTxn.wallet_id));
      if (!wallet) {
        setError("Wallet not found.");
        return;
      }

      const nextTransactions = removeById(transactions, incomeTxn.id);

      commitFinanceState({
        key: cacheKey,
        loaded: true,
        expenses,
        wallets,
        transactions: nextTransactions,
      });
    } catch (err) {
      console.error("Failed to delete local income:", err);
      setError(err?.message || "Failed to delete income locally.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let list = [...transactions];

    if (typeFilter !== "all") {
      list = list.filter((txn) => getTxnDisplayType(txn) === typeFilter);
    }

    if (filter === "recent") return showAllRecent ? list : list.slice(0, 5);

    if (filter === "this_month") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const end = now;

      return list.filter((txn) => {
        const txnDate = getTransactionDateObject(txn);
        return txnDate && txnDate >= start && txnDate <= end;
      });
    }

    if (filter === "last_month") {
      const nowParts = getPHParts(now);
      const lastMonth = nowParts.month === 1 ? 12 : nowParts.month - 1;
      const lastMonthYear = nowParts.month === 1 ? nowParts.year - 1 : nowParts.year;

      const start = phLocalPartsToUtcDate({
        year: lastMonthYear,
        month: lastMonth,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });

      const currentMonthStart = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });

      const end = new Date(currentMonthStart.getTime() - 1);

      return list.filter((txn) => {
        const txnDate = getTransactionDateObject(txn);
        return txnDate && txnDate >= start && txnDate <= end;
      });
    }

    if (filter === "3_months") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month - 2,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const end = now;

      return list.filter((txn) => {
        const txnDate = getTransactionDateObject(txn);
        return txnDate && txnDate >= start && txnDate <= end;
      });
    }

    if (filter === "6_months") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month - 5,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const end = now;

      return list.filter((txn) => {
        const txnDate = getTransactionDateObject(txn);
        return txnDate && txnDate >= start && txnDate <= end;
      });
    }

    if (filter === "this_year") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const end = now;

      return list.filter((txn) => {
        const txnDate = getTransactionDateObject(txn);
        return txnDate && txnDate >= start && txnDate <= end;
      });
    }

    if (filter === "custom") {
      if (!customStartDate && !customEndDate) return list;

      const start = customStartDate ? parsePHDateOnlyToUtcDate(customStartDate, false) : null;
      const end = customEndDate ? parsePHDateOnlyToUtcDate(customEndDate, true) : null;

      return list.filter((txn) => {
        const txnDate = getTransactionDateObject(txn);
        if (!txnDate) return false;
        if (start && end) return txnDate >= start && txnDate <= end;
        if (start) return txnDate >= start;
        if (end) return txnDate <= end;
        return true;
      });
    }

    return list;
  }, [transactions, filter, typeFilter, showAllRecent, customStartDate, customEndDate]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, txn) => {
        const amount = normalizeNumber(txn.amount);
        const type = getTxnDisplayType(txn);

        if (type === "income") {
          acc.income += amount;
          acc.net += amount;
        } else if (type === "expense") {
          acc.expense += amount;
          acc.net -= amount;
        } else {
          acc.transfer += amount;
        }

        return acc;
      },
      { income: 0, expense: 0, transfer: 0, net: 0 }
    );
  }, [filteredTransactions]);

  const filterLabel = useMemo(() => {
    switch (filter) {
      case "recent":
        return showAllRecent ? "All recent transactions" : "Top 5 recent transactions";
      case "this_month":
        return "This month";
      case "last_month":
        return "Last month";
      case "3_months":
        return "Last 3 months";
      case "6_months":
        return "Last 6 months";
      case "this_year":
        return "This year";
      case "custom":
        return "Custom range";
      default:
        return "Transactions";
    }
  }, [filter, showAllRecent]);

  const groupedTransactions = useMemo(() => {
    const orderedLabels = ["Today", "This Week", "This Month", "Older"];
    const groups = {};

    filteredTransactions.forEach((txn) => {
      const label = getTransactionGroupLabel(txn);
      if (!groups[label]) groups[label] = [];
      groups[label].push(txn);
    });

    return orderedLabels
      .filter((label) => groups[label]?.length)
      .map((label) => ({
        label,
        items: groups[label],
        net: groups[label].reduce((sum, item) => {
          const amount = normalizeNumber(item.amount);
          const sign = getTxnAmountSign(item);
          return sum + amount * sign;
        }, 0),
      }));
  }, [filteredTransactions]);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(normalizeNumber(n));

  const needTypeColors = {
    need: "bg-primary/10 text-primary border border-primary/20",
    want: "bg-secondary/20 text-secondary-foreground border border-border/50",
    savings: "bg-accent/10 text-accent border border-accent/20",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-4">
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal();
          else setOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? `Edit ${editMode === "income" ? "Income" : "Expense"}` : "Add Expense"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Amount (₱)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            {editMode === "expense" && (
              <>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Need Type</Label>
                  <Select
                    value={form.need_type}
                    onValueChange={(v) => setForm({ ...form, need_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {needTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Planning Status</Label>
                  <Select
                    value={form.planning_status}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        planning_status: v,
                        unplanned_reason:
                          v === "unplanned" ? form.unplanned_reason : "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planningStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.planning_status === "unplanned" && (
                  <div>
                    <Label>Reason for Unplanned Expense</Label>
                    <Input
                      placeholder="Why did this need to happen?"
                      value={form.unplanned_reason}
                      onChange={(e) =>
                        setForm({ ...form, unplanned_reason: e.target.value })
                      }
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <Label>Wallet</Label>
              <Select
                value={form.wallet_id}
                onValueChange={(v) => {
                  setError("");
                  setForm({ ...form, wallet_id: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={wallets.length > 0 ? "Select wallet" : "No wallets found"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name} • {fmt(w.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {wallets.length === 0 && (
                <p className="mt-1 text-xs text-destructive">Create a wallet first</p>
              )}

              {!!selectedWallet && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {editMode === "income" ? "Current balance" : "Available balance"}:{" "}
                  {fmt(selectedWallet.balance)}
                </p>
              )}
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder={editMode === "income" ? "Income details" : "What was this for?"}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {!!error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={
                saving ||
                !form.amount ||
                !form.wallet_id ||
                wallets.length === 0 ||
                (editMode === "expense" &&
                  form.planning_status === "unplanned" &&
                  !form.unplanned_reason.trim())
              }
            >
              {saving
                ? "Saving..."
                : editId
                ? `Save ${editMode === "income" ? "Income" : "Expense"}`
                : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {transactions.length > 0 && (
        <div className="mb-5 rounded-3xl border border-border/50 bg-gradient-to-br from-card to-card/60 p-4 shadow-sm backdrop-blur-md md:p-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-2 block">Timeframe</Label>
                <Select value={filter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Top 5 Recent</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="3_months">Last 3 Months</SelectItem>
                    <SelectItem value="6_months">Last 6 Months</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filter === "custom" && (
                <>
                  <div>
                    <Label className="mb-2 block">Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div className="text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">{filteredTransactions.length}</span>{" "}
                • {filterLabel}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Money In
                  </p>
                  <p className="text-sm font-bold text-emerald-400">+{fmt(totals.income)}</p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Money Out
                  </p>
                  <p className="text-sm font-bold text-destructive">-{fmt(totals.expense)}</p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Transfers
                  </p>
                  <p className="text-sm font-bold text-sky-400">{fmt(totals.transfer)}</p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Net</p>
                  <p
                    className={`text-sm font-bold ${
                      totals.net < 0 ? "text-destructive" : "text-emerald-400"
                    }`}
                  >
                    {totals.net < 0 ? "-" : "+"}
                    {fmt(Math.abs(totals.net))}
                  </p>
                </div>
              </div>
            </div>

            {filter === "recent" && filteredTransactions.length > 0 && transactions.length > 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit rounded-xl"
                onClick={() => setShowAllRecent((prev) => !prev)}
              >
                {showAllRecent ? (
                  <>
                    <ChevronUp className="mr-1 h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-4 w-4" />
                    See More
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Start tracking your money movement by adding your first transaction."
        />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions found"
          description="No transactions match the selected filters."
        />
      ) : (
        <div className="space-y-5">
          {groupedTransactions.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold tracking-wide text-foreground/90">
                  {group.label}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    group.net < 0 ? "text-destructive" : "text-emerald-400"
                  }`}
                >
                  {group.net < 0 ? "-" : "+"}
                  {fmt(Math.abs(group.net))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm">
                {group.items.map((txn, index) => {
                  const Icon = getTxnIcon(txn);
                  const linkedExpense = expenseIdByTxnId.get(String(txn.id));
                  const txnType = getTxnDisplayType(txn);
                  const canEdit = (txnType === "expense" && !!linkedExpense) || txnType === "income";
                  const canDelete =
                    (txnType === "expense" && !!linkedExpense) || txnType === "income";

                  return (
                    <div
                      key={txn.id}
                      className={`group flex items-center gap-4 px-4 py-4 transition-all duration-200 hover:bg-muted/20 ${
                        index !== group.items.length - 1 ? "border-b border-border/40" : ""
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${getTxnIconWrapClass(
                          txn
                        )}`}
                      >
                        <Icon className={`h-5 w-5 ${getTxnIconClass(txn)}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-wide">
                              {getTxnPrimaryLabel(txn)}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{getTxnSecondaryLabel(txn, walletMap)}</span>
                              <span>•</span>
                              <span>
                                {formatLocalDateTime(txn.created_at || txn.date || Date.now())}
                              </span>

                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                  txnType === "expense"
                                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                                    : txnType === "income"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-sky-500/20 bg-sky-500/10 text-sky-400"
                                }`}
                              >
                                {txnType}
                              </span>

                              {!!txn.need_type && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    needTypeColors[txn.need_type] || ""
                                  }`}
                                >
                                  {txn.need_type}
                                </span>
                              )}

                              {!!txn.planning_status && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                                  {txn.planning_status}
                                </span>
                              )}
                            </div>

                            {txn.notes && (
                              <p className="mt-1 truncate text-xs italic text-muted-foreground">
                                {txn.notes}
                              </p>
                            )}

                            {txn.planning_status === "unplanned" && txn.unplanned_reason && (
                              <p className="mt-1 truncate text-xs text-amber-300/85">
                                Reason: {txn.unplanned_reason}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-shrink-0 flex-col items-end gap-2">
                            <p
                              className={`whitespace-nowrap text-sm font-bold ${getTxnAmountColor(
                                txn
                              )}`}
                            >
                              {formatTxnAmount(txn, fmt)}
                            </p>

                            {canEdit || canDelete ? (
                              <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                    onClick={() => {
                                      if (txnType === "expense" && linkedExpense) {
                                        openEditExpense(linkedExpense);
                                      } else if (txnType === "income") {
                                        openEditIncome(txn);
                                      }
                                    }}
                                    disabled={saving}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}

                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10"
                                    onClick={() => {
                                      if (txnType === "expense" && linkedExpense) {
                                        handleDeleteExpense(linkedExpense.id);
                                      } else if (txnType === "income") {
                                        handleDeleteIncome(txn.id);
                                      }
                                    }}
                                    disabled={saving}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="h-8" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
