import { useState, useMemo, useCallback } from "react";
import {
  Receipt,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
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
import useFinancialData from "../hooks/useFinancialData";

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

const toDateInputValue = (value) => {
  if (!value) return getToday();

  const d = parseSupabaseDate(value);
  if (d) return getPHDateString(d);

  const raw = String(value).slice(0, 10);
  return raw || getToday();
};

const buildCreatedAtFromDate = (dateValue, baseTimeValue = null) => {
  const baseParts = baseTimeValue
    ? getPHParts(baseTimeValue)
    : getPHParts(new Date());

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

const sortByDateDesc = (a, b) => {
  const aTime = parseSupabaseDate(a?.created_at || a?.date || 0)?.getTime() ?? 0;
  const bTime = parseSupabaseDate(b?.created_at || b?.date || 0)?.getTime() ?? 0;
  return bTime - aTime;
};

const getExpenseDateObject = (expense) => {
  const exactRaw =
    expense?.created_at ||
    expense?.timestamp ||
    expense?.datetime ||
    expense?.updated_at ||
    expense?.date;

  if (exactRaw) {
    const exactDate = parseSupabaseDate(exactRaw);
    if (exactDate) return exactDate;
  }

  if (expense?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(expense.date))) {
    return parsePHDateOnlyToUtcDate(String(expense.date), false);
  }

  return null;
};

const getExpensePHDateKey = (expense) => {
  const d = getExpenseDateObject(expense);
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

const getExpenseGroupLabel = (expense) => {
  const expenseKey = getExpensePHDateKey(expense);
  if (!expenseKey) return "Older";

  const todayKey = getPHDateString();
  const startOfWeekKey = getPHStartOfWeekDateString(new Date());

  const nowParts = getPHParts(new Date());
  const startOfMonthKey = `${nowParts.year}-${pad(nowParts.month)}-01`;

  if (expenseKey === todayKey) return "Today";
  if (expenseKey >= startOfWeekKey) return "This Week";
  if (expenseKey >= startOfMonthKey) return "This Month";
  return "Older";
};

export default function Expenses() {
  const { user } = useUserRole();

  const {
    expenses = [],
    wallets = [],
    addExpense,
    updateExpense,
    deleteExpense,
    refreshData,
    loading,
    error: dataError,
  } = useFinancialData();

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeWallets = Array.isArray(wallets) ? wallets : [];

  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    date: getToday(),
  });
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("recent");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [needTypeFilter, setNeedTypeFilter] = useState("all");
  const [planningFilter, setPlanningFilter] = useState("all");
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const walletMap = useMemo(() => {
    const map = new Map();

    safeWallets.forEach((wallet) => {
      map.set(String(wallet.id), {
        ...wallet,
        name: wallet?.name || wallet?.wallet_name || "Untitled Wallet",
        balance: normalizeNumber(wallet?.balance),
      });
    });

    return map;
  }, [safeWallets]);

  const selectedWallet = useMemo(() => {
    return walletMap.get(String(form.wallet_id)) || null;
  }, [walletMap, form.wallet_id]);

  const sortedExpenses = useMemo(() => {
    return [...safeExpenses].sort(sortByDateDesc);
  }, [safeExpenses]);

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

  const handleFilterChange = (value) => {
    setFilter(value);
    if (value !== "recent") setShowAllRecent(true);
  };

  const openAddExpense = () => {
    setError("");
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      date: getToday(),
      wallet_id: safeWallets.length === 1 ? String(safeWallets[0].id) : "",
    });
    setOpen(true);
  };

  const openEditExpense = (expense) => {
    setError("");
    setEditId(String(expense.id));
    setForm({
      amount: String(expense.amount ?? ""),
      category: expense.category || "food",
      wallet_id: expense.wallet_id ? String(expense.wallet_id) : "",
      date: toDateInputValue(expense.date || expense.created_at),
      notes: expense.notes || "",
      need_type: expense.need_type || "need",
      planning_status: normalizePlanningStatus(expense.planning_status),
      unplanned_reason: expense.unplanned_reason || "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setOpen(false);
    setEditId(null);
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
      setError("Enter a valid expense amount.");
      return;
    }

    if (!form.wallet_id) {
      setError("Please select a wallet.");
      return;
    }

    const targetWallet = walletMap.get(String(form.wallet_id));

    if (!targetWallet) {
      setError("Selected wallet not found.");
      return;
    }

    const planningStatus = normalizePlanningStatus(form.planning_status);
    const unplannedReason = String(form.unplanned_reason || "").trim();

    if (planningStatus === "unplanned" && !unplannedReason) {
      setError("Reason is required when an expense is unplanned.");
      return;
    }

    const existingExpense = editId
      ? safeExpenses.find((expense) => String(expense.id) === String(editId))
      : null;

    const sameWallet =
      existingExpense && String(existingExpense.wallet_id) === String(form.wallet_id);

    let availableBalance = normalizeNumber(targetWallet.balance);

    if (sameWallet) {
      availableBalance += normalizeNumber(existingExpense.amount);
    }

    if (parsedAmount > availableBalance) {
      setError("Not enough wallet balance for this expense.");
      return;
    }

    try {
      setSaving(true);

      const createdAt = buildCreatedAtFromDate(
        form.date,
        existingExpense?.created_at || new Date()
      );

      const payload = {
        amount: parsedAmount,
        category: form.category,
        wallet_id: String(form.wallet_id),
        date: form.date,
        notes: form.notes || "",
        need_type: form.need_type,
        planning_status: planningStatus,
        unplanned_reason: planningStatus === "unplanned" ? unplannedReason : "",
        created_at: createdAt,
        updated_at: new Date().toISOString(),
        created_by: user.email ?? "",
        user_email: user.email ?? "",
        user_id: user.id ?? "",
      };

      if (editId) {
        await updateExpense(editId, {
          ...existingExpense,
          ...payload,
        });
      } else {
        await addExpense(payload);
      }

      await refreshData?.();
      closeModal();
    } catch (err) {
      console.error("Failed to save expense:", err);
      setError(err?.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    setError("");

    try {
      setSaving(true);
      await deleteExpense(id);
      await refreshData?.();
    } catch (err) {
      console.error("Failed to delete expense:", err);
      setError(err?.message || "Failed to delete expense.");
    } finally {
      setSaving(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let list = [...sortedExpenses];

    if (categoryFilter !== "all") {
      list = list.filter((expense) => expense.category === categoryFilter);
    }

    if (needTypeFilter !== "all") {
      list = list.filter((expense) => expense.need_type === needTypeFilter);
    }

    if (planningFilter !== "all") {
      list = list.filter(
        (expense) => normalizePlanningStatus(expense.planning_status) === planningFilter
      );
    }

    if (filter === "recent") {
      return showAllRecent ? list : list.slice(0, 5);
    }

    if (filter === "this_month") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month,
        day: 1,
      });
      const end = now;

      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
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
      });

      const currentMonthStart = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month,
        day: 1,
      });

      const end = new Date(currentMonthStart.getTime() - 1);

      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "3_months") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month - 2,
        day: 1,
      });
      const end = now;

      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "6_months") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: nowParts.month - 5,
        day: 1,
      });
      const end = now;

      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "this_year") {
      const nowParts = getPHParts(now);
      const start = phLocalPartsToUtcDate({
        year: nowParts.year,
        month: 1,
        day: 1,
      });
      const end = now;

      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "custom") {
      if (!customStartDate && !customEndDate) return list;

      const start = customStartDate
        ? parsePHDateOnlyToUtcDate(customStartDate, false)
        : null;
      const end = customEndDate ? parsePHDateOnlyToUtcDate(customEndDate, true) : null;

      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        if (!expenseDate) return false;
        if (start && end) return expenseDate >= start && expenseDate <= end;
        if (start) return expenseDate >= start;
        if (end) return expenseDate <= end;
        return true;
      });
    }

    return list;
  }, [
    sortedExpenses,
    filter,
    categoryFilter,
    needTypeFilter,
    planningFilter,
    showAllRecent,
    customStartDate,
    customEndDate,
  ]);

  const totals = useMemo(() => {
    return filteredExpenses.reduce(
      (acc, expense) => {
        const amount = normalizeNumber(expense.amount);
        acc.expense += amount;

        const needType = expense.need_type || "need";
        if (!acc.byNeedType[needType]) acc.byNeedType[needType] = 0;
        acc.byNeedType[needType] += amount;

        return acc;
      },
      {
        expense: 0,
        byNeedType: {
          need: 0,
          want: 0,
          savings: 0,
        },
      }
    );
  }, [filteredExpenses]);

  const filterLabel = useMemo(() => {
    switch (filter) {
      case "recent":
        return showAllRecent ? "All recent expenses" : "Top 5 recent expenses";
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
        return "Expenses";
    }
  }, [filter, showAllRecent]);

  const groupedExpenses = useMemo(() => {
    const orderedLabels = ["Today", "This Week", "This Month", "Older"];
    const groups = {};

    filteredExpenses.forEach((expense) => {
      const label = getExpenseGroupLabel(expense);
      if (!groups[label]) groups[label] = [];
      groups[label].push(expense);
    });

    return orderedLabels
      .filter((label) => groups[label]?.length)
      .map((label) => ({
        label,
        items: groups[label],
        total: groups[label].reduce(
          (sum, item) => sum + normalizeNumber(item.amount),
          0
        ),
      }));
  }, [filteredExpenses]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
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
            <DialogTitle>{editId ? "Edit Expense" : "Add Expense"}</DialogTitle>
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
                    placeholder={
                      safeWallets.length > 0 ? "Select wallet" : "No wallets found"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {safeWallets.map((w) => {
                    const walletName = w?.name || w?.wallet_name || "Untitled Wallet";

                    return (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {walletName} • {fmt(w.balance)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {safeWallets.length === 0 && (
                <p className="mt-1 text-xs text-destructive">Create a wallet first</p>
              )}

              {!!selectedWallet && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Available balance: {fmt(selectedWallet.balance)}
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
                placeholder="What was this for?"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {!!(error || dataError) && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error || dataError}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={
                saving ||
                !form.amount ||
                !form.wallet_id ||
                safeWallets.length === 0 ||
                (form.planning_status === "unplanned" &&
                  !form.unplanned_reason.trim())
              }
            >
              {saving ? "Saving..." : editId ? "Save Expense" : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Expenses</h1>
          <p className="text-xs text-muted-foreground">
            Track money out by wallet, need type, and plan status.
          </p>
        </div>

        <Button onClick={openAddExpense} className="rounded-xl" disabled={saving}>
          Add Expense
        </Button>
      </div>

      {sortedExpenses.length > 0 && (
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
                <Label className="mb-2 block">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Need Type</Label>
                <Select value={needTypeFilter} onValueChange={setNeedTypeFilter}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select need type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Need Types</SelectItem>
                    {needTypes.map((needType) => (
                      <SelectItem key={needType} value={needType}>
                        {needType.charAt(0).toUpperCase() + needType.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Planning</Label>
                <Select value={planningFilter} onValueChange={setPlanningFilter}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select planning status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {planningStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
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
                <span className="font-semibold text-foreground">
                  {filteredExpenses.length}
                </span>{" "}
                • {filterLabel}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Total Out
                  </p>
                  <p className="text-sm font-bold text-destructive">
                    -{fmt(totals.expense)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Needs
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {fmt(totals.byNeedType.need)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Wants
                  </p>
                  <p className="text-sm font-bold text-secondary-foreground">
                    {fmt(totals.byNeedType.want)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Savings
                  </p>
                  <p className="text-sm font-bold text-accent">
                    {fmt(totals.byNeedType.savings)}
                  </p>
                </div>
              </div>
            </div>

            {filter === "recent" &&
              filteredExpenses.length > 0 &&
              sortedExpenses.length > 5 && (
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

      {sortedExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Start tracking your spending by adding your first expense."
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses found"
          description="No expenses match the selected filters."
        />
      ) : (
        <div className="space-y-5">
          {groupedExpenses.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold tracking-wide text-foreground/90">
                  {group.label}
                </div>

                <div className="text-xs font-semibold text-destructive">
                  -{fmt(group.total)}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm">
                {group.items.map((expense, index) => {
                  const wallet =
                    walletMap.get(String(expense.wallet_id)) || null;
                  const walletName = wallet?.name || "Unknown wallet";
                  const needType = expense.need_type || "need";
                  const planningStatus = normalizePlanningStatus(
                    expense.planning_status
                  );

                  return (
                    <div
                      key={expense.id}
                      className={`group flex items-center gap-4 px-4 py-4 transition-all duration-200 hover:bg-muted/20 ${
                        index !== group.items.length - 1
                          ? "border-b border-border/40"
                          : ""
                      }`}
                    >
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
                        <ArrowUpRight className="h-5 w-5 text-destructive" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-wide">
                              {expense.category
                                ? expense.category.charAt(0).toUpperCase() +
                                  expense.category.slice(1)
                                : "Expense"}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{walletName}</span>
                              <span>•</span>
                              <span>
                                {formatLocalDateTime(
                                  expense.created_at || expense.date || Date.now()
                                )}
                              </span>

                              <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-destructive">
                                expense
                              </span>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  needTypeColors[needType] || ""
                                }`}
                              >
                                {needType}
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                                {planningStatus}
                              </span>
                            </div>

                            {expense.notes && (
                              <p className="mt-1 truncate text-xs italic text-muted-foreground">
                                {expense.notes}
                              </p>
                            )}

                            {planningStatus === "unplanned" &&
                              expense.unplanned_reason && (
                                <p className="mt-1 truncate text-xs text-amber-300/85">
                                  Reason: {expense.unplanned_reason}
                                </p>
                              )}
                          </div>

                          <div className="flex flex-shrink-0 flex-col items-end gap-2">
                            <p className="whitespace-nowrap text-sm font-bold text-destructive">
                              -{fmt(expense.amount)}
                            </p>

                            <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                onClick={() => openEditExpense(expense)}
                                disabled={saving}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10"
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
