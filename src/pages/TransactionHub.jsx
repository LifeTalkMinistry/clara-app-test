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

const formatActivityDate = (value, compact = false) => {
  const date = parseDate(value);
  if (!date) return "No date";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: compact ? undefined : "numeric",
    minute: compact ? undefined : "2-digit",
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
  if (TRANSFER_OUT_TYPES.has(type) || TRANSFER_IN_TYPES.has(type) || type === "transfer") return "transfer";
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
  if (group === "transfer" || TRANSFER_OUT_TYPES.has(normalizedType) || TRANSFER_IN_TYPES.has(normalizedType)) return ArrowLeftRight;
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

const getMetricTone = (tone) => {
  const tones = {
    rose: "from-rose-500/13 via-white/[0.045] to-white/[0.025] text-rose-100 shadow-rose-500/10",
    emerald: "from-emerald-400/14 via-white/[0.045] to-white/[0.025] text-emerald-100 shadow-emerald-500/10",
    cyan: "from-cyan-400/14 via-white/[0.045] to-white/[0.025] text-cyan-100 shadow-cyan-500/10",
    slate: "from-white/10 via-white/[0.045] to-white/[0.025] text-white shadow-black/20",
  };
  return tones[tone] || tones.slate;
};

function MetricCard({ label, value, helper, tone = "slate" }) {
  return (
    <div className={`relative min-h-[96px] overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br ${getMetricTone(tone)} p-4 shadow-[0_20px_55px_rgba(0,0,0,0.20)] backdrop-blur-2xl`}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</p>
      <p className="mt-3 truncate text-[clamp(18px,5.2vw,25px)] font-black tracking-tight">{value}</p>
      {helper ? <p className="mt-1 truncate text-[11px] font-medium text-white/48">{helper}</p> : null}
    </div>
  );
}

export default function TransactionHub() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUserRole();
  const financial = useFinancialData(user);

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const expenses = Array.isArray(financial?.expenses) ? financial.expenses : [];
  const walletTransactions = Array.isArray(financial?.walletTransactions) ? financial.walletTransactions : [];
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
      <div className="min-h-[100dvh] bg-[#020713] px-4 py-6 text-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <div className="h-32 animate-pulse rounded-[30px] border border-white/10 bg-white/[0.055]" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.055]" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-[30px] border border-white/10 bg-white/[0.055]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#020713] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white md:px-6">
      <style>{`
        .transaction-hub-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .transaction-hub-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute -bottom-20 -left-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,19,0.2)_0%,rgba(2,7,19,0.88)_56%,rgba(2,7,19,1)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-5">
        <header className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,25,37,0.94),rgba(11,26,42,0.82)_50%,rgba(8,18,31,0.94))] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-emerald-300/16 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 top-4 h-44 w-44 rounded-full bg-cyan-300/12 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/45 to-transparent" />

          <div className="relative flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-black/20 text-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 pb-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.12)]">
                <Sparkles className="h-3.5 w-3.5" />
                Read-only hub
              </div>
              <h1 className="text-[clamp(26px,7vw,36px)] font-black leading-none tracking-tight">Transaction Hub</h1>
              <p className="mt-2 max-w-[240px] text-sm font-medium leading-6 text-white/64 sm:max-w-none">
                All your money movement in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-black/20 text-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition hover:bg-white/10 hover:text-white disabled:opacity-50 active:scale-95"
              aria-label="Refresh transactions"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Total Expenses" value={`-${formatPeso(summary.totalExpenses)}`} helper="Money out" tone="rose" />
          <MetricCard label="Total Income" value={`+${formatPeso(summary.totalIncome)}`} helper="Money in" tone="emerald" />
          <MetricCard label="Transfers" value={summary.transferCount} helper="Wallet moves" tone="cyan" />
          <MetricCard
            label="Latest"
            value={summary.latestDate ? formatActivityDate(summary.latestDate, true) : "None"}
            helper={summary.latestDate ? "Newest activity" : "No activity yet"}
            tone="slate"
          />
        </section>

        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.055] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full bg-cyan-300/8 blur-3xl" />
          <div className="transaction-hub-scrollbar relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`min-h-[42px] shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-[0.98] ${
                    active
                      ? "border-emerald-300/40 bg-emerald-400/16 text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.18)]"
                      : "border-white/10 bg-black/18 text-white/62 hover:border-white/18 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search category, wallet, notes, type, or amount"
              className="h-13 min-h-[54px] w-full rounded-[22px] border border-white/10 bg-black/20 pl-11 pr-4 text-[15px] font-medium text-white outline-none transition placeholder:text-white/34 focus:border-emerald-300/38 focus:bg-black/30 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.08)]"
            />
          </div>
        </section>

        <section className="space-y-3">
          {!filteredActivity.length ? (
            <div className="rounded-[30px] border border-dashed border-white/16 bg-white/[0.055] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-300/15 bg-emerald-400/10 shadow-[0_0_32px_rgba(16,185,129,0.12)]">
                <Receipt className="h-7 w-7 text-emerald-100/70" />
              </div>
              <h2 className="mt-4 text-xl font-black tracking-tight">No activity yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-white/55">
                Your transactions will appear here once you start using CLARA.
              </p>
            </div>
          ) : (
            filteredActivity.map((item) => {
              const Icon = getActivityIcon(item.group, item.type);
              const isNegative = item.signedAmount < 0;
              const isPositive = item.signedAmount > 0;
              const isNeutralTransfer = item.group === "transfer" && item.signedAmount === 0;
              const amountText = isNeutralTransfer ? formatPeso(item.amount) : formatSignedPeso(item.signedAmount);

              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-200 hover:border-white/16 hover:bg-white/[0.075]"
                >
                  <div className="pointer-events-none absolute -right-16 -top-20 h-32 w-32 rounded-full bg-white/8 blur-3xl transition group-hover:bg-emerald-300/10" />
                  <div className="relative flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border shadow-[0_14px_36px_rgba(0,0,0,0.20)] ${
                        isNegative
                          ? "border-rose-300/20 bg-rose-400/12 text-rose-100"
                          : isPositive
                            ? "border-emerald-300/20 bg-emerald-400/12 text-emerald-100"
                            : "border-cyan-300/20 bg-cyan-400/12 text-cyan-100"
                      }`}
                    >
                      <Icon className="h-5.5 w-5.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[15px] font-black leading-5 text-white">{item.title}</h3>
                          <p className="mt-1 text-xs font-medium text-white/48">{formatActivityDate(item.dateValue)}</p>
                        </div>
                        <p
                          className={`shrink-0 text-right text-[15px] font-black leading-5 ${
                            isNegative ? "text-rose-100" : isPositive ? "text-emerald-100" : "text-cyan-100"
                          }`}
                        >
                          {amountText}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-black/22 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white/60">
                          {item.statusLabel}
                        </span>
                        {item.walletName ? (
                          <span className="max-w-full truncate rounded-full border border-white/10 bg-black/22 px-2.5 py-1 text-[11px] font-semibold text-white/64">
                            {item.walletName}
                          </span>
                        ) : null}
                        {item.category ? (
                          <span className="rounded-full border border-white/10 bg-black/22 px-2.5 py-1 text-[11px] font-semibold text-white/64">
                            {titleCase(item.category)}
                          </span>
                        ) : null}
                      </div>

                      {item.notes ? <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-white/52">{item.notes}</p> : null}
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
