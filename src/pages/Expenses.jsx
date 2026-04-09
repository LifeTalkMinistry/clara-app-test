import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, Receipt, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
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
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

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

const EXPENSES_TABLE = "expenses";
const WALLETS_TABLE = "wallets";
const TXN_TABLE = "wallet_transactions";

const getToday = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  amount: "",
  category: "food",
  wallet_id: "",
  date: getToday(),
  notes: "",
  need_type: "need",
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

  const possibleUserIds = [
    item?.user_id,
    item?.owner_id,
    item?.profile_id,
  ]
    .map((v) => normalizeString(v))
    .filter(Boolean);

  if (userEmail && possibleEmails.includes(userEmail)) return true;
  if (currentUserId && possibleUserIds.includes(currentUserId)) return true;

  return false;
};

const sortByDateDesc = (a, b) => {
  const aTime = new Date(a?.created_at || a?.date || 0).getTime();
  const bTime = new Date(b?.created_at || b?.date || 0).getTime();
  return bTime - aTime;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isSameDay = (a, b) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getExpenseDateObject = (expense) => {
  const raw =
    expense?.created_at ||
    (expense?.date ? `${String(expense.date).slice(0, 10)}T12:00:00` : null) ||
    expense?.updated_at;

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getExpenseGroupLabel = (dateValue) => {
  const expenseDate = startOfDay(dateValue);
  const now = new Date();
  const today = startOfDay(now);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const startOfWeek = getStartOfWeek(today);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  if (isSameDay(expenseDate, today)) return "Today";
  if (isSameDay(expenseDate, yesterday)) return "Yesterday";
  if (expenseDate >= startOfWeek) return "This Week";
  if (expenseDate >= startOfMonth) return "Earlier This Month";
  return "Older";
};

const normalizeWallets = (wallets) => {
  return (wallets || []).map((wallet) => ({
    ...wallet,
    id: String(wallet.id),
    balance: normalizeNumber(
      wallet?.balance ??
        wallet?.current_balance ??
        wallet?.wallet_balance ??
        wallet?.starting_balance ??
        0
    ),
    name: wallet?.name || wallet?.wallet_name || "Untitled Wallet",
  }));
};

const fetchRowsForUser = async (table, user, orderColumn = "created_at", ascending = false) => {
  if (!user?.id && !user?.email) return [];

  const allRows = [];

  if (user?.id) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id)
      .order(orderColumn, { ascending });

    if (error) {
      console.error(`Failed loading ${table} by user_id`, error);
    } else if (Array.isArray(data)) {
      allRows.push(...data);
    }
  }

  if (user?.email) {
    const emailColumns = ["user_email", "created_by", "owner_email", "email"];

    for (const column of emailColumns) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(column, user.email)
        .order(orderColumn, { ascending });

      if (error) {
        // ignore columns that do not exist or do not match
        continue;
      }

      if (Array.isArray(data)) {
        allRows.push(...data);
      }
    }
  }

  const map = new Map();

  allRows.forEach((row) => {
    const key = String(row?.id ?? `${table}-${Math.random().toString(36).slice(2)}`);
    if (!map.has(key) && isOwnedByUser(row, user)) {
      map.set(key, row);
    }
  });

  return Array.from(map.values()).sort(sortByDateDesc);
};

export default function Expenses() {
  const { user } = useUserRole();

  const [expenses, setExpenses] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("recent");
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const refreshTimeoutRef = useRef(null);

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

  const loadData = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setExpenses([]);
      setWallets([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [expenseRows, walletRows, transactionRows] = await Promise.all([
        fetchRowsForUser(EXPENSES_TABLE, user, "created_at", false),
        fetchRowsForUser(WALLETS_TABLE, user, "created_at", false),
        fetchRowsForUser(TXN_TABLE, user, "created_at", false),
      ]);

      const normalizedExpenses = (expenseRows || [])
        .map((expense) => ({
          ...expense,
          id: String(expense.id),
          wallet_id: expense.wallet_id ? String(expense.wallet_id) : "",
          amount: normalizeNumber(expense.amount),
          date: expense?.date ? String(expense.date).slice(0, 10) : getToday(),
        }))
        .sort(sortByDateDesc);

      const normalizedWalletRows = normalizeWallets(walletRows || []);
      const normalizedTransactions = (transactionRows || []).map((txn) => ({
        ...txn,
        id: String(txn.id),
        wallet_id: txn.wallet_id ? String(txn.wallet_id) : "",
        amount: normalizeNumber(txn.amount),
      }));

      setExpenses(normalizedExpenses);
      setWallets(normalizedWalletRows);
      setTransactions(normalizedTransactions);
    } catch (err) {
      console.error("Failed to load expenses page data:", err);
      setExpenses([]);
      setWallets([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        loadData();
      }, 120);
    };

    const channel = supabase
      .channel(`expenses-page-${user?.id || user?.email || "guest"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: EXPENSES_TABLE }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: WALLETS_TABLE }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: TXN_TABLE }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [loadData, user?.id, user?.email]);

  const updateWalletBalance = useCallback(
    async (walletId, nextBalance) => {
      const { error: walletError } = await supabase
        .from(WALLETS_TABLE)
        .update({
          balance: normalizeNumber(nextBalance),
          updated_at: new Date().toISOString(),
        })
        .eq("id", walletId);

      if (walletError) throw walletError;
    },
    []
  );

  const findMatchingExpenseTxn = useCallback(
    (expense) => {
      return transactions.find((t) => {
        if (String(t.type || "").toLowerCase() !== "expense") return false;
        if (String(t.wallet_id) !== String(expense.wallet_id)) return false;
        if (normalizeNumber(t.amount) !== normalizeNumber(expense.amount)) return false;

        const txnDate = String(t.created_at || "").slice(0, 10);
        const expenseDate = String(expense.date || "").slice(0, 10);
        if (txnDate !== expenseDate) return false;

        if ((t.notes || "") !== (expense.notes || "")) return false;
        if ((t.category || "") !== (expense.category || "")) return false;
        if ((t.need_type || "") !== (expense.need_type || "")) return false;

        return isOwnedByUser(t, user) || !t.created_by;
      });
    },
    [transactions, user]
  );

  const handleFilterChange = (value) => {
    setFilter(value);
    if (value !== "recent") setShowAllRecent(true);
  };

  const openAdd = () => {
    setEditId(null);
    setError("");
    setForm({
      ...EMPTY_FORM,
      wallet_id: wallets[0]?.id ? String(wallets[0].id) : "",
      date: getToday(),
    });
    setOpen(true);
  };

  const openEdit = (exp) => {
    setError("");
    setEditId(String(exp.id));
    setForm({
      amount: String(exp.amount ?? ""),
      category: exp.category || "food",
      wallet_id: exp.wallet_id ? String(exp.wallet_id) : "",
      date: exp.date ? String(exp.date).slice(0, 10) : getToday(),
      notes: exp.notes || "",
      need_type: exp.need_type || "need",
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

    try {
      setSaving(true);

      if (editId) {
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

        const updatedExpense = {
          amount: parsedAmount,
          category: form.category,
          wallet_id: String(form.wallet_id),
          date: form.date || getToday(),
          notes: form.notes || "",
          need_type: form.need_type,
          updated_at: new Date().toISOString(),
        };

        const { error: expenseUpdateError } = await supabase
          .from(EXPENSES_TABLE)
          .update(updatedExpense)
          .eq("id", oldExpense.id);

        if (expenseUpdateError) throw expenseUpdateError;

        if (sameWallet) {
          const restored = normalizeNumber(oldWallet.balance) + normalizeNumber(oldExpense.amount);
          const newBalance = restored - parsedAmount;
          await updateWalletBalance(oldWallet.id, newBalance);
        } else {
          const oldWalletNewBalance =
            normalizeNumber(oldWallet.balance) + normalizeNumber(oldExpense.amount);

          const newWalletNewBalance =
            normalizeNumber(targetWallet.balance) - parsedAmount;

          await updateWalletBalance(oldWallet.id, oldWalletNewBalance);
          await updateWalletBalance(targetWallet.id, newWalletNewBalance);
        }

        const oldTxn = findMatchingExpenseTxn(oldExpense);

        if (oldTxn) {
          const txnUpdatePayload = {
            wallet_id: String(form.wallet_id),
            amount: parsedAmount,
            category: form.category,
            need_type: form.need_type,
            notes: form.notes || "",
            created_at: form.date
              ? new Date(`${form.date}T12:00:00`).toISOString()
              : oldTxn.created_at,
            updated_at: new Date().toISOString(),
          };

          const { error: txnUpdateError } = await supabase
            .from(TXN_TABLE)
            .update(txnUpdatePayload)
            .eq("id", oldTxn.id);

          if (txnUpdateError) throw txnUpdateError;
        } else {
          const newTxn = {
            id: generateId(),
            wallet_id: String(form.wallet_id),
            amount: parsedAmount,
            type: "expense",
            category: form.category,
            need_type: form.need_type,
            notes: form.notes || "",
            created_at: form.date
              ? new Date(`${form.date}T12:00:00`).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: user.email ?? "",
            user_email: user.email ?? "",
            user_id: user.id ?? "",
          };

          const { error: txnInsertError } = await supabase
            .from(TXN_TABLE)
            .insert([newTxn]);

          if (txnInsertError) throw txnInsertError;
        }
      } else {
        if (parsedAmount > normalizeNumber(targetWallet.balance)) {
          setError("Not enough wallet balance for this expense.");
          return;
        }

        const createdAt = form.date
          ? new Date(`${form.date}T12:00:00`).toISOString()
          : new Date().toISOString();

        const newExpense = {
          id: generateId(),
          amount: parsedAmount,
          category: form.category,
          wallet_id: String(form.wallet_id),
          date: form.date || getToday(),
          notes: form.notes || "",
          need_type: form.need_type,
          created_by: user.email ?? "",
          user_email: user.email ?? "",
          user_id: user.id ?? "",
          created_at: createdAt,
          updated_at: createdAt,
        };

        const newTxn = {
          id: generateId(),
          wallet_id: String(form.wallet_id),
          amount: parsedAmount,
          type: "expense",
          category: form.category,
          need_type: form.need_type,
          notes: form.notes || "",
          created_at: createdAt,
          updated_at: createdAt,
          created_by: user.email ?? "",
          user_email: user.email ?? "",
          user_id: user.id ?? "",
        };

        const { error: expenseInsertError } = await supabase
          .from(EXPENSES_TABLE)
          .insert([newExpense]);

        if (expenseInsertError) throw expenseInsertError;

        const { error: txnInsertError } = await supabase
          .from(TXN_TABLE)
          .insert([newTxn]);

        if (txnInsertError) throw txnInsertError;

        const nextBalance = normalizeNumber(targetWallet.balance) - parsedAmount;
        await updateWalletBalance(targetWallet.id, nextBalance);
      }

      await loadData();
      closeModal();
    } catch (err) {
      console.error("Failed to save expense:", err);
      setError(err?.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
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

      const { error: expenseDeleteError } = await supabase
        .from(EXPENSES_TABLE)
        .delete()
        .eq("id", expenseToDelete.id);

      if (expenseDeleteError) throw expenseDeleteError;

      if (matchingTxn) {
        const { error: txnDeleteError } = await supabase
          .from(TXN_TABLE)
          .delete()
          .eq("id", matchingTxn.id);

        if (txnDeleteError) throw txnDeleteError;
      }

      const nextBalance =
        normalizeNumber(wallet.balance) + normalizeNumber(expenseToDelete.amount);

      await updateWalletBalance(wallet.id, nextBalance);
      await loadData();
    } catch (err) {
      console.error("Failed to delete expense:", err);
      setError(err?.message || "Failed to delete expense.");
    } finally {
      setSaving(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const list = [...expenses];

    if (filter === "recent") return showAllRecent ? list : list.slice(0, 5);

    if (filter === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endOfDay(now);
      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);

      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "3_months") {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = endOfDay(now);
      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "6_months") {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const end = endOfDay(now);
      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "this_year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = endOfDay(now);
      return list.filter((expense) => {
        const expenseDate = getExpenseDateObject(expense);
        return expenseDate && expenseDate >= start && expenseDate <= end;
      });
    }

    if (filter === "custom") {
      if (!customStartDate && !customEndDate) return list;

      const start = customStartDate ? startOfDay(customStartDate) : null;
      const end = customEndDate ? endOfDay(customEndDate) : null;

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
  }, [expenses, filter, showAllRecent, customStartDate, customEndDate]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + normalizeNumber(expense.amount), 0);
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
    const orderedLabels = ["Today", "Yesterday", "This Week", "Earlier This Month", "Older"];
    const groups = {};

    filteredExpenses.forEach((expense) => {
      const expenseDate = getExpenseDateObject(expense) || new Date();
      const label = getExpenseGroupLabel(expenseDate);
      if (!groups[label]) groups[label] = [];
      groups[label].push(expense);
    });

    return orderedLabels
      .filter((label) => groups[label]?.length)
      .map((label) => ({
        label,
        items: groups[label],
        total: groups[label].reduce((sum, item) => sum + normalizeNumber(item.amount), 0),
      }));
  }, [filteredExpenses]);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(normalizeNumber(n));

  const walletName = (id) => walletMap.get(String(id))?.name || "Unknown wallet";

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
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Expenses"
        subtitle="Track every peso you spend"
        action={
          <Button size="sm" onClick={openAdd} className="rounded-xl px-4 shadow-sm">
            <Plus className="w-4 h-4 mr-1" /> Add Expense
          </Button>
        }
      />

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal();
          else setOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Expense</DialogTitle>
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
              <Label>Type</Label>
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
              <Label>Wallet</Label>
              <Select
                value={form.wallet_id}
                onValueChange={(v) => {
                  setError("");
                  setForm({ ...form, wallet_id: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={wallets.length > 0 ? "Select wallet" : "No wallets found"} />
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
                <p className="text-xs text-destructive mt-1">Create a wallet first</p>
              )}

              {!!selectedWallet && (
                <p className="text-xs text-muted-foreground mt-1">
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

            {!!error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={saving || !form.amount || !form.wallet_id || wallets.length === 0}
            >
              {saving ? "Saving..." : editId ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {expenses.length > 0 && (
        <div className="mb-5 rounded-3xl border border-border/50 bg-gradient-to-br from-card to-card/60 backdrop-blur-md p-4 md:p-5 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
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

            {filter === "custom" && (
              <>
                <div className="flex-1">
                  <Label className="mb-2 block">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex-1">
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

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
            <div className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredExpenses.length}</span> • {filterLabel}
            </div>

            <div className="font-bold text-lg">
              <span className="text-muted-foreground mr-1">Total:</span>
              <span className="text-destructive">-{fmt(totalFilteredAmount)}</span>
            </div>
          </div>

          {filter === "recent" && expenses.length > 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl w-fit"
              onClick={() => setShowAllRecent((prev) => !prev)}
            >
              {showAllRecent ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  See More
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Start tracking your spending by adding your first expense."
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses found"
          description="No expenses match the selected timeframe."
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

              <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm overflow-hidden">
                {group.items.map((exp, index) => (
                  <div
                    key={exp.id}
                    className={`group flex items-center gap-4 px-4 py-4 transition-all duration-200 hover:bg-muted/20 ${
                      index !== group.items.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-destructive" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate tracking-wide">
                            {exp.category?.charAt(0).toUpperCase() + exp.category?.slice(1)}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span>{walletName(exp.wallet_id)}</span>
                            <span>•</span>
                            <span>{exp.date}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                needTypeColors[exp.need_type] || ""
                              }`}
                            >
                              {exp.need_type}
                            </span>
                          </div>

                          {exp.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate italic">
                              {exp.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <p className="font-heading font-bold text-sm text-destructive whitespace-nowrap">
                            -{fmt(exp.amount)}
                          </p>

                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 rounded-lg"
                              onClick={() => openEdit(exp)}
                              disabled={saving}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 rounded-lg"
                              onClick={() => handleDelete(exp.id)}
                              disabled={saving}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}