import { useState, useEffect } from "react";
import { Plus, TrendingUp, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const STORAGE_KEYS = {
  incomes: "clara_incomes",
  wallets: "clara_wallets",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function AddFunds() {
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
    notes: "",
  });

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const allIncomes = getStoredData(STORAGE_KEYS.incomes);
    const allWallets = getStoredData(STORAGE_KEYS.wallets);

    const userIncomes = allIncomes
      .filter((item) => item.created_by === user.email)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const userWallets = allWallets.filter(
      (item) => item.created_by === user.email
    );

    setIncomes(userIncomes);
    setWallets(userWallets);

    if (userWallets.length > 0) {
      setForm((prev) => ({
        ...prev,
        wallet_id: prev.wallet_id || userWallets[0].id,
      }));
    }

    setLoading(false);
  }, [user?.email]);

  const handleSubmit = async () => {
    if (!form.amount || !form.wallet_id || !form.source || !user?.email) return;

    const newIncome = {
      id: generateId(),
      created_by: user.email,
      amount: parseFloat(form.amount),
      source: form.source.trim(),
      wallet_id: form.wallet_id,
      date: form.date,
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
    };

    const allIncomes = getStoredData(STORAGE_KEYS.incomes);
    const updatedIncomes = [newIncome, ...allIncomes];
    setStoredData(STORAGE_KEYS.incomes, updatedIncomes);

    const userIncomes = updatedIncomes
      .filter((item) => item.created_by === user.email)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    setIncomes(userIncomes);

    setForm({
      amount: "",
      source: "",
      wallet_id: wallets[0]?.id || "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });

    setOpen(false);
  };

  const handleDelete = async (id) => {
    const allIncomes = getStoredData(STORAGE_KEYS.incomes);
    const updatedIncomes = allIncomes.filter((item) => item.id !== id);
    setStoredData(STORAGE_KEYS.incomes, updatedIncomes);
    setIncomes((prev) => prev.filter((item) => item.id !== id));
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

  const walletName = (id) =>
    wallets.find((wallet) => wallet.id === id)?.name || "Unknown";

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
        title="Add Funds"
        subtitle="Record money added to your wallets"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Funds
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Funds to Wallet</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Amount (₱)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Source / Description</Label>
                  <Input
                    placeholder="e.g., Salary, Freelance, Gift"
                    value={form.source}
                    onChange={(e) =>
                      setForm({ ...form, source: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Wallet</Label>
                  <Select
                    value={form.wallet_id}
                    onValueChange={(value) =>
                      setForm({ ...form, wallet_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {wallet.name}
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
                    placeholder="Additional details"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={!form.amount || !form.wallet_id || !form.source}
                >
                  Add Funds
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {incomes.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No funds added yet"
          description="Record money added to your wallets to track your income and wallet balances."
        />
      ) : (
        <div className="space-y-2">
          {incomes.map((inc) => (
            <div
              key={inc.id}
              className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{inc.source}</p>
                  <p className="font-heading font-bold text-sm text-primary">
                    +{fmt(inc.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{walletName(inc.wallet_id)}</span>
                  <span>•</span>
                  <span>{inc.date}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8"
                onClick={() => handleDelete(inc.id)}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}