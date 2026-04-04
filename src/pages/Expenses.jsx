import { useState, useEffect } from "react";
import { Plus, Receipt, Trash2, Edit } from "lucide-react";
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

const EMPTY_FORM = {
  amount: "",
  category: "food",
  wallet_id: "",
  date: new Date().toISOString().split("T")[0],
  notes: "",
  need_type: "need",
};

const EXPENSES_KEY = "clara_expenses";
const WALLETS_KEY = "clara_wallets";

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const safeWrite = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function Expenses() {
  const { user } = useUserRole();
  const [expenses, setExpenses] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!user?.email) {
      setExpenses([]);
      setWallets([]);
      setLoading(false);
      return;
    }

    const allExpenses = safeRead(EXPENSES_KEY);
    const allWallets = safeRead(WALLETS_KEY);

    const userExpenses = allExpenses
      .filter((item) => item.created_by === user.email)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const userWallets = allWallets.filter(
      (item) => item.created_by === user.email
    );

    setExpenses(userExpenses);
    setWallets(userWallets);
    setLoading(false);
  }, [user?.email]);

  const openAdd = () => {
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      wallet_id: wallets[0]?.id || "",
    });
    setOpen(true);
  };

  const openEdit = (exp) => {
    setEditId(exp.id);
    setForm({
      amount: String(exp.amount ?? ""),
      category: exp.category || "food",
      wallet_id: exp.wallet_id || "",
      date: exp.date || new Date().toISOString().split("T")[0],
      notes: exp.notes || "",
      need_type: exp.need_type || "need",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.wallet_id || !user?.email) return;

    const allExpenses = safeRead(EXPENSES_KEY);
    const parsedAmount = parseFloat(form.amount);

    if (Number.isNaN(parsedAmount)) return;

    if (editId) {
      const updatedExpense = {
        ...allExpenses.find((e) => e.id === editId),
        ...form,
        id: editId,
        amount: parsedAmount,
        created_by: user.email,
      };

      const updatedAllExpenses = allExpenses.map((e) =>
        e.id === editId ? updatedExpense : e
      );

      safeWrite(EXPENSES_KEY, updatedAllExpenses);

      const userExpenses = updatedAllExpenses
        .filter((item) => item.created_by === user.email)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setExpenses(userExpenses);
    } else {
      const newExpense = {
        id: generateId(),
        ...form,
        amount: parsedAmount,
        created_by: user.email,
      };

      const updatedAllExpenses = [newExpense, ...allExpenses];
      safeWrite(EXPENSES_KEY, updatedAllExpenses);

      const userExpenses = updatedAllExpenses
        .filter((item) => item.created_by === user.email)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setExpenses(userExpenses);
    }

    setOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (id) => {
    const allExpenses = safeRead(EXPENSES_KEY);
    const updatedAllExpenses = allExpenses.filter((e) => e.id !== id);

    safeWrite(EXPENSES_KEY, updatedAllExpenses);

    const userExpenses = updatedAllExpenses
      .filter((item) => item.created_by === user.email)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    setExpenses(userExpenses);
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

  const walletName = (id) => wallets.find((w) => w.id === id)?.name || "Unknown";

  const needTypeColors = {
    need: "bg-primary/10 text-primary",
    want: "bg-secondary/20 text-secondary-foreground",
    savings: "bg-accent/10 text-accent",
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
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        }
      />

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditId(null);
            setForm(EMPTY_FORM);
          }
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
                onValueChange={(v) => setForm({ ...form, wallet_id: v })}
              >
                <SelectTrigger>
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
              {wallets.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  Create a wallet first
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

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={!form.amount || !form.wallet_id}
            >
              {editId ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Start tracking your spending by adding your first expense."
        />
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-destructive" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">
                    {exp.category?.charAt(0).toUpperCase() +
                      exp.category?.slice(1)}
                  </p>
                  <p className="font-heading font-bold text-sm text-destructive">
                    -{fmt(exp.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span>{walletName(exp.wallet_id)}</span>
                  <span>•</span>
                  <span>{exp.date}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      needTypeColors[exp.need_type] || ""
                    }`}
                  >
                    {exp.need_type}
                  </span>
                </div>

                {exp.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {exp.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(exp)}
                >
                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(exp.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}