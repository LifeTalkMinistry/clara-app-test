import { useState, useMemo } from "react";
import {
  Plus,
  Wallet as WalletIcon,
  Trash2,
  ArrowLeftRight,
  X,
  RotateCcw,
  CalendarDays,
  ArrowUp,
  ArrowDown,
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
import EmptyState from "../components/EmptyState";
import FeaturePageLoader from "../components/FeaturePageLoader";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";
import { supabase } from "@/lib/supabaseClient";

const walletTypes = ["cash", "gcash", "bank", "maya", "credit_card", "other"];
const fundSourceTypes = [
  "Salary",
  "Business",
  "Allowance",
  "Gift",
  "Bonus",
  "Side Hustle",
  "Transfer In",
  "Other",
];
const fundTags = [
  "Regular Income",
  "Extra Income",
  "Emergency Fund",
  "Savings Top Up",
  "Business Funds",
  "Other",
];

const walletIcons = {
  cash: "💵",
  gcash: "📱",
  bank: "🏦",
  maya: "💜",
  credit_card: "💳",
  other: "💰",
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getWalletSortOrder = (wallet, index) => {
  if (wallet?.sort_order === null || wallet?.sort_order === undefined) return index;
  const n = Number(wallet.sort_order);
  return Number.isFinite(n) ? n : index;
};

export default function Wallets() {
  const { user, loading: accessLoading } = useUserRole();
  const { wallets, walletTransactions, refreshData, loading } =
    useFinancialData(user);

  const [addOpen, setAddOpen] = useState(false);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [isTransferringMoney, setIsTransferringMoney] = useState(false);
  const [isReorderingWallets, setIsReorderingWallets] = useState(false);

  const [selectedWallet, setSelectedWallet] = useState(null);
  const [historyWallet, setHistoryWallet] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "cash",
    starting_balance: "",
  });

  const [addMoneyForm, setAddMoneyForm] = useState({
    amount: "",
    source_type: "Salary",
    details: "",
    date: getToday(),
    tag: "Regular Income",
    notes: "",
  });

  const [transferForm, setTransferForm] = useState({
    from_wallet_id: "",
    to_wallet_id: "",
    amount: "",
    notes: "",
  });

  if (accessLoading || loading) {
    return <FeaturePageLoader label="Preparing wallets..." />;
  }

  const sortedWallets = useMemo(() => {
    return [...wallets].sort((a, b) => {
      const aOrder = getWalletSortOrder(
        a,
        wallets.findIndex((w) => String(w.id) === String(a.id))
      );
      const bOrder = getWalletSortOrder(
        b,
        wallets.findIndex((w) => String(w.id) === String(b.id))
      );

      if (aOrder !== bOrder) return aOrder - bOrder;

      const aCreated = new Date(a?.created_at || 0).getTime();
      const bCreated = new Date(b?.created_at || 0).getTime();
      return aCreated - bCreated;
    });
  }, [wallets]);

  const getBalance = (wallet) => Number(wallet?.balance || 0);

  const totalBalance = useMemo(() => {
    return sortedWallets.reduce((sum, w) => sum + getBalance(w), 0);
  }, [sortedWallets]);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));

  const formatHistoryDate = (value) => {
    if (!value) return "No date";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "No date";
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const resetAddWalletForm = () => {
    setForm({
      name: "",
      type: "cash",
      starting_balance: "",
    });
  };

  const resetAddMoneyForm = () => {
    setAddMoneyForm({
      amount: "",
      source_type: "Salary",
      details: "",
      date: getToday(),
      tag: "Regular Income",
      notes: "",
    });
    setSelectedWallet(null);
  };

  const resetTransferForm = () => {
    setTransferForm({
      from_wallet_id: "",
      to_wallet_id: "",
      amount: "",
      notes: "",
    });
  };

  const historyItems = useMemo(() => {
    if (!historyWallet?.id) return [];

    return [...(walletTransactions || [])]
      .filter((t) => String(t.wallet_id) === String(historyWallet.id))
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [walletTransactions, historyWallet]);

  const getHistoryTypeLabel = (type) => {
    switch (type) {
      case "add":
        return "Added Money";
      case "income":
        return "Income";
      case "transfer_in":
        return "Transfer In";
      case "transfer_out":
        return "Transfer Out";
      case "expense":
        return "Expense";
      case "reset":
        return "Reset";
      default:
        return String(type || "Transaction")
          .replaceAll("_", " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const getHistoryAmountPrefix = (type) => {
    if (type === "transfer_out" || type === "expense" || type === "reset") {
      return "-";
    }
    return "+";
  };

  const normalizeWalletOrder = async (walletList) => {
    const updates = walletList.map((wallet, index) =>
      supabase
        .from("wallets")
        .update({ sort_order: index })
        .eq("id", String(wallet.id))
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      throw failed.error;
    }
  };

  const moveWallet = async (walletId, direction) => {
    if (isReorderingWallets) return;

    const currentIndex = sortedWallets.findIndex(
      (wallet) => String(wallet.id) === String(walletId)
    );

    if (currentIndex === -1) return;

    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= sortedWallets.length) return;

    const nextWallets = [...sortedWallets];
    [nextWallets[currentIndex], nextWallets[targetIndex]] = [
      nextWallets[targetIndex],
      nextWallets[currentIndex],
    ];

    try {
      setIsReorderingWallets(true);
      await normalizeWalletOrder(nextWallets);
      await refreshData();
    } catch (error) {
      alert(error?.message || "Failed to reorder wallets");
    } finally {
      setIsReorderingWallets(false);
    }
  };

  const handleAddWallet = async () => {
    if (!form.name.trim()) {
      alert("Please enter a wallet name.");
      return;
    }

    if (!user?.email && !user?.id) {
      alert("User not found.");
      return;
    }

    try {
      setIsCreatingWallet(true);

      const starting = toNumber(form.starting_balance);
      const nextSortOrder = sortedWallets.length;

      const { error } = await supabase.from("wallets").insert([
        {
          name: form.name.trim(),
          type: form.type,
          balance: starting,
          icon: walletIcons[form.type],
          sort_order: nextSortOrder,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
      ]);

      if (error) throw error;

      setAddOpen(false);
      resetAddWalletForm();
      await refreshData();
    } catch (error) {
      alert(error?.message || "Failed to create wallet");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleDeleteWallet = async (id) => {
    const confirmed = window.confirm("Delete this wallet?");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("wallets")
        .delete()
        .eq("id", String(id));

      if (error) throw error;

      const remainingWallets = sortedWallets.filter(
        (wallet) => String(wallet.id) !== String(id)
      );

      await normalizeWalletOrder(remainingWallets);
      await refreshData();
    } catch (error) {
      alert(error?.message || "Failed to delete wallet");
    }
  };

  const openAddMoneyModal = (wallet) => {
    setSelectedWallet(wallet);
    setAddMoneyForm({
      amount: "",
      source_type: "Salary",
      details: "",
      date: getToday(),
      tag: "Regular Income",
      notes: "",
    });
    setAddMoneyOpen(true);
  };

  const handleAddMoney = async () => {
    if (!selectedWallet?.id) {
      alert("No wallet selected.");
      return;
    }

    const amount = toNumber(addMoneyForm.amount);

    if (amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    try {
      setIsAddingMoney(true);

      const currentBalance = getBalance(selectedWallet);
      const newBalance = currentBalance + amount;

      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", String(selectedWallet.id));

      if (walletError) throw walletError;

      const historyPayload = {
        wallet_id: selectedWallet.id,
        type: "income",
        amount,
        notes: addMoneyForm.notes || null,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      };

      const { error: historyError } = await supabase
        .from("wallet_transactions")
        .insert([historyPayload]);

      if (historyError) throw historyError;

      setAddMoneyOpen(false);
      resetAddMoneyForm();
      await refreshData();
    } catch (error) {
      alert(error?.message || "Failed to add money");
    } finally {
      setIsAddingMoney(false);
    }
  };

  const handleTransferMoney = async () => {
    const fromId = String(transferForm.from_wallet_id || "");
    const toId = String(transferForm.to_wallet_id || "");
    const amount = toNumber(transferForm.amount);

    if (!fromId || !toId) {
      alert("Please select both wallets.");
      return;
    }

    if (fromId === toId) {
      alert("Source and destination wallets must be different.");
      return;
    }

    if (amount <= 0) {
      alert("Enter a valid transfer amount.");
      return;
    }

    const fromWallet = sortedWallets.find((w) => String(w.id) === fromId);
    const toWallet = sortedWallets.find((w) => String(w.id) === toId);

    if (!fromWallet || !toWallet) {
      alert("Wallet not found.");
      return;
    }

    const fromBalance = getBalance(fromWallet);
    const toBalance = getBalance(toWallet);

    if (fromBalance < amount) {
      alert("Insufficient balance in source wallet.");
      return;
    }

    try {
      setIsTransferringMoney(true);

      const nextFromBalance = fromBalance - amount;
      const nextToBalance = toBalance + amount;

      const { error: fromError } = await supabase
        .from("wallets")
        .update({ balance: nextFromBalance })
        .eq("id", fromId);

      if (fromError) throw fromError;

      const { error: toError } = await supabase
        .from("wallets")
        .update({ balance: nextToBalance })
        .eq("id", toId);

      if (toError) throw toError;

      const historyRows = [
        {
          wallet_id: fromId,
          type: "transfer_out",
          amount,
          notes: transferForm.notes || null,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
        {
          wallet_id: toId,
          type: "transfer_in",
          amount,
          notes: transferForm.notes || null,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        },
      ];

      const { error: historyError } = await supabase
        .from("wallet_transactions")
        .insert(historyRows);

      if (historyError) throw historyError;

      setTransferOpen(false);
      resetTransferForm();
      await refreshData();
    } catch (error) {
      alert(error?.message || "Failed to transfer money");
    } finally {
      setIsTransferringMoney(false);
    }
  };

  const projectedBalance =
    getBalance(selectedWallet) + toNumber(addMoneyForm.amount || 0);

  if (accessLoading) {
    return <FeaturePageLoader label="Preparing wallets..." />;
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-6 flex justify-center">
        <Button
          onClick={() => setAddOpen(true)}
          className="min-w-[180px] rounded-full bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Wallet
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Total Balance</p>
          <p className="text-xl font-bold">{fmt(totalBalance)}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Total Wallets</p>
          <p className="text-xl font-bold">{sortedWallets.length}</p>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border border-emerald-400/20 bg-[#04122a] text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Add Wallet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-white/80">Wallet Name</p>
              <Input
                placeholder="Wallet name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-white/80">Type</p>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#08152f] text-white">
                  {walletTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {walletIcons[t]} {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-white/80">Starting Balance</p>
              <Input
                type="number"
                placeholder="0.00"
                value={form.starting_balance}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    starting_balance: e.target.value,
                  }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/35"
              />
            </div>

            <Button
              onClick={handleAddWallet}
              disabled={isCreatingWallet}
              className="w-full bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
            >
              {isCreatingWallet ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
        <DialogContent className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#020d24] p-0 text-white sm:max-w-[510px]">
          <div className="relative p-6 sm:p-6">
            <button
              type="button"
              onClick={() => setAddMoneyOpen(false)}
              className="absolute right-4 top-4 text-white/70 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <DialogHeader className="mb-5 text-left">
              <DialogTitle className="text-[18px] font-semibold tracking-tight">
                Add Funds • {selectedWallet?.name || "Wallet"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 text-sm text-white/60">Wallet</p>
                    <p className="text-[17px] font-semibold">
                      {selectedWallet?.icon || "💰"} {selectedWallet?.name || "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="mb-1 text-sm text-white/60">Current Balance</p>
                    <p className="text-[17px] font-semibold">
                      {fmt(getBalance(selectedWallet))}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-white">Amount</p>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={addMoneyForm.amount}
                  onChange={(e) =>
                    setAddMoneyForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border-emerald-400/70 bg-transparent text-base text-white placeholder:text-white/35 focus-visible:ring-emerald-400"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {[500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() =>
                        setAddMoneyForm((prev) => ({
                          ...prev,
                          amount: String(toNumber(prev.amount) + amt),
                        }))
                      }
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                    >
                      +₱{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-white">Source Type</p>
                <Select
                  value={addMoneyForm.source_type}
                  onValueChange={(v) =>
                    setAddMoneyForm((prev) => ({ ...prev, source_type: v }))
                  }
                >
                  <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-transparent text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#08152f] text-white">
                    {fundSourceTypes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-white">Details</p>
                <Input
                  placeholder="e.g. Client payment, bonus, side hustle"
                  value={addMoneyForm.details}
                  onChange={(e) =>
                    setAddMoneyForm((prev) => ({
                      ...prev,
                      details: e.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border-white/10 bg-transparent text-white placeholder:text-white/35"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-white">Date</p>
                  <div className="relative">
                    <Input
                      type="date"
                      value={addMoneyForm.date}
                      onChange={(e) =>
                        setAddMoneyForm((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      className="h-12 rounded-2xl border-white/10 bg-transparent pr-10 text-white"
                    />
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-white">Tag</p>
                  <Select
                    value={addMoneyForm.tag}
                    onValueChange={(v) =>
                      setAddMoneyForm((prev) => ({ ...prev, tag: v }))
                    }
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-transparent text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#08152f] text-white">
                      {fundTags.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-white">Notes</p>
                <Input
                  placeholder="Optional note"
                  value={addMoneyForm.notes}
                  onChange={(e) =>
                    setAddMoneyForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border-white/10 bg-transparent text-white placeholder:text-white/35"
                />
              </div>

              <div className="rounded-2xl border border-emerald-400/10 bg-gradient-to-r from-emerald-900/30 to-emerald-700/10 px-4 py-4">
                <p className="mb-2 text-sm text-white/70">Projected Balance</p>
                <p className="text-[16px] font-semibold">
                  {fmt(getBalance(selectedWallet))} → {fmt(projectedBalance)}
                </p>
                <p className="mt-3 text-sm text-white/55">
                  Every peso you track builds more control.
                </p>
              </div>

              <Button
                onClick={handleAddMoney}
                disabled={isAddingMoney}
                className="h-12 w-full rounded-2xl bg-emerald-500 text-base font-semibold text-black hover:bg-emerald-400"
              >
                {isAddingMoney ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="rounded-3xl border border-emerald-400/20 bg-[#020d24] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold">
              Transfer Money
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-white">From Wallet</p>
              <Select
                value={transferForm.from_wallet_id}
                onValueChange={(v) =>
                  setTransferForm((prev) => ({ ...prev, from_wallet_id: v }))
                }
              >
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-transparent text-white">
                  <SelectValue placeholder="From wallet" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#08152f] text-white">
                  {sortedWallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={String(wallet.id)}>
                      {(wallet.icon || "💰") + " " + wallet.name} ({fmt(getBalance(wallet))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-white">To Wallet</p>
              <Select
                value={transferForm.to_wallet_id}
                onValueChange={(v) =>
                  setTransferForm((prev) => ({ ...prev, to_wallet_id: v }))
                }
              >
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-transparent text-white">
                  <SelectValue placeholder="To wallet" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#08152f] text-white">
                  {sortedWallets
                    .filter(
                      (wallet) =>
                        String(wallet.id) !== String(transferForm.from_wallet_id)
                    )
                    .map((wallet) => (
                      <SelectItem key={wallet.id} value={String(wallet.id)}>
                        {(wallet.icon || "💰") + " " + wallet.name} ({fmt(getBalance(wallet))})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-white">Amount</p>
              <Input
                type="number"
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="h-12 rounded-2xl border-white/10 bg-transparent text-white placeholder:text-white/35"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-white">Notes</p>
              <Input
                placeholder="Optional transfer note"
                value={transferForm.notes}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="h-12 rounded-2xl border-white/10 bg-transparent text-white placeholder:text-white/35"
              />
            </div>

            <Button
              onClick={handleTransferMoney}
              disabled={isTransferringMoney}
              className="h-12 w-full rounded-2xl bg-emerald-500 font-semibold text-black hover:bg-emerald-400"
            >
              {isTransferringMoney ? "Transferring..." : "Transfer Money"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="rounded-3xl border border-emerald-400/20 bg-[#020d24] text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold">
              Wallet History • {historyWallet?.name || ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-sm text-white/60">Wallet</p>
                  <p className="text-[17px] font-semibold">
                    {historyWallet?.icon || "💰"} {historyWallet?.name || "—"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="mb-1 text-sm text-white/60">Current Balance</p>
                  <p className="text-[17px] font-semibold">
                    {fmt(getBalance(historyWallet))}
                  </p>
                </div>
              </div>
            </div>

            {historyItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center">
                <p className="text-sm text-white/55">No transaction history yet</p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                {historyItems.map((item) => {
                  const isNegative =
                    item.type === "transfer_out" ||
                    item.type === "expense" ||
                    item.type === "reset";

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {getHistoryTypeLabel(item.type)}
                          </p>

                          <p className="mt-1 text-xs text-white/55">
                            {formatHistoryDate(item.created_at)}
                          </p>

                          {!!item.notes && (
                            <p className="mt-2 text-xs text-white/60">
                              Notes: {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-semibold ${
                              isNegative ? "text-red-300" : "text-emerald-300"
                            }`}
                          >
                            {getHistoryAmountPrefix(item.type)}
                            {fmt(item.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!loading && sortedWallets.length === 0 && (
        <EmptyState icon={WalletIcon} title="No wallets yet" />
      )}

      <div className="space-y-4">
        {sortedWallets.map((w, index) => {
          const hasActivity = walletTransactions.some(
            (t) => String(t.wallet_id) === String(w.id)
          );

          return (
            <div
              key={w.id}
              className="rounded-[24px] border border-white/10 bg-white/5 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                    Wallet
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Use arrows to reorder wallet position
                  </p>
                </div>

                <div className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-white/55">
                  Position {index + 1}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[18px] font-semibold">
                    {w.icon || walletIcons[w.type] || "💰"} {w.name}
                  </p>
                  <p className="mt-1 text-sm capitalize text-white/60">
                    {String(w.type || "other").replaceAll("_", " ")}
                  </p>
                  <p className="mt-4 text-[20px] font-bold">{fmt(getBalance(w))}</p>
                  <p className="mt-2 text-sm text-white/45">
                    {hasActivity ? "Has activity" : "No activity yet"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="mr-1 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveWallet(w.id, -1)}
                      disabled={index === 0 || isReorderingWallets}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Move wallet up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveWallet(w.id, 1)}
                      disabled={index === sortedWallets.length - 1 || isReorderingWallets}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Move wallet down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAddMoneyModal(w)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22c55e] text-white transition hover:scale-105"
                    title="Add Money"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTransferForm({
                        from_wallet_id: String(w.id),
                        to_wallet_id: "",
                        amount: "",
                        notes: "",
                      });
                      setTransferOpen(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22c55e] text-white transition hover:scale-105"
                    title="Transfer Money"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHistoryWallet(w);
                      setHistoryOpen(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#facc15] text-black transition hover:scale-105"
                    title="View History"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteWallet(w.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef4444] text-white transition hover:scale-105"
                    title="Delete Wallet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
