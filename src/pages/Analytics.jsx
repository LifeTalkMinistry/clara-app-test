import { useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Lock, Zap } from "lucide-react";
import PageHeader from "../components/PageHeader";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";

const COLORS = [
  "hsl(145,60%,36%)",
  "hsl(45,95%,51%)",
  "hsl(210,78%,52%)",
  "hsl(160,50%,42%)",
  "hsl(30,80%,55%)",
  "hsl(280,60%,50%)",
  "hsl(0,70%,55%)",
  "hsl(190,60%,45%)",
];

const ALL_TIMEFRAMES = [
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_3", label: "Last 3 Mo" },
  { id: "last_6", label: "Last 6 Mo" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

const FREE_ALLOWED = ["this_month", "last_month", "last_3"];

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

const TOOLTIP_STYLE = {
  borderRadius: "12px",
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#fff",
};

const AXIS_LINE_STYLE = { stroke: "rgba(255,255,255,0.08)" };
const TICK_STYLE = { fontSize: 11, fill: "#94a3b8" };

const SPENDING_TYPE_META = [
  {
    label: "Needs",
    key: "needsSpent",
    color: "bg-primary",
    textColor: "text-primary",
  },
  {
    label: "Wants",
    key: "wantsSpent",
    color: "bg-secondary",
    textColor: "text-secondary",
  },
  {
    label: "Savings",
    key: "savingsSpent",
    color: "bg-accent",
    textColor: "text-accent",
  },
];

function normalizeString(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isOwnedByUser(item, user) {
  if (!user || !item) return false;

  const userId = String(user?.id ?? "").trim();
  const userEmail = normalizeString(user?.email);

  const itemIds = [item?.user_id, item?.owner_id, item?.profile_id]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  const itemEmails = [
    item?.created_by,
    item?.user_email,
    item?.owner_email,
    item?.email,
  ]
    .map(normalizeString)
    .filter(Boolean);

  if (userId && itemIds.includes(userId)) return true;
  if (userEmail && itemEmails.includes(userEmail)) return true;

  return false;
}

function getDateRange(timeframe, customStart, customEnd) {
  const now = new Date();

  switch (timeframe) {
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case "last_3":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case "last_6":
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      return {
        start: customStart ? new Date(customStart) : startOfMonth(now),
        end: customEnd ? new Date(customEnd) : endOfMonth(now),
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function safeDate(value) {
  if (!value) return null;

  try {
    const parsed = typeof value === "string" ? parseISO(value) : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isInRange(value, start, end) {
  const parsed = safeDate(value);
  if (!parsed) return false;
  return isWithinInterval(parsed, { start, end });
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getExpenseNeedType(expense) {
  return normalizeText(
    expense?.need_type ||
      expense?.needType ||
      expense?.type ||
      expense?.classification ||
      expense?.bucket
  );
}

function getExpenseCategory(expense) {
  return (
    expense?.category ||
    expense?.budgetCategory ||
    expense?.classification ||
    expense?.type ||
    "Uncategorized"
  );
}

function getWalletKey(item) {
  return String(item?.wallet_id || item?.walletId || item?.wallet || "");
}

function getItemDate(item) {
  return item?.date || item?.created_at || item?.timestamp || null;
}

function getWalletTransactionType(item) {
  return normalizeText(item?.type || item?.transaction_type || item?.kind);
}

function getWalletBalance(wallet) {
  return toNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.amount ??
      0
  );
}

function mapWalletTransactionIncome(item) {
  return {
    ...item,
    amount: toNumber(item?.amount),
    wallet_id: item?.wallet_id || item?.walletId || item?.wallet || null,
    date: item?.date || item?.created_at || item?.timestamp || null,
    __source: "wallet_transaction_income",
  };
}

function addToMap(map, key, value) {
  map.set(key, (map.get(key) || 0) + value);
}

function incrementMap(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

export default function Analytics() {
  const { user, isFree } = useUserRole();
  const rawData = useFinancialData(user);

  const [timeframe, setTimeframe] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fmt = useCallback((n) => CURRENCY_FORMATTER.format(Number(n || 0)), []);

  const availableTimeframes = useMemo(() => {
    return ALL_TIMEFRAMES.map((item) => ({
      ...item,
      locked: isFree ? !FREE_ALLOWED.includes(item.id) : false,
    }));
  }, [isFree]);

  const activeTimeframe = useMemo(() => {
    return isFree && !FREE_ALLOWED.includes(timeframe) ? "this_month" : timeframe;
  }, [isFree, timeframe]);

  const { start, end } = useMemo(
    () => getDateRange(activeTimeframe, customStart, customEnd),
    [activeTimeframe, customStart, customEnd]
  );

  const data = useMemo(() => {
    const wallets = [];
    const expenses = [];
    const incomes = [];
    const walletTransactions = [];
    const transfers = [];

    const rawWallets = rawData?.wallets || [];
    const rawExpenses = rawData?.expenses || [];
    const rawIncomes = rawData?.incomes || [];
    const rawWalletTransactions = rawData?.walletTransactions || [];
    const rawTransfers = rawData?.transfers || [];

    for (let i = 0; i < rawWallets.length; i += 1) {
      const item = rawWallets[i];
      if (isOwnedByUser(item, user)) wallets.push(item);
    }

    for (let i = 0; i < rawExpenses.length; i += 1) {
      const item = rawExpenses[i];
      if (isOwnedByUser(item, user)) expenses.push(item);
    }

    for (let i = 0; i < rawIncomes.length; i += 1) {
      const item = rawIncomes[i];
      if (isOwnedByUser(item, user)) incomes.push(item);
    }

    for (let i = 0; i < rawWalletTransactions.length; i += 1) {
      const item = rawWalletTransactions[i];
      if (isOwnedByUser(item, user)) walletTransactions.push(item);
    }

    for (let i = 0; i < rawTransfers.length; i += 1) {
      const item = rawTransfers[i];
      if (isOwnedByUser(item, user)) transfers.push(item);
    }

    return {
      wallets,
      expenses,
      incomes,
      walletTransactions,
      transfers,
      loading: rawData?.loading,
    };
  }, [rawData, user]);

  const analytics = useMemo(() => {
    const filteredExpenses = [];
    const filteredIncomes = [];
    const filteredWalletTransactions = [];
    const filteredTransfers = [];

    for (let i = 0; i < data.expenses.length; i += 1) {
      const item = data.expenses[i];
      if (isInRange(getItemDate(item), start, end)) filteredExpenses.push(item);
    }

    for (let i = 0; i < data.incomes.length; i += 1) {
      const item = data.incomes[i];
      if (isInRange(getItemDate(item), start, end)) filteredIncomes.push(item);
    }

    for (let i = 0; i < data.walletTransactions.length; i += 1) {
      const item = data.walletTransactions[i];
      if (isInRange(getItemDate(item), start, end)) filteredWalletTransactions.push(item);
    }

    for (let i = 0; i < data.transfers.length; i += 1) {
      const item = data.transfers[i];
      if (isInRange(getItemDate(item), start, end)) filteredTransfers.push(item);
    }

    const fallbackIncomeTransactions = [];
    for (let i = 0; i < filteredWalletTransactions.length; i += 1) {
      const item = filteredWalletTransactions[i];
      const type = getWalletTransactionType(item);
      if (type === "add" || type === "income") {
        fallbackIncomeTransactions.push(mapWalletTransactionIncome(item));
      }
    }

    const effectiveIncomes =
      filteredIncomes.length > 0 ? filteredIncomes : fallbackIncomeTransactions;

    let totalIncome = 0;
    for (let i = 0; i < effectiveIncomes.length; i += 1) {
      totalIncome += toNumber(effectiveIncomes[i]?.amount);
    }

    let totalExpenses = 0;
    let needsSpent = 0;
    let wantsSpent = 0;
    let savingsSpent = 0;
    let largestExpense = null;

    const monthlyMap = new Map();
    const categoryTotalsMap = new Map();
    const categoryCountMap = new Map();

    const walletIncomeMap = new Map();
    const walletExpenseMap = new Map();
    const walletSavingsMovedMap = new Map();
    const walletTransferOutMap = new Map();
    const walletTransferInMap = new Map();
    const walletTxCountMap = new Map();

    for (let i = 0; i < effectiveIncomes.length; i += 1) {
      const item = effectiveIncomes[i];
      const amount = toNumber(item?.amount);
      const date = safeDate(getItemDate(item));
      const walletId = getWalletKey(item);

      if (date) {
        const month = format(date, "yyyy-MM");
        const existing = monthlyMap.get(month) || { month, income: 0, expenses: 0 };
        existing.income += amount;
        monthlyMap.set(month, existing);
      }

      if (walletId) {
        addToMap(walletIncomeMap, walletId, amount);
      }
    }

    for (let i = 0; i < filteredExpenses.length; i += 1) {
      const item = filteredExpenses[i];
      const amount = toNumber(item?.amount);
      const needType = getExpenseNeedType(item);
      const category = getExpenseCategory(item);
      const date = safeDate(getItemDate(item));
      const walletId = getWalletKey(item);

      totalExpenses += amount;

      if (needType === "need") needsSpent += amount;
      if (needType === "want") wantsSpent += amount;
      if (needType === "savings") savingsSpent += amount;

      addToMap(categoryTotalsMap, category, amount);
      incrementMap(categoryCountMap, category);

      if (!largestExpense || amount > toNumber(largestExpense?.amount)) {
        largestExpense = item;
      }

      if (date) {
        const month = format(date, "yyyy-MM");
        const existing = monthlyMap.get(month) || { month, income: 0, expenses: 0 };
        existing.expenses += amount;
        monthlyMap.set(month, existing);
      }

      if (walletId) {
        addToMap(walletExpenseMap, walletId, amount);
        incrementMap(walletTxCountMap, walletId);
      }
    }

    for (let i = 0; i < filteredWalletTransactions.length; i += 1) {
      const item = filteredWalletTransactions[i];
      const amount = toNumber(item?.amount);
      const type = getWalletTransactionType(item);
      const walletId = String(item?.wallet_id || "");

      if (walletId) {
        incrementMap(walletTxCountMap, walletId);

        if (type === "savings_transfer" || type === "savings") {
          addToMap(walletSavingsMovedMap, walletId, amount);
        }
      }
    }

    for (let i = 0; i < filteredTransfers.length; i += 1) {
      const item = filteredTransfers[i];
      const amount = toNumber(item?.amount);
      const type = normalizeText(item?.type);
      const walletId = String(item?.wallet_id || "");

      if (walletId) {
        incrementMap(walletTxCountMap, walletId);

        if (type === "transfer_out") {
          addToMap(walletTransferOutMap, walletId, amount);
        } else if (type === "transfer_in") {
          addToMap(walletTransferInMap, walletId, amount);
        }
      }
    }

    for (let i = 0; i < effectiveIncomes.length; i += 1) {
      const walletId = getWalletKey(effectiveIncomes[i]);
      if (walletId) {
        incrementMap(walletTxCountMap, walletId);
      }
    }

    const monthlyData = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    const categoryBreakdown = Array.from(categoryTotalsMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        pct: totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const topCategory = Array.from(categoryTotalsMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const mostFrequent = Array.from(categoryCountMap.entries()).sort((a, b) => b[1] - a[1])[0];

    const walletAnalytics = data.wallets.map((wallet) => {
      const walletId = String(wallet?.id || "");

      const received =
        (walletIncomeMap.get(walletId) || 0) + (walletTransferInMap.get(walletId) || 0);

      const spent =
        (walletExpenseMap.get(walletId) || 0) + (walletTransferOutMap.get(walletId) || 0);

      return {
        ...wallet,
        balance: getWalletBalance(wallet),
        received,
        spent,
        savingsMoved: walletSavingsMovedMap.get(walletId) || 0,
        txCount: walletTxCountMap.get(walletId) || 0,
      };
    });

    return {
      filteredExpenses,
      filteredIncomes,
      filteredWalletTransactions,
      filteredTransfers,
      fallbackIncomeTransactions,
      effectiveIncomes,
      totalIncome,
      totalExpenses,
      needsSpent,
      wantsSpent,
      savingsSpent,
      monthlyData,
      categoryBreakdown,
      largestExpense,
      topCategory,
      mostFrequent,
      walletAnalytics,
    };
  }, [data, start, end]);

  const handleTimeframeChange = useCallback((nextTimeframe, locked) => {
    if (!locked) {
      setTimeframe(nextTimeframe);
    }
  }, []);

  const handleCustomStartChange = useCallback((e) => {
    setCustomStart(e.target.value);
  }, []);

  const handleCustomEndChange = useCallback((e) => {
    setCustomEnd(e.target.value);
  }, []);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader title="Analytics" subtitle="Your complete financial picture" />

      <div className="grad-card rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Timeframe
          </p>

          {isFree && (
            <span className="ml-auto text-[10px] bg-secondary/20 text-secondary px-2 py-0.5 rounded-full font-bold">
              Free: up to 3 months
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {availableTimeframes.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleTimeframeChange(opt.id, opt.locked)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                opt.locked
                  ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
                  : activeTimeframe === opt.id
                  ? "grad-green text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {opt.label}
              {opt.locked && <Lock className="w-3 h-3" />}
            </button>
          ))}
        </div>

        {activeTimeframe === "custom" && (
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={customStart}
                onChange={handleCustomStartChange}
                className="mt-1 h-8 text-sm clara-input"
              />
            </div>

            <div className="flex-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={handleCustomEndChange}
                className="mt-1 h-8 text-sm clara-input"
              />
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-2">
          {format(start, "MMM d, yyyy")} — {format(end, "MMM d, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="grad-green rounded-2xl p-3 text-center card-glow-green">
          <p className="text-[10px] text-green-100 font-semibold uppercase">Income</p>
          <p className="font-heading font-bold text-white text-lg leading-tight mt-1">
            {fmt(analytics.totalIncome)}
          </p>
        </div>

        <div className="grad-yellow rounded-2xl p-3 text-center card-glow-yellow">
          <p className="text-[10px] text-secondary-foreground/70 font-semibold uppercase">
            Expenses
          </p>
          <p className="font-heading font-bold text-secondary-foreground text-lg leading-tight mt-1">
            {fmt(analytics.totalExpenses)}
          </p>
        </div>
      </div>

      {analytics.filteredExpenses.length > 0 && (
        <div className="grad-card rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Spending Intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {analytics.topCategory && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Top Spending Category</span>
                <span className="font-bold text-sm capitalize text-white">
                  {analytics.topCategory[0]} · {fmt(analytics.topCategory[1])}
                </span>
              </div>
            )}

            {analytics.largestExpense && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Largest Single Expense</span>
                <span className="font-bold text-sm capitalize text-white">
                  {getExpenseCategory(analytics.largestExpense)} ·{" "}
                  {fmt(analytics.largestExpense.amount)}
                </span>
              </div>
            )}

            {analytics.mostFrequent && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Most Frequent Category</span>
                <span className="font-bold text-sm capitalize text-white">
                  {analytics.mostFrequent[0]} ({analytics.mostFrequent[1]}x)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
              <span className="text-sm text-muted-foreground">Avg. per Transaction</span>
              <span className="font-bold text-sm text-white">
                {fmt(
                  analytics.filteredExpenses.length > 0
                    ? analytics.totalExpenses / analytics.filteredExpenses.length
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-5 bg-muted/80 rounded-2xl p-1">
          <TabsTrigger value="income" className="text-xs rounded-xl">
            Income
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs rounded-xl">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="retention" className="text-xs rounded-xl">
            Trend
          </TabsTrigger>
          <TabsTrigger value="wallets" className="text-xs rounded-xl">
            Wallets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          {analytics.monthlyData.length > 0 ? (
            <div className="grad-card rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Monthly Income Trend
              </p>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.monthlyData}>
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => v.substring(5)}
                    tick={TICK_STYLE}
                    axisLine={AXIS_LINE_STYLE}
                    tickLine={AXIS_LINE_STYLE}
                  />
                  <YAxis
                    tick={TICK_STYLE}
                    axisLine={AXIS_LINE_STYLE}
                    tickLine={AXIS_LINE_STYLE}
                  />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(145,60%,36%)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="Income"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No income data for this period
            </p>
          )}
        </TabsContent>

        <TabsContent value="expenses">
          <div className="space-y-4">
            <div className="grad-card rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Spending Type
              </p>

              {SPENDING_TYPE_META.map((item) => {
                const value = analytics[item.key];
                const width =
                  analytics.totalExpenses > 0
                    ? Math.min((value / analytics.totalExpenses) * 100, 100)
                    : 0;

                return (
                  <div key={item.label} className="mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium text-white">{item.label}</span>
                      <span className={`text-sm font-bold ${item.textColor}`}>{fmt(value)}</span>
                    </div>

                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full progress-bar`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {analytics.categoryBreakdown.length > 0 && (
              <div className="grad-card rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  By Category
                </p>

                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {analytics.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="retention">
          {analytics.monthlyData.length > 0 ? (
            <div className="grad-card rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Income vs Expenses
              </p>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.monthlyData} barGap={4}>
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => v.substring(5)}
                    tick={TICK_STYLE}
                    axisLine={AXIS_LINE_STYLE}
                    tickLine={AXIS_LINE_STYLE}
                  />
                  <YAxis
                    tick={TICK_STYLE}
                    axisLine={AXIS_LINE_STYLE}
                    tickLine={AXIS_LINE_STYLE}
                  />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Bar
                    dataKey="income"
                    fill="hsl(145,60%,36%)"
                    radius={[6, 6, 0, 0]}
                    name="Income"
                  />
                  <Bar
                    dataKey="expenses"
                    fill="hsl(45,95%,51%)"
                    radius={[6, 6, 0, 0]}
                    name="Expenses"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No data for this period
            </p>
          )}
        </TabsContent>

        <TabsContent value="wallets">
          {analytics.walletAnalytics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No wallets found</p>
          ) : (
            <div className="space-y-3">
              {analytics.walletAnalytics.map((wallet, i) => (
                <div key={wallet?.id || i} className="grad-card rounded-2xl p-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <p className="font-medium text-white">{wallet.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current Balance: {fmt(wallet.balance)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{wallet.txCount} transactions</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-primary/10 rounded-xl p-2.5 text-center border border-primary/15">
                      <p className="text-[10px] text-muted-foreground">Received</p>
                      <p className="text-sm font-bold text-primary">{fmt(wallet.received)}</p>
                    </div>

                    <div className="bg-secondary/10 rounded-xl p-2.5 text-center border border-secondary/20">
                      <p className="text-[10px] text-muted-foreground">Spent</p>
                      <p className="text-sm font-bold text-secondary">{fmt(wallet.spent)}</p>
                    </div>

                    <div className="bg-accent/10 rounded-xl p-2.5 text-center border border-accent/20">
                      <p className="text-[10px] text-muted-foreground">To Savings</p>
                      <p className="text-sm font-bold text-accent">{fmt(wallet.savingsMoved)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}