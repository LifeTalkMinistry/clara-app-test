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
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import {
  getWalletDisplayBalance,
  getWalletDisplayName,
  getWalletSpendableBalance,
} from "@/utils/dashboard/dashboardHelpers";

const PH_TIME_ZONE = "Asia/Manila";

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

const normalizeNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const numeric = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const getPHDateString = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

const getDefaultExpenseForm = (walletId = "") => ({
  amount: "",
  category: "food",
  wallet_id: walletId,
  notes: "",
  need_type: "need",
  planning_status: "planned",
  unplanned_reason: "",
});

const getDefaultIncomeForm = (walletId = "") => ({
  amount: "",
  source: "",
  wallet_id: walletId,
  notes: "",
});

const getDefaultTransferForm = (fromWalletId = "", toWalletId = "") => ({
  amount: "",
  from_wallet_id: fromWalletId,
  to_wallet_id: toWalletId,
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
  if (!/^[\d+\-*/().\s]+$/.test(sanitized)) throw new Error("Invalid expression");
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${sanitized})`)();
  if (!Number.isFinite(result)) throw new Error("Invalid result");
  return String(result);
}

function CalculatorPopover({ open, value, onValueChange, onApply, onClose }) {
  if (!open) return null;

  const handlePress = (key) => {
    if (key === "C") return onValueChange("");
    if (key === "⌫") return onValueChange(String(value || "").slice(0, -1));
    if (key === "=") {
      try {
        onValueChange(safeEvaluateExpression(value));
      } catch {
        onValueChange("");
      }
      return;
    }
    onValueChange(`${value || ""}${key}`);
  };

  let previewResult = "";
  try {
    previewResult = value?.trim() ? safeEvaluateExpression(value) : "";
  } catch {
    previewResult = "";
  }

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[280px] rounded-2xl border border-emerald-500/20 bg-[#06162d] p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Calculator</div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close calculator">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 min-h-[52px] rounded-xl border border-white/10 bg-[#071a34] px-3 py-2">
        <div className="truncate text-right text-sm text-slate-400">{value || "0"}</div>
        <div className="truncate text-right text-lg font-bold text-white">{previewResult || " "}</div>
      </div>
      <div className="grid gap-2">
        {CALCULATOR_KEYS.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-2">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePress(key)}
                className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${
                  key === "="
                    ? "bg-emerald-600 text-white"
                    : key === "C"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-white/5 text-white"
                }`}
              >
                {key === "⌫" ? <Delete className="h-4 w-4" /> : key}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="border-slate-700 bg-transparent text-slate-200">Close</Button>
        <Button type="button" onClick={() => onApply(previewResult || value)} className="bg-emerald-600 text-white">Apply</Button>
      </div>
    </div>
  );
}

export default function QuickAddModal({
  open,
  onClose,
  onSuccess,
  initialAction = "expense",
  initialExpenseData = null,
}) {
  const { user } = useUserRole();
  const finance = useFinancialData(user);
  const {
    wallets = [],
    loading: loadingWallets = false,
    refreshing = false,
    addExpense,
    addIncome,
    transferBetweenWallets,
    refreshData,
  } = finance;

  const activeWallets = useMemo(
    () =>
      (Array.isArray(wallets) ? wallets : []).filter(
        (wallet) => !wallet?.deletedAt && !wallet?.deleted_at && !wallet?.is_archived && !wallet?.isArchived,
      ),
    [wallets],
  );

  const walletMap = useMemo(
    () => new Map(activeWallets.map((wallet) => [String(wallet.id), wallet])),
    [activeWallets],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionType, setActionType] = useState("expense");
  const [expenseForm, setExpenseForm] = useState(getDefaultExpenseForm());
  const [incomeForm, setIncomeForm] = useState(getDefaultIncomeForm());
  const [transferForm, setTransferForm] = useState(getDefaultTransferForm());
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextAction = ["expense", "income", "transfer"].includes(initialAction) ? initialAction : "expense";
    setActionType(nextAction);
    setError("");
    setCalculatorOpen(false);
  }, [open, initialAction]);

  useEffect(() => {
    if (!open || !activeWallets.length) return;
    const firstWalletId = String(activeWallets[0]?.id || "");
    const secondWalletId = String(activeWallets.find((wallet) => String(wallet.id) !== firstWalletId)?.id || "");

    setExpenseForm((prev) => ({
      ...prev,
      wallet_id: prev.wallet_id && walletMap.has(String(prev.wallet_id)) ? prev.wallet_id : firstWalletId,
    }));
    setIncomeForm((prev) => ({
      ...prev,
      wallet_id: prev.wallet_id && walletMap.has(String(prev.wallet_id)) ? prev.wallet_id : firstWalletId,
    }));
    setTransferForm((prev) => ({
      ...prev,
      from_wallet_id: prev.from_wallet_id && walletMap.has(String(prev.from_wallet_id)) ? prev.from_wallet_id : firstWalletId,
      to_wallet_id:
        prev.to_wallet_id && walletMap.has(String(prev.to_wallet_id)) && String(prev.to_wallet_id) !== firstWalletId
          ? prev.to_wallet_id
          : secondWalletId,
    }));
  }, [activeWallets, open, walletMap]);

  useEffect(() => {
    if (!open || !initialExpenseData) return;
    const amount = normalizeNumber(initialExpenseData?.amount);
    setExpenseForm((prev) => ({
      ...prev,
      amount: amount > 0 ? String(amount) : prev.amount,
      category: String(initialExpenseData?.category || prev.category || "food").toLowerCase(),
      notes: initialExpenseData?.notes || initialExpenseData?.note || prev.notes || "",
      need_type: initialExpenseData?.need_type || initialExpenseData?.needType || prev.need_type || "need",
      planning_status:
        initialExpenseData?.planning_status || initialExpenseData?.planningStatus || prev.planning_status || "planned",
    }));
  }, [initialExpenseData, open]);

  const resetForms = () => {
    const firstWalletId = String(activeWallets[0]?.id || "");
    const secondWalletId = String(activeWallets.find((wallet) => String(wallet.id) !== firstWalletId)?.id || "");
    setExpenseForm(getDefaultExpenseForm(firstWalletId));
    setIncomeForm(getDefaultIncomeForm(firstWalletId));
    setTransferForm(getDefaultTransferForm(firstWalletId, secondWalletId));
    setError("");
    setCalculatorOpen(false);
    setCalculatorValue("");
  };

  const handleClose = () => {
    if (saving) return;
    onClose?.();
    window.setTimeout(resetForms, 120);
  };

  const nowPayload = () => {
    const now = new Date();
    const iso = now.toISOString();
    return { now, iso, phDate: getPHDateString(now) };
  };

  const handleCreateExpense = async () => {
    const amount = normalizeNumber(expenseForm.amount);
    if (amount <= 0) throw new Error("Enter a valid expense amount.");
    if (!expenseForm.wallet_id) throw new Error("Please select a wallet.");

    const wallet = walletMap.get(String(expenseForm.wallet_id));
    if (!wallet) throw new Error("Selected wallet not found.");
    if (amount > getWalletSpendableBalance(wallet)) {
      throw new Error("Not enough spendable balance in this wallet.");
    }

    const planningStatus = ["planned", "unplanned", "undocumented"].includes(expenseForm.planning_status)
      ? expenseForm.planning_status
      : "planned";
    const reason = String(expenseForm.unplanned_reason || "").trim();
    if (planningStatus === "unplanned" && !reason) {
      throw new Error("Reason is required for an unplanned expense.");
    }

    const { iso, phDate } = nowPayload();
    await addExpense?.({
      amount,
      wallet_id: String(expenseForm.wallet_id),
      walletId: String(expenseForm.wallet_id),
      category: expenseForm.category,
      budget_category: expenseForm.category,
      need_type: expenseForm.need_type,
      planning_status: planningStatus,
      unplanned_reason: planningStatus === "unplanned" ? reason : null,
      notes: expenseForm.notes || "",
      source_type: "Manual Log Expense",
      date: phDate,
      created_at: iso,
      updated_at: iso,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    });
  };

  const handleCreateIncome = async () => {
    const amount = normalizeNumber(incomeForm.amount);
    if (amount <= 0) throw new Error("Enter a valid amount.");
    if (!incomeForm.wallet_id) throw new Error("Please select a wallet.");
    if (!walletMap.has(String(incomeForm.wallet_id))) throw new Error("Selected wallet not found.");

    const { iso, phDate } = nowPayload();
    await addIncome?.({
      wallet_id: String(incomeForm.wallet_id),
      walletId: String(incomeForm.wallet_id),
      type: "income",
      amount,
      source: incomeForm.source || "Quick Actions",
      notes: incomeForm.notes || incomeForm.source || "",
      date: phDate,
      created_at: iso,
      updated_at: iso,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    });
  };

  const handleCreateTransfer = async () => {
    const amount = normalizeNumber(transferForm.amount);
    if (amount <= 0) throw new Error("Enter a valid transfer amount.");
    if (!transferForm.from_wallet_id || !transferForm.to_wallet_id) throw new Error("Please select both wallets.");
    if (String(transferForm.from_wallet_id) === String(transferForm.to_wallet_id)) {
      throw new Error("Source and destination wallets must be different.");
    }

    const fromWallet = walletMap.get(String(transferForm.from_wallet_id));
    const toWallet = walletMap.get(String(transferForm.to_wallet_id));
    if (!fromWallet || !toWallet) throw new Error("Selected wallet not found.");
    if (amount > getWalletSpendableBalance(fromWallet)) {
      throw new Error("Not enough spendable balance for this transfer.");
    }

    const { iso } = nowPayload();
    await transferBetweenWallets?.({
      from_wallet_id: String(transferForm.from_wallet_id),
      to_wallet_id: String(transferForm.to_wallet_id),
      amount,
      notes: transferForm.notes || "",
      created_at: iso,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    });
  };

  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      if (actionType === "expense") await handleCreateExpense();
      else if (actionType === "income") await handleCreateIncome();
      else await handleCreateTransfer();

      await refreshData?.();
      [
        "clara-expenses-updated",
        "clara-finance-updated",
        "clara-wallets-updated",
        "clara-wallet-transactions-updated",
      ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
      await onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Quick Actions save failed:", err);
      setError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const selectedExpenseWallet = walletMap.get(String(expenseForm.wallet_id));
  const selectedIncomeWallet = walletMap.get(String(incomeForm.wallet_id));
  const selectedTransferFromWallet = walletMap.get(String(transferForm.from_wallet_id));
  const selectedTransferToWallet = walletMap.get(String(transferForm.to_wallet_id));

  const openCalculatorForCurrentAction = () => {
    setCalculatorValue(
      actionType === "expense"
        ? expenseForm.amount || ""
        : actionType === "income"
          ? incomeForm.amount || ""
          : transferForm.amount || "",
    );
    setCalculatorOpen(true);
  };

  const applyCalculatorValue = (value) => {
    const computedValue = String(value ?? "").trim();
    if (!computedValue) return setCalculatorOpen(false);
    if (actionType === "expense") setExpenseForm((prev) => ({ ...prev, amount: computedValue }));
    else if (actionType === "income") setIncomeForm((prev) => ({ ...prev, amount: computedValue }));
    else setTransferForm((prev) => ({ ...prev, amount: computedValue }));
    setCalculatorOpen(false);
  };

  const isDisabled =
    saving ||
    loadingWallets ||
    refreshing ||
    activeWallets.length === 0 ||
    (actionType === "expense"
      ? !expenseForm.amount || !expenseForm.wallet_id
      : actionType === "income"
        ? !incomeForm.amount || !incomeForm.wallet_id
        : !transferForm.amount || !transferForm.from_wallet_id || !transferForm.to_wallet_id);

  const AmountField = ({ value, onChange }) => (
    <div className="relative">
      <Label className="mb-1 block text-xs text-slate-200">Amount (₱)</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={onChange}
          className="border-emerald-500/40 bg-[#071a34] pr-12 text-lg font-bold text-white"
          autoFocus
        />
        <button type="button" onClick={openCalculatorForCurrentAction} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/10" aria-label="Open calculator">
          <Calculator className="h-4 w-4" />
        </button>
      </div>
      <CalculatorPopover open={calculatorOpen} value={calculatorValue} onValueChange={setCalculatorValue} onApply={applyCalculatorValue} onClose={() => setCalculatorOpen(false)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="mx-auto max-w-sm border border-emerald-500/20 bg-[#031126] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-white">Quick Actions</DialogTitle>
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
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {actionType === "expense" ? (
          <div className="space-y-3">
            <AmountField value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-xs text-slate-200">Category</Label>
                <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger className="border-slate-700 bg-[#071a34] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block text-xs text-slate-200">Need Type</Label>
                <Select value={expenseForm.need_type} onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, need_type: value }))}>
                  <SelectTrigger className="border-slate-700 bg-[#071a34] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="need">Need</SelectItem>
                    <SelectItem value="want">Want</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label className="mb-1 block text-xs text-slate-200">Planning Status</Label>
                <Select
                  value={expenseForm.planning_status}
                  onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, planning_status: value, unplanned_reason: value === "unplanned" ? prev.unplanned_reason : "" }))}
                >
                  <SelectTrigger className="border-slate-700 bg-[#071a34] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="unplanned">Unplanned</SelectItem>
                    <SelectItem value="undocumented">Undocumented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {expenseForm.planning_status === "unplanned" ? (
              <div>
                <Label className="mb-1 block text-xs text-slate-200">Reason</Label>
                <Input value={expenseForm.unplanned_reason} onChange={(event) => setExpenseForm((prev) => ({ ...prev, unplanned_reason: event.target.value }))} placeholder="Why did this need to happen?" className="border-slate-700 bg-[#071a34] text-white" />
              </div>
            ) : null}

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Wallet</Label>
              <Select value={expenseForm.wallet_id} onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, wallet_id: value }))}>
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white"><SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select wallet"} /></SelectTrigger>
                <SelectContent>{activeWallets.map((wallet) => <SelectItem key={wallet.id} value={String(wallet.id)}>{getWalletDisplayName(wallet)}</SelectItem>)}</SelectContent>
              </Select>
              {selectedExpenseWallet ? <p className="mt-1 text-xs text-slate-400">Spendable: ₱{getWalletSpendableBalance(selectedExpenseWallet).toLocaleString()}</p> : null}
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input placeholder="What was this for?" value={expenseForm.notes} onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))} className="border-slate-700 bg-[#071a34] text-white" />
            </div>

            <p className="text-[11px] leading-4 text-slate-500">Date and time are recorded automatically when you save.</p>
          </div>
        ) : null}

        {actionType === "income" ? (
          <div className="space-y-3">
            <AmountField value={incomeForm.amount} onChange={(event) => setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} />
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Source / Description</Label>
              <Input placeholder="e.g., Salary, Freelance" value={incomeForm.source} onChange={(event) => setIncomeForm((prev) => ({ ...prev, source: event.target.value }))} className="border-slate-700 bg-[#071a34] text-white" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Wallet</Label>
              <Select value={incomeForm.wallet_id} onValueChange={(value) => setIncomeForm((prev) => ({ ...prev, wallet_id: value }))}>
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white"><SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select wallet"} /></SelectTrigger>
                <SelectContent>{activeWallets.map((wallet) => <SelectItem key={wallet.id} value={String(wallet.id)}>{getWalletDisplayName(wallet)}</SelectItem>)}</SelectContent>
              </Select>
              {selectedIncomeWallet ? <p className="mt-1 text-xs text-slate-400">Current balance: ₱{getWalletDisplayBalance(selectedIncomeWallet).toLocaleString()}</p> : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input placeholder="Additional details" value={incomeForm.notes} onChange={(event) => setIncomeForm((prev) => ({ ...prev, notes: event.target.value }))} className="border-slate-700 bg-[#071a34] text-white" />
            </div>
            <p className="text-[11px] leading-4 text-slate-500">Date and time are recorded automatically when you save.</p>
          </div>
        ) : null}

        {actionType === "transfer" ? (
          <div className="space-y-3">
            <AmountField value={transferForm.amount} onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))} />
            <div>
              <Label className="mb-1 block text-xs text-slate-200">From Wallet</Label>
              <Select value={transferForm.from_wallet_id} onValueChange={(value) => setTransferForm((prev) => ({ ...prev, from_wallet_id: value, to_wallet_id: String(prev.to_wallet_id) === String(value) ? "" : prev.to_wallet_id }))}>
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white"><SelectValue placeholder="Select wallet" /></SelectTrigger>
                <SelectContent>{activeWallets.map((wallet) => <SelectItem key={wallet.id} value={String(wallet.id)}>{getWalletDisplayName(wallet)}</SelectItem>)}</SelectContent>
              </Select>
              {selectedTransferFromWallet ? <p className="mt-1 text-xs text-slate-400">Spendable: ₱{getWalletSpendableBalance(selectedTransferFromWallet).toLocaleString()}</p> : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">To Wallet</Label>
              <Select value={transferForm.to_wallet_id} onValueChange={(value) => setTransferForm((prev) => ({ ...prev, to_wallet_id: value }))}>
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white"><SelectValue placeholder="Select wallet" /></SelectTrigger>
                <SelectContent>{activeWallets.filter((wallet) => String(wallet.id) !== String(transferForm.from_wallet_id)).map((wallet) => <SelectItem key={wallet.id} value={String(wallet.id)}>{getWalletDisplayName(wallet)}</SelectItem>)}</SelectContent>
              </Select>
              {selectedTransferToWallet ? <p className="mt-1 text-xs text-slate-400">Destination balance: ₱{getWalletDisplayBalance(selectedTransferToWallet).toLocaleString()}</p> : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input placeholder="Transfer details" value={transferForm.notes} onChange={(event) => setTransferForm((prev) => ({ ...prev, notes: event.target.value }))} className="border-slate-700 bg-[#071a34] text-white" />
            </div>
            <p className="text-[11px] leading-4 text-slate-500">Date and time are recorded automatically when you save.</p>
          </div>
        ) : null}

        {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div> : null}

        {!activeWallets.length && !loadingWallets ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            No active wallet is available yet.
          </div>
        ) : null}

        <Button onClick={handleSubmit} disabled={isDisabled} className="mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60">
          {saving ? "Saving..." : actionType === "expense" ? "Add Expense" : actionType === "income" ? "Add Funds" : "Transfer Money"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
