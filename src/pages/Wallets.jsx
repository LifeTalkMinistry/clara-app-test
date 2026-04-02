import { useState, useEffect } from "react";
import { Plus, Wallet as WalletIcon, Trash2, ArrowLeftRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const walletTypes = ["cash", "gcash", "bank", "maya", "credit_card", "other"];
const walletIcons = { cash: "💵", gcash: "📱", bank: "🏦", maya: "💜", credit_card: "💳", other: "💰" };

export default function Wallets() {
  const { user } = useUserRole();

  const [wallets, setWallets] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "cash",
    starting_balance: "",
  });

  const [transferForm, setTransferForm] = useState({
    from_wallet_id: "",
    to_wallet_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (!user?.email) return;

    Promise.all([
      fetch(`/api/wallets?email=${user.email}`).then(r => r.json()),
      fetch(`/api/income?email=${user.email}`).then(r => r.json()),
      fetch(`/api/expenses?email=${user.email}`).then(r => r.json()),
      fetch(`/api/transfers?email=${user.email}`).then(r => r.json()),
    ])
      .then(([w, i, e, t]) => {
        setWallets(w || []);
        setIncomes(i || []);
        setExpenses(e || []);
        setTransfers(t || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  const handleAddWallet = async () => {
    if (!form.name) return;

    const res = await fetch(`/api/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        starting_balance: parseFloat(form.starting_balance) || 0,
        user_email: user.email,
      }),
    });

    const newWallet = await res.json();
    setWallets([...wallets, newWallet]);

    setForm({ name: "", type: "cash", starting_balance: "" });
    setAddOpen(false);
  };

  const handleDelete = async (id) => {
    await fetch(`/api/wallets/${id}`, { method: "DELETE" });
    setWallets(wallets.filter(w => w.id !== id));
  };

  const handleTransfer = async () => {
    const { from_wallet_id, to_wallet_id, amount, date, notes } = transferForm;

    if (!from_wallet_id || !to_wallet_id || !amount) return;

    const res = await fetch(`/api/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_wallet_id,
        to_wallet_id,
        amount: parseFloat(amount),
        date,
        notes,
        user_email: user.email,
      }),
    });

    const tr = await res.json();
    setTransfers([tr, ...transfers]);

    setTransferOpen(false);
  };

  const getBalance = (w) => {
    const inc = incomes.filter(i => i.wallet_id === w.id).reduce((s, i) => s + i.amount, 0);
    const exp = expenses.filter(e => e.wallet_id === w.id).reduce((s, e) => s + e.amount, 0);
    const tin = transfers.filter(t => t.to_wallet_id === w.id).reduce((s, t) => s + t.amount, 0);
    const tout = transfers.filter(t => t.from_wallet_id === w.id).reduce((s, t) => s + t.amount, 0);

    return (w.starting_balance || 0) + inc - exp + tin - tout;
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

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
        title="Wallets"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="w-4 h-4 mr-1" /> History
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        }
      />

      {wallets.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No wallets yet" />
      ) : (
        <div className="space-y-3">
          {wallets.map(w => {
            const balance = getBalance(w);

            return (
              <div key={w.id} className="p-4 border rounded-xl">

                <div className="flex justify-between mb-2">
                  <p>{w.name}</p>

                  <div className="flex gap-2">
                    <Button size="icon" onClick={() => setTransferOpen(true)}>
                      <ArrowLeftRight className="w-4 h-4" />
                    </Button>

                    <Button size="icon" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm">
                  {fmt(balance)}
                </p>

              </div>
            );
          })}
        </div>
      )}

      {/* ADD WALLET */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Wallet</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {walletTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input type="number" placeholder="Balance" value={form.starting_balance} onChange={e => setForm({ ...form, starting_balance: e.target.value })} />

            <Button onClick={handleAddWallet}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}