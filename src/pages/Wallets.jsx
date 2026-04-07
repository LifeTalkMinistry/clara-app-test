import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Wallet as WalletIcon,
  Trash2,
  ArrowLeftRight,
  PlusCircle,
  History,
  Pencil,
  Save,
  X,
  StickyNote,
  CalendarDays,
  Tag,
} from "lucide-react";
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
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";

const WALLET_KEY = "clara_wallets";
const TRANSFER_KEY = "clara_transfers";
const TXN_KEY = "clara_wallet_transactions";

const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const emitWalletSync = () => {
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("clara-wallets-updated"));
  window.dispatchEvent(new Event("clara-expenses-updated"));
};

const walletTypes = ["cash", "gcash", "bank", "maya", "credit_card", "other"];

const walletIcons = {
  cash: "💵",
  gcash: "📱",
  bank: "🏦",
  maya: "💜",
  credit_card: "💳",
  other: "💰",
};

const fundSourceOptions = [
  "salary",
  "freelance",
  "business",
  "gift",
  "allowance",
  "refund",
  "other",
];

const fundTagOptions = ["regular_income", "extra_income", "unexpected_money"];

const getTodayInputValue = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeString = (value) => String(value ?? "").trim();

const isOwnedByUser = (item, user) => {
  if (!user) return false;

  const itemEmail = normalizeString(
    item?.created_by ?? item?.user_email ?? item?.owner_email ?? item?.email
  ).toLowerCase();

  const userEmail = normalizeString(user?.email).toLowerCase();

  const itemUserId = normalizeString(
    item?.user_id ?? item?.owner_id ?? item?.profile_id
  );

  const currentUserId = normalizeString(user?.id);

  if (itemEmail && userEmail && itemEmail === userEmail) return true;
  if (itemUserId && currentUserId && itemUserId === currentUserId) return true;

  return false;
};

const toLabel = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Wallets() {
  const { user } = useUserRole();

  const [wallets, setWallets] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [addOpen, setAddOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [selectedWallet, setSelectedWallet] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "cash",
    starting_balance: "",
  });

  const [fundForm, setFundForm] = useState({
    amount: "",
    source_type: "salary",
    source_details: "",
    tag: "regular_income",
    notes: "",
    date: getTodayInputValue(),
  });

  const [transferForm, setTransferForm] = useState({
    to_wallet_id: "",
    amount: "",
    note: "",
    date: getTodayInputValue(),
  });

  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    source_type: "salary",
    source_details: "",
    tag: "regular_income",
    notes: "",
    date: getTodayInputValue(),
  });

  const loadData = () => {
    if (!user?.email && !user?.id) {
      setWallets([]);
      setTransfers([]);
      setTransactions([]);
      return;
    }

    const allWallets = safeRead(WALLET_KEY);
    const allTransfers = safeRead(TRANSFER_KEY);
    const allTransactions = safeRead(TXN_KEY);

    const userWallets = allWallets
      .filter((wallet) => isOwnedByUser(wallet, user))
      .map((wallet) => ({
        ...wallet,
        id: String(wallet.id),
        icon: wallet.icon || walletIcons[wallet.type] || "💰",
      }));

    const userWalletIds = new Set(userWallets.map((w) => String(w.id)));

    const userTransactions = allTransactions
      .filter(
        (txn) =>
          isOwnedByUser(txn, user) || userWalletIds.has(String(txn.wallet_id))
      )
      .map((txn) => ({
        ...txn,
        id: String(txn.id),
        wallet_id: String(txn.wallet_id),
      }));

    const userTransfers = allTransfers
      .filter(
        (transfer) =>
          isOwnedByUser(transfer, user) ||
          userWalletIds.has(String(transfer.wallet_id)) ||
          userWalletIds.has(String(transfer.linked_wallet_id))
      )
      .map((transfer) => ({
        ...transfer,
        id: String(transfer.id),
        wallet_id: String(transfer.wallet_id),
        linked_wallet_id:
          transfer.linked_wallet_id != null
            ? String(transfer.linked_wallet_id)
            : "",
      }));

    setWallets(userWallets);
    setTransactions(userTransactions);
    setTransfers(userTransfers);
  };

  useEffect(() => {
    loadData();

    const handleReload = () => loadData();

    window.addEventListener("storage", handleReload);
    window.addEventListener("clara-wallets-updated", handleReload);
    window.addEventListener("clara-expenses-updated", handleReload);

    return () => {
      window.removeEventListener("storage", handleReload);
      window.removeEventListener("clara-wallets-updated", handleReload);
      window.removeEventListener("clara-expenses-updated", handleReload);
    };
  }, [user?.email, user?.id]);

  const saveWallets = (data) => {
    const allWallets = safeRead(WALLET_KEY);
    const otherUsersWallets = allWallets.filter((wallet) => !isOwnedByUser(wallet, user));
    const merged = [...otherUsersWallets, ...data];

    setWallets(data);
    safeWrite(WALLET_KEY, merged);
    emitWalletSync();
  };

  const saveTransfers = (data) => {
    const allTransfers = safeRead(TRANSFER_KEY);
    const otherUsersTransfers = allTransfers.filter(
      (transfer) => !isOwnedByUser(transfer, user)
    );
    const merged = [...otherUsersTransfers, ...data];

    setTransfers(data);
    safeWrite(TRANSFER_KEY, merged);
    emitWalletSync();
  };

  const saveTransactions = (data) => {
    const allTransactions = safeRead(TXN_KEY);
    const otherUsersTransactions = allTransactions.filter(
      (txn) => !isOwnedByUser(txn, user)
    );
    const merged = [...otherUsersTransactions, ...data];

    setTransactions(data);
    safeWrite(TXN_KEY, merged);
    emitWalletSync();
  };

  const resetFundForm = () => {
    setFundForm({
      amount: "",
      source_type: "salary",
      source_details: "",
      tag: "regular_income",
      notes: "",
      date: getTodayInputValue(),
    });
  };

  const resetTransferForm = () => {
    setTransferForm({
      to_wallet_id: "",
      amount: "",
      note: "",
      date: getTodayInputValue(),
    });
  };

  const handleAddWallet = () => {
    if (!form.name.trim()) return;
    if (!user?.email && !user?.id) return;

    const newWallet = {
      id: generateId(),
      name: form.name.trim(),
      type: form.type,
      starting_balance: parseFloat(form.starting_balance) || 0,
      icon: walletIcons[form.type] || "💰",
      created_by: user?.email || "",
      user_id: user?.id || "",
      created_at: new Date().toISOString(),
    };

    saveWallets([newWallet, ...wallets]);
    setAddOpen(false);
    setForm({ name: "", type: "cash", starting_balance: "" });
  };

  const handleDeleteWallet = (id) => {
    const walletId = String(id);
    const updatedWallets = wallets.filter((w) => String(w.id) !== walletId);
    const updatedTransactions = transactions.filter(
      (t) => String(t.wallet_id) !== walletId
    );
    const updatedTransfers = transfers.filter(
      (t) =>
        String(t.wallet_id) !== walletId &&
        String(t.linked_wallet_id) !== walletId
    );

    saveWallets(updatedWallets);
    saveTransactions(updatedTransactions);
    saveTransfers(updatedTransfers);

    if (selectedWallet && String(selectedWallet.id) === walletId) {
      setSelectedWallet(null);
      setHistoryOpen(false);
      setFundOpen(false);
      setTransferOpen(false);
    }
  };

  const handleAddFunds = () => {
    if (!selectedWallet) return;
    if (!user?.email && !user?.id) return;

    const amount = parseFloat(fundForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const newTxn = {
      id: generateId(),
      wallet_id: String(selectedWallet.id),
      amount,
      type: "deposit",
      source_type: fundForm.source_type || "salary",
      source_details: fundForm.source_details || "",
      tag: fundForm.tag || "regular_income",
      notes: fundForm.notes || "",
      created_at: fundForm.date
        ? new Date(`${fundForm.date}T12:00:00`).toISOString()
        : new Date().toISOString(),
      created_by: user?.email || "",
      user_id: user?.id || "",
    };

    saveTransactions([newTxn, ...transactions]);
    setFundOpen(false);
    resetFundForm();
  };

  const getBalance = (wallet) => {
    const walletId = String(wallet.id);

    const deposits = transactions
      .filter((t) => String(t.wallet_id) === walletId)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const transfersIn = transfers
      .filter(
        (t) => String(t.wallet_id) === walletId && t.type === "transfer_in"
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const transfersOut = transfers
      .filter(
        (t) => String(t.wallet_id) === walletId && t.type === "transfer_out"
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    return (
      Number(wallet.starting_balance || 0) + deposits + transfersIn - transfersOut
    );
  };

  const handleTransfer = () => {
    if (!selectedWallet) return;
    if (!user?.email && !user?.id) return;

    const amount = parseFloat(transferForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return;
    if (!transferForm.to_wallet_id) return;

    const fromWalletId = String(selectedWallet.id);
    const toWalletId = String(transferForm.to_wallet_id);

    if (fromWalletId === toWalletId) return;

    const fromBalance = getBalance(selectedWallet);
    if (amount > fromBalance) return;

    const createdAt = transferForm.date
      ? new Date(`${transferForm.date}T12:00:00`).toISOString()
      : new Date().toISOString();

    const linkId = generateId();

    const outTransfer = {
      id: generateId(),
      link_id: linkId,
      wallet_id: fromWalletId,
      linked_wallet_id: toWalletId,
      amount,
      type: "transfer_out",
      note: transferForm.note || "",
      created_at: createdAt,
      created_by: user?.email || "",
      user_id: user?.id || "",
    };

    const inTransfer = {
      id: generateId(),
      link_id: linkId,
      wallet_id: toWalletId,
      linked_wallet_id: fromWalletId,
      amount,
      type: "transfer_in",
      note: transferForm.note || "",
      created_at: createdAt,
      created_by: user?.email || "",
      user_id: user?.id || "",
    };

    saveTransfers([outTransfer, inTransfer, ...transfers]);
    setTransferOpen(false);
    resetTransferForm();
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));

  const formatDateTime = (value) => {
    try {
      return new Date(value).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const formatDateOnly = (value) => {
    try {
      const d = new Date(value);
      const year = d.getFullYear();
      const month = `${d.getMonth() + 1}`.padStart(2, "0");
      const day = `${d.getDate()}`.padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return getTodayInputValue();
    }
  };

  const getWalletNameById = (id) => {
    const found = wallets.find((w) => String(w.id) === String(id));
    return found ? found.name : "Unknown Wallet";
  };

  const getLastActivity = (wallet) => {
    const walletId = String(wallet.id);

    const history = [
      ...transactions
        .filter((t) => String(t.wallet_id) === walletId)
        .map((t) => ({
          ...t,
          activity_date: t.created_at || new Date().toISOString(),
          label: `Added ${fmt(t.amount)} • ${toLabel(t.source_type || "deposit")}`,
        })),
      ...transfers
        .filter((t) => String(t.wallet_id) === walletId)
        .map((t) => ({
          ...t,
          activity_date: t.created_at || new Date().toISOString(),
          label:
            t.type === "transfer_in"
              ? `Transfer in ${fmt(t.amount)}`
              : `Transfer out ${fmt(t.amount)}`,
        })),
    ].sort(
      (a, b) =>
        new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()
    );

    return history[0]?.label || "No activity yet";
  };

  const selectedWalletHistory = useMemo(() => {
    if (!selectedWallet) return [];

    const walletId = String(selectedWallet.id);

    const depositHistory = transactions
      .filter((t) => String(t.wallet_id) === walletId)
      .map((t) => ({
        id: `txn-${t.id}`,
        rawId: String(t.id),
        sourceType: "transaction",
        type: "deposit",
        amount: Number(t.amount || 0),
        created_at: t.created_at || new Date().toISOString(),
        title: "Funds Added",
        subtitle: toLabel(t.source_type || "deposit"),
        source_type: t.source_type || "salary",
        source_details: t.source_details || "",
        tag: t.tag || "regular_income",
        notes: t.notes || "",
      }));

    const transferHistory = transfers
      .filter((t) => String(t.wallet_id) === walletId)
      .map((t) => ({
        id: `tr-${t.id}`,
        rawId: String(t.id),
        rawLinkId: t.link_id || null,
        sourceType: "transfer",
        type: t.type,
        amount: Number(t.amount || 0),
        created_at: t.created_at || new Date().toISOString(),
        title: t.type === "transfer_in" ? "Transfer In" : "Transfer Out",
        subtitle:
          t.type === "transfer_in"
            ? `From ${getWalletNameById(t.linked_wallet_id)}`
            : `To ${getWalletNameById(t.linked_wallet_id)}`,
        source_type: t.type === "transfer_in" ? "transfer_in" : "transfer_out",
        source_details: t.note || "",
        tag: "regular_income",
        notes: t.note || "",
      }));

    return [...depositHistory, ...transferHistory].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [selectedWallet, transactions, transfers, wallets]);

  const totalBalance = wallets.reduce((sum, w) => sum + getBalance(w), 0);

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditForm({
      amount: String(item.amount || ""),
      source_type: item.source_type || "salary",
      source_details: item.source_details || "",
      tag: item.tag || "regular_income",
      notes: item.notes || "",
      date: formatDateOnly(item.created_at),
    });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditForm({
      amount: "",
      source_type: "salary",
      source_details: "",
      tag: "regular_income",
      notes: "",
      date: getTodayInputValue(),
    });
  };

  const handleSaveHistoryItem = (item) => {
    const parsed = parseFloat(editForm.amount);
    if (Number.isNaN(parsed) || parsed <= 0) return;

    if (item.sourceType === "transaction") {
      const updatedTransactions = transactions.map((t) =>
        String(t.id) === String(item.rawId)
          ? {
              ...t,
              amount: parsed,
              source_type: editForm.source_type,
              source_details: editForm.source_details,
              tag: editForm.tag,
              notes: editForm.notes,
              created_at: editForm.date
                ? new Date(`${editForm.date}T12:00:00`).toISOString()
                : t.created_at,
            }
          : t
      );
      saveTransactions(updatedTransactions);
    }

    if (item.sourceType === "transfer") {
      const updatedTransfers = transfers.map((t) =>
        item.rawLinkId
          ? t.link_id === item.rawLinkId
            ? {
                ...t,
                amount: parsed,
                note: editForm.notes,
                created_at: editForm.date
                  ? new Date(`${editForm.date}T12:00:00`).toISOString()
                  : t.created_at,
              }
            : t
          : String(t.id) === String(item.rawId)
          ? {
              ...t,
              amount: parsed,
              note: editForm.notes,
              created_at: editForm.date
                ? new Date(`${editForm.date}T12:00:00`).toISOString()
                : t.created_at,
            }
          : t
      );
      saveTransfers(updatedTransfers);
    }

    cancelEditing();
  };

  const handleDeleteHistoryItem = (item) => {
    if (item.sourceType === "transaction") {
      const updatedTransactions = transactions.filter(
        (t) => String(t.id) !== String(item.rawId)
      );
      saveTransactions(updatedTransactions);
    }

    if (item.sourceType === "transfer") {
      const updatedTransfers = item.rawLinkId
        ? transfers.filter((t) => t.link_id !== item.rawLinkId)
        : transfers.filter((t) => String(t.id) !== String(item.rawId));

      saveTransfers(updatedTransfers);
    }

    if (editingItemId === item.id) {
      cancelEditing();
    }
  };

  const quickAmounts = [500, 1000, 5000];
  const selectedWalletBalance = selectedWallet ? getBalance(selectedWallet) : 0;
  const fundAmountNumber = Number(fundForm.amount || 0);
  const projectedBalance =
    selectedWalletBalance + (Number.isNaN(fundAmountNumber) ? 0 : fundAmountNumber);

  const availableTransferTargets = selectedWallet
    ? wallets.filter((w) => String(w.id) !== String(selectedWallet.id))
    : [];

  const transferAmountNumber = Number(transferForm.amount || 0);
  const projectedAfterTransfer =
    selectedWalletBalance -
    (Number.isNaN(transferAmountNumber) ? 0 : transferAmountNumber);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Wallets"
        subtitle="Manage your money"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Wallet
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-white/60">Total Balance</p>
          <p className="text-xl font-bold">{fmt(totalBalance)}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-white/60">Total Wallets</p>
          <p className="text-xl font-bold">{wallets.length}</p>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Wallet</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Wallet name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {walletTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {walletIcons[t]} {toLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Starting balance"
              value={form.starting_balance}
              onChange={(e) =>
                setForm({ ...form, starting_balance: e.target.value })
              }
            />

            <Button onClick={handleAddWallet}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fundOpen}
        onOpenChange={(open) => {
          setFundOpen(open);
          if (!open) resetFundForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Add Funds {selectedWallet ? `• ${selectedWallet.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedWallet && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/60">Wallet</p>
                    <p className="font-semibold">
                      {selectedWallet.icon} {selectedWallet.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">Current Balance</p>
                    <p className="font-semibold">{fmt(selectedWalletBalance)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={fundForm.amount}
                onChange={(e) =>
                  setFundForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() =>
                      setFundForm((prev) => ({
                        ...prev,
                        amount: String((Number(prev.amount || 0) || 0) + amount),
                      }))
                    }
                    className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition"
                  >
                    +{fmt(amount)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source Type</label>
              <Select
                value={fundForm.source_type}
                onValueChange={(value) =>
                  setFundForm((prev) => ({ ...prev, source_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {fundSourceOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {toLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Details</label>
              <Input
                placeholder="e.g. Client payment, bonus, side hustle"
                value={fundForm.source_details}
                onChange={(e) =>
                  setFundForm((prev) => ({
                    ...prev,
                    source_details: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={fundForm.date}
                  onChange={(e) =>
                    setFundForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tag</label>
                <Select
                  value={fundForm.tag}
                  onValueChange={(value) =>
                    setFundForm((prev) => ({ ...prev, tag: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {fundTagOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {toLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Optional note"
                value={fundForm.notes}
                onChange={(e) =>
                  setFundForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            {selectedWallet && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                <p className="text-sm text-white/70">Projected Balance</p>
                <p className="text-lg font-bold mt-1">
                  {fmt(selectedWalletBalance)} → {fmt(projectedBalance)}
                </p>
                <p className="text-xs text-white/55 mt-2">
                  Every peso you track builds more control.
                </p>
              </div>
            )}

            <Button className="w-full" onClick={handleAddFunds}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={transferOpen}
        onOpenChange={(open) => {
          setTransferOpen(open);
          if (!open) resetTransferForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Transfer Funds {selectedWallet ? `• ${selectedWallet.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedWallet && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/60">From Wallet</p>
                    <p className="font-semibold">
                      {selectedWallet.icon} {selectedWallet.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">Available</p>
                    <p className="font-semibold">{fmt(selectedWalletBalance)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Transfer To</label>
              <Select
                value={transferForm.to_wallet_id}
                onValueChange={(value) =>
                  setTransferForm((prev) => ({ ...prev, to_wallet_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination wallet" />
                </SelectTrigger>
                <SelectContent>
                  {availableTransferTargets.map((wallet) => (
                    <SelectItem key={wallet.id} value={String(wallet.id)}>
                      {wallet.icon} {wallet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={transferForm.date}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Note</label>
              <Input
                placeholder="Optional note"
                value={transferForm.note}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>

            {selectedWallet && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-sm text-white/70">Projected Balance</p>
                <p className="text-lg font-bold mt-1">
                  {fmt(selectedWalletBalance)} → {fmt(projectedAfterTransfer)}
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleTransfer}
              disabled={!availableTransferTargets.length}
            >
              Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (!open) cancelEditing();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedWallet ? `${selectedWallet.name} History` : "Wallet History"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {selectedWallet && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white/60">Current Balance</p>
                <p className="text-2xl font-bold mt-1">
                  {fmt(getBalance(selectedWallet))}
                </p>
              </div>
            )}

            {selectedWalletHistory.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-white/10 text-center text-sm text-white/50">
                No wallet history yet.
              </div>
            ) : (
              selectedWalletHistory.map((item) => {
                const isPositive =
                  item.type === "deposit" || item.type === "transfer_in";
                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    {!isEditing ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-white/50 mt-0.5">
                              {item.subtitle}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                              {formatDateTime(item.created_at)}
                            </p>
                          </div>

                          <p
                            className={`font-bold whitespace-nowrap ${
                              isPositive ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {fmt(item.amount)}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs text-white/70">
                          <div className="rounded-lg bg-white/5 px-3 py-2 flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            <span>{toLabel(item.tag || "regular_income")}</span>
                          </div>

                          <div className="rounded-lg bg-white/5 px-3 py-2 flex items-center gap-2">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>{formatDateTime(item.created_at)}</span>
                          </div>

                          {item.source_details ? (
                            <div className="rounded-lg bg-white/5 px-3 py-2 sm:col-span-2">
                              <span className="text-white/45">Details:</span>{" "}
                              {item.source_details}
                            </div>
                          ) : null}

                          {item.notes ? (
                            <div className="rounded-lg bg-white/5 px-3 py-2 sm:col-span-2 flex items-start gap-2">
                              <StickyNote className="w-3.5 h-3.5 mt-0.5" />
                              <span>{item.notes}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex justify-end gap-2 mt-3">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => startEditing(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDeleteHistoryItem(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-xs text-white/60">Amount</label>
                            <Input
                              type="number"
                              value={editForm.amount}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  amount: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs text-white/60">Date</label>
                            <Input
                              type="date"
                              value={editForm.date}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  date: e.target.value,
                                }))
                              }
                            />
                          </div>

                          {item.sourceType === "transaction" && (
                            <>
                              <div className="space-y-2">
                                <label className="text-xs text-white/60">
                                  Source Type
                                </label>
                                <Select
                                  value={editForm.source_type}
                                  onValueChange={(value) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      source_type: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fundSourceOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {toLabel(option)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs text-white/60">Tag</label>
                                <Select
                                  value={editForm.tag}
                                  onValueChange={(value) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      tag: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fundTagOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {toLabel(option)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="sm:col-span-2 space-y-2">
                                <label className="text-xs text-white/60">
                                  Details
                                </label>
                                <Input
                                  value={editForm.source_details}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      source_details: e.target.value,
                                    }))
                                  }
                                  placeholder="Optional details"
                                />
                              </div>
                            </>
                          )}

                          <div className="sm:col-span-2 space-y-2">
                            <label className="text-xs text-white/60">Notes</label>
                            <Input
                              value={editForm.notes}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  notes: e.target.value,
                                }))
                              }
                              placeholder="Optional note"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            size="icon"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleSaveHistoryItem(item)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {wallets.length === 0 ? (
        <EmptyState icon={WalletIcon} title="No wallets yet" />
      ) : (
        <div className="space-y-4">
          {wallets.map((w) => {
            const balance = getBalance(w);

            return (
              <div
                key={w.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-green-400/30 transition"
              >
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {w.icon} {w.name}
                    </p>
                    <p className="text-xs text-white/50 capitalize">{w.type}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      size="icon"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => {
                        setSelectedWallet(w);
                        setFundOpen(true);
                      }}
                    >
                      <PlusCircle className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      onClick={() => {
                        setSelectedWallet(w);
                        setTransferOpen(true);
                      }}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => {
                        setSelectedWallet(w);
                        setHistoryOpen(true);
                      }}
                    >
                      <History className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteWallet(w.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="mt-4 text-2xl font-bold">{fmt(balance)}</p>
                <p className="text-xs text-white/50 mt-1">{getLastActivity(w)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}