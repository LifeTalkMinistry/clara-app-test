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
import useFinancialData from "../hooks/useFinancialData";
import * as financeRepository from "@/lib/financeRepository";

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
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const pad = (n) => String(n).padStart(2, "0");

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sortByDateDesc = (a, b) => {
  const aTime =
    new Date(a?.updated_at || a?.updatedAt || a?.created_at || a?.createdAt || a?.date || 0)
      .getTime() || 0;

  const bTime =
    new Date(b?.updated_at || b?.updatedAt || b?.created_at || b?.createdAt || b?.date || 0)
      .getTime() || 0;

  return bTime - aTime;
};

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

const isNeedsCategory = (category) =>
  ["housing", "food", "transport", "utilities", "health", "education"].includes(category);

const isWantsCategory = (category) =>
  ["entertainment", "shopping", "personal"].includes(category);

const getExpenseAmount = (expense) => {
  const raw =
    expense?.amount ??
    expense?.expense_amount ??
    expense?.total ??
    expense?.value ??
    expense?.price ??
    0;

  return Math.abs(toNumber(raw));
};

const getExpenseCategory = (expense) => {
  const raw =
    expense?.category ??
    expense?.budget_category ??
    expense?.expense_category ??
    expense?.type ??
    expense?.label ??
    "";

  const normalized = normalizeText(raw);

  if (BUDGET_CATEGORIES.includes(normalized)) return normalized;

  if (normalized.includes("food") || normalized.includes("grocery")) return "food";
  if (normalized.includes("transport") || normalized.includes("fare")) return "transport";
  if (normalized.includes("rent") || normalized.includes("house")) return "housing";
  if (normalized.includes("bill") || normalized.includes("util")) return "utilities";
  if (normalized.includes("entertain") || normalized.includes("fun")) return "entertainment";
  if (normalized.includes("shop")) return "shopping";
  if (normalized.includes("health") || normalized.includes("medical")) return "health";
  if (normalized.includes("school") || normalized.includes("education")) return "education";
  if (normalized.includes("personal")) return "personal";

  return "other";
};

const getBudgetCategory = (budget) => {
  const category = normalizeText(
    budget?.category ??
      budget?.budget_category ??
      budget?.expense_category ??
      budget?.name ??
      budget?.label ??
      "other"
  );

  return BUDGET_CATEGORIES.includes(category) ? category : "other";
};

const getBudgetStart = (budget, fallback) =>
  budget?.tracking_start_date ||
  budget?.trackingStartDate ||
  budget?.range_start ||
  budget?.rangeStart ||
  budget?.start_date ||
  budget?.startDate ||
  budget?.created_at ||
  budget?.createdAt ||
  fallback;

const getBudgetEnd = (budget, fallback) =>
  budget?.tracking_end_date ||
  budget?.trackingEndDate ||
  budget?.range_end ||
  budget?.rangeEnd ||
  budget?.end_date ||
  budget?.endDate ||
  fallback;

const normalizeExpenseRow = (expense) => ({
  ...expense,
  id: String(expense?.id || generateId()),
  wallet_id: expense?.wallet_id ? String(expense.wallet_id) : expense?.walletId || "",
  amount: getExpenseAmount(expense),
  category: getExpenseCategory(expense),
  date: expense?.date || expense?.created_at || expense?.createdAt || new Date().toISOString(),
  need_type: expense?.need_type || expense?.needType || expense?.type || null,
  planning_status: expense?.planning_status || expense?.planningStatus || null,
  created_at: expense?.created_at || expense?.createdAt || expense?.date || new Date().toISOString(),
  updated_at: expense?.updated_at || expense?.updatedAt || expense?.created_at || new Date().toISOString(),
});

const normalizeBudgetRow = (budget) => {
  const category = getBudgetCategory(budget);
  const totalBudget = toNumber(budget?.allocated_amount ?? budget?.allocatedAmount ?? budget?.total_budget ?? budget?.totalBudget);
  const fallbackRange = monthKeyToRange(budget?.month || getPHMonthKey());
  const createdAt = budget?.created_at || budget?.createdAt || new Date().toISOString();

  return {
    ...budget,
    id: String(budget?.id || generateId()),
    month: budget?.month || getPHMonthKey(createdAt),
    category,
    budget_category: budget?.budget_category || budget?.budgetCategory || category,
    allocated_amount: totalBudget,
    allocatedAmount: totalBudget,
    total_budget: totalBudget,
    totalBudget: totalBudget,
    needs_pct: toNumber(
      budget?.needs_pct ?? budget?.needsPercent ?? budget?.needs_percent ?? (isNeedsCategory(category) ? 100 : 0)
    ),
    wants_pct: toNumber(
      budget?.wants_pct ?? budget?.wantsPercent ?? budget?.wants_percent ?? (isWantsCategory(category) ? 100 : 0)
    ),
    other_pct: toNumber(
      budget?.other_pct ??
        budget?.otherPercent ??
        budget?.other_percent ??
        budget?.savings_pct ??
        budget?.savingsPercent ??
        budget?.savings_percent ??
        (category === "other" ? 100 : 0)
    ),
    needs_percent: toNumber(
      budget?.needs_percent ?? budget?.needsPercent ?? budget?.needs_pct ?? (isNeedsCategory(category) ? 100 : 0)
    ),
    wants_percent: toNumber(
      budget?.wants_percent ?? budget?.wantsPercent ?? budget?.wants_pct ?? (isWantsCategory(category) ? 100 : 0)
    ),
    other_percent: toNumber(
      budget?.other_percent ??
        budget?.otherPercent ??
        budget?.other_pct ??
        budget?.savings_percent ??
        budget?.savingsPercent ??
        budget?.savings_pct ??
        (category === "other" ? 100 : 0)
    ),
    savings_pct: toNumber(
      budget?.savings_pct ?? budget?.savingsPercent ?? budget?.savings_percent ?? (category === "other" ? 100 : 0)
    ),
    savings_percent: toNumber(
      budget?.savings_percent ?? budget?.savingsPercent ?? budget?.savings_pct ?? (category === "other" ? 100 : 0)
    ),
    tracking_start_date: getBudgetStart(budget, fallbackRange.start),
    trackingStartDate: getBudgetStart(budget, fallbackRange.start),
    tracking_end_date: getBudgetEnd(budget, fallbackRange.end),
    trackingEndDate: getBudgetEnd(budget, fallbackRange.end),
    range_start: getBudgetStart(budget, fallbackRange.start),
    rangeStart: getBudgetStart(budget, fallbackRange.start),
    range_end: getBudgetEnd(budget, fallbackRange.end),
    rangeEnd: getBudgetEnd(budget, fallbackRange.end),
    is_manual_range: budget?.is_manual_range ?? budget?.isManualRange ?? true,
    isManualRange: budget?.isManualRange ?? budget?.is_manual_range ?? true,
    created_at: createdAt,
    createdAt,
    updated_at: budget?.updated_at || budget?.updatedAt || createdAt,
    updatedAt: budget?.updatedAt || budget?.updated_at || createdAt,
  };
};

const getItemDate = (item) => {
  const raw =
    item?.date ||
    item?.spent_at ||
    item?.spentAt ||
    item?.transaction_date ||
    item?.transactionDate ||
    item?.created_at ||
    item?.createdAt ||
    item?.updated_at ||
    item?.updatedAt;

  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const textIncludesAny = (text, keywords) => {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(keyword));
};

const getBudgetBucket = (expense) => {
  const needType = normalizeText(
    expense?.need_type ??
      expense?.needType ??
      expense?.bucket ??
      expense?.budget_bucket ??
      expense?.budgetBucket ??
      expense?.expense_type ??
      expense?.expenseType ??
      expense?.type
  );

  if (["need", "needs"].includes(needType)) return "needs";
  if (["want", "wants"].includes(needType)) return "wants";
  if (["other", "others", "saving", "savings"].includes(needType)) return "other";

  const category = getExpenseCategory(expense);

  if (isNeedsCategory(category)) return "needs";
  if (isWantsCategory(category)) return "wants";

  const haystack = [
    expense?.category,
    expense?.budget_category,
    expense?.budgetCategory,
    expense?.title,
    expense?.name,
    expense?.description,
    expense?.note,
    expense?.merchant,
  ].join(" ");

  if (textIncludesAny(haystack, NEEDS_KEYWORDS)) return "needs";
  if (textIncludesAny(haystack, WANTS_KEYWORDS)) return "wants";
  if (textIncludesAny(haystack, OTHER_KEYWORDS)) return "other";

  return "other";
};

const formatRangeText = (startValue, endValue) => {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "No active range";
  }

  const formatter = new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const dispatchBudgetEvents = () => {
  if (typeof window === "undefined") return;

  [
    "clara-budgets-updated",
    "clara-finance-updated",
    "clara-local-finance-updated",
  ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
};

const callBudgetCreate = async (userKey, payload) => {
  if (typeof financeRepository.addBudget === "function") {
    return financeRepository.addBudget(userKey, payload);
  }

  if (typeof financeRepository.createBudget === "function") {
    return financeRepository.createBudget(userKey, payload);
  }

  if (typeof financeRepository.upsertBudget === "function") {
    return financeRepository.upsertBudget(userKey, payload);
  }

  throw new Error("No budget create function found in financeRepository.");
};

const callBudgetUpdate = async (userKey, id, payload) => {
  if (typeof financeRepository.updateBudget === "function") {
    return financeRepository.updateBudget(userKey, id, payload);
  }

  if (typeof financeRepository.saveBudget === "function") {
    return financeRepository.saveBudget(userKey, id, payload);
  }

  if (typeof financeRepository.upsertBudget === "function") {
    return financeRepository.upsertBudget(userKey, payload);
  }

  throw new Error("No budget update function found in financeRepository.");
};

export default function Budgets() {
  const { user, access, loading: accessLoading } = useUserRole();

  const localUserId = user?.id || user?.email || "";
  const canUseBudgets = access?.budgets ?? true;

  const {
    loading: financeLoading,
    budgets: financeBudgets = [],
    expenses: financeExpenses = [],
    wallets: financeWallets = [],
    refreshData,
  } = useFinancialData(user);

  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
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

  const budgets = useMemo(() => {
    return Array.isArray(financeBudgets)
      ? financeBudgets.map(normalizeBudgetRow).sort(sortByDateDesc)
      : [];
  }, [financeBudgets]);

  const expenses = useMemo(() => {
    return Array.isArray(financeExpenses)
      ? financeExpenses.map(normalizeExpenseRow).sort(sortByDateDesc)
      : [];
  }, [financeExpenses]);

  const wallets = useMemo(() => {
    return Array.isArray(financeWallets) ? financeWallets : [];
  }, [financeWallets]);

  const refreshPageData = useCallback(async () => {
    if (typeof refreshData === "function") {
      await refreshData();
    }

    dispatchBudgetEvents();
  }, [refreshData]);

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

    window.addEventListener("focus", onRefresh);
    window.addEventListener("clara-expenses-updated", onRefresh);
    window.addEventListener("clara-budgets-updated", onRefresh);
    window.addEventListener("clara-finance-updated", onRefresh);
    window.addEventListener("clara-local-finance-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onRefresh);
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
          const aTime = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0).getTime();
          const bTime = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0).getTime();
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
        total_budget: String(currentBudget.total_budget ?? currentBudget.totalBudget ?? currentBudget.allocated_amount ?? ""),
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

    if (!localUserId) {
      alert("Please sign in before saving a budget.");
      return;
    }

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
        created_at: existing?.created_at || existing?.createdAt || nowIso,
        updated_at: nowIso,
        created_by: user?.email || null,
        email: user?.email || null,
        user_id: user?.id || null,
      });

      if (existing?.id) {
        await callBudgetUpdate(localUserId, existing.id, payload);
      } else {
        await callBudgetCreate(localUserId, payload);
      }

      await refreshPageData();
      dispatchBudgetEvents();
      setOpen(false);
    } catch (error) {
      console.error("Failed to save budget:", error);
      alert("Failed to save budget.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!currentBudget || resetting) return;

    if (!localUserId) {
      alert("Please sign in before resetting a budget.");
      return;
    }

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

      const payload = normalizeBudgetRow({
        ...currentBudget,
        tracking_start_date: nowIso,
        tracking_end_date: safeEnd,
        range_start: nowIso,
        range_end: safeEnd,
        is_manual_range: true,
        updated_at: nowIso,
      });

      await callBudgetUpdate(localUserId, currentBudget.id, payload);
      await refreshPageData();
      dispatchBudgetEvents();
    } catch (error) {
      console.error("Failed to reset budget tracking:", error);
      alert("Failed to reset budget tracking.");
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

  const totalBudget = toNumber(currentBudget?.total_budget ?? currentBudget?.totalBudget ?? currentBudget?.allocated_amount);

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
        )) /
      100
    : 0;

  const totalSpent = toNumber(financials.totalSpent);
  const needsSpent = toNumber(financials.needsSpent);
  const wantsSpent = toNumber(financials.wantsSpent);
  const otherSpent = toNumber(financials.otherSpent);

  if (financeLoading) {
    return <FeaturePageLoader label="Preparing budgets..." />;
  }

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing budgets..." />;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Budgets</h1>
        </div>

        {!canUseBudgets ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">
            <Lock className="w-3.5 h-3.5" /> Upgrade to use budgets
          </div>
        ) : (
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  {currentBudget ? "Edit Budget" : "Set Budget"}
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{currentBudget ? "Edit" : "Set"} Budget</DialogTitle>
                  <DialogDescription>
                    Set your total budget, category split, and exact clickable date/time range in
                    Philippine time.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Month</Label>
                    <Input
                      type="month"
                      value={form.month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      {BUDGET_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Total Budget (₱)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={form.total_budget}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          total_budget: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>From</Label>
                      <Input
                        type="datetime-local"
                        value={form.range_start}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            range_start: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <Label>To</Label>
                      <Input
                        type="datetime-local"
                        value={form.range_end}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            range_end: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="hidden">
                    <p className="text-xs font-medium mb-3">50 / 30 / 20 SPLIT</p>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Needs %</Label>
                        <Input
                          type="number"
                          value={form.needs_pct}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              needs_pct: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Wants %</Label>
                        <Input
                          type="number"
                          value={form.wants_pct}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              wants_pct: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Other %</Label>
                        <Input
                          type="number"
                          value={form.other_pct}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              other_pct: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-3">
                      Total must equal 100%
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    disabled={!form.total_budget || saving}
                  >
                    {saving ? "Saving..." : "Save Budget"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {currentBudget && (
              <Button size="sm" variant="outline" onClick={handleReset} disabled={resetting}>
                <RotateCcw className={`w-4 h-4 mr-1 ${resetting ? "animate-spin" : ""}`} />
                {resetting ? "Resetting..." : "Reset"}
              </Button>
            )}
          </div>
        )}
      </div>

      {canUseBudgets && !financeLoading && !currentBudget && (
        <EmptyState
          icon={Target}
          title="No budget set"
          description="Set your budget and exact calculation range to start tracking."
        />
      )}

      {canUseBudgets && currentBudget && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">BUDGET</p>
                <p className="font-heading text-2xl font-bold">{fmt(totalBudget)}</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">SPENT</p>
                <p className="font-heading text-2xl font-bold text-destructive">
                  {fmt(totalSpent)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 mb-4">
              <CalendarRange className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Active Calculation Range
                </p>
                <p className="text-sm font-medium">
                  {formatRangeText(
                    activeRangeStart?.toISOString(),
                    activeRangeEnd?.toISOString()
                  )}
                </p>
              </div>
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  totalSpent > totalBudget ? "bg-destructive" : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(
                    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {fmt(Math.max(0, totalBudget - totalSpent))} remaining
            </p>
          </div>

          {categoryBudgetCards.length > 0 && (
            <div className="space-y-3">
              {categoryBudgetCards.map((item) => {
                const warning = item.pct >= 80 && item.pct < 100;
                const exceeded = item.pct >= 100;

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
