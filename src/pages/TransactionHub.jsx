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
  Edit3,
  Flame,
  PiggyBank,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  TrendingUp,
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

const DEFAULT_THEME = {
  primary:
    "border-[color:var(--clara-theme-border,rgba(52,211,153,0.28))] bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.12))] text-[color:var(--clara-theme-text,rgba(236,253,245,0.92))]",
  primaryText: "text-[color:var(--clara-theme-text,rgba(236,253,245,0.9))]",
  border: "border-[color:var(--clara-theme-border,rgba(52,211,153,0.24))]",
  glow:
    "shadow-[0_0_28px_var(--clara-theme-glow,rgba(52,211,153,0.14))]",
  glowSoft:
    "shadow-[0_0_36px_var(--clara-theme-glow,rgba(52,211,153,0.1))]",
  orb: "bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.12))]",
  focus:
    "focus:border-[color:var(--clara-theme-border,rgba(52,211,153,0.34))] focus:shadow-[0_0_24px_var(--clara-theme-glow,rgba(52,211,153,0.1))]",
};

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

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const parseDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (!hasValue(value)) return new Date();

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const monthKey = (value) => {
  const d = parseDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

const isDeletedRecord = (item) =>
  Boolean(
    item?.deletedAt ||
      item?.deleted_at ||
      item?.isDeleted ||
      item?.is_deleted ||
      normalizeText(item?.status) === "deleted"
  );

const getFirstValue = (item, keys = []) => {
  for (const key of keys) {
    if (hasValue(item?.[key])) return item[key];
  }
  return "";
};

const getLast12Months = () => {
  const now = new Date();

  return Array.from({ length: 12 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - index, 1);

    return {
      key: monthKey(d),
      label: d.toLocaleDateString("en-PH", {
        month: "short",
        year: "numeric",
      }),
    };
  });
};

const getGroup = (item) => {
  if (item?.__activityGroup) return item.__activityGroup;

  const type = normalizeText(item?.type);
  const category = normalizeText(item?.category);
  const sourceType = normalizeText(item?.source_type || item?.sourceType);

  if (type.includes("transfer") || sourceType.includes("transfer")) {
    return "transfer";
  }

  if (
    type.includes("saving") ||
    category.includes("saving") ||
    sourceType.includes("saving") ||
    type.includes("emergency") ||
    category.includes("emergency") ||
    sourceType.includes("emergency")
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

const isLinkedExpenseWalletTransaction = (item) => {
  const type = normalizeText(item?.type);
  const sourceType = normalizeText(item?.source_type || item?.sourceType);

  return (
    type === "expense" ||
    sourceType === "expense" ||
    hasValue(item?.expense_id) ||
    hasValue(item?.expenseId)
  );
};

const getStableDedupeKey = (item, group, source, fallback) => {
  const expenseId = getFirstValue(item, ["expense_id", "expenseId"]);
  if (expenseId) return `expense:${expenseId}`;

  const transferId = getFirstValue(item, [
    "transfer_group_id",
    "transferGroupId",
    "transfer_id",
    "transferId",
  ]);
  if (transferId) return `transfer:${transferId}`;

  const savingsId = getFirstValue(item, [
    "savings_transaction_id",
    "savingsTransactionId",
    "savings_goal_id",
    "savingsGoalId",
  ]);
  if (savingsId) return `savings:${savingsId}`;

  const emergencyId = getFirstValue(item, [
    "emergency_fund_transaction_id",
    "emergencyFundTransactionId",
    "emergency_fund_id",
    "emergencyFundId",
  ]);
  if (emergencyId) return `emergency:${emergencyId}`;

  const transactionId = getFirstValue(item, [
    "transaction_id",
    "transactionId",
    "wallet_transaction_id",
    "walletTransactionId",
  ]);
  if (transactionId) return `${group}:transaction:${transactionId}`;

  const localId = getFirstValue(item, ["local_id", "localId"]);
  if (localId) return `${group}:local:${localId}`;

  const id = getFirstValue(item, ["id"]);
  if (id) return `${group}:${source}:id:${id}`;

  return fallback;
};

const getSignedAmountByGroup = (group, amount) => {
  const safeAmount = Math.abs(cleanNumber(amount));

  if (group === "expense") return -safeAmount;
  if (group === "savings") return -safeAmount;
  if (group === "income") return safeAmount;
  if (group === "transfer") return 0;

  return cleanNumber(amount);
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
      glow:
        "bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.14))]",
      border:
        "border-[color:var(--clara-theme-border,rgba(52,211,153,0.2))]",
      icon:
        "bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.12))] text-[color:var(--clara-theme-text,rgba(236,253,245,0.92))] shadow-[0_0_28px_var(--clara-theme-glow,rgba(52,211,153,0.16))]",
      amount: "text-[color:var(--clara-theme-text,rgba(236,253,245,0.92))]",
      rail: "bg-[color:var(--clara-theme-line,rgba(52,211,153,0.45))]",
    };
  }

  if (group === "transfer") {
    return {
      glow:
        "bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.14))]",
      border:
        "border-[color:var(--clara-theme-secondary-border,rgba(34,211,238,0.2))]",
      icon:
        "bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.12))] text-cyan-100 shadow-[0_0_28px_var(--clara-theme-secondary-glow,rgba(34,211,238,0.16))]",
      amount: "text-cyan-100",
      rail: "bg-[color:var(--clara-theme-secondary-line,rgba(34,211,238,0.45))]",
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
    glow:
      signedAmount >= 0
        ? "bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.1))]"
        : "bg-rose-400/10",
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

const getBudgetCategory = (item) =>
  normalizeText(
    item?.category || item?.budget_category || item?.name || item?.title
  );

const getBudgetAmount = (budget) =>
  cleanNumber(
    budget?.allocated_amount ||
      budget?.allocatedAmount ||
      budget?.amount ||
      budget?.limit ||
      budget?.budget ||
      budget?.target_amount ||
      budget?.targetAmount
  );

const getBudgetMonthKey = (budget) => {
  const explicitMonth =
    budget?.month ||
    budget?.month_key ||
    budget?.monthKey ||
    budget?.period ||
    budget?.budget_month ||
    budget?.budgetMonth;

  if (hasValue(explicitMonth)) {
    const text = String(explicitMonth).trim();
    if (/^\d{4}-\d{2}$/.test(text)) return text;
    return monthKey(text);
  }

  const date =
    budget?.range_start ||
    budget?.rangeStart ||
    budget?.start_date ||
    budget?.startDate ||
    budget?.created_at ||
    budget?.createdAt ||
    new Date();

  return monthKey(date);
};

function getTimelineStats(items) {
  const expenses = items
    .filter((item) => item.group === "expense")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  const savings = items
    .filter((item) => item.group === "savings")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  const income = items
    .filter((item) => item.group === "income")
    .reduce((sum, item) => sum + Math.abs(item.signedAmount), 0);

  return {
    spent: expenses + savings,
    income,
    total: income - expenses - savings,
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
  theme = DEFAULT_THEME,
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
            ? `${theme.border} ${theme.orb} ${theme.glow}`
            : "border-white/10 bg-white/[0.055]"
        }`}
      >
        <span
          className={`pointer-events-none absolute -right-8 -top-10 h-20 w-20 rounded-full ${theme.orb} blur-2xl`}
        />

        <span className="relative flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/20 ${theme.primaryText}`}
            >
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
            open ? `rotate-180 ${theme.primaryText}` : ""
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
                      ? `${theme.orb} ${theme.primaryText} ${theme.glow}`
                      : "text-white/62 hover:bg-white/[0.055]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span
                      className={`h-2 w-2 rounded-full ${theme.orb} ${theme.glow}`}
                    />
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
        ? "from-[color:var(--clara-theme-soft,rgba(52,211,153,0.16))] text-[color:var(--clara-theme-text,rgba(236,253,245,0.92))] shadow-[var(--clara-theme-glow,rgba(52,211,153,0.1))]"
        : tone === "cyan"
          ? "from-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.16))] text-cyan-100 shadow-cyan-500/10"
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
      ? "border-[color:var(--clara-theme-border,rgba(52,211,153,0.2))] bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.1))] text-[color:var(--clara-theme-text,rgba(236,253,245,0.8))]"
      : tone === "warn"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-50/80"
        : tone === "bad"
          ? "border-rose-300/20 bg-rose-400/10 text-rose-50/80"
          : tone === "info"
            ? "border-[color:var(--clara-theme-secondary-border,rgba(34,211,238,0.2))] bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.1))] text-cyan-50/80"
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

function InsightCard({ insight, theme = DEFAULT_THEME }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[24px] border ${theme.border} bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.07))] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.24)] backdrop-blur-2xl`}
    >
      <div
        className={`pointer-events-none absolute -right-14 -top-16 h-32 w-32 rounded-full ${theme.orb} blur-3xl`}
      />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-28 w-28 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.1))] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border ${theme.border} ${theme.orb} ${theme.primaryText} ${theme.glow}`}
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0">
          <p
            className={`text-[9px] font-black uppercase tracking-[0.18em] ${theme.primaryText} opacity-55`}
          >
            CLARA Insight
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-white/72">
            {insight}
          </p>
        </div>
      </div>
    </section>
  );
}

function TransactionCard({ item, onEdit }) {
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

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.(item);
        }}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[13px] border border-white/10 bg-black/24 text-white/58 shadow-[0_10px_28px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition duration-200 hover:bg-white/[0.08] hover:text-white active:scale-[0.94]"
        aria-label={`Edit ${item.title}`}
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>

      <div className="relative flex items-start gap-3 pr-8">
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
                {peso(Math.abs(item.signedAmount || item.amount))}
              </p>
              <p className="mt-1 text-[9px] font-bold text-white/32">
                {formatTime(item.date)}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <StatusBadge icon={Tag}>{titleCase(item.group)}</StatusBadge>

            {item.group === "expense" && item.budgetStatus ? (
              <StatusBadge
                icon={CheckCircle2}
                tone={item.budgetStatus === "planned" ? "good" : "warn"}
              >
                {item.budgetStatus === "planned" ? "Planned" : "Unplanned"}
              </StatusBadge>
            ) : null}

            {item.isBudgetRisk ? (
              <StatusBadge icon={ShieldAlert} tone="bad">
                Budget Risk
              </StatusBadge>
            ) : null}

            {item.isGoodDecision ? (
              <StatusBadge icon={CheckCircle2} tone="good">
                Good Decision
              </StatusBadge>
            ) : null}

            {item.isFrequent ? (
              <StatusBadge icon={Flame} tone="warn">
                Frequent
              </StatusBadge>
            ) : null}

            {item.isHighSpend ? (
              <StatusBadge icon={TrendingUp} tone="bad">
                High Spend
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

function TimelineDropdown({ group, items, isOpen, onToggle, onEdit, theme = DEFAULT_THEME }) {
  const stats = getTimelineStats(items);
  const hasItems = items.length > 0;

  return (
    <article
      className={`relative overflow-hidden rounded-[24px] border bg-white/[0.052] shadow-[0_18px_58px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-300 ${
        isOpen ? `${theme.border} ${theme.glowSoft}` : "border-white/10"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full ${theme.orb} blur-3xl`}
      />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-28 w-28 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.08))] blur-3xl" />
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
              ? `${theme.border} ${theme.orb} ${theme.primaryText}`
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
              items.map((item) => (
                <TransactionCard key={item.id} item={item} onEdit={onEdit} />
              ))
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
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.12))] blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.12))] blur-3xl" />
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
      <div className="pointer-events-none absolute -right-28 top-36 h-72 w-72 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.1))] blur-3xl" />

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
              className="min-h-[48px] rounded-[20px] border border-[color:var(--clara-theme-border,rgba(52,211,153,0.25))] bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.14))] text-sm font-black text-[color:var(--clara-theme-text,rgba(236,253,245,0.92))] shadow-[0_0_24px_var(--clara-theme-glow,rgba(52,211,153,0.14))] transition duration-200 active:scale-[0.98]"
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

  const theme = DEFAULT_THEME;

  const months = useMemo(() => getLast12Months(), []);
  const [month, setMonth] = useState(() => months[0]?.key || monthKey(new Date()));
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [notice, setNotice] = useState("");

  const safeWallets = Array.isArray(financial.wallets) ? financial.wallets : [];
  const safeExpenses = Array.isArray(financial.expenses) ? financial.expenses : [];
  const safeWalletTransactions = Array.isArray(financial.walletTransactions)
    ? financial.walletTransactions
    : [];
  const safeTransfers = Array.isArray(financial.transfers) ? financial.transfers : [];
  const safeBudgets = Array.isArray(financial.budgets) ? financial.budgets : [];
  const safeSavingsTransactions = Array.isArray(financial.savingsTransactions)
    ? financial.savingsTransactions
    : [];
  const safeEmergencyTransactions = Array.isArray(financial.emergencyFundTransactions)
    ? financial.emergencyFundTransactions
    : [];

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

  const budgetMap = useMemo(() => {
    const map = new Map();

    safeBudgets
      .filter((item) => !isDeletedRecord(item))
      .forEach((budget) => {
        const category = getBudgetCategory(budget);
        if (!category) return;

        const key = `${getBudgetMonthKey(budget)}:${category}`;
        const current = map.get(key) || {
          category,
          monthKey: getBudgetMonthKey(budget),
          allocated: 0,
        };

        current.allocated += getBudgetAmount(budget);
        map.set(key, current);
      });

    return map;
  }, [safeBudgets]);

  const activityBase = useMemo(() => {
    const visibleSources = [
      ...safeExpenses
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "expense",
          __activitySource: "expense",
        })),

      ...safeWalletTransactions
        .filter((item) => !isDeletedRecord(item))
        .filter((item) => !isLinkedExpenseWalletTransaction(item))
        .filter((item) => {
          const group = getGroup(item);
          return group === "income" || group === "savings" || group === "wallet";
        })
        .map((item) => ({
          ...item,
          __activityGroup: getGroup(item),
          __activitySource: "wallet_transaction",
        })),

      ...safeTransfers
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "transfer",
          __activitySource: "transfer",
        })),

      ...safeSavingsTransactions
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "savings",
          __activitySource: "savings",
        })),

      ...safeEmergencyTransactions
        .filter((item) => !isDeletedRecord(item))
        .map((item) => ({
          ...item,
          __activityGroup: "savings",
          __activitySource: "emergency_fund",
        })),
    ];

    const seen = new Set();

    return visibleSources
      .map((item, index) => {
        const date =
          item.created_at ||
          item.createdAt ||
          item.date ||
          item.transaction_date ||
          item.transactionDate ||
          item.paid_at ||
          item.paidAt ||
          item.logged_at ||
          item.loggedAt ||
          item.updated_at ||
          item.updatedAt ||
          new Date();

        const group = getGroup(item);
        const source = item.__activitySource || "source";

        const wallet =
          walletMap.get(String(item.wallet_id || "")) ||
          walletMap.get(String(item.walletId || "")) ||
          walletMap.get(String(item.from_wallet_id || "")) ||
          walletMap.get(String(item.fromWalletId || "")) ||
          walletMap.get(String(item.to_wallet_id || "")) ||
          walletMap.get(String(item.toWalletId || "")) ||
          walletMap.get(String(item.source_wallet_id || "")) ||
          walletMap.get(String(item.sourceWalletId || "")) ||
          walletMap.get(String(item.destination_wallet_id || "")) ||
          walletMap.get(String(item.destinationWalletId || ""));

        const fromWallet =
          walletMap.get(String(item.from_wallet_id || "")) ||
          walletMap.get(String(item.fromWalletId || "")) ||
          walletMap.get(String(item.source_wallet_id || "")) ||
          walletMap.get(String(item.sourceWalletId || ""));

        const toWallet =
          walletMap.get(String(item.to_wallet_id || "")) ||
          walletMap.get(String(item.toWalletId || "")) ||
          walletMap.get(String(item.destination_wallet_id || "")) ||
          walletMap.get(String(item.destinationWalletId || ""));

        const note = item.notes || item.note || item.description || item.memo || "";
        const amount = Math.abs(cleanNumber(item.amount || item.value || item.total));
        const signedAmount = getSignedAmountByGroup(group, amount);

        const fallbackKey = `${group}:${source}:${monthKey(date)}:${parseDate(
          date
        ).getTime()}:${amount}:${item.category || item.type || index}`;

        const dedupeKey = getStableDedupeKey(item, group, source, fallbackKey);

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
          monthKey: monthKey(date),
          group,
          type: item.type || item.source_type || item.sourceType || group,
          title: titleCase(
            item.title ||
              item.name ||
              item.merchant ||
              item.payee ||
              item.category ||
              item.source_type ||
              item.sourceType ||
              item.type ||
              group
          ),
          category:
            item.category || item.budget_category || item.budgetCategory || item.tag || "",
          walletName:
            transferWalletLabel ||
            wallet?.name ||
            wallet?.wallet_name ||
            wallet?.title ||
            "",
          amount,
          signedAmount,
          note: isJsonLike(note) ? "" : String(note || "").trim(),
        };
      })
      .filter(Boolean)
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [
    safeExpenses,
    safeWalletTransactions,
    safeTransfers,
    safeSavingsTransactions,
    safeEmergencyTransactions,
    walletMap,
  ]);

  const activity = useMemo(() => {
    const monthlyCategoryStats = new Map();

    activityBase
      .filter((item) => item.group === "expense")
      .forEach((item) => {
        const category = normalizeText(item.category || "uncategorized");
        const key = `${item.monthKey}:${category}`;
        const current = monthlyCategoryStats.get(key) || {
          count: 0,
          total: 0,
          amounts: [],
        };

        current.count += 1;
        current.total += Math.abs(item.amount);
        current.amounts.push(Math.abs(item.amount));
        monthlyCategoryStats.set(key, current);
      });

    const monthlyCategorySpend = new Map();

    return activityBase.map((item) => {
      const category = normalizeText(item.category || "uncategorized");
      const categoryKey = `${item.monthKey}:${category}`;
      const budget = budgetMap.get(categoryKey);
      const categoryStats = monthlyCategoryStats.get(categoryKey) || {
        count: 0,
        total: 0,
        amounts: [],
      };

      const previousSpend = monthlyCategorySpend.get(categoryKey) || 0;
      const nextSpend = previousSpend + Math.abs(item.amount);
      if (item.group === "expense") monthlyCategorySpend.set(categoryKey, nextSpend);

      const budgetStatus =
        item.group === "expense" && budget?.allocated > 0 ? "planned" : "unplanned";

      const averageAmount =
        categoryStats.count > 0 ? categoryStats.total / categoryStats.count : 0;

      const significantAmount = Math.max(
        500,
        cleanNumber(budget?.allocated) * 0.25,
        averageAmount * 1.5
      );

      const isBudgetRisk =
        item.group === "expense" &&
        budgetStatus === "unplanned" &&
        Math.abs(item.amount) >= significantAmount;

      const isGoodDecision =
        item.group === "expense" &&
        budgetStatus === "planned" &&
        budget?.allocated > 0 &&
        nextSpend <= budget.allocated;

      const isFrequent = item.group === "expense" && categoryStats.count >= 3;

      const isHighSpend =
        item.group === "expense" &&
        categoryStats.count >= 3 &&
        averageAmount > 0 &&
        Math.abs(item.amount) > averageAmount * 1.5;

      const enhanced = {
        ...item,
        budgetStatus,
        budgetLimit: budget?.allocated || 0,
        budgetCategorySpend: nextSpend,
        isBudgetRisk,
        isGoodDecision,
        isFrequent,
        isHighSpend,
      };

      return {
        ...enhanced,
        searchText: [
          enhanced.title,
          enhanced.category,
          enhanced.walletName,
          enhanced.note,
          enhanced.type,
          enhanced.group,
          enhanced.budgetStatus,
          enhanced.isBudgetRisk ? "budget risk" : "",
          enhanced.isGoodDecision ? "good decision" : "",
          enhanced.isFrequent ? "frequent" : "",
          enhanced.isHighSpend ? "high spend" : "",
          enhanced.amount,
          enhanced.signedAmount,
          peso(enhanced.amount),
          formatDateOnly(enhanced.date),
          formatTime(enhanced.date),
        ]
          .join(" ")
          .toLowerCase(),
      };
    });
  }, [activityBase, budgetMap]);

  const monthlyActivity = useMemo(
    () => activity.filter((item) => item.monthKey === month),
    [activity, month]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return monthlyActivity.filter((item) => {
      const matchesFilter = filter === "all" || item.group === filter;
      const matchesSearch = !q || item.searchText.includes(q);

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

    const plannedCount = monthlyActivity.filter(
      (item) => item.group === "expense" && item.budgetStatus === "planned"
    ).length;

    const unplannedCount = monthlyActivity.filter(
      (item) => item.group === "expense" && item.budgetStatus === "unplanned"
    ).length;

    const budgetRiskCount = monthlyActivity.filter((item) => item.isBudgetRisk).length;
    const frequentCount = monthlyActivity.filter((item) => item.isFrequent).length;
    const highSpendCount = monthlyActivity.filter((item) => item.isHighSpend).length;

    let insight = "Your timeline looks stable. Keep your spending connected to your plan.";

    if (budgetRiskCount > 0) {
      insight =
        "Some spending is outside your budget plan. Review it before it becomes a pattern.";
    } else if (frequentCount > 0 || highSpendCount > 0) {
      insight =
        "This category is appearing often. Check if your budget still matches your real behavior.";
    } else if (plannedCount > 0 && unplannedCount === 0) {
      insight = "Your planned expenses are staying aligned this month.";
    }

    return {
      moneyOut,
      moneyIn,
      netFlow: moneyIn - moneyOut,
      count: filtered.length,
      plannedCount,
      unplannedCount,
      budgetRiskCount,
      insight,
    };
  }, [monthlyActivity, filtered.length]);

  const hasOfflineReadyData =
    Boolean(activity.length) ||
    Boolean(safeWallets.length) ||
    Boolean(safeExpenses.length) ||
    Boolean(safeWalletTransactions.length) ||
    Boolean(safeTransfers.length) ||
    Boolean(safeBudgets.length) ||
    Boolean(safeSavingsTransactions.length) ||
    Boolean(safeEmergencyTransactions.length);

  const refresh = async () => {
    if (typeof financial.refreshData !== "function") return;

    try {
      setRefreshing(true);
      await financial.refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditTransaction = (item) => {
    if (!item) return;

    const rawId =
      item.raw?.id ||
      item.raw?.local_id ||
      item.raw?.localId ||
      item.raw?.transaction_id ||
      item.raw?.transactionId ||
      "";

    if (item.group === "expense") {
      if (rawId) {
        navigate(`/edit-expense/${rawId}`);
        return;
      }

      setNotice("Editing for this transaction type is coming soon.");
      return;
    }

    if (item.group === "income") {
      if (typeof financial.updateWalletTransaction === "function") {
        setNotice("Income editing is ready in the data layer. Add the edit form route next.");
        return;
      }

      setNotice("Editing for this transaction type is coming soon.");
      return;
    }

    if (item.group === "transfer") {
      setNotice("Editing for this transaction type is coming soon.");
      return;
    }

    if (item.group === "savings") {
      setNotice("Editing for this transaction type is coming soon.");
      return;
    }

    setNotice("Editing for this transaction type is coming soon.");
  };

  useEffect(() => {
    if (!notice) return undefined;

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [notice]);

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

  if ((userLoading || financial.loading) && !hasOfflineReadyData) {
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
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#020713] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white md:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[color:var(--clara-theme-soft,rgba(52,211,153,0.12))] blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.12))] blur-3xl" />
        <div className="absolute -bottom-20 -left-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-3.5">
        <header className="flex items-center justify-between gap-3 px-1 pt-1">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${theme.border} ${theme.orb} text-white/85 ${theme.glow} backdrop-blur-2xl transition duration-200 active:scale-[0.96]`}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 px-2 text-center">
            <p className="text-[13px] font-black tracking-tight text-white/85">
              Transaction Hub
            </p>
            <p className="mt-0.5 whitespace-nowrap text-[10px] font-semibold text-white/42">
              {selectedMonthLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || typeof financial.refreshData !== "function"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${theme.border} ${theme.orb} text-white/85 ${theme.glow} backdrop-blur-2xl transition duration-200 disabled:opacity-45 active:scale-[0.96]`}
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </header>

        {notice ? (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.065] px-4 py-3 text-xs font-semibold leading-5 text-white/68 shadow-[0_16px_42px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
            {notice}
          </div>
        ) : null}

        {financial.error && hasOfflineReadyData ? (
          <div className="rounded-[20px] border border-amber-300/15 bg-amber-400/8 px-4 py-3 text-xs font-semibold leading-5 text-amber-50/70">
            Offline data is visible. Live refresh could not complete.
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-2">
          <GlassDropdown
            label="Month"
            icon={CalendarDays}
            value={month}
            options={monthOptions}
            onChange={setMonth}
            onAfterChange={() => setOpenGroup(null)}
            theme={theme}
          />

          <GlassDropdown
            label="Filter"
            icon={Receipt}
            value={filter}
            options={filterOptions}
            onChange={setFilter}
            onAfterChange={() => setOpenGroup(null)}
            theme={theme}
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

        <InsightCard insight={summary.insight} theme={theme} />

        <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.052] p-2.5 shadow-[0_18px_58px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-20 -top-20 h-36 w-36 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.1))] blur-3xl" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOpenGroup(null);
              }}
              placeholder="Search transactions"
              className={`min-h-[50px] w-full rounded-[20px] border border-white/10 bg-black/[0.28] pl-11 pr-4 text-sm font-medium text-white shadow-inner shadow-black/20 outline-none backdrop-blur-2xl transition duration-200 placeholder:text-white/32 focus:bg-black/[0.34] ${theme.focus}`}
            />
          </div>
        </section>

        <section className="space-y-2.5">
          {!filtered.length ? (
            <div className={`relative overflow-hidden rounded-[28px] border border-dashed ${theme.border} bg-white/[0.055] p-7 text-center shadow-[0_22px_70px_rgba(0,0,0,0.26)] backdrop-blur-2xl`}>
              <div
                className={`pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full ${theme.orb} blur-3xl`}
              />
              <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(34,211,238,0.1))] blur-3xl" />

              <div
                className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] border ${theme.border} ${theme.orb} ${theme.glow}`}
              >
                <Receipt className={`h-6 w-6 ${theme.primaryText} opacity-75`} />
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
                onEdit={handleEditTransaction}
                theme={theme}
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
