import { useState, useEffect } from "react";
import {
  Plus,
  Wallet as WalletIcon,
  Trash2,
  ArrowLeftRight,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const WALLET_KEY = "clara_wallets";
const TRANSFER_KEY = "clara_transfers";

const safeRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const safeWrite = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const walletTypes = ["cash", "gcash", "bank", "maya", "credit_card", "other"];
const walletIcons = {
  cash: "💵",
  gcash: "📱",
  bank: "🏦",
  maya: "💜",
  credit_card: "💳",
  other: "💰"
};

export default function Wallets() {
  const { user } = useUserRole();

  const [wallets, setWallets] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "cash",
    starting_balance: ""
  });

  const [transferForm, setTransferForm] = useState({
    from_wallet_id: "",
    to_wallet_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  useEffect(() => {
    setWallets(safeRead(WALLET_KEY));
    setTransfers(safeRead(TRANSFER_KEY));
    setLoading(false);
  }, []);

  const saveWallets = (data) => {
    setWallets(data);
    safeWrite(WALLET_KEY, data);
  };

  const saveTransfers = (data) => {
    setTransfers(data);
    safeWrite(TRANSFER_KEY, data);
  };

  const handleAddWallet = () => {
    if (!form.name) return;

    const newWallet = {
      ...form,
      id: Date.now(),
      starting_balance: parseFloat(form.starting_balance) || 0,
      icon: walletIcons[form.type]
    };

    saveWallets([...wallets, newWallet]);
    setForm({ name: "", type: "cash", starting_balance: "" });
    setAddOpen(false);
  };

  const handleDelete = (id) => {
    saveWallets(wallets.filter(w => w.id !== id));
  };

  const handleTransfer = () => {
    const { from_wallet_id, to_wallet_id, amount } = transferForm;
    if (!from_wallet_id || !to_wallet_id || !amount) return;

    const newTransfer = {
      ...transferForm,
      id: Date.now(),
      amount: parseFloat(amount)
    };

    saveTransfers([newTransfer, ...transfers]);
    setTransferOpen(false);
  };

  const getBalance = (wallet) => {
    const transfersIn = transfers
      .filter(t => t.to_wallet_id === wallet.id)
      .reduce((s, t) => s + t.amount, 0);

    const transfersOut = transfers
      .filter(t => t.from_wallet_id === wallet.id)
      .reduce((s, t) => s + t.amount, 0);

    return (wallet.starting_balance || 0) + transfersIn - transfersOut;
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0
    }).format(n);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Wallets"
        subtitle="Manage your money"
        action={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="w-4 h-4 mr-1" /> History
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        }
      />

      {/* ADD WALLET */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Wallet</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Wallet name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {walletTypes.map(t => (
                  <SelectItem key={t} value={t}>
                    {walletIcons[t]} {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Starting balance"
              value={form.starting_balance}
              onChange={(e) =>
                setForm({
                  ...form,
                  starting_balance: e.target.value
                })
              }
            />

            <Button onClick={handleAddWallet}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* LIST */}
      {wallets.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No wallets yet" />
      ) : (
        <div className="space-y-3">
          {wallets.map(w => {
            const balance = getBalance(w);

            return (
              <div key={w.id} className="p-4 border rounded-xl">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">
                      {w.icon} {w.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.type}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="icon" onClick={() => setTransferOpen(true)}>
                      <ArrowLeftRight className="w-4 h-4" />
                    </Button>
                    <Button size="icon" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <p className="mt-2 font-bold">{fmt(balance)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}