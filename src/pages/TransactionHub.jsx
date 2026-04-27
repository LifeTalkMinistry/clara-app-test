import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  PiggyBank,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";

import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "expense", label: "Expenses" },
  { key: "income", label: "Income" },
  { key: "transfer", label: "Transfers" },
  { key: "savings", label: "Savings" },
  { key: "wallet", label: "Wallet Activity" },
];

const INCOME_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

const EXPENSE_TYPES = new Set(["expense", "cashout", "debit", "withdrawal"]);
const TRANSFER_OUT_TYPES = new Set(["transfer_out", "transfer-out", "sent_transfer"]);
const TRANSFER_IN_TYPES = new Set(["transfer_in", "transfer-in", "received_transfer"]);
const SAVINGS_TYPES = new Set(["savings_goal", "savings_transfer", "goal_top_up", "savings_top_up"]);

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const formatPeso = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(toNumber(amount));

const formatSignedPeso = (amount) => {
  const value = toNumber(amount);
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${formatPeso(Math.abs(value))}`;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getActivityDateValue = (item) =>
  item?.created_at || item?.date || item?.updated_at || item?.transaction_date || item?.expense_date || null;

const getActivityTime = (item) => parseDate(getActivityDateValue(item))?.getTime() ?? 0;

const formatActivityDate = (value) => {
  const date = parseDate(value);
  if (!date) return "No date";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const titleCase = (value) => {
  const text = normalizeText(value).replaceAll("_", " ").replaceAll("-", " ");
  if (!text) return "Activity";
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

const getWalletName = (walletMap, walletId) => {
  if (!walletId) return "";
  const wallet = walletMap.get(String(walletId));
  return normalizeText(wallet?.name || wallet?.wallet_name || wallet?.title || "");
};

const getTypeGroup = (rawType) => {
  const type = normalizeLower(rawType || "wallet_activity");

  if (EXPENSE_TYPES.has(type)) return "expense";
  if (INCOME_TYPES.has(type)) return "income";
  if (TRANSFER_OUT_TYPES.has(type) || TRANSFER_IN_TYPES.has(type) || type === "transfer") {
    return "transfer";
  }
  if (SAVINGS_TYPES.has(type)) return "savings";
  return "wallet";
};

const getSignedAmount = ({ type, amount }) => {
  const group = getTypeGroup(type);
  const value = toNumber(amount);
  const normalizedType = normalizeLower(type);

  if (group === "expense") return -Math.abs(value);
  if (group === "income") return Math.abs(value);
  if (group === "savings") return -Math.abs(value);
  if (TRANSFER_OUT_TYPES.has(normalizedType)) return -Math.abs(value);
  if (TRANSFER_IN_TYPES.has(normalizedType)) return Math.abs(value);
  return value;
};

const getActivityIcon = (group, type) => {
  const normalizedType = normalizeLower(type);

  if (group === "expense") return ArrowUpRight;
  if (group === "income") return ArrowDownLeft;
  if (group === "savings") return PiggyBank;
  if (group === "transfer" || TRANSFER_OUT_TYPES.has(normalizedType) || TRANSFER_IN_TYPES.has(normalizedType)) {
    return ArrowLeftRight;
  }
  return WalletCards;
};

const getActivityTitle = (item) => {
  if (item.source === "expense") return titleCase(item.category || "Expense");

  const type = normalizeLower(item.type);
  if (EXPENSE_TYPES.has(type)) return titleCase(item.category || "Expense");
  if (INCOME_TYPES.has(type)) return titleCase(item.source_type || item.tag || "Income");
  if (TRANSFER_OUT_TYPES.has(type)) return "Transfer Out";
  if (TRANSFER_IN_TYPES.has(type)) return "Transfer In";
  if (SAVINGS_TYPES.has(type)) return "Savings Goal Top-Up";
  if (type === "transfer") return "Transfer";
  return titleCase(item.type || item.category || "Wallet Activity");
};

const buildSearchText = (item) =>
  [
    item.title,
    item.type,
    item.category,
    item.walletName,
    item.notes,
    item.statusLabel,
    item.amount,
    item.signedAmount,
  ]
    .map((value) => normalizeLower(value))
    .filter(Boolean)
    .join(" ");

const buildUnifiedActivity = ({ expenses = [], walletTransactions = [], transfers = [], walletMap }) => {
  const transactionExpenseIds = new Set(
    walletTransactions
      .filter((txn) => normalizeLower(txn?.type) === "expense" && txn?.expense_id)
      .map((txn) => String(txn.expense_id))
  );

  const transactionTransferGroups = new Set(
    walletTransactions
      .filter((txn) => txn?.transfer_group_id)
      .map((txn) => String(txn.transfer_group_id))
  );

  const walletActivity = walletTransactions.map((txn) => {
    const group = getTypeGroup(txn?.type);
    const signedAmount = getSignedAmount({ type: txn?.type, amount: txn?.amount });
    const walletName = getWalletName(walletMap, txn?.wallet_id);
    const title = getActivityTitle(txn);

    return {
      id: `wallet-${txn.id || `${txn.type}-${txn.wallet_id}-${txn.created_at}`}`,
      source: "wallet_transaction",
      raw: txn,
      group,
      type: normalizeLower(txn?.type || "wallet_activity"),
      title,
      amount: toNumber(txn?.amount),
      signedAmount,
      walletName,
      category: txn?.category || txn?.source_type || txn?.tag || "",
      notes: txn?.notes || txn?.details || "",
      dateValue: getActivityDateValue(txn),
      statusLabel: titleCase(txn?.type || group),
    };
  });

  const orphanExpenses = expenses
    .filter((expense) => !transactionExpenseIds.has(String(expense?.id)))
    .map((expense) => {
      const walletName = getWalletName(walletMap, expense?.wallet_id);
      const title = titleCase(expense?.category || "Expense");

      return {
        id: `expense-${expense.id}`,
        source: "expense",
        raw: expense,
        group: "expense",
        type: "expense",
        title,
        amount: toNumber(expense?.amount),
        signedAmount: -Math.abs(toNumber(expense?.amount)),
        walletName,
        category: expense?.category || "",
        notes: expense?.notes || "",
        dateValue: getActivityDateValue(expense),
        statusLabel: titleCase(expense?.planning_status || "expense"),
      };
    });

  const transferSummaries = transfers
    .filter((transfer) => {
      const groupId = String(transfer?.id || transfer?.transfer_group_id || "");
      return groupId && !transactionTransferGroups.has(groupId);
    })
    .map((transfer) => {
      const fromWallet = getWalletName(walletMap, transfer?.from_wallet_id || transfer?.wallet_id);
      const toWallet = getWalletName(walletMap, transfer?.to_wallet_id || transfer?.related_wallet_id);
      const walletName = [fromWallet, toWallet].filter(Boolean).join(" → ");

      return {
        id: `transfer-${transfer.id || transfer.transfer_group_id}`,
        source: "transfer",
        raw: transfer,
        group: "transfer",
        type: "transfer",
        title: "Transfer",
        amount: toNumber(transfer?.amount),
        signedAmount: 0,
        walletName,
        category: "Transfer",
        notes: transfer?.notes || "",
        dateValue: getActivityDateValue(transfer),
        statusLabel: "Transfer Summary",
      };
    });

  return [...walletActivity, ...orphanExpenses, ...transferSummaries]
    .map((item) => ({
      ...item,
      searchText: buildSearchText(item),
    }))
    .sort((left, right) => getActivityTime(right.raw || right) - getActivityTime(left.raw || left));
};

export default function TransactionHub() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUserRole();
  const financial = useFinancialData(user);

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const expenses = Array.isArray(financial?.expenses) ? financial.expenses : [];
  const walletTransactions = Array.isArray(financial?.walletTransactions)
    ? financial.walletTransactions
    : [];
  const transfers = Array.isArray(financial?.transfers) ? financial.transfers : [];
  const wallets = Array.isArray(financial?.wallets) ? financial.wallets : [];
  const loading = userLoading || Boolean(financial?.loading);

  const walletMap = useMemo(() => {
    const map = new Map();
    wallets.forEach((wallet) => {
      if (wallet?.id) map.set(String(wallet.id), wallet);
    });
    return map;
  }, [wallets]);

  const activity = useMemo(
    () => buildUnifiedActivity({ expenses, walletTransactions, transfers, walletMap }),
    [expenses, walletTransactions, transfers, walletMap]
  );

  const filteredActivity = useMemo(() => {
    const query = normalizeLower(searchQuery);

    return activity.filter((item) => {
      const matchesFilter = activeFilter === "all" || item.group === activeFilter;
      const matchesSearch = !query || item.searchText.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [activity, activeFilter, searchQuery]);

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense?.amount), 0);
    const totalIncome = walletTransactions
      .filter((txn) => INCOME_TYPES.has(normalizeLower(txn?.type)))
      .reduce((sum, txn) => sum + toNumber(txn?.amount), 0);

    const transferIds = new Set();
    walletTransactions.forEach((txn) => {
      const type = normalizeLower(txn?.type);
      if (!TRANSFER_OUT_TYPES.has(type) && !TRANSFER_IN_TYPES.has(type)) return;
      transferIds.add(String(txn?.transfer_group_id || txn?.id || `${txn?.wallet_id}-${txn?.created_at}`));
    });
    transfers.forEach((transfer) => {
      transferIds.add(String(transfer?.id || transfer?.transfer_group_id || `${transfer?.created_at}`));
    });

    return {
      totalExpenses,
      totalIncome,
      transferCount: transferIds.size,
      latestDate: activity[0]?.dateValue || null,
    };
  }, [activity, expenses, transfers, walletTransactions]);

  const handleRefresh = async () => {
    if (refreshing || typeof financial?.refreshData !== "function") return;

    try {
      setRefreshing(true);
      await financial.refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] px-4 py-6 text-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <div className="h-24 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] px-4 pb-28 pt-5 text-white md:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute right-[-120px] top-48 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-120px] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-5">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-cyan-400/10" />
          <div className="relative flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                Read-only hub
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Transaction Hub</h1>
              <p className="mt-1 text-sm text-white/65">All your money movement in one place.</p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label="Refresh transactions"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Total expenses</p>
            <p className="mt-2 text-lg font-bold text-rose-200">-{formatPeso(summary.totalExpenses)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Total income</p>
            <p className="mt-2 text-lg font-bold text-emerald-200">+{formatPeso(summary.totalIncome)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Transfers</p>
            <p className="mt-2 text-lg font-bold text-cyan-200">{summary.transferCount}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Latest</p>
            <p className="mt-2 truncate text-sm font-bold text-white/90">
              {summary.latestDate ? formatActivityDate(summary.latestDate) : "No activity"}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-3 backdrop-blur-2xl">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.14)]"
                      : "border-white/10 bg-black/20 text-white/65 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search category, wallet, notes, type, or amount"
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/40 focus:bg-black/30"
            />
          </div>
        </section>

        <section className="space-y-3">
          {!filteredActivity.length ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.055] p-8 text-center backdrop-blur-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                <Receipt className="h-7 w-7 text-white/40" />
              </div>
              <h2 className="mt-4 text-lg font-bold">No activity yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/55">
                Your transactions will appear here once you start using CLARA.
              </p>
            </div>
          ) : (
            filteredActivity.map((item) => {
              const Icon = getActivityIcon(item.group, item.type);
              const isNegative = item.signedAmount < 0;
              const isPositive = item.signedAmount > 0;

              return (
                <article
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/20 backdrop-blur-2xl transition duration-200 hover:bg-white/[0.075]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                        isNegative
                          ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                          : isPositive
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                            : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
                          <p className="mt-1 text-xs text-white/50">{formatActivityDate(item.dateValue)}</p>
                        </div>
                        <p
                          className={`shrink-0 text-sm font-black ${
                            isNegative ? "text-rose-200" : isPositive ? "text-emerald-200" : "text-cyan-200"
                          }`}
                        >
                          {formatSignedPeso(item.signedAmount)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                          {item.statusLabel}
                        </span>
                        {item.walletName ? (
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/65">
                            {item.walletName}
                          </span>
                        ) : null}
                        {item.category ? (
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-white/65">
                            {titleCase(item.category)}
                          </span>
                        ) : null}
                      </div>

                      {item.notes ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/55">{item.notes}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
