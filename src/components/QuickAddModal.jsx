import { useState, useEffect } from "react";
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
  {
    id: "expense",
    label: "Add Expense",
    icon: Receipt,
    color: "text-destructive bg-destructive/10",
  },
  {
    id: "income",
    label: "Add Funds",
    icon: TrendingUp,
    color: "text-primary bg-primary/10",
  },
];

const todayStr = () => new Date().toISOString().split("T")[0];

function getStoredWallets(userEmail) {
  try {
    const allWallets = JSON.parse(localStorage.getItem("clara_wallets") || "[]");
    if (!userEmail) return allWallets;
    return allWallets.filter(
      (wallet) =>
        wallet.created_by === userEmail ||
        wallet.user_email === userEmail ||
        wallet.userEmail === userEmail
    );
  } catch {
    return [];
  }
}

function saveExpense(payload) {
  const existing = JSON.parse(localStorage.getItem("clara_expenses") || "[]");
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    created_at: new Date().toISOString(),
    ...payload,
  };
  localStorage.setItem("clara_expenses", JSON.stringify([newItem, ...existing]));
  return newItem;
}

function saveIncome(payload) {
  const existing = JSON.parse(localStorage.getItem("clara_income") || "[]");
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    created_at: new Date().toISOString(),
    ...payload,
  };
  localStorage.setItem("clara_income", JSON.stringify([newItem, ...existing]));
  return newItem;
}

export default function QuickAddModal({
  open,
  onClose,
  userEmail,
  onSuccess,
  wallets: walletsProp,
  onCreateExpense,
  onCreateIncome,
}) {
  const [wallets, setWallets] = useState([]);
  const [actionType, setActionType] = useState("expense");
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "food",
    wallet_id: "",
    date: todayStr(),
    notes: "",
    need_type: "need",
  });
  const [incomeForm, setIncomeForm] = useState({
    amount: "",
    source: "",
    wallet_id: "",
    date: todayStr(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const walletList =
      Array.isArray(walletsProp) && walletsProp.length > 0
        ? walletsProp
        : getStoredWallets(userEmail);

    setWallets(walletList);

    if (walletList.length > 0) {
      setExpenseForm((f) => ({ ...f, wallet_id: f.wallet_id || walletList[0].id }));
      setIncomeForm((f) => ({ ...f, wallet_id: f.wallet_id || walletList[0].id }));
    }
  }, [userEmail, open, walletsProp]);

  const resetForms = () => {
    setActionType("expense");
    setExpenseForm({
      amount: "",
      category: "food",
      wallet_id: wallets[0]?.id || "",
      date: todayStr(),
      notes: "",
      need_type: "need",
    });
    setIncomeForm({
      amount: "",
      source: "",
      wallet_id: wallets[0]?.id || "",
      date: todayStr(),
    });
  };

  const handleClose = () => {
    onClose?.();
    setTimeout(() => resetForms(), 150);
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      if (actionType === "expense") {
        if (!expenseForm.amount || !expenseForm.wallet_id) {
          setSaving(false);
          return;
        }

        const payload = {
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
          created_by: userEmail || "",
        };

        if (typeof onCreateExpense === "function") {
          await onCreateExpense(payload);
        } else {
          saveExpense(payload);
        }
      } else {
        if (!incomeForm.amount || !incomeForm.wallet_id || !incomeForm.source) {
          setSaving(false);
          return;
        }

        const payload = {
          ...incomeForm,
          amount: parseFloat(incomeForm.amount),
          created_by: userEmail || "",
        };

        if (typeof onCreateIncome === "function") {
          await onCreateIncome(payload);
        } else {
          saveIncome(payload);
        }
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Quick add failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const isDisabled =
    actionType === "expense"
      ? !expenseForm.amount || !expenseForm.wallet_id
      : !incomeForm.amount || !incomeForm.wallet_id || !incomeForm.source;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Quick Log</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mb-2">
          {ACTION_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActionType(t.id)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                actionType === t.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {actionType === "expense" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount (₱)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
                className="text-lg font-bold"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(v) =>
                    setExpenseForm({ ...expenseForm, category: v })
                  }
                >
                  <SelectTrigger className="h-9">
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
                <Label className="text-xs">Type</Label>
                <Select
                  value={expenseForm.need_type}
                  onValueChange={(v) =>
                    setExpenseForm({ ...expenseForm, need_type: v })
                  }
                >
                  <SelectTrigger className="h-9">
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
              <Label className="text-xs">Wallet</Label>
              <Select
                value={expenseForm.wallet_id}
                onValueChange={(v) =>
                  setExpenseForm({ ...expenseForm, wallet_id: v })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input
                placeholder="What was this for?"
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, notes: e.target.value })
                }
                className="h-9"
              />
            </div>
          </div>
        )}

        {actionType === "income" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Amount (₱)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={incomeForm.amount}
                onChange={(e) =>
                  setIncomeForm({ ...incomeForm, amount: e.target.value })
                }
                className="text-lg font-bold"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs">Source / Description</Label>
              <Input
                placeholder="e.g., Salary, Freelance"
                value={incomeForm.source}
                onChange={(e) =>
                  setIncomeForm({ ...incomeForm, source: e.target.value })
                }
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs">Wallet</Label>
              <Select
                value={incomeForm.wallet_id}
                onValueChange={(v) =>
                  setIncomeForm({ ...incomeForm, wallet_id: v })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={incomeForm.date}
                onChange={(e) =>
                  setIncomeForm({ ...incomeForm, date: e.target.value })
                }
                className="h-9"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          className="w-full mt-2"
          disabled={isDisabled || saving}
        >
          {saving ? "Saving..." : `Log ${actionType === "expense" ? "Expense" : "Funds"}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}