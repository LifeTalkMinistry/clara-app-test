import { useState, useMemo } from "react";
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

function filterByRange(items, start, end, customDateGetter) {
  return items.filter((item) => {
    const rawValue = customDateGetter ? customDateGetter(item) : item?.date;
    const parsed = safeDate(rawValue);
    if (!parsed) return false;

    return isWithinInterval(parsed, { start, end });
  });
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

export default function Analytics() {
  const { user, isFree } = useUserRole();
  const data = useFinancialData(user?.email);

  const [timeframe, setTimeframe] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));

  const FREE_ALLOWED = ["this_month", "last_month", "last_3"];

  const availableTimeframes = isFree
    ? ALL_TIMEFRAMES.map((item) => ({
        ...item,
        locked: !FREE_ALLOWED.includes(item.id),
      }))
    : ALL_TIMEFRAMES.map((item) => ({ ...item, locked: false }));

  const activeTimeframe =
    isFree && !FREE_ALLOWED.includes(timeframe) ? "this_month" : timeframe;

  const { start, end } = useMemo(
    () => getDateRange(activeTimeframe, customStart, customEnd),
    [activeTimeframe, customStart, customEnd]
  );

  const filteredExpenses = useMemo(
    () => filterByRange(data.expenses || [], start, end, (item) => item?.date),
    [data.expenses, start, end]
  );

  const filteredIncomes = useMemo(
    () => filterByRange(data.incomes || [], start, end, (item) => item?.date),
    [data.incomes, start, end]
  );

  const filteredWalletTransactions = useMemo(
    () =>
      filterByRange(
        data.walletTransactions || [],
        start,
        end,
        (item) => item?.date
      ),
    [data.walletTransactions, start, end]
  );

  const totalIncome = filteredIncomes.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  );

  const needsSpent = filteredExpenses
    .filter((e) => getExpenseNeedType(e) === "need")
    .reduce((sum, e) => sum + toNumber(e.amount), 0);

  const wantsSpent = filteredExpenses
    .filter((e) => getExpenseNeedType(e) === "want")
    .reduce((sum, e) => sum + toNumber(e.amount), 0);

  const savingsSpent = filteredExpenses
    .filter((e) => getExpenseNeedType(e) === "savings")
    .reduce((sum, e) => sum + toNumber(e.amount), 0);

  const monthlyData = useMemo(() => {
    const map = {};

    filteredIncomes.forEach((item) => {
      const date = safeDate(item?.date);
      if (!date) return;

      const month = format(date, "yyyy-MM");
      if (!map[month]) {
        map[month] = { month, income: 0, expenses: 0 };
      }

      map[month].income += toNumber(item.amount);
    });

    filteredExpenses.forEach((item) => {
      const date = safeDate(item?.date);
      if (!date) return;

      const month = format(date, "yyyy-MM");
      if (!map[month]) {
        map[month] = { month, income: 0, expenses: 0 };
      }

      map[month].expenses += toNumber(item.amount);
    });

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredExpenses, filteredIncomes]);

  const categoryBreakdown = useMemo(() => {
    const map = {};

    filteredExpenses.forEach((item) => {
      const key = getExpenseCategory(item);
      if (!map[key]) map[key] = 0;
      map[key] += toNumber(item.amount);
    });

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        pct: totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, totalExpenses]);

  const categoryTotals = {};
  const categoryCount = {};
  let largestExpense = null;

  filteredExpenses.forEach((item) => {
    const category = getExpenseCategory(item);

    categoryTotals[category] =
      (categoryTotals[category] || 0) + toNumber(item.amount);
    categoryCount[category] = (categoryCount[category] || 0) + 1;

    if (
      !largestExpense ||
      toNumber(item.amount) > toNumber(largestExpense.amount)
    ) {
      largestExpense = item;
    }
  });

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const mostFrequent = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];

  const walletAnalytics = useMemo(() => {
    return (data.wallets || []).map((wallet) => {
      const walletId = String(wallet?.id || "");
      const walletIncome = filteredIncomes
        .filter((item) => getWalletKey(item) === walletId)
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

      const walletExpense = filteredExpenses
        .filter((item) => getWalletKey(item) === walletId)
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

      const walletSavingsTransferOut = filteredWalletTransactions
        .filter(
          (item) => String(item?.wallet_id || "") === walletId && item?.type === "savings_transfer"
        )
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

      const walletTransfers = filteredWalletTransactions.filter(
        (item) =>
          String(item?.wallet_id || "") === walletId && item?.type === "transfer"
      );

      const txCount =
        filteredExpenses.filter((item) => getWalletKey(item) === walletId).length +
        filteredIncomes.filter((item) => getWalletKey(item) === walletId).length +
        walletTransfers.length +
        filteredWalletTransactions.filter(
          (item) =>
            String(item?.wallet_id || "") === walletId &&
            item?.type === "savings_transfer"
        ).length;

      return {
        ...wallet,
        received: walletIncome,
        spent: walletExpense,
        savingsMoved: walletSavingsTransferOut,
        txCount,
      };
    });
  }, [data.wallets, filteredExpenses, filteredIncomes, filteredWalletTransactions]);

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
              onClick={() => !opt.locked && setTimeframe(opt.id)}
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
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1 h-8 text-sm clara-input"
              />
            </div>

            <div className="flex-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
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
            {fmt(totalIncome)}
          </p>
        </div>

        <div className="grad-yellow rounded-2xl p-3 text-center card-glow-yellow">
          <p className="text-[10px] text-secondary-foreground/70 font-semibold uppercase">
            Expenses
          </p>
          <p className="font-heading font-bold text-secondary-foreground text-lg leading-tight mt-1">
            {fmt(totalExpenses)}
          </p>
        </div>
      </div>

      {filteredExpenses.length > 0 && (
        <div className="grad-card rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Spending Intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {topCategory && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Top Spending Category</span>
                <span className="font-bold text-sm capitalize text-white">
                  {topCategory[0]} · {fmt(topCategory[1])}
                </span>
              </div>
            )}

            {largestExpense && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Largest Single Expense</span>
                <span className="font-bold text-sm capitalize text-white">
                  {getExpenseCategory(largestExpense)} · {fmt(largestExpense.amount)}
                </span>
              </div>
            )}

            {mostFrequent && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground">Most Frequent Category</span>
                <span className="font-bold text-sm capitalize text-white">
                  {mostFrequent[0]} ({mostFrequent[1]}x)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
              <span className="text-sm text-muted-foreground">Avg. per Transaction</span>
              <span className="font-bold text-sm text-white">
                {fmt(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
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
          {monthlyData.length > 0 ? (
            <div className="grad-card rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Monthly Income Trend
              </p>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData}>
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => v.substring(5)}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{
                      borderRadius: "12px",
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fff",
                    }}
                  />
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

              {[
                {
                  label: "Needs",
                  value: needsSpent,
                  color: "bg-primary",
                  textColor: "text-primary",
                },
                {
                  label: "Wants",
                  value: wantsSpent,
                  color: "bg-secondary",
                  textColor: "text-secondary",
                },
                {
                  label: "Savings",
                  value: savingsSpent,
                  color: "bg-accent",
                  textColor: "text-accent",
                },
              ].map((item) => (
                <div key={item.label} className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-white">{item.label}</span>
                    <span className={`text-sm font-bold ${item.textColor}`}>{fmt(item.value)}</span>
                  </div>

                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full progress-bar`}
                      style={{
                        width: `${
                          totalExpenses > 0
                            ? Math.min((item.value / totalExpenses) * 100, 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {categoryBreakdown.length > 0 && (
              <div className="grad-card rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  By Category
                </p>

                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{
                        borderRadius: "12px",
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="retention">
          {monthlyData.length > 0 ? (
            <div className="grad-card rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Income vs Expenses
              </p>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barGap={4}>
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => v.substring(5)}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{
                      borderRadius: "12px",
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fff",
                    }}
                  />
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
          {walletAnalytics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No wallets found</p>
          ) : (
            <div className="space-y-3">
              {walletAnalytics.map((wallet, i) => (
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