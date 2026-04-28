import { useState, useEffect, useMemo, useCallback } from "react";
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
import { getWalletBalance } from "@/utils/financialEngine";

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

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error("Unable to generate a valid UUID on this device.");
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


const LOCAL_FINANCE_VERSION = 1;
const LOCAL_FINANCE_PREFIX = "clara_local_finance_v1";
const LOCAL_FINANCE_LAST_KEY = `${LOCAL_FINANCE_PREFIX}:last`;

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const safeText = (value) => String(value ?? "").trim();

const safeJsonParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getLocalFinanceKey = (userKey) =>
  `${LOCAL_FINANCE_PREFIX}:${safeText(userKey || "guest").toLowerCase() || "guest"}`;

const sortByDateDesc = (a, b) => {
  const aTime = new Date(a?.created_at || a?.date || 0).getTime() || 0;
  const bTime = new Date(b?.created_at || b?.date || 0).getTime() || 0;
  return bTime - aTime;
};

const normalizeWalletRow = (wallet) => {
  const name = wallet?.name || wallet?.wallet_name || "Untitled Wallet";
  const type = wallet?.type || "other";
  const startingBalance = toNumber(
    wallet?.starting_balance ?? wallet?.initial_balance ?? wallet?.balance
  );
  const balance = toNumber(
    wallet?.balance ?? wallet?.current_balance ?? wallet?.starting_balance ?? startingBalance
  );

  return {
    ...wallet,
    id: String(wallet?.id || generateId()),
    name,
    wallet_name: wallet?.wallet_name || name,
    type,
    balance,
    starting_balance: startingBalance,
    icon: wallet?.icon || walletIcons[type] || "💰",
    sort_order:
      wallet?.sort_order === null || wallet?.sort_order === undefined
        ? 0
        : toNumber(wallet.sort_order),
    created_at: wallet?.created_at || new Date().toISOString(),
    updated_at: wallet?.updated_at || wallet?.created_at || new Date().toISOString(),
    local_only: wallet?.local_only ?? true,
  };
};

const normalizeTransactionRow = (transaction) => ({
  ...transaction,
  id: String(transaction?.id || generateId()),
  transaction_id: transaction?.transaction_id || transaction?.id || generateId(),
  wallet_id: transaction?.wallet_id ? String(transaction.wallet_id) : "",
  related_wallet_id: transaction?.related_wallet_id
    ? String(transaction.related_wallet_id)
    : transaction?.relatedWalletId
      ? String(transaction.relatedWalletId)
      : null,
  amount: toNumber(transaction?.amount),
  type: String(transaction?.type || "other").trim().toLowerCase(),
  created_at: transaction?.created_at || transaction?.date || new Date().toISOString(),
  updated_at:
    transaction?.updated_at ||
    transaction?.created_at ||
    transaction?.date ||
    new Date().toISOString(),
  local_only: transaction?.local_only ?? true,
});

const readLocalArrayFallback = (keys = []) => {
  if (!isBrowser()) return [];

  for (const key of keys) {
    const parsed = safeJsonParse(window.localStorage.getItem(key), null);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    if (Array.isArray(parsed?.data)) return parsed.data;
  }

  return [];
};

const readLocalFinanceSnapshot = (key = null) => {
  if (!isBrowser()) {
    return {
      key,
      loaded: true,
      version: LOCAL_FINANCE_VERSION,
      updatedAt: new Date().toISOString(),
      expenses: [],
      wallets: [],
      transactions: [],
      transfers: [],
    };
  }

  const normalizedKey = key || "guest";
  const storageKey = getLocalFinanceKey(normalizedKey);
  const stored = safeJsonParse(window.localStorage.getItem(storageKey), null);
  const last = safeJsonParse(window.localStorage.getItem(LOCAL_FINANCE_LAST_KEY), null);
  const source = stored || (last?.key === normalizedKey ? last : null) || {};

  const suffix = safeText(normalizedKey).toLowerCase();
  const legacyWallets = readLocalArrayFallback([
    `clara_wallets:${suffix}`,
    `clara_local_wallets:${suffix}`,
    "clara_wallets",
    "clara_local_wallets",
    "wallets",
  ]);
  const legacyTransactions = readLocalArrayFallback([
    `clara_wallet_transactions:${suffix}`,
    `clara_transactions:${suffix}`,
    `clara_local_transactions:${suffix}`,
    "clara_wallet_transactions",
    "clara_transactions",
    "clara_local_transactions",
    "wallet_transactions",
  ]);
  const legacyExpenses = readLocalArrayFallback([
    `clara_expenses:${suffix}`,
    `clara_local_expenses:${suffix}`,
    "clara_expenses",
    "clara_local_expenses",
    "expenses",
  ]);

  const transactions = (Array.isArray(source.transactions)
    ? source.transactions
    : legacyTransactions)
    .map(normalizeTransactionRow)
    .sort(sortByDateDesc);

  const wallets = (Array.isArray(source.wallets) ? source.wallets : legacyWallets)
    .map(normalizeWalletRow)
    .map((wallet) => ({
      ...wallet,
      balance: getWalletBalance(wallet, transactions),
      derived_balance: getWalletBalance(wallet, transactions),
    }));

  return {
    key: normalizedKey,
    loaded: true,
    version: LOCAL_FINANCE_VERSION,
    updatedAt: source.updatedAt || source.updated_at || new Date().toISOString(),
    expenses: Array.isArray(source.expenses) ? source.expenses : legacyExpenses,
    wallets,
    transactions,
    transfers: Array.isArray(source.transfers) ? source.transfers : [],
  };
};

const writeLocalFinanceSnapshot = (key, snapshot) => {
  if (!isBrowser()) return snapshot;

  const normalizedKey = key || "guest";
  const transactions = (snapshot.transactions || [])
    .map(normalizeTransactionRow)
    .sort(sortByDateDesc);

  const wallets = (snapshot.wallets || [])
    .map(normalizeWalletRow)
    .map((wallet) => ({
      ...wallet,
      balance: getWalletBalance(wallet, transactions),
      derived_balance: getWalletBalance(wallet, transactions),
    }));

  const nextSnapshot = {
    key: normalizedKey,
    loaded: true,
    version: LOCAL_FINANCE_VERSION,
    updatedAt: new Date().toISOString(),
    expenses: Array.isArray(snapshot.expenses) ? snapshot.expenses : [],
    wallets,
    transactions,
    transfers: Array.isArray(snapshot.transfers) ? snapshot.transfers : [],
  };

  window.localStorage.setItem(getLocalFinanceKey(normalizedKey), JSON.stringify(nextSnapshot));
  window.localStorage.setItem(LOCAL_FINANCE_LAST_KEY, JSON.stringify(nextSnapshot));

  return nextSnapshot;
};

const dispatchLocalFinanceEvents = () => {
  if (typeof window === "undefined") return;

  [
    "clara-wallets-updated",
    "clara-wallet-transactions-updated",
    "clara-finance-updated",
    "clara-expenses-updated",
    "clara-local-finance-updated",
  ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
};

export default function Wallets() {
  const { user, loading: accessLoading } = useUserRole();
  const cacheKey = user?.id || user?.email || "guest";
  const [financeSnapshot, setFinanceSnapshot] = useState(() =>
    readLocalFinanceSnapshot(cacheKey)
  );

  useEffect(() => {
    const refreshLocalFinance = () => {
      setFinanceSnapshot(readLocalFinanceSnapshot(cacheKey));
    };

    refreshLocalFinance();

    if (typeof window === "undefined") return undefined;

    window.addEventListener("storage", refreshLocalFinance);
    window.addEventListener("clara-local-finance-updated", refreshLocalFinance);
    window.addEventListener("clara-finance-updated", refreshLocalFinance);
    window.addEventListener("clara-wallets-updated", refreshLocalFinance);
    window.addEventListener("clara-wallet-transactions-updated", refreshLocalFinance);

    return () => {
      window.removeEventListener("storage", refreshLocalFinance);
      window.removeEventListener("clara-local-finance-updated", refreshLocalFinance);
      window.removeEventListener("clara-finance-updated", refreshLocalFinance);
      window.removeEventListener("clara-wallets-updated", refreshLocalFinance);
      window.removeEventListener("clara-wallet-transactions-updated", refreshLocalFinance);
    };
  }, [cacheKey]);

  const commitFinanceState = useCallback(
    (nextPartial) => {
      const nextSnapshot = writeLocalFinanceSnapshot(cacheKey, {
        ...financeSnapshot,
        ...nextPartial,
      });

      setFinanceSnapshot(nextSnapshot);
      dispatchLocalFinanceEvents();
      return nextSnapshot;
    },
    [cacheKey, financeSnapshot]
  );

  const wallets = useMemo(
    () => (Array.isArray(financeSnapshot?.wallets) ? financeSnapshot.wallets : []),
    [financeSnapshot?.wallets]
  );

  const walletTransactions = useMemo(
    () =>
      Array.isArray(financeSnapshot?.transactions)
        ? financeSnapshot.transactions
        : [],
    [financeSnapshot?.transactions]
  );

  const expenses = useMemo(
    () => (Array.isArray(financeSnapshot?.expenses) ? financeSnapshot.expenses : []),
    [financeSnapshot?.expenses]
  );

  const transfers = useMemo(
    () => (Array.isArray(financeSnapshot?.transfers) ? financeSnapshot.transfers : []),
    [financeSnapshot?.transfers]
  );

  const loading = false;

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

  const getBalance = useCallback((wallet) => {
    return toNumber(wallet?.balance);
  }, []);

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

  const totalBalance = useMemo(() => {
    return sortedWallets.reduce((sum, wallet) => sum + getBalance(wallet), 0);
  }, [sortedWallets, getBalance]);

  const historyItems = useMemo(() => {
    if (!historyWallet?.id) return [];

    return [...walletTransactions]
      .filter((t) => String(t?.wallet_id) === String(historyWallet.id))
      .sort((a, b) => {
        const aTime = new Date(a?.created_at || 0).getTime();
        const bTime = new Date(b?.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [walletTransactions, historyWallet]);

  const projectedBalance = useMemo(() => {
    return getBalance(selectedWallet) + toNumber(addMoneyForm.amount || 0);
  }, [selectedWallet, addMoneyForm.amount, getBalance]);

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

  const normalizeWalletOrder = useCallback(
    (walletList) =>
      walletList.map((wallet, index) =>
        normalizeWalletRow({
          ...wallet,
          sort_order: index,
          updated_at: new Date().toISOString(),
        })
      ),
    []
  );

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

      commitFinanceState({
        wallets: normalizeWalletOrder(nextWallets),
        transactions: walletTransactions,
        expenses,
        transfers,
      });
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

      const newWallet = normalizeWalletRow({
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
        local_only: true,
      });

      commitFinanceState({
        wallets: [...wallets, newWallet],
        transactions: walletTransactions,
        expenses,
        transfers,
      });

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
      const remainingWallets = sortedWallets.filter(
        (wallet) => String(wallet.id) !== String(id)
      );

      commitFinanceState({
        wallets: normalizeWalletOrder(remainingWallets),
        transactions: walletTransactions,
        expenses,
        transfers,
      });
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

      const operationTime = new Date().toISOString();
      const currentBalance = getBalance(selectedWallet);
      const newBalance = currentBalance + amount;

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

      const nextWallets = wallets.map((wallet) =>
        String(wallet.id) === String(selectedWallet.id)
          ? normalizeWalletRow({
              ...wallet,
              balance: newBalance,
              updated_at: operationTime,
            })
          : wallet
      );

      const historyPayload = normalizeTransactionRow({
        id: generateId(),
        transaction_id: generateId(),
        wallet_id: selectedWallet.id,
        type: "income",
        amount,
        source_type: addMoneyForm.source_type,
        tag: addMoneyForm.tag,
        notes: mergedNotes || null,
        created_at: operationTime,
        updated_at: operationTime,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
        local_only: true,
      });

      commitFinanceState({
        wallets: nextWallets,
        transactions: [historyPayload, ...walletTransactions],
        expenses,
        transfers,
      });

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

    const fromBalance = getBalance(fromWallet);
    const toBalance = getBalance(toWallet);

    if (fromBalance < amount) {
      alert("Insufficient balance in source wallet.");
      return;
    }

    try {
      setIsTransferringMoney(true);

      const operationTime = new Date().toISOString();
      const nextFromBalance = fromBalance - amount;
      const nextToBalance = toBalance + amount;
      const transferGroupId = generateId();

      const nextWallets = wallets.map((wallet) => {
        if (String(wallet.id) === fromId) {
          return normalizeWalletRow({
            ...wallet,
            balance: nextFromBalance,
            updated_at: operationTime,
          });
        }

        if (String(wallet.id) === toId) {
          return normalizeWalletRow({
            ...wallet,
            balance: nextToBalance,
            updated_at: operationTime,
          });
        }

        return wallet;
      });

      const historyRows = [
        normalizeTransactionRow({
          id: generateId(),
          transaction_id: generateId(),
          wallet_id: fromId,
          type: "transfer_out",
          amount,
          transfer_group_id: transferGroupId,
          related_wallet_id: toId,
          notes: transferForm.notes || null,
          created_at: operationTime,
          updated_at: operationTime,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
          local_only: true,
        }),
        normalizeTransactionRow({
          id: generateId(),
          transaction_id: generateId(),
          wallet_id: toId,
          type: "transfer_in",
          amount,
          transfer_group_id: transferGroupId,
          related_wallet_id: fromId,
          notes: transferForm.notes || null,
          created_at: operationTime,
          updated_at: operationTime,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
          local_only: true,
        }),
      ];

      const transferSummary = {
        id: transferGroupId,
        from_wallet_id: fromId,
        to_wallet_id: toId,
        amount,
        notes: transferForm.notes || null,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
        created_at: operationTime,
        updated_at: operationTime,
        local_only: true,
      };

      commitFinanceState({
        wallets: nextWallets,
        transactions: [...historyRows, ...walletTransactions],
        expenses,
        transfers: [transferSummary, ...transfers],
      });

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
                  {formatPeso(getBalance(selectedWallet))} → {formatPeso(projectedBalance)}
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
                      {(wallet.icon || "💰") + " " + wallet.name} ({formatPeso(getBalance(wallet))})
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
                        {(wallet.icon || "💰") + " " + wallet.name} ({formatPeso(getBalance(wallet))})
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
          const hasActivity = walletTransactions.some(
            (t) => String(t?.wallet_id) === String(wallet.id)
          );

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
                    {wallet.icon || walletIcons[wallet.type] || "💰"} {wallet.name}
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
                      disabled={index === sortedWallets.length - 1 || isReorderingWallets}
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
