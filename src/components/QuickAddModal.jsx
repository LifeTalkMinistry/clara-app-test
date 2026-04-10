import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Receipt, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import useUserRole from "../hooks/useUserRole";

const EXPENSES_TABLE = "expenses";
const WALLETS_TABLE = "wallets";
const TXN_TABLE = "wallet_transactions";
const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MINUTES = 8 * 60;

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

const ACTION_TYPES = [
  { id: "expense", label: "Add Expense", icon: Receipt },
  { id: "income", label: "Add Funds", icon: TrendingUp },
];

const pad = (n) => String(n).padStart(2, "0");

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

const getToday = () => getPHDateString();

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
  const aTime = parseSupabaseDate(a?.created_at || a?.date || 0)?.getTime() ?? 0;
  const bTime = parseSupabaseDate(b?.created_at || b?.date || 0)?.getTime() ?? 0;
  return bTime - aTime;
};

const normalizeWallets = (wallets) =>
  (wallets || []).map((wallet) => ({
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

const fetchRowsForUser = async (table, user, orderColumn = "created_at", ascending = false) => {
  if (!user?.id && !user?.email) return [];

  const allRows = [];

  if (user?.id) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id)
      .order(orderColumn, { ascending });

    if (!error && Array.isArray(data)) {
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

      if (!error && Array.isArray(data)) {
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

export default function QuickAddModal({
  open,
  onClose,
  onSuccess,
}) {
  const { user } = useUserRole();

  const [wallets, setWallets] = useState([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionType, setActionType] = useState("expense");

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "food",
    wallet_id: "",
    date: getToday(),
    notes: "",
    need_type: "need",
  });

  const [incomeForm, setIncomeForm] = useState({
    amount: "",
    source: "",
    wallet_id: "",
    date: getToday(),
    notes: "",
  });

  const walletMap = useMemo(() => {
    const map = new Map();
    wallets.forEach((wallet) => {
      map.set(String(wallet.id), wallet);
    });
    return map;
  }, [wallets]);

  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadWallets = async () => {
      if (!user?.id && !user?.email) {
        if (active) setWallets([]);
        return;
      }

      try {
        setLoadingWallets(true);
        const walletRows = await fetchRowsForUser(WALLETS_TABLE, user, "created_at", false);
        if (!active) return;

        const normalized = normalizeWallets(walletRows || []);
        setWallets(normalized);

        const firstWalletId = normalized[0]?.id ? String(normalized[0].id) : "";

        setExpenseForm((prev) => ({
          ...prev,
          wallet_id: prev.wallet_id || firstWalletId,
        }));

        setIncomeForm((prev) => ({
          ...prev,
          wallet_id: prev.wallet_id || firstWalletId,
        }));
      } catch (err) {
        console.error("Failed loading wallets:", err);
        if (active) setWallets([]);
      } finally {
        if (active) setLoadingWallets(false);
      }
    };

    loadWallets();

    return () => {
      active = false;
    };
  }, [open, user]);

  const resetForms = () => {
    const firstWalletId = wallets[0]?.id ? String(wallets[0].id) : "";

    setActionType("expense");
    setError("");

    setExpenseForm({
      amount: "",
      category: "food",
      wallet_id: firstWalletId,
      date: getToday(),
      notes: "",
      need_type: "need",
    });

    setIncomeForm({
      amount: "",
      source: "",
      wallet_id: firstWalletId,
      date: getToday(),
      notes: "",
    });
  };

  const handleClose = () => {
    if (saving) return;
    onClose?.();
    setTimeout(() => resetForms(), 120);
  };

  const updateWalletBalance = async (walletId, nextBalance) => {
    const { error: walletError } = await supabase
      .from(WALLETS_TABLE)
      .update({
        balance: normalizeNumber(nextBalance),
        updated_at: new Date().toISOString(),
      })
      .eq("id", walletId);

    if (walletError) throw walletError;
  };

  const insertWalletTransaction = async ({
    walletId,
    amount,
    type,
    category = null,
    needType = null,
    notes = "",
    createdAt,
  }) => {
    const payload = {
      id: generateId(),
      wallet_id: String(walletId),
      amount: normalizeNumber(amount),
      type,
      notes: notes || "",
      created_at: createdAt,
      updated_at: createdAt,
      created_by: user?.email ?? "",
      user_email: user?.email ?? "",
      user_id: user?.id ?? "",
    };

    if (type === "expense") {
      payload.category = category || null;
      payload.need_type = needType || null;
    }

    const { error: txnInsertError } = await supabase
      .from(TXN_TABLE)
      .insert([payload]);

    if (txnInsertError) throw txnInsertError;
  };

  const handleCreateExpense = async () => {
    const parsedAmount = normalizeNumber(expenseForm.amount);

    if (!user?.email && !user?.id) {
      throw new Error("User not found.");
    }

    if (!parsedAmount || parsedAmount <= 0) {
      throw new Error("Enter a valid expense amount.");
    }

    if (!expenseForm.wallet_id) {
      throw new Error("Please select a wallet.");
    }

    const targetWallet = walletMap.get(String(expenseForm.wallet_id));
    if (!targetWallet) {
      throw new Error("Selected wallet not found.");
    }

    if (parsedAmount > normalizeNumber(targetWallet.balance)) {
      throw new Error("Not enough wallet balance for this expense.");
    }

    const createdAt = buildCreatedAtFromDate(expenseForm.date);

    const newExpense = {
      id: generateId(),
      amount: parsedAmount,
      category: expenseForm.category,
      wallet_id: String(expenseForm.wallet_id),
      date: expenseForm.date || getToday(),
      notes: expenseForm.notes || "",
      need_type: expenseForm.need_type,
      created_by: user.email ?? "",
      user_email: user.email ?? "",
      user_id: user.id ?? "",
      created_at: createdAt,
      updated_at: createdAt,
    };

    const { error: expenseInsertError } = await supabase
      .from(EXPENSES_TABLE)
      .insert([newExpense]);

    if (expenseInsertError) throw expenseInsertError;

    await insertWalletTransaction({
      walletId: expenseForm.wallet_id,
      amount: parsedAmount,
      type: "expense",
      category: expenseForm.category,
      needType: expenseForm.need_type,
      notes: expenseForm.notes || "",
      createdAt,
    });

    const nextBalance = normalizeNumber(targetWallet.balance) - parsedAmount;
    await updateWalletBalance(targetWallet.id, nextBalance);
  };

  const handleCreateIncome = async () => {
    const parsedAmount = normalizeNumber(incomeForm.amount);

    if (!user?.email && !user?.id) {
      throw new Error("User not found.");
    }

    if (!parsedAmount || parsedAmount <= 0) {
      throw new Error("Enter a valid amount.");
    }

    if (!incomeForm.wallet_id) {
      throw new Error("Please select a wallet.");
    }

    const targetWallet = walletMap.get(String(incomeForm.wallet_id));
    if (!targetWallet) {
      throw new Error("Selected wallet not found.");
    }

    const createdAt = buildCreatedAtFromDate(incomeForm.date);

    const nextBalance = normalizeNumber(targetWallet.balance) + parsedAmount;
    await updateWalletBalance(targetWallet.id, nextBalance);

    await insertWalletTransaction({
      walletId: incomeForm.wallet_id,
      amount: parsedAmount,
      type: "income",
      notes: incomeForm.notes || incomeForm.source || "",
      createdAt,
    });
  };

  const handleSubmit = async () => {
    setError("");
    setSaving(true);

    try {
      if (actionType === "expense") {
        await handleCreateExpense();
      } else {
        await handleCreateIncome();
      }

      window.dispatchEvent(new Event("clara-expenses-updated"));
      window.dispatchEvent(new Event("clara-finance-updated"));
      window.dispatchEvent(new Event("clara-wallets-updated"));
      window.dispatchEvent(new Event("clara-wallet-transactions-updated"));

      await onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Quick add failed:", err);
      setError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const isDisabled =
    saving ||
    loadingWallets ||
    wallets.length === 0 ||
    (actionType === "expense"
      ? !expenseForm.amount || !expenseForm.wallet_id
      : !incomeForm.amount || !incomeForm.wallet_id);

  const selectedExpenseWallet = walletMap.get(String(expenseForm.wallet_id));
  const selectedIncomeWallet = walletMap.get(String(incomeForm.wallet_id));

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="max-w-sm mx-auto border border-emerald-500/20 bg-[#031126] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            Quick Log
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mb-2">
          {ACTION_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setError("");
                setActionType(item.id);
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                actionType === item.id
                  ? "border-emerald-400 text-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                  : "border-slate-700 text-slate-300"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {actionType === "expense" && (
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Amount (₱)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="border-emerald-500/40 bg-[#071a34] text-lg font-bold text-white"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-xs text-slate-200">Category</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(value) =>
                    setExpenseForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block text-xs text-slate-200">Type</Label>
                <Select
                  value={expenseForm.need_type}
                  onValueChange={(value) =>
                    setExpenseForm((prev) => ({ ...prev, need_type: value }))
                  }
                >
                  <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="need">Need</SelectItem>
                    <SelectItem value="want">Want</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Wallet</Label>
              <Select
                value={expenseForm.wallet_id}
                onValueChange={(value) =>
                  setExpenseForm((prev) => ({ ...prev, wallet_id: value }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                  <SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select wallet"} />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={String(wallet.id)}>
                      {wallet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!!selectedExpenseWallet && (
                <p className="mt-1 text-xs text-slate-400">
                  Available balance: ₱{normalizeNumber(selectedExpenseWallet.balance).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Date</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input
                placeholder="What was this for?"
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>
          </div>
        )}

        {actionType === "income" && (
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Amount (₱)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={incomeForm.amount}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="border-emerald-500/40 bg-[#071a34] text-lg font-bold text-white"
                autoFocus
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Source / Description</Label>
              <Input
                placeholder="e.g., Salary, Freelance"
                value={incomeForm.source}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, source: e.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Wallet</Label>
              <Select
                value={incomeForm.wallet_id}
                onValueChange={(value) =>
                  setIncomeForm((prev) => ({ ...prev, wallet_id: value }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                  <SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select wallet"} />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={String(wallet.id)}>
                      {wallet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!!selectedIncomeWallet && (
                <p className="mt-1 text-xs text-slate-400">
                  Current balance: ₱{normalizeNumber(selectedIncomeWallet.balance).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Date</Label>
              <Input
                type="date"
                value={incomeForm.date}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input
                placeholder="Additional details"
                value={incomeForm.notes}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>
          </div>
        )}

        {!!error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {wallets.length === 0 && !loadingWallets && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Create a wallet first.
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving ? "Saving..." : actionType === "expense" ? "Log Expense" : "Log Funds"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}