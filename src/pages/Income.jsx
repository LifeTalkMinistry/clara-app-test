import { useState, useEffect } from "react";
import { Plus, TrendingUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

export default function Income() {
  const { user } = useUserRole();

  const [incomes, setIncomes] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    source: "",
    wallet_id: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  useEffect(() => {
    if (!user?.email) return;

    Promise.all([
      fetch(`/api/income?email=${user.email}`).then(r => r.json()),
      fetch(`/api/wallets?email=${user.email}`).then(r => r.json()),
    ])
      .then(([inc, wal]) => {
        setIncomes(inc || []);
        setWallets(wal || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  const handleSubmit = async () => {
    if (!form.amount || !form.wallet_id || !form.source) return;

    const res = await fetch("/api/income", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        user_email: user.email,
      }),
    });

    const newInc = await res.json();

    setIncomes([newInc, ...incomes]);

    setForm({
      amount: "",
      source: "",
      wallet_id: wallets[0]?.id || "",
      date: new Date().toISOString().split("T")[0],
      notes: ""
    });

    setOpen(false);
  };

  const handleDelete = async (id) => {
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    setIncomes(incomes.filter(i => i.id !== id));
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

  const walletName = (id) =>
    wallets.find(w => w.id === id)?.name || "Unknown";

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
        title="Income"
        subtitle="Log all your income sources"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
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
              <Label>Source</Label>
              <Input
                placeholder="Salary, Freelance, etc."
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
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
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
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

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={!form.amount || !form.wallet_id || !form.source}
            >
              Add Income
            </Button>

          </div>
        </DialogContent>
      </Dialog>

      {incomes.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No income yet" />
      ) : (
        <div className="space-y-2">
          {incomes.map(inc => (
            <div key={inc.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border">

              <div className="w-10 h-10 bg-green-100 flex items-center justify-center rounded">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium">{inc.source}</p>

                <p className="text-xs text-muted-foreground">
                  {walletName(inc.wallet_id)} • {inc.date}
                </p>
              </div>

              <p className="font-bold text-green-600">
                +{fmt(inc.amount)}
              </p>

              <Button size="icon" variant="ghost" onClick={() => handleDelete(inc.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}