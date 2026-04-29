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

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getWalletSortOrder = (wallet, index) => {
  if (wallet?.sort_order === null || wallet?.sort_order === undefined) {
    return index;
  }

  const n = Number(wallet.sort_order);
  return Number.isFinite(n) ? n : index;
};

const formatPeso = (n) =>
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
    case "savings_goal":
      return "Savings Goal";
    default:
      return String(type || "Transaction")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const getHistoryAmountPrefix = (type) => {
  if (
    type === "transfer_out" ||
    type === "expense" ||
    type === "reset" ||
    type === "savings_goal"
  ) {
    return "-";
  }

  return "+";
};

const getBalance = (wallet) =>
  toNumber(
    wallet?.derived_balance ??
      wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.starting_balance ??
      0
  );

const normalizeWalletPayload = (wallet) => {
  const type = wallet?.type || "other";
  const name = wallet?.name || wallet?.wallet_name || "Untitled Wallet";
  const starting = toNumber(
    wallet?.starting_balance ?? wallet?.initial_balance ?? wallet?.balance ?? 0
  );

  return {
    ...wallet,
    id: wallet?.id || generateId(),
    name,
    wallet_name: wallet?.wallet_name || name,
    type,
    icon: wallet?.icon || walletIcons[type] || "💰",
    balance: toNumber(wallet?.balance ?? starting),
    starting_balance: starting,
    sort_order:
      wallet?.sort_order === null || wallet?.sort_order === undefined
        ? 0
        : toNumber(wallet.sort_order),
    created_at: wallet?.created_at || new Date().toISOString(),
    updated_at: wallet?.updated_at || new Date().toISOString(),
    syncStatus: wallet?.syncStatus || "local_only",
    source: wallet?.source || "local",
  };
};

export default function Wallets() {
  const { user, loading: accessLoading } = useUserRole();

  const {
    loading,
    wallets = [],
    walletTransactions = [],
    transfers = [],
    addWallet,
    updateWallet,
    deleteWallet,
    addIncome,
    transferBetweenWallets,
    refreshData,
  } = useFinancialData(user);

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

      const aCreated = new Date(a?.created_at || a?.createdAt || 0).getTime();
      const bCreated = new Date(b?.created_at || b?.createdAt || 0).getTime();
      return aCreated - bCreated;
    });
  }, [wallets]);

  const totalBalance = useMemo(() => {
    return sortedWallets.reduce((sum, wallet) => sum + getBalance(wallet), 0);
  }, [sortedWallets]);

  const historyItems = useMemo(() => {
    if (!historyWallet?.id) return [];

    const walletId = String(historyWallet.id);

    const transactionItems = [...walletTransactions]
      .filter((t) => String(t?.wallet_id) === walletId)
      .map((t) => ({
        ...t,
        id: t?.id || generateId(),
        type: t?.type || t?.transaction_type || "transaction",
        amount: toNumber(t?.amount),
        created_at: t?.created_at || t?.createdAt || new Date().toISOString(),
        notes: t?.notes || t?.description || "",
        source: "wallet_transaction",
      }));

    const transferItems = [...transfers]
      .filter(
        (transfer) =>
          String(transfer?.from_wallet_id) === walletId ||
          String(transfer?.to_wallet_id) === walletId
      )
      .map((transfer) => {
        const isOutgoing = String(transfer?.from_wallet_id) === walletId;
        const otherWalletId = isOutgoing
          ? transfer?.to_wallet_id
          : transfer?.from_wallet_id;

        const otherWallet = sortedWallets.find(
          (wallet) => String(wallet.id) === String(otherWalletId)
        );

        return {
          ...transfer,
          id: transfer?.id || generateId(),
          type: isOutgoing ? "transfer_out" : "transfer_in",
          amount: toNumber(transfer?.amount),
          created_at:
            transfer?.created_at ||
            transfer?.createdAt ||
            transfer?.date ||
            new Date().toISOString(),
          notes:
            transfer?.notes ||
            (isOutgoing
              ? `Transferred to ${otherWallet?.name || "another wallet"}`
              : `Transferred from ${otherWallet?.name || "another wallet"}`),
          source: "transfer",
        };
      });

    return [...transactionItems, ...transferItems].sort((a, b) => {
      const aTime = new Date(a?.created_at || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.created_at || b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [walletTransactions, transfers, historyWallet, sortedWallets]);

  const projectedBalance = useMemo(() => {
    return getBalance(selectedWallet) + toNumber(addMoneyForm.amount || 0);
  }, [selectedWallet, addMoneyForm.amount]);

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

      if (typeof updateWallet !== "function") {
        throw new Error("Wallet reorder is not available yet.");
      }

      await Promise.all(
        nextWallets.map((wallet, index) =>
          updateWallet(wallet.id, {
            sort_order: index,
            updated_at: new Date().toISOString(),
          })
        )
      );

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

    if (!user?.id && !user?.email) {
      alert("User not found.");
      return;
    }

    try {
      setIsCreatingWallet(true);

      const operationTime = new Date().toISOString();
      const starting = toNumber(form.starting_balance);
      const nextSortOrder = sortedWallets.length;

      await addWallet(
        normalizeWalletPayload({
          id: generateId(),
          name: form.name.trim(),
          wallet_name: form.name.trim(),
          type: form.type,
          balance: starting,
          starting_balance: starting,
          icon: walletIcons[form.type],
          sort_order: nextSortOrder,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
          created_at: operationTime,
          updated_at: operationTime,
        })
      );

      await refreshData();

      setAddOpen(false);
      resetAddWalletForm();
    } catch (error) {
      alert(error?.message || "Failed to create wallet locally");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleDeleteWallet = async (id) => {
    const confirmed = window.confirm("Delete this wallet?");
    if (!confirmed) return;

    try {
      await deleteWallet(id);
      await refreshData();
    } catch (error) {
      alert(error?.message || "Failed to delete wallet locally");
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

      const detailText = String(addMoneyForm.details || "").trim();
      const noteText = String(addMoneyForm.notes || "").trim();
      const dateText = String(addMoneyForm.date || "").trim();

      const mergedNotes = [
        noteText,
        detailText ? `Details: ${detailText}` : "",
        dateText ? `Recorded date: ${dateText}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      await addIncome({
        id: generateId(),
        wallet_id: selectedWallet.id,
        amount,
        source_type: addMoneyForm.source_type,
        source: addMoneyForm.source_type,
        tag: addMoneyForm.tag,
        notes: mergedNotes || "",
        created_at: new Date().toISOString(),
      });

      await refreshData();

      setAddMoneyOpen(false);
      resetAddMoneyForm();
    } catch (error) {
      alert(error?.message || "Failed to add money locally");
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

    if (getBalance(fromWallet) < amount) {
      alert("Insufficient balance in source wallet.");
      return;
    }

    try {
      setIsTransferringMoney(true);

      await transferBetweenWallets({
        id: generateId(),
        from_wallet_id: fromId,
        to_wallet_id: toId,
        amount,
        notes: transferForm.notes || "",
        created_at: new Date().toISOString(),
      });

      await refreshData();

      setTransferOpen(false);
      resetTransferForm();
    } catch (error) {
      alert(error?.message || "Failed to transfer money locally");
    } finally {
      setIsTransferringMoney(false);
    }
  };

  if (accessLoading || loading) {
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
          <p className="text-xl font-bold">{formatPeso(totalBalance)}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Total Wallets</p>
          <p className="text-xl font-bold">{sortedWallets.length}</p>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[32px] border border-white/10 bg-[#030914] p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(16,185,129,0.16)] sm:max-w-[520px]">
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.13),transparent_40%),linear-gradient(180deg,rgba(10,23,42,0.98),rgba(3,9,20,1))]" />
            <div className="pointer-events-none absolute -left-20 top-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative border-b border-white/10 px-5 py-5">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition hover:bg-white/[0.10] hover:text-white active:scale-95"
                aria-label="Close create wallet"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <DialogHeader className="pr-14 text-left">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-xl shadow-[0_0_28px_rgba(16,185,129,0.18)]">
                    {walletIcons[form.type] || "💰"}
                  </div>
                  <div>
                    <div className="inline-flex w-fit items-center rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/85">
                      Wallet setup
                    </div>
                    <DialogTitle className="mt-2 text-xl font-bold tracking-tight text-white">
                      Create wallet
                    </DialogTitle>
                  </div>
                </div>
                <p className="text-sm leading-6 text-white/65">
                  Build a money container for tracking balance, spending, and transfers.
                </p>
              </DialogHeader>
            </div>

            <div className="relative space-y-5 px-5 py-5">
              <div className="rounded-[28px] border border-emerald-300/15 bg-gradient-to-br from-emerald-400/[0.10] via-white/[0.045] to-cyan-400/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">New money container</p>
                    <p className="mt-2 truncate text-lg font-bold text-white">
                      {form.name.trim() || "Untitled wallet"}
                    </p>
                    <p className="mt-1 text-sm capitalize text-white/55">
                      {(form.type || "cash").replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Starting balance</p>
                    <p className="mt-2 text-lg font-bold text-emerald-100">
                      {formatPeso(toNumber(form.starting_balance))}
                    </p>
                    <p className="mt-1 text-xs text-emerald-100/50">Ready to track</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white/86">Wallet name</p>
                    <Input
                      placeholder="e.g. GCash, Cash, Payroll"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="h-12 rounded-2xl border-white/15 bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] placeholder:text-white/35 focus-visible:border-emerald-300/45 focus-visible:ring-emerald-400/25"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white/86">Wallet type</p>
                    <div className="grid grid-cols-3 gap-2">
                      {walletTypes.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, type: t }))}
                          className={`rounded-2xl border px-2.5 py-3 text-center text-xs font-bold capitalize transition active:scale-[0.98] ${form.type === t ? "border-emerald-300/45 bg-emerald-400/15 text-emerald-50 shadow-[0_0_26px_rgba(16,185,129,0.14)]" : "border-white/10 bg-white/[0.045] text-white/58 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/80"}`}
                        >
                          <span className="mb-1 block text-lg leading-none">{walletIcons[t] || "💰"}</span>
                          <span>{t.replaceAll("_", " ")}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white/86">Starting balance</p>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-100/75">₱</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={form.starting_balance}
                        onChange={(e) => setForm((prev) => ({ ...prev, starting_balance: e.target.value }))}
                        className="h-12 rounded-2xl border-white/15 bg-white/[0.07] pl-9 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] placeholder:text-white/35 focus-visible:border-emerald-300/45 focus-visible:ring-emerald-400/25"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddWallet}
                disabled={isCreatingWallet}
                className="min-h-[54px] w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 text-sm font-bold text-white shadow-[0_14px_34px_rgba(16,185,129,0.32)] transition hover:scale-[1.01] hover:from-emerald-300 hover:to-green-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingWallet ? "Creating..." : "Create wallet"}
              </Button>

              <Button
                type="button"
                onClick={() => setAddOpen(false)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] text-sm font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/[0.08] hover:text-white"
              >
                Cancel
              </Button>
            </div>
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
                      {selectedWallet?.icon || "💰"}{" "}
                      {selectedWallet?.name || "—"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="mb-1 text-sm text-white/60">
                      Current Balance
                    </p>
                    <p className="text-[17px] font-semibold">
                      {formatPeso(getBalance(selectedWallet))}
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
                <p className="mb-2 text-sm font-medium text-white">
                  Source Type
                </p>
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
                  {formatPeso(getBalance(selectedWallet))} →{" "}
                  {formatPeso(projectedBalance)}
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
                      {(wallet.icon || "💰") + " " + wallet.name} (
                      {formatPeso(getBalance(wallet))})
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
                        String(wallet.id) !==
                        String(transferForm.from_wallet_id)
                    )
                    .map((wallet) => (
                      <SelectItem key={wallet.id} value={String(wallet.id)}>
                        {(wallet.icon || "💰") + " " + wallet.name} (
                        {formatPeso(getBalance(wallet))})
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
                    {formatPeso(getBalance(historyWallet))}
                  </p>
                </div>
              </div>
            </div>

            {historyItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center">
                <p className="text-sm text-white/55">
                  No transaction history yet
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                {historyItems.map((item) => {
                  const isNegative =
                    item.type === "transfer_out" ||
                    item.type === "expense" ||
                    item.type === "reset" ||
                    item.type === "savings_goal";

                  return (
                    <div
                      key={`${item.source || "history"}-${item.id}`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {getHistoryTypeLabel(item.type)}
                          </p>

                          <p className="mt-1 text-xs text-white/55">
                            {formatHistoryDate(
                              item.created_at || item.createdAt
                            )}
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
                            {formatPeso(item.amount)}
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

      {sortedWallets.length === 0 && (
        <EmptyState icon={WalletIcon} title="No wallets yet" />
      )}

      <div className="space-y-4">
        {sortedWallets.map((wallet, index) => {
          const hasWalletTransactionActivity = walletTransactions.some(
            (t) => String(t?.wallet_id) === String(wallet.id)
          );

          const hasTransferActivity = transfers.some(
            (transfer) =>
              String(transfer?.from_wallet_id) === String(wallet.id) ||
              String(transfer?.to_wallet_id) === String(wallet.id)
          );

          const hasActivity =
            hasWalletTransactionActivity || hasTransferActivity;

          return (
            <div
              key={wallet.id}
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
                    {wallet.icon || walletIcons[wallet.type] || "💰"}{" "}
                    {wallet.name}
                  </p>
                  <p className="mt-1 text-sm capitalize text-white/60">
                    {String(wallet.type || "other").replaceAll("_", " ")}
                  </p>
                  <p className="mt-4 text-[20px] font-bold">
                    {formatPeso(getBalance(wallet))}
                  </p>
                  <p className="mt-2 text-sm text-white/45">
                    {hasActivity ? "Has activity" : "No activity yet"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="mr-1 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveWallet(wallet.id, -1)}
                      disabled={index === 0 || isReorderingWallets}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Move wallet up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveWallet(wallet.id, 1)}
                      disabled={
                        index === sortedWallets.length - 1 ||
                        isReorderingWallets
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Move wallet down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAddMoneyModal(wallet)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22c55e] text-white transition hover:scale-105"
                    title="Add Money"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTransferForm({
                        from_wallet_id: String(wallet.id),
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
                      setHistoryWallet(wallet);
                      setHistoryOpen(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#facc15] text-black transition hover:scale-105"
                    title="View History"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteWallet(wallet.id)}
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
