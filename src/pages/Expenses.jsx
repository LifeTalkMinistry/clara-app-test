import { useState, useEffect } from "react";
import { Plus, Receipt, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const categories = ["food", "transport", "housing", "utilities", "entertainment", "shopping", "health", "education", "personal", "other"];
const needTypes = ["need", "want", "savings"];

const EMPTY_FORM = {
  amount: "",
  category: "food",
  wallet_id: "",
  date: new Date().toISOString().split("T")[0],
  notes: "",
  need_type: "need"
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
    if (!user?.email) return;

    Promise.all([
      fetch(`/api/expenses?email=${user.email}`).then(r => r.json()),
      fetch(`/api/wallets?email=${user.email}`).then(r => r.json()),
    ])
      .then(([exp, wal]) => {
        setExpenses(exp || []);
        setWallets(wal || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, wallet_id: wallets[0]?.id || "" });
    setOpen(true);
  };

  const openEdit = (exp) => {
    setEditId(exp.id);
    setForm({
      amount: exp.amount,
      category: exp.category,
      wallet_id: exp.wallet_id,
      date: exp.date,
      notes: exp.notes || "",
      need_type: exp.need_type
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.wallet_id) return;

    if (editId) {
      const res = await fetch(`/api/expenses/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });

      const updated = await res.json();
      setExpenses(expenses.map(e => (e.id === editId ? updated : e)));
    } else {
      const res = await fetch(`/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          user_email: user.email,
        }),
      });

      const newExp = await res.json();
      setExpenses([newExp, ...expenses]);
    }

    setOpen(false);
    setEditId(null);
  };

  const handleDelete = async (id) => {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

  const walletName = (id) =>
    wallets.find(w => w.id === id)?.name || "Unknown";

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

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={form.need_type} onValueChange={(v) => setForm({ ...form, need_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {needTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Wallet</Label>
              <Select value={form.wallet_id} onValueChange={(v) => setForm({ ...form, wallet_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                <SelectContent>
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              {editId ? "Save" : "Add"}
            </Button>

          </div>
        </DialogContent>
      </Dialog>

      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses yet" />
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <div key={exp.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border">

              <div className="w-10 h-10 bg-red-100 flex items-center justify-center rounded">
                <Receipt className="w-5 h-5 text-red-500" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium">{exp.category}</p>

                <p className="text-xs text-muted-foreground">
                  {walletName(exp.wallet_id)} • {exp.date}
                </p>

                <span className={`text-xs px-2 py-0.5 rounded ${needTypeColors[exp.need_type]}`}>
                  {exp.need_type}
                </span>
              </div>

              <p className="font-bold text-red-500">
                -{fmt(exp.amount)}
              </p>

              <Button size="icon" variant="ghost" onClick={() => openEdit(exp)}>
                <Edit className="w-4 h-4" />
              </Button>

              <Button size="icon" variant="ghost" onClick={() => handleDelete(exp.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}