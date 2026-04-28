import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Target, Lock, RotateCcw, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";

const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MINUTES = 8 * 60;

const NEEDS_KEYWORDS = [
  "need",
  "needs",
  "housing",
  "house",
  "rent",
  "mortgage",
  "food",
  "groceries",
  "grocery",
  "transport",
  "transportation",
  "fare",
  "gas",
  "fuel",
  "commute",
  "utilities",
  "utility",
  "electric",
  "electricity",
  "water",
  "internet",
  "wifi",
  "bill",
  "bills",
  "phone",
  "load",
  "medicine",
  "medical",
  "health",
  "insurance",
  "school",
  "tuition",
  "childcare",
  "baby",
  "essentials",
  "essential",
];

const WANTS_KEYWORDS = [
  "want",
  "wants",
  "personal",
  "shopping",
  "shop",
  "entertainment",
  "leisure",
  "fun",
  "dining",
  "dining out",
  "restaurant",
  "coffee",
  "milk tea",
  "snacks",
  "travel",
  "vacation",
  "beauty",
  "self care",
  "self-care",
  "skin care",
  "skincare",
  "makeup",
  "clothes",
  "clothing",
  "fashion",
  "subscription",
  "subscriptions",
  "game",
  "games",
  "gaming",
  "hobby",
  "hobbies",
  "gifts",
  "gift",
];

const OTHER_KEYWORDS = [
  "other",
  "others",
  "misc",
  "miscellaneous",
  "unknown",
  "uncategorized",
  "uncategorised",
];

const BUDGET_CATEGORIES = [
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

const CATEGORY_LABELS = {
  food: "Food",
  transport: "Transport",
  housing: "Housing",
  utilities: "Utilities",
  entertainment: "Entertainment",
  shopping: "Shopping",
  health: "Health",
  education: "Education",
  personal: "Personal",
  other: "Other",
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const pad = (n) => String(n).padStart(2, "0");

const getPHParts = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

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

const getPHMonthKey = (value = new Date()) => {
  const { year, month } = getPHParts(value);
  return `${year}-${pad(month)}`;
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

const parsePHDateTimeLocalValue = (value) => {
  if (!value) return null;

  const [datePart, timePart = "00:00"] = String(value).split("T");
  const [year, month, day] = String(datePart).split("-").map(Number);
  const [hour = 0, minute = 0] = String(timePart).split(":").map(Number);

  if (!year || !month || !day) return null;

  const date = phLocalPartsToUtcDate({
    year,
    month,
    day,
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });

  return Number.isNaN(date.getTime()) ? null : date;
};

const toPHDateTimeLocalValue = (value) => {
  if (!value) return "";

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const { year, month, day, hour, minute } = getPHParts(d);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};

const monthKeyToRange = (monthKey) => {
  const safeMonthKey = monthKey && monthKey.includes("-") ? monthKey : getPHMonthKey();
  const [year, month] = safeMonthKey.split("-").map(Number);

  const start = phLocalPartsToUtcDate({
    year,
    month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  const end = phLocalPartsToUtcDate({
    year,
    month: month + 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    start: start.toISOString(),
    end: new Date(end.getTime() - 1).toISOString(),
  };
};


const LOCAL_FINANCE_VERSION = 1;
const LOCAL_FINANCE_PREFIX = "clara_local_finance_v1";
const LOCAL_FINANCE_LAST_KEY = `${LOCAL_FINANCE_PREFIX}:last`;
const LOCAL_BUDGETS_PREFIX = "clara_local_budgets_v1";
const LOCAL_BUDGETS_LAST_KEY = `${LOCAL_BUDGETS_PREFIX}:last`;

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
  `${LOCAL_FINANCE_PREFIX}:${normalizeText(userKey || "guest") || "guest"}`;

const getLocalBudgetsKey = (userKey) =>
  `${LOCAL_BUDGETS_PREFIX}:${normalizeText(userKey || "guest") || "guest"}`;

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sortByDateDesc = (a, b) => {
  const aTime = new Date(a?.updated_at || a?.created_at || a?.date || 0).getTime() || 0;
  const bTime = new Date(b?.updated_at || b?.created_at || b?.date || 0).getTime() || 0;
  return bTime - aTime;
};

const isNeedsCategory = (category) =>
  ["housing", "food", "transport", "utilities", "health", "education"].includes(category);

const isWantsCategory = (category) =>
  ["entertainment", "shopping", "personal"].includes(category);

const normalizeExpenseRow = (expense) => ({
  ...expense,
  id: String(expense?.id || generateId()),
  wallet_id: expense?.wallet_id ? String(expense.wallet_id) : "",
  amount: getExpenseAmount(expense),
  category: getExpenseCategory(expense),
  date: expense?.date || "",
  need_type: expense?.need_type || expense?.type || null,
  planning_status: expense?.planning_status || null,
  created_at: expense?.created_at || expense?.date || new Date().toISOString(),
  updated_at: expense?.updated_at || expense?.created_at || new Date().toISOString(),
  local_only: expense?.local_only ?? true,
});

const normalizeBudgetRow = (budget) => {
  const category = getBudgetCategory(budget);
  const totalBudget = toNumber(budget?.allocated_amount ?? budget?.total_budget);
  const fallbackRange = monthKeyToRange(budget?.month || getPHMonthKey());
  const createdAt = budget?.created_at || new Date().toISOString();

  return {
    ...budget,
    id: String(budget?.id || generateId()),
    month: budget?.month || getPHMonthKey(createdAt),
    category,
    budget_category: budget?.budget_category || category,
    allocated_amount: totalBudget,
    total_budget: totalBudget,
    needs_pct: toNumber(budget?.needs_pct ?? budget?.needs_percent ?? (isNeedsCategory(category) ? 100 : 0)),
    wants_pct: toNumber(budget?.wants_pct ?? budget?.wants_percent ?? (isWantsCategory(category) ? 100 : 0)),
    other_pct: toNumber(
      budget?.other_pct ??
        budget?.other_percent ??
        budget?.savings_pct ??
        budget?.savings_percent ??
        (category === "other" ? 100 : 0)
    ),
    needs_percent: toNumber(budget?.needs_percent ?? budget?.needs_pct ?? (isNeedsCategory(category) ? 100 : 0)),
    wants_percent: toNumber(budget?.wants_percent ?? budget?.wants_pct ?? (isWantsCategory(category) ? 100 : 0)),
    other_percent: toNumber(
      budget?.other_percent ??
        budget?.other_pct ??
        budget?.savings_percent ??
        budget?.savings_pct ??
        (category === "other" ? 100 : 0)
    ),
    savings_pct: toNumber(budget?.savings_pct ?? budget?.savings_percent ?? (category === "other" ? 100 : 0)),
    savings_percent: toNumber(budget?.savings_percent ?? budget?.savings_pct ?? (category === "other" ? 100 : 0)),
    tracking_start_date: getBudgetStart(budget, fallbackRange.start),
    tracking_end_date: getBudgetEnd(budget, fallbackRange.end),
    range_start: getBudgetStart(budget, fallbackRange.start),
    range_end: getBudgetEnd(budget, fallbackRange.end),
    is_manual_range: budget?.is_manual_range ?? true,
    created_at: createdAt,
    updated_at: budget?.updated_at || createdAt,
    local_only: budget?.local_only ?? true,
  };
};

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
    return {
      key,
      loaded: true,
      version: LOCAL_FINANCE_VERSION,
      updatedAt: new Date().toISOString(),
      expenses: [],
      wallets: [],
      transactions: [],
      transfers: [],
    };
  }

  const normalizedKey = key || "guest";
  const stored = safeJsonParse(window.localStorage.getItem(getLocalFinanceKey(normalizedKey)), null);
  const last = safeJsonParse(window.localStorage.getItem(LOCAL_FINANCE_LAST_KEY), null);
  const source = stored || (last?.key === normalizedKey ? last : null) || {};
  const suffix = normalizeText(normalizedKey);

  const legacyExpenses = readLocalArrayFallback([
    `clara_expenses:${suffix}`,
    `clara_local_expenses:${suffix}`,
    "clara_expenses",
    "clara_local_expenses",
    "expenses",
  ]);

  return {
    key: normalizedKey,
    loaded: true,
    version: LOCAL_FINANCE_VERSION,
    updatedAt: source.updatedAt || source.updated_at || new Date().toISOString(),
    expenses: (Array.isArray(source.expenses) ? source.expenses : legacyExpenses)
      .map(normalizeExpenseRow)
      .sort(sortByDateDesc),
    wallets: Array.isArray(source.wallets) ? source.wallets : [],
    transactions: Array.isArray(source.transactions) ? source.transactions : [],
    transfers: Array.isArray(source.transfers) ? source.transfers : [],
    budgets: Array.isArray(source.budgets) ? source.budgets : [],
  };
};

const readLocalBudgets = (key = null) => {
  if (!isBrowser()) return [];

  const normalizedKey = key || "guest";
  const stored = safeJsonParse(window.localStorage.getItem(getLocalBudgetsKey(normalizedKey)), null);
  const last = safeJsonParse(window.localStorage.getItem(LOCAL_BUDGETS_LAST_KEY), null);
  const finance = readLocalFinanceSnapshot(normalizedKey);
  const suffix = normalizeText(normalizedKey);
  const legacyBudgets = readLocalArrayFallback([
    `clara_budgets:${suffix}`,
    `clara_local_budgets:${suffix}`,
    "clara_budgets",
    "clara_local_budgets",
    "budgets",
  ]);

  const sourceBudgets = Array.isArray(stored?.budgets)
    ? stored.budgets
    : Array.isArray(last?.budgets) && last?.key === normalizedKey
      ? last.budgets
      : Array.isArray(finance?.budgets)
        ? finance.budgets
        : legacyBudgets;

  return sourceBudgets.map(normalizeBudgetRow).sort(sortByDateDesc);
};

const writeLocalBudgets = (key, budgets = []) => {
  if (!isBrowser()) return budgets;

  const normalizedKey = key || "guest";
  const normalizedBudgets = budgets.map(normalizeBudgetRow).sort(sortByDateDesc);
  const payload = {
    key: normalizedKey,
    version: LOCAL_FINANCE_VERSION,
    updatedAt: new Date().toISOString(),
    budgets: normalizedBudgets,
  };

  window.localStorage.setItem(getLocalBudgetsKey(normalizedKey), JSON.stringify(payload));
  window.localStorage.setItem(LOCAL_BUDGETS_LAST_KEY, JSON.stringify(payload));

  const finance = readLocalFinanceSnapshot(normalizedKey);
  const nextFinance = {
    ...finance,
    key: normalizedKey,
    version: LOCAL_FINANCE_VERSION,
    updatedAt: new Date().toISOString(),
    budgets: normalizedBudgets,
  };

  window.localStorage.setItem(getLocalFinanceKey(normalizedKey), JSON.stringify(nextFinance));
  window.localStorage.setItem(LOCAL_FINANCE_LAST_KEY, JSON.stringify(nextFinance));

  return normalizedBudgets;
};

const dispatchBudgetEvents = () => {
  if (typeof window === "undefined") return;

  [
    "clara-budgets-updated",
    "clara-finance-updated",
    "clara-local-finance-updated",
  ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
};

export default function Budgets() {
  const { user, access, loading: accessLoading } = useUserRole();
  const cacheKey = user?.id || user?.email || "guest";
  const canUseBudgets = access?.budgets ?? true;

  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentMonth = getPHMonthKey(new Date());
  const defaultRange = monthKeyToRange(currentMonth);

  const [form, setForm] = useState({
    month: currentMonth,
    category: "food",
    total_budget: "",
    needs_pct: "50",
    wants_pct: "30",
    other_pct: "20",
    range_start: toPHDateTimeLocalValue(defaultRange.start),
    range_end: toPHDateTimeLocalValue(defaultRange.end),
  });

  const refreshPageData = useCallback(() => {
    const finance = readLocalFinanceSnapshot(cacheKey);
    const localBudgets = readLocalBudgets(cacheKey);

    setBudgets(localBudgets);
    setExpenses(finance.expenses || []);
    setLoading(false);
  }, [cacheKey]);

  useEffect(() => {
    refreshPageData();
  }, [refreshPageData]);

  useEffect(() => {
    const onRefresh = () => refreshPageData();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshPageData();
      }
    };
    const onStorage = (event) => {
      if (
        !event?.key ||
        event.key.includes(LOCAL_FINANCE_PREFIX) ||
        event.key.includes(LOCAL_BUDGETS_PREFIX)
      ) {
        refreshPageData();
      }
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("clara-expenses-updated", onRefresh);
    window.addEventListener("clara-budgets-updated", onRefresh);
    window.addEventListener("clara-finance-updated", onRefresh);
    window.addEventListener("clara-local-finance-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("clara-expenses-updated", onRefresh);
      window.removeEventListener("clara-budgets-updated", onRefresh);
      window.removeEventListener("clara-finance-updated", onRefresh);
      window.removeEventListener("clara-local-finance-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshPageData]);

  const currentBudget = useMemo(() => {
    const exactMonth = budgets.find(
      (b) => b.month === currentMonth && getBudgetCategory(b) === form.category
    );
    if (exactMonth) return exactMonth;

    return (
      budgets
        .filter((budget) => budget.month === currentMonth)
        .slice()
        .sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        })[0] || null
    );
  }, [budgets, currentMonth, form.category]);

  useEffect(() => {
    if (currentBudget) {
      const fallbackRange = monthKeyToRange(currentBudget.month || currentMonth);

      setForm({
        month: currentBudget.month || currentMonth,
        category: getBudgetCategory(currentBudget),
        total_budget: String(currentBudget.total_budget ?? ""),
        needs_pct: String(currentBudget.needs_pct ?? currentBudget.needs_percent ?? 50),
        wants_pct: String(currentBudget.wants_pct ?? currentBudget.wants_percent ?? 30),
        other_pct: String(
          currentBudget.other_pct ??
            currentBudget.other_percent ??
            currentBudget.savings_pct ??
            currentBudget.savings_percent ??
            20
        ),
        range_start: toPHDateTimeLocalValue(getBudgetStart(currentBudget, fallbackRange.start)),
        range_end: toPHDateTimeLocalValue(getBudgetEnd(currentBudget, fallbackRange.end)),
      });
    } else {
      const freshRange = monthKeyToRange(currentMonth);

      setForm({
        month: currentMonth,
        category: "food",
        total_budget: "",
        needs_pct: "50",
        wants_pct: "30",
        other_pct: "20",
        range_start: toPHDateTimeLocalValue(freshRange.start),
        range_end: toPHDateTimeLocalValue(freshRange.end),
      });
    }
  }, [currentBudget, currentMonth]);

  const activeRangeStart = useMemo(() => {
    const fallback = monthKeyToRange(currentBudget?.month || currentMonth).start;
    const raw = getBudgetStart(currentBudget, fallback);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [currentBudget, currentMonth]);

  const activeRangeEnd = useMemo(() => {
    const fallback = monthKeyToRange(currentBudget?.month || currentMonth).end;
    const raw = getBudgetEnd(currentBudget, fallback);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [currentBudget, currentMonth]);

  const financials = useMemo(() => {
    const result = {
      totalSpent: 0,
      needsSpent: 0,
      wantsSpent: 0,
      otherSpent: 0,
    };

    if (!activeRangeStart || !activeRangeEnd) return result;

    expenses.forEach((item) => {
      const d = getItemDate(item);
      if (!d) return;
      if (d < activeRangeStart || d > activeRangeEnd) return;

      const amount = getExpenseAmount(item);
      const bucket = getBudgetBucket(item);

      result.totalSpent += amount;

      if (bucket === "needs") {
        result.needsSpent += amount;
      } else if (bucket === "wants") {
        result.wantsSpent += amount;
      } else {
        result.otherSpent += amount;
      }
    });

    return result;
  }, [expenses, activeRangeStart, activeRangeEnd]);

  const categoryBudgetCards = useMemo(() => {
    const monthBudgets = budgets.filter((budget) => budget.month === currentMonth);
    const monthRange = monthKeyToRange(currentMonth);
    const start = new Date(monthRange.start);
    const end = new Date(monthRange.end);

    return BUDGET_CATEGORIES.map((category) => {
      const allocated = monthBudgets.reduce((sum, budget) => {
        if (getBudgetCategory(budget) !== category) return sum;
        return sum + toNumber(budget.allocated_amount ?? budget.total_budget);
      }, 0);

      const used = expenses.reduce((sum, expense) => {
        const date = getItemDate(expense);
        if (!date || date < start || date > end) return sum;
        if (getExpenseCategory(expense) !== category) return sum;
        return sum + getExpenseAmount(expense);
      }, 0);

      return {
        category,
        allocated,
        used,
        remaining: Math.max(allocated - used, 0),
        pct: allocated > 0 ? Math.min((used / allocated) * 100, 999) : 0,
      };
    }).filter((item) => item.allocated > 0 || item.used > 0);
  }, [budgets, currentMonth, expenses]);

  const handleMonthChange = (monthValue) => {
    const nextRange = monthKeyToRange(monthValue);

    setForm((prev) => ({
      ...prev,
      month: monthValue,
      range_start: toPHDateTimeLocalValue(nextRange.start),
      range_end: toPHDateTimeLocalValue(nextRange.end),
    }));
  };

  const handleSubmit = async () => {
    if (!form.total_budget || !canUseBudgets) return;

    const totalBudget = toNumber(form.total_budget);
    const category = BUDGET_CATEGORIES.includes(form.category) ? form.category : "other";

    const rangeStart = parsePHDateTimeLocalValue(form.range_start);
    const rangeEnd = parsePHDateTimeLocalValue(form.range_end);

    if (totalBudget <= 0) {
      alert("Please enter a valid total budget.");
      return;
    }

    if (!rangeStart || Number.isNaN(rangeStart.getTime())) {
      alert("Please select a valid start date and time.");
      return;
    }

    if (!rangeEnd || Number.isNaN(rangeEnd.getTime())) {
      alert("Please select a valid end date and time.");
      return;
    }

    if (rangeEnd <= rangeStart) {
      alert("End date/time must be later than start date/time.");
      return;
    }

    try {
      setSaving(true);

      const existing = budgets.find(
        (b) => b.month === form.month && getBudgetCategory(b) === category
      );

      const nowIso = new Date().toISOString();
      const payload = normalizeBudgetRow({
        id: existing?.id || generateId(),
        month: form.month,
        category,
        budget_category: category,
        allocated_amount: totalBudget,
        total_budget: totalBudget,

        needs_pct: isNeedsCategory(category) ? 100 : 0,
        wants_pct: isWantsCategory(category) ? 100 : 0,
        other_pct: category === "other" ? 100 : 0,

        needs_percent: isNeedsCategory(category) ? 100 : 0,
        wants_percent: isWantsCategory(category) ? 100 : 0,
        other_percent: category === "other" ? 100 : 0,

        savings_pct: category === "other" ? 100 : 0,
        savings_percent: category === "other" ? 100 : 0,

        tracking_start_date: rangeStart.toISOString(),
        tracking_end_date: rangeEnd.toISOString(),

        range_start: rangeStart.toISOString(),
        range_end: rangeEnd.toISOString(),

        is_manual_range: true,
        created_at: existing?.created_at || nowIso,
        updated_at: nowIso,
        created_by: user?.email || null,
        email: user?.email || null,
        user_id: user?.id || null,
      });

      const nextBudgets = existing?.id
        ? budgets.map((budget) => (String(budget.id) === String(existing.id) ? payload : budget))
        : [payload, ...budgets];

      const savedBudgets = writeLocalBudgets(cacheKey, nextBudgets);
      setBudgets(savedBudgets);
      dispatchBudgetEvents();
      setOpen(false);
    } catch (error) {
      console.error("Failed to save local budget:", error);
      alert("Failed to save budget locally.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!currentBudget || resetting) return;

    const confirmReset = window.confirm(
      "Reset tracking start to right now? Expenses before this exact date and time will no longer count."
    );
    if (!confirmReset) return;

    try {
      setResetting(true);

      const nowIso = new Date().toISOString();
      const fallbackEnd = monthKeyToRange(currentBudget.month || currentMonth).end;
      const currentEnd = getBudgetEnd(currentBudget, fallbackEnd);
      const endDate = new Date(currentEnd);

      const safeEnd =
        !Number.isNaN(endDate.getTime()) && endDate > new Date(nowIso)
          ? endDate.toISOString()
          : new Date(new Date(nowIso).getTime() + 60 * 60 * 1000).toISOString();

      const nextBudgets = budgets.map((budget) =>
        String(budget.id) === String(currentBudget.id)
          ? normalizeBudgetRow({
              ...budget,
              tracking_start_date: nowIso,
              tracking_end_date: safeEnd,
              range_start: nowIso,
              range_end: safeEnd,
              is_manual_range: true,
              updated_at: nowIso,
            })
          : budget
      );

      const savedBudgets = writeLocalBudgets(cacheKey, nextBudgets);
      setBudgets(savedBudgets);
      dispatchBudgetEvents();
    } catch (error) {
      console.error("Failed to reset local budget tracking:", error);
      alert("Failed to reset budget tracking locally.");
    } finally {
      setTimeout(() => setResetting(false), 150);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(toNumber(n));

  const totalBudget = toNumber(currentBudget?.total_budget);
  const needsBudget = currentBudget
    ? (totalBudget * toNumber(currentBudget.needs_pct ?? currentBudget.needs_percent ?? 50)) / 100
    : 0;
  const wantsBudget = currentBudget
    ? (totalBudget * toNumber(currentBudget.wants_pct ?? currentBudget.wants_percent ?? 30)) / 100
    : 0;
  const otherBudget = currentBudget
    ? (totalBudget *
        toNumber(
          currentBudget.other_pct ??
            currentBudget.other_percent ??
            currentBudget.savings_pct ??
            currentBudget.savings_percent ??
            20
        )) / 100
    : 0;

  const totalSpent = toNumber(financials.totalSpent);
  const needsSpent = toNumber(financials.needsSpent);
  const wantsSpent = toNumber(financials.wantsSpent);
  const otherSpent = toNumber(financials.otherSpent);

  if (loading) {
    return <FeaturePageLoader label="Preparing budgets..." />;
  }

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing budgets..." />;
  }
  return (
                  <div key={item.category} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex justify-between gap-3 mb-2">
                      <div>
                        <span className="text-sm font-medium">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                        {(warning || exceeded) && (
                          <p
                            className={`mt-1 text-xs font-medium ${
                              exceeded ? "text-destructive" : "text-secondary"
                            }`}
                          >
                            {exceeded ? "Budget exceeded" : "Nearing limit"}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {fmt(item.used)} / {fmt(item.allocated)}
                      </span>
                    </div>

                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          exceeded ? "bg-destructive" : warning ? "bg-secondary" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {fmt(item.remaining)} remaining
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {[
            {
              label: "Needs",
              budget: needsBudget,
              spent: needsSpent,
              color: "bg-primary",
            },
            {
              label: "Wants",
              budget: wantsBudget,
              spent: wantsSpent,
              color: "bg-secondary",
            },
            {
              label: "Other",
              budget: otherBudget,
              spent: otherSpent,
              color: "bg-accent",
            },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-muted-foreground">
                  {fmt(item.spent)} / {fmt(item.budget)}
                </span>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.spent > item.budget ? "bg-destructive" : item.color
                  }`}
                  style={{
                    width: `${
                      item.budget > 0
                        ? Math.min((item.spent / item.budget) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
