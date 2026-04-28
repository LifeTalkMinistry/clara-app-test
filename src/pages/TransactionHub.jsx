import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  PiggyBank,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  WalletCards,
} from "lucide-react";

import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";
import {
  getLocalExpenses,
  getPendingExpenses,
  isClaraOnline,
} from "@/lib/clara-offline-finance";

const FILTERS = [
  ["all", "All"],
  ["expense", "Expenses"],
  ["income", "Income"],
  ["transfer", "Transfers"],
  ["savings", "Savings"],
  ["wallet", "Wallet"],
];

const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const cleanNumber = (value) => {
  const n = Number(String(value ?? "0").replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const dateKey = (value) => {
  const d = parseDate(value);
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
};

const formatTime = (value) =>
  parseDate(value).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });

const formatDateOnly = (value) =>
  parseDate(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const titleCase = (value) =>
  String(value || "Transaction")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const isJsonLike = (value) => {
  const text = String(value || "").trim();
  return (
    text.startsWith("{") ||
    text.startsWith("[") ||
    /"[\w-]+"\s*:/.test(text) ||
    /previous_balance|budget_category|wallet_id/i.test(text)
  );
};

const getLast12Months = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleDateString("en-PH", {
        month: "short",
        year: "numeric",
      }),
    };
  });
};

const getGroup = (item) => {
  const type = String(item.type || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();

  if (type.includes("transfer")) return "transfer";
  if (type.includes("saving") || category.includes("saving")) return "savings";
  if (
    type.includes("income") ||
    type.includes("deposit") ||
    type.includes("credit") ||
    type.includes("add")
  )
    return "income";
  if (
    type.includes("expense") ||
    type.includes("debit") ||
    type.includes("cashout") ||
    type.includes("withdraw")
  )
    return "expense";

  return "wallet";
};

const getSignedAmount = (item) => {
  const group = getGroup(item);
  const amount = Math.abs(cleanNumber(item.amount));

  if (group === "expense" || group === "savings") return -amount;
  if (group === "income") return amount;

  return cleanNumber(item.amount);
};

const getIcon = (group) => {
  if (group === "expense") return ArrowUpRight;
  if (group === "income") return ArrowDownLeft;
  if (group === "transfer") return ArrowLeftRight;
  if (group === "savings") return PiggyBank;
  return WalletCards;
};

const getToneClasses = (group, signedAmount = 0) => {
  if (group === "expense") {
    return {
      glow: "bg-rose-400/14",
      border: "border-rose-300/20",
      icon: "bg-rose-400/12 text-rose-100 shadow-[0_0_28px_rgba(251,113,133,0.14)]",
      amount: "text-rose-100",
      rail: "bg-rose-300/45",
    };
  }

  if (group === "income") {
    return {
      glow: "bg-emerald-400/14",
      border: "border-emerald-300/20",
      icon:
        "bg-emerald-400/12 text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.16)]",
      amount: "text-emerald-100",
      rail: "bg-emerald-300/45",
    };
  }

  if (group === "transfer") {
    return {
      glow: "bg-cyan-400/14",
      border: "border-cyan-300/20",
      icon: "bg-cyan-400/12 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.16)]",
      amount: "text-cyan-100",
      rail: "bg-cyan-300/45",
    };
  }

  if (group === "savings") {
    return {
      glow: "bg-violet-400/14",
      border: "border-violet-300/20",
      icon:
        "bg-violet-400/12 text-violet-100 shadow-[0_0_28px_rgba(167,139,250,0.14)]",
      amount: "text-violet-100",
      rail: "bg-violet-300/45",
    };
  }

  return {
    glow: signedAmount >= 0 ? "bg-cyan-400/10" : "bg-rose-400/10",
    border: "border-white/10",
    icon: "bg-white/10 text-white/80",
    amount: signedAmount >= 0 ? "text-white" : "text-rose-100",
    rail: "bg-white/25",
  };
};

function SummaryCard({ label, value, helper, tone = "slate" }) {
  const toneClass =
    tone === "rose"
      ? "from-rose-500/18 text-rose-100 shadow-rose-500/10"
      : tone === "emerald"
        ? "from-emerald-400/18 text-emerald-100 shadow-emerald-500/10"
        : tone === "cyan"
          ? "from-cyan-400/18 text-cyan-100 shadow-cyan-500/10"
          : "from-white/10 text-white shadow-black/20";

  return (
    <div
      className={`relative min-h-[106px] overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br ${toneClass} via-white/[0.05] to-white/[0.025] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
        {label}
      </p>
      <p className="mt-3 truncate text-[clamp(18px,5vw,25px)] font-black tracking-tight">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] font-medium text-white/48">
        {helper}
      </p>
    </div>
  );
}

function StatusBadge({ children, icon: Icon = CircleDot, tone = "neutral" }) {
  const toneClass =
    tone === "good"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-50/80"
      : tone === "warn"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-50/80"
        : tone === "bad"
          ? "border-rose-300/20 bg-rose-400/10 text-rose-50/80"
          : "border-white/10 bg-black/22 text-white/60";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${toneClass}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function TransactionCard({ item }) {
  const Icon = getIcon(item.group);
  const tone = getToneClasses(item.group, item.signedAmount);
  const sign = item.signedAmount > 0 ? "+" : item.signedAmount < 0 ? "-" : "";

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.085),rgba(255,255,255,0.035))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition duration-300 active:scale-[0.985]">
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-36 w-36 rounded-full ${tone.glow} blur-3xl transition duration-300 group-active:opacity-100`}
      />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className={`absolute left-0 top-6 h-14 w-1 rounded-r-full ${tone.rail}`} />

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border ${tone.border} ${tone.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-black leading-tight text-white">
                {item.title}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-white/48">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatTime(item.date)}
                </span>

                {item.walletName ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <WalletCards className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.walletName}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className={`text-[15px] font-black leading-tight ${tone.amount}`}>
                {sign}
                {peso(Math.abs(item.signedAmount))}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/34">
                {titleCase(item.group)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge icon={Tag}>
              {item.category ? titleCase(item.category) : titleCase(item.group)}
            </StatusBadge>

            {item.needType ? (
              <StatusBadge
                tone={String(item.needType).toLowerCase() === "need" ? "good" : "warn"}
              >
                {titleCase(item.needType)}
              </StatusBadge>
            ) : null}

            {item.planningStatus ? (
              <StatusBadge
                icon={CheckCircle2}
                tone={
                  String(item.planningStatus).toLowerCase().includes("planned")
                    ? "good"
                    : "warn"
                }
              >
                {titleCase(item.planningStatus)}
              </StatusBadge>
            ) : null}
          </div>

          {item.note ? (
            <p className="mt-3 line-clamp-2 rounded-[18px] border border-white/10 bg-black/16 px-3 py-2 text-sm font-medium leading-6 text-white/55">
              {item.note}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden border border-white/10 bg-white/[0.055] backdrop-blur-2xl ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#020713] px-4 pb-28 pt-6 text-white">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl space-y-4">
        <SkeletonBlock className="h-36 rounded-[32px]" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((x) => (
            <SkeletonBlock key={x} className="h-24 rounded-[26px]" />
          ))}
        </div>

        <SkeletonBlock className="h-28 rounded-[30px]" />

        {[1, 2, 3].map((x) => (
          <SkeletonBlock key={x} className="h-28 rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onBack, onRefresh }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#020713] px-4 py-6 text-white">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-rose-400/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-36 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[80dvh] max-w-lg items-center">
        <div className="w-full overflow-hidden rounded-[34px] border border-rose-300/15 bg-white/[0.055] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-rose-300/20 bg-rose-400/10">
            <AlertTriangle className="h-7 w-7 text-rose-100" />
          </div>

          <h2 className="mt-5 text-2xl font-black tracking-tight">
            Transaction history could not load
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-white/55">
            CLARA could not prepare your activity timeline right now. Your finance data
            was not changed.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[48px] rounded-[20px] border border-white/10 bg-black/20 text-sm font-black text-white/75 transition duration-200 active:scale-[0.98]"
            >
              Back
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="min-h-[48px] rounded-[20px] border border-emerald-300/25 bg-emerald-400/14 text-sm font-black text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.14)] transition duration-200 active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionHub() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUserRole();
  const financial = useFinancialData(user);

  const months = useMemo(() => getLast12Months(), []);
  const [month, setMonth] = useState(() => months[0]?.key);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [localExpenses, setLocalExpenses] = useState([]);
  const [online, setOnline] = useState(() => isClaraOnline());

  const ownerKey = user?.id || user?.email || "guest";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncOnline = () => setOnline(isClaraOnline());
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    syncOnline();

    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [saved] = await Promise.all([
          getLocalExpenses(ownerKey),
          getPendingExpenses(ownerKey),
        ]);
        if (active) setLocalExpenses(Array.isArray(saved) ? saved : []);
      } catch {
        if (active) setLocalExpenses([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [ownerKey]);

  const walletMap = useMemo(() => {
    const map = new Map();
    (financial.wallets || []).forEach((wallet) => {
      if (wallet?.id) map.set(String(wallet.id), wallet);
    });
    return map;
  }, [financial.wallets]);

  const activity = useMemo(() => {
    const all = [
      ...(financial.expenses || []),
      ...localExpenses,
      ...(financial.walletTransactions || []),
      ...(financial.transfers || []),
    ];

    return all
      .map((item, index) => {
        const date = item.created_at || item.date || item.updated_at || new Date();
        const group = getGroup(item);
        const wallet =
          walletMap.get(String(item.wallet_id || "")) ||
          walletMap.get(String(item.from_wallet_id || "")) ||
          walletMap.get(String(item.to_wallet_id || ""));

        const note = item.notes || item.note || item.description || "";

        return {
          id: item.id || item.local_id || `${date}-${index}`,
          raw: item,
          date,
          monthKey: dateKey(date),
          group,
          type: item.type || group,
          title: titleCase(
            item.title ||
              item.name ||
              item.merchant ||
              item.category ||
              item.source_type ||
              item.type ||
              group
          ),
          category: item.category || item.source_type || item.tag || "",
          walletName: wallet?.name || wallet?.wallet_name || wallet?.title || "",
          amount: cleanNumber(item.amount),
          signedAmount: getSignedAmount(item),
          needType: item.need_type || item.needType || "",
          planningStatus:
            item.planning_status || item.planningStatus || item.status || "",
          note: isJsonLike(note) ? "" : String(note || "").trim(),
        };
      })
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [financial, localExpenses, walletMap]);

  const monthlyActivity = useMemo(
    () => activity.filter((item) => item.monthKey === month),
    [activity, month]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return monthlyActivity.filter((item) => {
      const matchesFilter = filter === "all" || item.group === filter;
      const matchesSearch =
        !q ||
        [
          item.title,
          item.category,
          item.walletName,
          item.type,
          item.note,
          item.needType,
          item.planningStatus,
          item.amount,
          item.signedAmount,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [monthlyActivity, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map();

    filtered.forEach((item) => {
      const key = formatDateOnly(item.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return Array.from(map.entries());
  }, [filtered]);

  const summary = useMemo(() => {
    const moneyOut = monthlyActivity
      .filter((item) => item.group === "expense")
      .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

    const moneyIn = monthlyActivity
      .filter((item) => item.group === "income")
      .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

    return {
      moneyOut,
      moneyIn,
      netFlow: moneyIn - moneyOut,
      count: filtered.length,
    };
  }, [monthlyActivity, filtered.length]);

  const refresh = async () => {
    if (!online || typeof financial.refreshData !== "function") return;

    try {
      setRefreshing(true);
      await financial.refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const selectedMonthLabel =
    months.find((item) => item.key === month)?.label || "This month";

  if (userLoading || financial.loading) {
    return <LoadingState />;
  }

  if (financial.error) {
    return (
      <ErrorState
        onBack={() => navigate("/dashboard")}
        onRefresh={() => {
          if (typeof financial.refreshData === "function") financial.refreshData();
        }}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#020713] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white md:px-6">
      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute -bottom-20 -left-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-5">
        <header className="relative overflow-hidden rounded-[32px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(7,23,36,0.96),rgba(12,34,52,0.84)_48%,rgba(11,19,43,0.96))] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-emerald-300/16 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 top-4 h-44 w-44 rounded-full bg-cyan-300/12 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />

          <div className="relative flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-cyan-200/20 bg-cyan-100/10 text-white/85 shadow-[0_0_28px_rgba(34,211,238,0.13)] transition duration-200 active:scale-[0.96]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/22 bg-emerald-400/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.12)]">
                <Sparkles className="h-3.5 w-3.5" />
                Financial Timeline
              </div>

              <h1 className="text-[clamp(28px,7vw,38px)] font-black leading-none tracking-tight">
                Transaction Hub
              </h1>

              <p className="mt-2 max-w-[270px] text-sm font-medium leading-6 text-white/64 sm:max-w-none">
                {selectedMonthLabel} · {filtered.length} transaction
                {filtered.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={refreshing || !online}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-cyan-200/20 bg-cyan-100/10 text-white/85 shadow-[0_0_28px_rgba(34,211,238,0.13)] transition duration-200 disabled:opacity-45 active:scale-[0.96]"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.055] p-3 shadow-[0_22px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.18em] text-white/40">
            <CalendarDays className="h-4 w-4 text-emerald-100/60" />
            12-month tracker
          </div>

          <div className="no-scrollbar relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {months.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMonth(item.key)}
                className={`min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-black transition duration-200 active:scale-[0.98] ${
                  month === item.key
                    ? "border-emerald-300/45 bg-emerald-400/18 text-emerald-50 shadow-[0_0_28px_rgba(52,211,153,0.2)]"
                    : "border-white/10 bg-black/18 text-white/58"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            label="Money Out"
            value={`-${peso(summary.moneyOut)}`}
            helper="Monthly expenses"
            tone="rose"
          />
          <SummaryCard
            label="Money In"
            value={`+${peso(summary.moneyIn)}`}
            helper="Monthly income"
            tone="emerald"
          />
          <SummaryCard
            label="Net Flow"
            value={`${summary.netFlow >= 0 ? "+" : "-"}${peso(
              Math.abs(summary.netFlow)
            )}`}
            helper={summary.netFlow >= 0 ? "Positive month" : "Needs attention"}
            tone={summary.netFlow >= 0 ? "emerald" : "rose"}
          />
          <SummaryCard
            label="Shown"
            value={summary.count}
            helper="Current view"
            tone="cyan"
          />
        </section>

        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.055] p-3 shadow-[0_22px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-20 -top-20 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="no-scrollbar relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[42px] shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition duration-200 active:scale-[0.98] ${
                  filter === key
                    ? "border-cyan-300/40 bg-cyan-400/16 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                    : "border-white/10 bg-black/18 text-white/62"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, category, wallet, note, or amount"
              className="min-h-[54px] w-full rounded-[22px] border border-white/10 bg-black/20 pl-11 pr-4 text-[15px] font-medium text-white outline-none transition duration-200 placeholder:text-white/34 focus:border-emerald-300/38 focus:bg-black/28 focus:shadow-[0_0_24px_rgba(52,211,153,0.1)]"
            />
          </div>
        </section>

        <section className="space-y-5">
          {!filtered.length ? (
            <div className="relative overflow-hidden rounded-[30px] border border-dashed border-emerald-300/18 bg-white/[0.055] p-8 text-center shadow-[0_22px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-emerald-400/12 blur-3xl" />
              <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-300/18 bg-emerald-400/10 shadow-[0_0_30px_rgba(52,211,153,0.14)]">
                <Receipt className="h-7 w-7 text-emerald-100/70" />
              </div>

              <h2 className="relative mt-4 text-xl font-black tracking-tight">
                No transactions yet
              </h2>

              <p className="relative mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-white/55">
                Start by logging your first expense. CLARA will organize your activity
                here.
              </p>
            </div>
          ) : (
            grouped.map(([date, items]) => (
              <div key={date} className="space-y-3">
                <div className="sticky top-3 z-20 inline-flex rounded-full border border-cyan-200/14 bg-[#07111f]/88 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/64 shadow-[0_12px_32px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
                  {date}
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <TransactionCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
