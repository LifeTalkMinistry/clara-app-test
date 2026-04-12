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
import {
  Receipt,
  TrendingUp,
  ArrowLeftRight,
  Calculator,
  Delete,
  X,
} from "lucide-react";
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
  { id: "expense", label: "Expense", icon: Receipt },
  { id: "income", label: "Add Funds", icon: TrendingUp },
  { id: "transfer", label: "Transfer", icon: ArrowLeftRight },
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

const getWalletSortOrder = (wallet, fallbackIndex = 0) => {
  if (wallet?.sort_order === null || wallet?.sort_order === undefined) return fallbackIndex;
  const n = Number(wallet.sort_order);
  return Number.isFinite(n) ? n : fallbackIndex;
};

const normalizeWallets = (wallets) =>
  (wallets || [])
    .map((wallet, index) => ({
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
      sort_order: getWalletSortOrder(wallet, index),
    }))
    .sort((a, b) => {
      const orderDiff = getWalletSortOrder(a) - getWalletSortOrder(b);
      if (orderDiff !== 0) return orderDiff;

      const aCreated = parseSupabaseDate(a?.created_at || 0)?.getTime() ?? 0;
      const bCreated = parseSupabaseDate(b?.created_at || 0)?.getTime() ?? 0;
      return aCreated - bCreated;
    });

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

const getDefaultExpenseForm = (walletId = "") => ({
  amount: "",
  category: "food",
  wallet_id: walletId,
  date: getToday(),
  notes: "",
  need_type: "need",
});

const getDefaultIncomeForm = (walletId = "") => ({
  amount: "",
  source: "",
  wallet_id: walletId,
  date: getToday(),
  notes: "",
});

const getDefaultTransferForm = (fromWalletId = "", toWalletId = "") => ({
  amount: "",
  from_wallet_id: fromWalletId,
  to_wallet_id: toWalletId,
  date: getToday(),
  notes: "",
});

const CALCULATOR_KEYS = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "(", ")"],
  ["C", "⌫", "=", "+"],
];

function safeEvaluateExpression(expression) {
  const raw = String(expression ?? "").trim();

  if (!raw) return "";

  const sanitized = raw.replace(/×/g, "*").replace(/÷/g, "/");

  if (!/^[\d+\-*/().\s]+$/.test(sanitized)) {
    throw new Error("Invalid expression");
  }

  const result = Function(`"use strict"; return (${sanitized})`)();

  if (!Number.isFinite(result)) {
    throw new Error("Invalid result");
  }

  return String(result);
}

function CalculatorPopover({ open, value, onValueChange, onApply, onClose }) {
  if (!open) return null;

  const handlePress = (key) => {
    if (key === "C") {
      onValueChange("");
      return;
    }

    if (key === "⌫") {
      onValueChange(String(value || "").slice(0, -1));
      return;
    }

    if (key === "=") {
      try {
        const computed = safeEvaluateExpression(value);
        onValueChange(computed);
      } catch {
        onValueChange("");
      }
      return;
    }

    onValueChange(`${value || ""}${key}`);
  };

  const previewResult = (() => {
    if (!value?.trim()) return "";
    try {
      return safeEvaluateExpression(value);
    } catch {
      return "";
    }
  })();

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[280px] rounded-2xl border border-emerald-500/20 bg-[#06162d] p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Calculator</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Close calculator"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 min-h-[52px] rounded-xl border border-white/10 bg-[#071a34] px-3 py-2">
        <div className="truncate text-right text-sm text-slate-400">
          {value || "0"}
        </div>
        <div className="truncate text-right text-lg font-bold text-white">
          {previewResult || " "}
        </div>
      </div>

      <div className="grid gap-2">
        {CALCULATOR_KEYS.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-2">
            {row.map((key) => {
              const isEquals = key === "=";
              const isClear = key === "C";
              const isDelete = key === "⌫";

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePress(key)}
                  className={[
                    "flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition",
                    isEquals
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : isClear
                        ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                        : isDelete
                          ? "bg-white/10 text-white hover:bg-white/15"
                          : "bg-white/5 text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  {isDelete ? <Delete className="h-4 w-4" /> : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-slate-700 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white"
        >
          Close
        </Button>

        <Button
          type="button"
          onClick={() => onApply(previewResult || value)}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

export default function QuickAddModal({
  open,
  onClose,
  onSuccess,
  initialAction = "expense",
}) {
  const { user } = useUserRole();

  const [wallets, setWallets] = useState([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionType, setActionType] = useState(
    ["expense", "income", "transfer"].includes(initialAction) ? initialAction : "expense"
  );

  const [expenseForm, setExpenseForm] = useState(getDefaultExpenseForm());
  const [incomeForm, setIncomeForm] = useState(getDefaultIncomeForm());
  const [transferForm, setTransferForm] = useState(getDefaultTransferForm());

  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");

  const walletMap = useMemo(() => {
    const map = new Map();
    wallets.forEach((wallet) => {
      map.set(String(wallet.id), wallet);
    });
    return map;
  }, [wallets]);

  useEffect(() => {
    if (open) {
      setActionType(
        ["expense", "income", "transfer"].includes(initialAction) ? initialAction : "expense"
      );
    }
  }, [open, initialAction]);

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
        const secondWalletId =
          normalized.find((wallet) => String(wallet.id) !== String(firstWalletId))?.id
            ? String(
                normalized.find((wallet) => String(wallet.id) !== String(firstWalletId)).id
              )
            : "";

        setExpenseForm((prev) => ({
          ...prev,
          wallet_id: firstWalletId,
        }));

        setIncomeForm((prev) => ({
          ...prev,
          wallet_id: firstWalletId,
        }));

        setTransferForm((prev) => ({
          ...prev,
          from_wallet_id: firstWalletId,
          to_wallet_id:
            secondWalletId && secondWalletId !== firstWalletId ? secondWalletId : "",
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

  useEffect(() => {
    if (!open) {
      setCalculatorOpen(false);
      setCalculatorValue("");
    }
  }, [open]);

  const resetForms = () => {
    const firstWalletId = wallets[0]?.id ? String(wallets[0].id) : "";
    const secondWalletId =
      wallets.find((wallet) => String(wallet.id) !== String(firstWalletId))?.id
        ? String(wallets.find((wallet) => String(wallet.id) !== String(firstWalletId)).id)
        : "";

    const nextAction = ["expense", "income", "transfer"].includes(initialAction)
      ? initialAction
      : "expense";

    setActionType(nextAction);
    setError("");
    setCalculatorOpen(false);
    setCalculatorValue("");
    setExpenseForm(getDefaultExpenseForm(firstWalletId));
    setIncomeForm(getDefaultIncomeForm(firstWalletId));
    setTransferForm(
      getDefaultTransferForm(
        firstWalletId,
        secondWalletId && secondWalletId !== firstWalletId ? secondWalletId : ""
      )
    );
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

    const { error: txnInsertError } = await supabase.from(TXN_TABLE).insert([payload]);

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

  const handleCreateTransfer = async () => {
    const parsedAmount = normalizeNumber(transferForm.amount);

    if (!user?.email && !user?.id) {
      throw new Error("User not found.");
    }

    if (!parsedAmount || parsedAmount <= 0) {
      throw new Error("Enter a valid transfer amount.");
    }

    if (!transferForm.from_wallet_id || !transferForm.to_wallet_id) {
      throw new Error("Please select both wallets.");
    }

    if (String(transferForm.from_wallet_id) === String(transferForm.to_wallet_id)) {
      throw new Error("Source and destination wallets must be different.");
    }

    const fromWallet = walletMap.get(String(transferForm.from_wallet_id));
    const toWallet = walletMap.get(String(transferForm.to_wallet_id));

    if (!fromWallet || !toWallet) {
      throw new Error("Selected wallet not found.");
    }

    if (parsedAmount > normalizeNumber(fromWallet.balance)) {
      throw new Error("Not enough wallet balance for this transfer.");
    }

    const createdAt = buildCreatedAtFromDate(transferForm.date);

    const nextFromBalance = normalizeNumber(fromWallet.balance) - parsedAmount;
    const nextToBalance = normalizeNumber(toWallet.balance) + parsedAmount;

    await updateWalletBalance(fromWallet.id, nextFromBalance);
    await updateWalletBalance(toWallet.id, nextToBalance);

    await insertWalletTransaction({
      walletId: transferForm.from_wallet_id,
      amount: parsedAmount,
      type: "transfer_out",
      notes: transferForm.notes || "",
      createdAt,
    });

    await insertWalletTransaction({
      walletId: transferForm.to_wallet_id,
      amount: parsedAmount,
      type: "transfer_in",
      notes: transferForm.notes || "",
      createdAt,
    });
  };

  const handleSubmit = async () => {
    setError("");
    setSaving(true);

    try {
      if (actionType === "expense") {
        await handleCreateExpense();
      } else if (actionType === "income") {
        await handleCreateIncome();
      } else {
        await handleCreateTransfer();
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
      : actionType === "income"
        ? !incomeForm.amount || !incomeForm.wallet_id
        : !transferForm.amount || !transferForm.from_wallet_id || !transferForm.to_wallet_id);

  const selectedExpenseWallet = walletMap.get(String(expenseForm.wallet_id));
  const selectedIncomeWallet = walletMap.get(String(incomeForm.wallet_id));
  const selectedTransferFromWallet = walletMap.get(String(transferForm.from_wallet_id));
  const selectedTransferToWallet = walletMap.get(String(transferForm.to_wallet_id));

  const openCalculatorForCurrentAction = () => {
    if (actionType === "expense") {
      setCalculatorValue(expenseForm.amount || "");
    } else if (actionType === "income") {
      setCalculatorValue(incomeForm.amount || "");
    } else {
      setCalculatorValue(transferForm.amount || "");
    }

    setCalculatorOpen(true);
  };

  const applyCalculatorValue = (value) => {
    const computedValue = String(value ?? "").trim();

    if (!computedValue) {
      setCalculatorOpen(false);
      return;
    }

    if (actionType === "expense") {
      setExpenseForm((prev) => ({ ...prev, amount: computedValue }));
    } else if (actionType === "income") {
      setIncomeForm((prev) => ({ ...prev, amount: computedValue }));
    } else {
      setTransferForm((prev) => ({ ...prev, amount: computedValue }));
    }

    setCalculatorOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="mx-auto max-w-sm border border-emerald-500/20 bg-[#031126] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            Quick Actions
          </DialogTitle>
        </DialogHeader>

        <div className="mb-2 grid grid-cols-3 gap-2">
          {ACTION_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setError("");
                setActionType(item.id);
                setCalculatorOpen(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-all ${
                actionType === item.id
                  ? "border-emerald-400 bg-emerald-500/5 text-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="block w-full leading-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {actionType === "expense" && (
          <div className="space-y-3">
            <div className="relative">
              <Label className="mb-1 block text-xs text-slate-200">Amount (₱)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="border-emerald-500/40 bg-[#071a34] pr-12 text-lg font-bold text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={openCalculatorForCurrentAction}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                  aria-label="Open calculator"
                >
                  <Calculator className="h-4 w-4" />
                </button>
              </div>

              <CalculatorPopover
                open={calculatorOpen}
                value={calculatorValue}
                onValueChange={setCalculatorValue}
                onApply={applyCalculatorValue}
                onClose={() => setCalculatorOpen(false)}
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
                    <SelectItem value="other">Other</SelectItem>
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
                  Available balance: ₱
                  {normalizeNumber(selectedExpenseWallet.balance).toLocaleString()}
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
            <div className="relative">
              <Label className="mb-1 block text-xs text-slate-200">Amount (₱)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={incomeForm.amount}
                  onChange={(e) =>
                    setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="border-emerald-500/40 bg-[#071a34] pr-12 text-lg font-bold text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={openCalculatorForCurrentAction}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                  aria-label="Open calculator"
                >
                  <Calculator className="h-4 w-4" />
                </button>
              </div>

              <CalculatorPopover
                open={calculatorOpen}
                value={calculatorValue}
                onValueChange={setCalculatorValue}
                onApply={applyCalculatorValue}
                onClose={() => setCalculatorOpen(false)}
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
                  Current balance: ₱
                  {normalizeNumber(selectedIncomeWallet.balance).toLocaleString()}
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

        {actionType === "transfer" && (
          <div className="space-y-3">
            <div className="relative">
              <Label className="mb-1 block text-xs text-slate-200">Amount (₱)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={transferForm.amount}
                  onChange={(e) =>
                    setTransferForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="border-emerald-500/40 bg-[#071a34] pr-12 text-lg font-bold text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={openCalculatorForCurrentAction}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                  aria-label="Open calculator"
                >
                  <Calculator className="h-4 w-4" />
                </button>
              </div>

              <CalculatorPopover
                open={calculatorOpen}
                value={calculatorValue}
                onValueChange={setCalculatorValue}
                onApply={applyCalculatorValue}
                onClose={() => setCalculatorOpen(false)}
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">From Wallet</Label>
              <Select
                value={transferForm.from_wallet_id}
                onValueChange={(value) =>
                  setTransferForm((prev) => {
                    const nextToWallet =
                      String(prev.to_wallet_id) === String(value) ? "" : prev.to_wallet_id;

                    return {
                      ...prev,
                      from_wallet_id: value,
                      to_wallet_id: nextToWallet,
                    };
                  })
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

              {!!selectedTransferFromWallet && (
                <p className="mt-1 text-xs text-slate-400">
                  Available balance: ₱
                  {normalizeNumber(selectedTransferFromWallet.balance).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">To Wallet</Label>
              <Select
                value={transferForm.to_wallet_id}
                onValueChange={(value) =>
                  setTransferForm((prev) => ({ ...prev, to_wallet_id: value }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                  <SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select wallet"} />
                </SelectTrigger>
                <SelectContent>
                  {wallets
                    .filter(
                      (wallet) => String(wallet.id) !== String(transferForm.from_wallet_id)
                    )
                    .map((wallet) => (
                      <SelectItem key={wallet.id} value={String(wallet.id)}>
                        {wallet.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {!!selectedTransferToWallet && (
                <p className="mt-1 text-xs text-slate-400">
                  Destination balance: ₱
                  {normalizeNumber(selectedTransferToWallet.balance).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Date</Label>
              <Input
                type="date"
                value={transferForm.date}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input
                placeholder="Transfer details"
                value={transferForm.notes}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, notes: e.target.value }))
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
          {saving
            ? "Saving..."
            : actionType === "expense"
              ? "Add Expense"
              : actionType === "income"
                ? "Add Funds"
                : "Transfer Money"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}