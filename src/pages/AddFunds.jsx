import { useMemo, useState } from "react";
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
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";
import { supabase } from "@/lib/supabaseClient";

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

const getTodayDate = () => new Date().toISOString().split("T")[0];

const createInitialForm = (walletId = "") => ({
  amount: "",
  source: "",
  wallet_id: walletId,
  date: getTodayDate(),
  notes: "",
});

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function AddFunds() {
  const { user, loading: accessLoading } = useUserRole();
  const financial = useFinancialData(user);

  const wallets = useMemo(
    () => (Array.isArray(financial.wallets) ? financial.wallets : []),
    [financial.wallets]
  );
  const transactions = useMemo(
    () =>
      Array.isArray(financial.walletTransactions)
        ? financial.walletTransactions
        : [],
    [financial.walletTransactions]
  );
  const loading = accessLoading || financial.loading;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => createInitialForm());

  const walletNameMap = useMemo(() => {
    return wallets.reduce((map, wallet) => {
      map.set(String(wallet.id), wallet.name || wallet.wallet_name || "Wallet");
      return map;
    }, new Map());
  }, [wallets]);

  const incomeTransactions = useMemo(() => {
    return transactions
      .filter((txn) => ["income", "add", "cash_in"].includes(String(txn.type).toLowerCase()))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [transactions]);

  const resetForm = () => {
    setForm(createInitialForm(wallets[0]?.id ? String(wallets[0].id) : ""));
    setError("");
  };

  const handleSubmit = async () => {
    const amount = toNumber(form.amount);

    if (!user?.id && !user?.email) {
      setError("User not found.");
      return;
    }

    if (amount <= 0 || !form.wallet_id || !form.source.trim()) {
      setError("Amount, source, and wallet are required.");
      return;
    }

    const wallet = wallets.find((item) => String(item.id) === String(form.wallet_id));
    if (!wallet) {
      setError("Wallet not found.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await financial.addIncome({
        amount,
        wallet_id: form.wallet_id,
        source_type: form.source.trim(),
        notes: form.notes.trim() || form.source.trim(),
        date: form.date,
      });

      setOpen(false);
      resetForm();
      window.dispatchEvent(new Event("clara-finance-updated"));
      window.dispatchEvent(new Event("clara-wallets-updated"));
      window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
    } catch (err) {
      console.error("Failed to add funds:", err);
      setError(err?.message || "Failed to add funds.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (txn) => {
    const wallet = wallets.find((item) => String(item.id) === String(txn.wallet_id));
    if (!wallet) return;

    try {
      setSaving(true);
      const nextBalance = toNumber(wallet.balance) - toNumber(txn.amount);

      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: nextBalance, updated_at: new Date().toISOString() })
        .eq("id", String(wallet.id));

      if (walletError) throw walletError;

      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .delete()
        .eq("id", String(txn.id));

      if (txnError) throw txnError;

      await financial.refreshData();
    } catch (err) {
      console.error("Failed to delete funds:", err);
      setError(err?.message || "Failed to delete funds.");
    } finally {
      setSaving(false);
    }
  };

  const addFundsAction = (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && !form.wallet_id && wallets[0]?.id) {
          setForm((prev) => ({ ...prev, wallet_id: String(wallets[0].id) }));
        }
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Funds
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Funds to Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </div>

          <div>
            <Label>Source / Description</Label>
            <Input
              placeholder="e.g., Salary, Freelance, Gift"
              value={form.source}
              onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
            />
          </div>

          <div>
            <Label>Wallet</Label>
            <Select
              value={form.wallet_id}
              onValueChange={(value) => setForm((prev) => ({ ...prev, wallet_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={String(wallet.id)}>
                    {wallet.name || wallet.wallet_name || "Wallet"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {wallets.length === 0 ? (
              <p className="mt-1 text-xs text-destructive">Create a wallet first</p>
            ) : null}
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              placeholder="Additional details"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={saving || !form.amount || !form.wallet_id || !form.source.trim()}
          >
            {saving ? "Saving..." : "Add Funds"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return <FeaturePageLoader label="Preparing funds..." />;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <PageHeader
        title="Add Funds"
        subtitle="Record money added to your wallets"
        action={addFundsAction}
      />

      {error && !open ? (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {incomeTransactions.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No funds added yet"
          description="Record money added to your wallets to track income and wallet balances."
        />
      ) : (
        <div className="space-y-2">
          {incomeTransactions.map((income) => (
            <div
              key={income.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">
                    {income.source_type || income.notes || "Funds added"}
                  </p>
                  <p className="font-heading text-sm font-bold text-primary">
                    +{currencyFormatter.format(toNumber(income.amount))}
                  </p>
                </div>

                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{walletNameMap.get(String(income.wallet_id)) || "Unknown"}</span>
                  <span>-</span>
                  <span>{formatDate(income.created_at)}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => handleDelete(income)}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
