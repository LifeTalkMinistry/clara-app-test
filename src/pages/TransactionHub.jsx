import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  PiggyBank,
  Receipt,
  RefreshCw,
  Search,
  Tag,
  WalletCards,
} from "lucide-react";

import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

const FILTERS = [
  ["all", "All Transactions"],
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
  const sourceType = String(item.source_type || "").toLowerCase();

  if (type.includes("transfer") || sourceType.includes("transfer")) {
    return "transfer";
  }

  if (
    type.includes("saving") ||
    category.includes("saving") ||
    sourceType.includes("saving")
  ) {
    return "savings";
  }

  if (
    type.includes("income") ||
    type.includes("deposit") ||
    type.includes("credit") ||
    type.includes("add") ||
    sourceType.includes("income") ||
    sourceType.includes("deposit")
  ) {
    return "income";
  }

  if (
    type.includes("expense") ||
    type.includes("debit") ||
    type.includes("cashout") ||
    type.includes("withdraw") ||
    sourceType.includes("expense")
  ) {
    return "expense";
  }

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
      icon:
        "bg-cyan-400/12 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.16)]",
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

const startOfDay = (dateValue) => {
  const d = parseDate(dateValue);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (dateValue) => {
  const today = startOfDay(new Date());
  const target = startOfDay(dateValue);

  return Math.floor((today.getTime() - target.getTime()) / 86400000);
};

const getTimelineKey = (dateValue) => {
  const diff = daysBetween(dateValue);

  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff >= 2 && diff <= 6) return "thisWeek";

  return "earlier";
};

const TIMELINE_GROUPS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "earlier", label: "Earlier" },
];

function getTimelineStats(items) {
  const spent = items
    .filter((item) => item.group === "expense" || item.group === "savings")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  const income = items
    .filter((item) => item.group === "income")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  const total = income - spent;

  return {
    spent,
    income,
    total,
    count: items.length,
  };
}

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handleClick = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      onClose();
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ref, onClose]);
}

function GlassDropdown({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  onAfterChange,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find((item) => item.key === value) || options[0];

  useClickOutside(dropdownRef, () => setOpen(false));

  return (
    <div ref={dropdownRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex min-h-[50px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border px-4 text-left shadow-[0_16px_42px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-300 active:scale-[0.985] ${
          open
            ? "border-emerald-300/35 bg-emerald-400/12 shadow-[0_0_30px_rgba(52,211,153,0.13)]"
            : "border-white/10 bg-white/[0.055]"
        }`}
      >
        <span className="pointer-events-none absolute -right-8 -top-10 h-20 w-20 rounded-full bg-cyan-400/10 blur-2xl" />

        <span className="relative flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/20 text-emerald-100/75">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}

          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
              {label}
            </span>
            <span className="mt-0.5 block truncate text-sm font-black text-white/88">
              {selected?.label}
            </span>
          </span>
        </span>

        <ChevronDown
          className={`relative h-4 w-4 shrink-0 text-white/52 transition duration-300 ${
            open ? "rotate-180 text-emerald-100" : ""
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-30 grid overflow-hidden rounded-[24px] border border-white/10 bg-[#06101f]/95 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-300 ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="max-h-72 overflow-y-auto">
          <div className="p-2">
            {options.map((item) => {
              const active = item.key === value;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onChange(item.key);
                    onAfterChange?.();
                    setOpen(false);
                  }}
                  className={`flex min-h-[42px] w-full items-center justify-between rounded-[18px] px-3 text-left text-sm font-black transition duration-200 active:scale-[0.985] ${
                    active
                      ? "bg-emerald-400/14 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.12)]"
                      : "text-white/62 hover:bg-white/[0.055]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.7)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, helper, tone = "slate" }) {
  const toneClass =
    tone === "rose"
      ? "from-rose-500/16 text-rose-100 shadow-rose-500/10"
      : tone === "emerald"
        ? "from-emerald-400/16 text-emerald-100 shadow-emerald-500/10"
        : tone === "cyan"
          ? "from-cyan-400/16 text-cyan-100 shadow-cyan-500/10"
          : "from-white/10 text-white shadow-black/20";

  return (
    <div
      className={`relative min-h-[82px] overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br ${toneClass} via-white/[0.045] to-white/[0.025] p-3 shadow-[0_18px_46px_rgba(0,0,0,0.25)] backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/40">
        {label}
      </p>
      <p className="mt-2 truncate text-[clamp(15px,4.5vw,22px)] font-black tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-white/42">
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
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${toneClass}`}
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
    <article className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.032))] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-300 active:scale-[0.985]">
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-32 w-32 rounded-full ${tone.glow} blur-3xl`}
      />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className={`absolute left-0 top-5 h-10 w-1 rounded-r-full ${tone.rail}`} />

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border ${tone.border} ${tone.icon}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-black leading-tight text-white">
                {item.title}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-white/45">
                <span>
                  {item.category ? titleCase(item.category) : titleCase(item.group)}
                </span>

                {item.walletName ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <WalletCards className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.walletName}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className={`text-[13px] font-black leading-tight ${tone.amount}`}>
                {sign}
                {peso(Math.abs(item.signedAmount))}
              </p>
              <p className="mt-1 text-[9px] font-bold text-white/32">
                {formatTime(item.date)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <StatusBadge icon={Tag}>{titleCase(item.group)}</StatusBadge>

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
            <p className="mt-2.5 line-clamp-2 rounded-[16px] border border-white/10 bg-black/16 px-3 py-2 text-xs font-medium leading-5 text-white/52">
              {item.note}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TimelineDropdown({ group, items, isOpen, onToggle }) {
  const stats = getTimelineStats(items);
  const hasItems = items.length > 0;

  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border bg-white/[0.052] shadow-[0_18px_58px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-300 ${
        isOpen
          ? "border-emerald-300/24 shadow-[0_0_36px_rgba(52,211,153,0.1)]"
          : "border-white/10"
      }`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-28 w-28 rounded-full bg-cyan-400/8 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />

      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-center justify-between gap-3 p-3.5 text-left transition duration-200 active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[16px] font-black tracking-tight text-white">
              {group.label}
            </h2>
            <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/45">
              {stats.count}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 overflow-hidden">
            <span className="truncate text-xs font-black text-white/70">
              {stats.total >= 0 ? "+" : "-"}
              {peso(Math.abs(stats.total))}
            </span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-white/25" />
            <span className="truncate text-[11px] font-semibold text-white/38">
              Out {peso(stats.spent)} · In {peso(stats.income)}
            </span>
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border transition duration-300 ${
            isOpen
              ? "border-emerald-300/30 bg-emerald-400/14 text-emerald-50"
              : "border-white/10 bg-black/20 text-white/50"
          }`}
        >
          <ChevronDown
            className={`h-4.5 w-4.5 transition duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2.5 border-t border-white/10 p-3 pt-3.5">
            {hasItems ? (
              items.map((item) => <TransactionCard key={item.id} item={item} />)
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-black/16 px-4 py-4 text-center text-sm font-semibold text-white/42">
                Nothing here yet.
              </div>
            )}
          </div>
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
        <SkeletonBlock className="h-16 rounded-[26px]" />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((x) => (
            <SkeletonBlock key={x} className="h-20 rounded-[22px]" />
          ))}
        </div>

        {[1, 2, 3, 4].map((x) => (
          <SkeletonBlock key={x} className="h-20 rounded-[24px]" />
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
        <div className="relative w-full overflow-hidden rounded-[34px] border border-rose-300/15 bg-white/[0.055] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
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
  const [openGroup, setOpenGroup] = useState(null);

  const safeWallets = Array.isArray(financial.wallets) ? financial.wallets : [];
  const safeExpenses = Array.isArray(financial.expenses) ? financial.expenses : [];
  const safeWalletTransactions = Array.isArray(financial.walletTransactions)
    ? financial.walletTransactions
    : [];
  const safeTransfers = Array.isArray(financial.transfers) ? financial.transfers : [];

  const walletMap = useMemo(() => {
    const map = new Map();

    safeWallets.forEach((wallet) => {
      if (wallet?.id) map.set(String(wallet.id), wallet);
      if (wallet?.local_id) map.set(String(wallet.local_id), wallet);
      if (wallet?.localId) map.set(String(wallet.localId), wallet);
      if (wallet?.wallet_id) map.set(String(wallet.wallet_id), wallet);
      if (wallet?.walletId) map.set(String(wallet.walletId), wallet);
    });

    return map;
  }, [safeWallets]);

  const activity = useMemo(() => {
    const all = [...safeExpenses, ...safeWalletTransactions, ...safeTransfers];
    const seen = new Set();

    return all
      .map((item, index) => {
        const date =
          item.created_at ||
          item.createdAt ||
          item.date ||
          item.transaction_date ||
          item.transactionDate ||
          item.updated_at ||
          item.updatedAt ||
          new Date();

        const group = getGroup(item);

        const wallet =
          walletMap.get(String(item.wallet_id || "")) ||
          walletMap.get(String(item.walletId || "")) ||
          walletMap.get(String(item.from_wallet_id || "")) ||
          walletMap.get(String(item.fromWalletId || "")) ||
          walletMap.get(String(item.to_wallet_id || "")) ||
          walletMap.get(String(item.toWalletId || "")) ||
          walletMap.get(String(item.source_wallet_id || "")) ||
          walletMap.get(String(item.destination_wallet_id || ""));

        const fromWallet =
          walletMap.get(String(item.from_wallet_id || "")) ||
          walletMap.get(String(item.fromWalletId || "")) ||
          walletMap.get(String(item.source_wallet_id || ""));

        const toWallet =
          walletMap.get(String(item.to_wallet_id || "")) ||
          walletMap.get(String(item.toWalletId || "")) ||
          walletMap.get(String(item.destination_wallet_id || ""));

        const note = item.notes || item.note || item.description || "";
        const stableId =
          item.id ||
          item.local_id ||
          item.localId ||
          item.transaction_id ||
          item.transactionId ||
          `${group}-${date}-${item.amount}-${item.category || item.type || index}`;

        const dedupeKey = String(stableId);

        if (seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);

        const transferWalletLabel =
          group === "transfer" && (fromWallet || toWallet)
            ? `${fromWallet?.name || fromWallet?.wallet_name || "Wallet"} → ${
                toWallet?.name || toWallet?.wallet_name || "Wallet"
              }`
            : "";

        return {
          id: dedupeKey,
          raw: item,
          date,
          monthKey: dateKey(date),
          group,
          type: item.type || item.source_type || item.sourceType || group,
          title: titleCase(
            item.title ||
              item.name ||
              item.merchant ||
              item.category ||
              item.source_type ||
              item.sourceType ||
              item.type ||
              group
          ),
          category: item.category || item.source_type || item.sourceType || item.tag || "",
          walletName:
            transferWalletLabel ||
            wallet?.name ||
            wallet?.wallet_name ||
            wallet?.title ||
            "",
          amount: cleanNumber(item.amount),
          signedAmount: getSignedAmount(item),
          needType: item.need_type || item.needType || "",
          planningStatus:
            item.planning_status || item.planningStatus || item.status || "",
          note: isJsonLike(note) ? "" : String(note || "").trim(),
        };
      })
      .filter(Boolean)
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [safeExpenses, safeWalletTransactions, safeTransfers, walletMap]);

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
          formatDateOnly(item.date),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [monthlyActivity, filter, search]);

  const timelineGroups = useMemo(() => {
    const map = new Map(TIMELINE_GROUPS.map((item) => [item.key, []]));

    filtered.forEach((item) => {
      const key = getTimelineKey(item.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return TIMELINE_GROUPS.map((group) => ({
      ...group,
      items: map.get(group.key) || [],
    }));
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
    if (typeof financial.refreshData !== "function") return;

    try {
      setRefreshing(true);
      await financial.refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const monthOptions = useMemo(
    () => months.map((item) => ({ key: item.key, label: item.label })),
    [months]
  );

  const filterOptions = useMemo(
    () => FILTERS.map(([key, label]) => ({ key, label })),
    []
  );

  const selectedMonthLabel =
    months.find((item) => item.key === month)?.label || "This month";

  const hasOfflineReadyData =
    Boolean(activity.length) ||
    Boolean(safeWallets.length) ||
    Boolean(safeExpenses.length) ||
    Boolean(safeWalletTransactions.length) ||
    Boolean(safeTransfers.length);

  if (userLoading || financial.loading) {
    return <LoadingState />;
  }

  if (financial.error && !hasOfflineReadyData) {
    return (
      <ErrorState
        onBack={() => navigate("/dashboard")}
        onRefresh={refresh}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#020713] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(0.85rem+env(safe-area-inset-top))] text-white md:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute -bottom-20 -left-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-3.5">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-cyan-200/20 bg-cyan-100/10 text-white/85 shadow-[0_0_28px_rgba(34,211,238,0.13)] backdrop-blur-2xl transition duration-200 active:scale-[0.96]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[13px] font-black tracking-tight text-white/85">
              Transaction Hub
            </p>
            <p className="truncate text-[10px] font-semibold text-white/36">
              {selectedMonthLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || typeof financial.refreshData !== "function"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-cyan-200/20 bg-cyan-100/10 text-white/85 shadow-[0_0_28px_rgba(34,211,238,0.13)] backdrop-blur-2xl transition duration-200 disabled:opacity-45 active:scale-[0.96]"
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </header>

        <section className="grid grid-cols-2 gap-2">
          <GlassDropdown
            label="Month"
            icon={CalendarDays}
            value={month}
            options={monthOptions}
            onChange={setMonth}
            onAfterChange={() => setOpenGroup(null)}
          />

          <GlassDropdown
            label="Filter"
            icon={Receipt}
            value={filter}
            options={filterOptions}
            onChange={setFilter}
            onAfterChange={() => setOpenGroup(null)}
          />
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
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

        <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.052] p-2.5 shadow-[0_18px_58px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-20 -top-20 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOpenGroup(null);
              }}
              placeholder="Search transactions"
              className="min-h-[50px] w-full rounded-[20px] border border-white/10 bg-black/18 pl-11 pr-4 text-sm font-medium text-white outline-none transition duration-200 placeholder:text-white/30 focus:border-emerald-300/34 focus:bg-black/26 focus:shadow-[0_0_24px_rgba(52,211,153,0.1)]"
            />
          </div>
        </section>

        <section className="space-y-2.5">
          {!filtered.length ? (
            <div className="relative overflow-hidden rounded-[28px] border border-dashed border-emerald-300/18 bg-white/[0.055] p-7 text-center shadow-[0_22px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-emerald-400/12 blur-3xl" />
              <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border border-emerald-300/18 bg-emerald-400/10 shadow-[0_0_30px_rgba(52,211,153,0.14)]">
                <Receipt className="h-6 w-6 text-emerald-100/70" />
              </div>

              <h2 className="relative mt-4 text-lg font-black tracking-tight">
                No transactions yet
              </h2>

              <p className="relative mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-white/52">
                Start logging expenses and CLARA will organize your financial timeline here.
              </p>
            </div>
          ) : (
            timelineGroups.map((group) => (
              <TimelineDropdown
                key={group.key}
                group={group}
                items={group.items}
                isOpen={openGroup === group.key}
                onToggle={() =>
                  setOpenGroup((current) => (current === group.key ? null : group.key))
                }
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
