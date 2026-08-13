import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Gauge,
  Lightbulb,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { format } from "date-fns";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MINUTES = 8 * 60;

const TIMEFRAMES = [
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_3_months", label: "3 Months" },
  { id: "last_6_months", label: "6 Months" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CHART_TOOLTIP_STYLE = {
  borderRadius: "16px",
  border: "1px solid rgba(126,181,255,0.22)",
  background: "rgba(2,10,28,0.96)",
  color: "#fff",
  boxShadow: "0 18px 44px rgba(0,0,0,0.38)",
};

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function safeDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getItemDate(item = {}) {
  return (
    item.date ||
    item.expense_date ||
    item.transaction_date ||
    item.created_at ||
    item.createdAt ||
    item.updated_at ||
    item.updatedAt ||
    item.timestamp ||
    null
  );
}

function getPHParts(value = new Date()) {
  const date = safeDate(value);
  if (!date) return null;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const map = {};
  formatter.formatToParts(date).forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function phLocalPartsToUtcDate({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
}) {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
      PH_OFFSET_MINUTES * 60 * 1000,
  );
}

function addPHMonths(parts, offset) {
  return getPHParts(
    phLocalPartsToUtcDate({
      year: parts.year,
      month: parts.month + offset,
      day: 1,
    }),
  );
}

function getPHMonthRange(offset = 0) {
  const nowParts = getPHParts(new Date());
  const target = addPHMonths(nowParts, offset);
  const next = addPHMonths(target, 1);

  return {
    start: phLocalPartsToUtcDate({ year: target.year, month: target.month, day: 1 }),
    end: new Date(
      phLocalPartsToUtcDate({ year: next.year, month: next.month, day: 1 }).getTime() - 1,
    ),
  };
}

function getPHYearRange() {
  const parts = getPHParts(new Date());
  return {
    start: phLocalPartsToUtcDate({ year: parts.year, month: 1, day: 1 }),
    end: new Date(
      phLocalPartsToUtcDate({ year: parts.year + 1, month: 1, day: 1 }).getTime() - 1,
    ),
  };
}

function parsePHDateOnly(value, endOfDay = false) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) return null;

  return phLocalPartsToUtcDate({
    year,
    month,
    day,
    hour: endOfDay ? 23 : 0,
    minute: endOfDay ? 59 : 0,
    second: endOfDay ? 59 : 0,
    millisecond: endOfDay ? 999 : 0,
  });
}

function getDateRange(timeframe, customStart, customEnd) {
  switch (timeframe) {
    case "last_month":
      return getPHMonthRange(-1);
    case "last_3_months":
      return { start: getPHMonthRange(-2).start, end: getPHMonthRange(0).end };
    case "last_6_months":
      return { start: getPHMonthRange(-5).start, end: getPHMonthRange(0).end };
    case "this_year":
      return getPHYearRange();
    case "custom":
      return {
        start: parsePHDateOnly(customStart, false) || getPHMonthRange(0).start,
        end: parsePHDateOnly(customEnd, true) || getPHMonthRange(0).end,
      };
    case "this_month":
    default:
      return getPHMonthRange(0);
  }
}

function getPHMonthKey(value = new Date()) {
  const parts = getPHParts(value);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function getEffectiveEnd(end) {
  const now = new Date();
  return end > now ? now : end;
}

function daysInclusive(start, end) {
  if (!start || !end || end < start) return 1;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function isInRange(item, start, end) {
  const date = safeDate(getItemDate(item));
  return Boolean(date && date >= start && date <= end);
}

function getPreviousEquivalentRange(start, end) {
  const duration = Math.max(end.getTime() - start.getTime(), 0);
  const previousEnd = new Date(start.getTime() - 1);
  return {
    start: new Date(previousEnd.getTime() - duration),
    end: previousEnd,
  };
}

function getExpenseCategory(expense = {}) {
  return normalize(
    expense.category ||
      expense.category_name ||
      expense.budgetCategory ||
      expense.budget_category ||
      expense.expense_category ||
      expense.tag ||
      "Uncategorized",
  );
}

function isUnplannedExpense(expense = {}) {
  const text = [
    expense.planning_status,
    expense.planningStatus,
    expense.budget_status,
    expense.budgetStatus,
    expense.status,
    expense.unplanned_reason,
    expense.unplannedReason,
  ]
    .map(normalizeLower)
    .join(" ");

  return Boolean(
    expense.unplanned_reason ||
      expense.unplannedReason ||
      text.includes("unplanned") ||
      text.includes("outside budget") ||
      text.includes("over budget"),
  );
}

function getIncomeFallback(walletTransactions = []) {
  const allowed = new Set(["income", "add", "cash_in", "deposit", "opening_balance", "credit"]);
  return walletTransactions.filter((item) =>
    allowed.has(normalizeLower(item.type || item.transaction_type || item.kind)),
  );
}

function getBudgetAmount(budget = {}) {
  return toNumber(
    budget.amount ??
      budget.limit ??
      budget.budget_amount ??
      budget.allocated ??
      budget.allocated_amount ??
      budget.monthly_amount ??
      budget.total_budget ??
      budget.budget ??
      budget.cap ??
      budget.plannedAmount ??
      budget.planned_amount ??
      budget.monthlyLimit ??
      budget.monthly_limit ??
      budget.categoryLimit ??
      budget.category_limit ??
      0,
  );
}

function getBudgetMonth(budget = {}) {
  return normalize(budget.month || budget.budget_month || budget.month_key || budget.monthKey || "");
}

function isMonthlyBudgetHeader(budget = {}) {
  const title = normalizeLower(
    budget.category || budget.name || budget.title || budget.label || budget.budget_category,
  );
  return Boolean(
    title === "__monthly_budget__" ||
      budget.is_plan_header === true ||
      normalizeLower(budget.plan_type) === "monthly_budget" ||
      normalizeLower(budget.type) === "monthly_budget",
  );
}

function resolveBudgetTotal(budgets = [], targetMonthKey, allowMonthless = false) {
  const eligible = budgets.filter((budget) => {
    const month = getBudgetMonth(budget);
    if (month) return month === targetMonthKey;
    return allowMonthless;
  });

  const headers = eligible.filter(isMonthlyBudgetHeader);
  const headerTotal = headers.reduce((sum, budget) => sum + getBudgetAmount(budget), 0);
  if (headerTotal > 0) return headerTotal;

  return eligible
    .filter((budget) => !isMonthlyBudgetHeader(budget))
    .reduce((sum, budget) => sum + getBudgetAmount(budget), 0);
}

function getSavingsSaved(goal = {}) {
  return toNumber(
    goal.saved_amount ?? goal.savedAmount ?? goal.saved ?? goal.current_amount ?? goal.currentAmount ?? 0,
  );
}

function getSavingsTarget(goal = {}) {
  return toNumber(goal.target_amount ?? goal.targetAmount ?? goal.target ?? goal.goal_amount ?? 0);
}

function getEmergencySaved(record = null) {
  if (!record) return 0;
  return toNumber(
    record.saved_amount ??
      record.savedAmount ??
      record.protectedBalance ??
      record.protected_balance ??
      record.current_amount ??
      record.currentAmount ??
      record.amount ??
      0,
  );
}

function getEmergencyTarget(record = null) {
  if (!record) return 0;
  return toNumber(record.target_amount ?? record.targetAmount ?? record.target ?? 0);
}

function buildMoneyTrend({ expenses, incomes, currentMoneyLeft, start, end, anchored }) {
  const dayCount = daysInclusive(start, end);
  const points = [];
  const dailyIncome = new Map();
  const dailyExpense = new Map();

  const add = (map, key, amount) => map.set(key, (map.get(key) || 0) + amount);

  incomes.forEach((item) => {
    const date = safeDate(getItemDate(item));
    if (date) add(dailyIncome, format(date, "yyyy-MM-dd"), toNumber(item.amount));
  });

  expenses.forEach((item) => {
    const date = safeDate(getItemDate(item));
    if (date) add(dailyExpense, format(date, "yyyy-MM-dd"), toNumber(item.amount));
  });

  const incomeTotal = incomes.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + toNumber(item.amount), 0);
  let running = anchored ? currentMoneyLeft - incomeTotal + expenseTotal : 0;

  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(start.getTime() + index * 86400000);
    const key = format(date, "yyyy-MM-dd");
    running += (dailyIncome.get(key) || 0) - (dailyExpense.get(key) || 0);
    points.push({
      label: format(date, dayCount > 45 ? "MMM d" : "d"),
      value: Math.round(running),
    });
  }

  return points;
}

function MetricChip({ label, value, accent = "blue" }) {
  const accentClass =
    accent === "yellow"
      ? "border-yellow-300/20 bg-yellow-300/[0.07] text-yellow-100"
      : accent === "red"
        ? "border-red-300/20 bg-red-400/[0.07] text-red-100"
        : "border-blue-300/20 bg-blue-400/[0.07] text-blue-100";

  return (
    <div className={`rounded-2xl border px-3 py-3 ${accentClass}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-60">{label}</p>
      <p className="mt-1.5 text-[15px] font-black text-white">{value}</p>
    </div>
  );
}

export default function ClaraAnalytics() {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const data = useFinancialData(user);
  const [timeframe, setTimeframe] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fmt = useCallback((value) => CURRENCY_FORMATTER.format(toNumber(value)), []);

  const { start, end } = useMemo(
    () => getDateRange(timeframe, customStart, customEnd),
    [timeframe, customStart, customEnd],
  );
  const effectiveEnd = useMemo(() => getEffectiveEnd(end), [end]);

  const expenses = useMemo(() => (Array.isArray(data.expenses) ? data.expenses : []), [data.expenses]);
  const incomes = useMemo(() => {
    const direct = Array.isArray(data.incomes) ? data.incomes : [];
    if (direct.length) return direct;
    return getIncomeFallback(Array.isArray(data.walletTransactions) ? data.walletTransactions : []);
  }, [data.incomes, data.walletTransactions]);

  const periodExpenses = useMemo(
    () => expenses.filter((item) => isInRange(item, start, effectiveEnd)),
    [expenses, start, effectiveEnd],
  );
  const periodIncomes = useMemo(
    () => incomes.filter((item) => isInRange(item, start, effectiveEnd)),
    [incomes, start, effectiveEnd],
  );

  const totalExpenses = useMemo(
    () => periodExpenses.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [periodExpenses],
  );
  const totalIncome = useMemo(
    () => periodIncomes.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [periodIncomes],
  );

  const periodDays = useMemo(() => daysInclusive(start, effectiveEnd), [start, effectiveEnd]);
  const avgDailySpending = totalExpenses / Math.max(periodDays, 1);
  const retentionAmount = totalIncome - totalExpenses;
  const retentionPct = totalIncome > 0 ? (retentionAmount / totalIncome) * 100 : 0;

  const currentMoneyLeft = toNumber(
    data.totalSpendableWalletBalance ?? data.totalWalletBalance ?? 0,
  );

  const currentMonthKey = getPHMonthKey(new Date());
  const targetMonthKey = getPHMonthKey(start);
  const budgetEligible = timeframe === "this_month" || timeframe === "last_month";
  const budgetTotal = budgetEligible
    ? resolveBudgetTotal(
        Array.isArray(data.budgets) ? data.budgets : [],
        targetMonthKey,
        targetMonthKey === currentMonthKey,
      )
    : 0;

  const budgetUsedPct = budgetTotal > 0 ? (totalExpenses / budgetTotal) * 100 : 0;
  const monthParts = getPHParts(start);
  const daysInTargetMonth = monthParts
    ? new Date(Date.UTC(monthParts.year, monthParts.month, 0)).getUTCDate()
    : 30;
  const expectedBudgetPct =
    timeframe === "this_month"
      ? clamp((periodDays / Math.max(daysInTargetMonth, 1)) * 100)
      : budgetEligible
        ? 100
        : 0;
  const paceDelta = budgetUsedPct - expectedBudgetPct;
  const budgetRemaining = Math.max(budgetTotal - totalExpenses, 0);
  const remainingDays =
    timeframe === "this_month"
      ? Math.max(daysInTargetMonth - periodDays + 1, 1)
      : 1;
  const safeDailyAllowance = budgetTotal > 0 ? budgetRemaining / remainingDays : 0;

  const unplannedExpenses = useMemo(
    () => periodExpenses.filter(isUnplannedExpense),
    [periodExpenses],
  );
  const unplannedAmount = useMemo(
    () => unplannedExpenses.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [unplannedExpenses],
  );
  const unplannedShare = totalExpenses > 0 ? unplannedAmount / totalExpenses : 0;

  const previousRange = useMemo(
    () => getPreviousEquivalentRange(start, effectiveEnd),
    [start, effectiveEnd],
  );
  const previousExpenses = useMemo(
    () => expenses.filter((item) => isInRange(item, previousRange.start, previousRange.end)),
    [expenses, previousRange],
  );
  const previousExpenseTotal = useMemo(
    () => previousExpenses.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [previousExpenses],
  );
  const spendingChangePct =
    previousExpenseTotal > 0
      ? ((totalExpenses - previousExpenseTotal) / previousExpenseTotal) * 100
      : 0;

  const savingsTotals = useMemo(() => {
    const goals = Array.isArray(data.savingsGoals) ? data.savingsGoals : [];
    const saved = goals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0) + getEmergencySaved(data.emergencyFund);
    const target = goals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0) + getEmergencyTarget(data.emergencyFund);
    return { saved, target };
  }, [data.savingsGoals, data.emergencyFund]);

  const budgetDisciplineScore = budgetTotal > 0
    ? clamp(
        100 -
          Math.max(paceDelta, 0) * 1.25 -
          Math.max(budgetUsedPct - 100, 0) * 0.75,
      )
    : 68;
  const spendingControlScore = clamp(
    100 - unplannedShare * 70 - Math.max(spendingChangePct, 0) * 0.2,
  );
  const savingsProgressScore = savingsTotals.target > 0
    ? clamp((savingsTotals.saved / savingsTotals.target) * 100)
    : totalIncome > 0
      ? clamp(Math.max(retentionPct, 0) * 1.35 + 35)
      : 60;
  const disciplineScore = Math.round(
    budgetDisciplineScore * 0.45 + spendingControlScore * 0.35 + savingsProgressScore * 0.2,
  );

  const healthLabel =
    disciplineScore >= 85
      ? "Strong Control"
      : disciplineScore >= 70
        ? "Healthy"
        : disciplineScore >= 55
          ? "Building"
          : "Needs Attention";

  const categoryBreakdown = useMemo(() => {
    const totals = new Map();
    periodExpenses.forEach((expense) => {
      const category = getExpenseCategory(expense);
      totals.set(category, (totals.get(category) || 0) + toNumber(expense.amount));
    });
    return Array.from(totals.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodExpenses, totalExpenses]);

  const trend = useMemo(
    () =>
      buildMoneyTrend({
        expenses: periodExpenses,
        incomes: periodIncomes,
        currentMoneyLeft,
        start,
        end: effectiveEnd,
        anchored: timeframe === "this_month",
      }),
    [periodExpenses, periodIncomes, currentMoneyLeft, start, effectiveEnd, timeframe],
  );

  const insight = useMemo(() => {
    if (!periodExpenses.length) {
      return "Start logging your spending and CLARA will turn it into a clear behavior pattern here.";
    }
    if (budgetTotal > 0 && paceDelta > 12) {
      return `You are using your budget about ${Math.round(paceDelta)} points faster than your calendar pace. Slowing the next few days protects your month-end Money Left.`;
    }
    if (unplannedShare >= 0.25) {
      return `${Math.round(unplannedShare * 100)}% of recorded spending in this period is unplanned. That is the clearest area where Ask Before You Spend can protect your money.`;
    }
    if (previousExpenseTotal > 0 && spendingChangePct <= -10) {
      return `Your spending is down ${Math.abs(Math.round(spendingChangePct))}% versus the previous comparable period. That is a real improvement in spending control.`;
    }
    if (categoryBreakdown[0]) {
      return `${categoryBreakdown[0].name} is currently your biggest spending category at ${fmt(categoryBreakdown[0].amount)}. Keep an eye on it before it quietly becomes the month’s pressure point.`;
    }
    return "Your current spending pace is stable. Keep checking before you spend so the pattern stays intentional.";
  }, [
    periodExpenses.length,
    budgetTotal,
    paceDelta,
    unplannedShare,
    previousExpenseTotal,
    spendingChangePct,
    categoryBreakdown,
    fmt,
  ]);

  if (data.loading) {
    return (
      <div className="min-h-[70dvh] bg-[#010217] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-300/20 border-t-yellow-300" />
      </div>
    );
  }

  const scoreDegrees = `${disciplineScore * 3.6}deg`;
  const trendHeading = timeframe === "this_month" ? "Money Left Trend" : "Net Cash Flow Trend";
  const trendValue = timeframe === "this_month" ? currentMoneyLeft : retentionAmount;
  const isSpendingDown = spendingChangePct <= 0;

  return (
    <div className="min-h-[100dvh] bg-[#010217] pb-28 text-white">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-12 pt-4 sm:px-5 sm:pt-6">
        <header className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-300/20 bg-[#071a3b] text-blue-100 transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300/85">
              CLARA MONEY ANALYTICS
            </p>
            <h1 className="mt-1 text-[24px] font-black tracking-[-0.035em] text-white">
              Understand your money behavior
            </h1>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[28px] border border-blue-300/25 bg-[linear-gradient(145deg,#0b397d_0%,#08275b_48%,#061a3d_100%)] p-4 shadow-[0_22px_54px_rgba(0,0,0,0.34)] sm:p-5">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#0867ff_0%,#0867ff_58%,#ffd84a_58%,#ffd84a_78%,#f32645_78%,#f32645_100%)]" />
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div
              className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full p-[6px] shadow-[0_0_30px_rgba(255,216,74,0.12)]"
              style={{
                background: `conic-gradient(#ffd84a ${scoreDegrees}, rgba(126,181,255,0.13) 0deg)`,
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-blue-200/15 bg-[#04142f]">
                <span className="text-[27px] font-black leading-none text-white">{disciplineScore}</span>
                <span className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/55">
                  / 100
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-yellow-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/60">
                  Money Discipline Score
                </p>
              </div>
              <h2 className="mt-2 text-[23px] font-black tracking-[-0.03em] text-white">
                {healthLabel}
              </h2>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-blue-100/68">
                Based on budget pace, spending control, and savings behavior — not how much you earn.
              </p>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <MetricChip label="Budget discipline" value={`${Math.round(budgetDisciplineScore)}%`} />
            <MetricChip label="Spending control" value={`${Math.round(spendingControlScore)}%`} accent="yellow" />
            <MetricChip label="Savings progress" value={`${Math.round(savingsProgressScore)}%`} accent="red" />
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-blue-300/15 bg-[#06172f] p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-200" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/55">Timeframe</p>
            <span className="ml-auto text-[10px] font-bold text-blue-100/45">
              {format(start, "MMM d")} — {format(effectiveEnd, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TIMEFRAMES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTimeframe(option.id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${
                  timeframe === option.id
                    ? "border-yellow-300/45 bg-yellow-300/10 text-yellow-200"
                    : "border-blue-300/15 bg-[#04142f] text-blue-100/55"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {timeframe === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/45">
                From
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-blue-300/15 bg-[#031028] px-3 py-2.5 text-[12px] font-bold text-white outline-none focus:border-yellow-300/45"
                />
              </label>
              <label className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/45">
                To
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-blue-300/15 bg-[#031028] px-3 py-2.5 text-[12px] font-bold text-white outline-none focus:border-yellow-300/45"
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="mt-4 overflow-hidden rounded-[26px] border border-blue-300/18 bg-[linear-gradient(145deg,#08275b_0%,#061a3d_62%,#04142f_100%)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/55">
                  {trendHeading}
                </p>
              </div>
              <p className="mt-2 text-[28px] font-black tracking-[-0.04em] text-white">{fmt(trendValue)}</p>
              <p className="mt-1 text-[11px] font-semibold text-blue-100/48">
                {timeframe === "this_month"
                  ? "Based on recorded income and spending this month."
                  : "Cumulative income minus spending for this period."}
              </p>
            </div>
            <WalletCards className="h-8 w-8 text-yellow-300/75" />
          </div>

          <div className="mt-4 h-[176px] w-full">
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="claraMoneyTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2b86ff" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#2b86ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={18}
                    tick={{ fill: "rgba(191,219,254,0.42)", fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={{ color: "rgba(191,219,254,0.72)", fontSize: 11, fontWeight: 800 }}
                    formatter={(value) => [fmt(value), trendHeading]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#66aaff"
                    strokeWidth={2.6}
                    fill="url(#claraMoneyTrendFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#ffd84a", stroke: "#04142f", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-blue-300/15 bg-black/10 px-6 text-center text-[12px] font-semibold leading-relaxed text-blue-100/45">
                Keep logging money activity and your trend will become visible here.
              </div>
            )}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <section className="rounded-[22px] border border-blue-300/16 bg-[#071b3d] p-3.5">
            <Gauge className="h-5 w-5 text-blue-200" />
            <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/45">Average daily spend</p>
            <p className="mt-1.5 text-[19px] font-black text-white">{fmt(avgDailySpending)}</p>
            <p className="mt-1 text-[10px] font-semibold text-blue-100/45">{periodDays} tracked day{periodDays === 1 ? "" : "s"}</p>
          </section>

          <section className="rounded-[22px] border border-yellow-300/16 bg-[#15172c] p-3.5">
            <PiggyBank className="h-5 w-5 text-yellow-300" />
            <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-yellow-100/45">Safe daily allowance</p>
            <p className="mt-1.5 text-[19px] font-black text-white">{budgetTotal > 0 ? fmt(safeDailyAllowance) : "—"}</p>
            <p className="mt-1 text-[10px] font-semibold text-yellow-100/45">{budgetTotal > 0 ? "To stay inside budget" : "Set a budget to unlock"}</p>
          </section>
        </div>

        <section className="mt-4 rounded-[26px] border border-blue-300/18 bg-[#06172f] p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-yellow-300" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/55">Budget Performance</p>
            {budgetTotal > 0 ? (
              <span className={`ml-auto rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${paceDelta > 10 ? "border-red-300/20 bg-red-400/10 text-red-200" : "border-blue-300/20 bg-blue-400/10 text-blue-100"}`}>
                {paceDelta > 10 ? "Spending fast" : "On pace"}
              </span>
            ) : null}
          </div>

          {budgetTotal > 0 ? (
            <>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[24px] font-black tracking-[-0.035em] text-white">{fmt(budgetRemaining)} left</p>
                  <p className="mt-1 text-[11px] font-semibold text-blue-100/48">{fmt(totalExpenses)} used of {fmt(budgetTotal)}</p>
                </div>
                <p className="text-[20px] font-black text-yellow-300">{Math.round(budgetUsedPct)}%</p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#020a1c]">
                <div
                  className={`h-full rounded-full ${budgetUsedPct > 100 ? "bg-red-400" : paceDelta > 10 ? "bg-yellow-300" : "bg-blue-500"}`}
                  style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9px] font-black uppercase tracking-[0.1em] text-blue-100/38">
                <span>Used {Math.round(budgetUsedPct)}%</span>
                <span>Calendar pace {Math.round(expectedBudgetPct)}%</span>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-blue-300/15 bg-[#031028] px-4 py-4 text-[12px] font-semibold leading-relaxed text-blue-100/48">
              No monthly budget is available for this period. Once a budget exists, CLARA will compare your spending against the pace of the month.
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[26px] border border-blue-300/18 bg-[#06172f] p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-200" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/55">Where Your Money Went</p>
          </div>

          {categoryBreakdown.length ? (
            <div className="mt-4 space-y-4">
              {categoryBreakdown.map((category, index) => (
                <div key={category.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="truncate text-[12px] font-bold text-white">{category.name}</p>
                    <p className="shrink-0 text-[12px] font-black text-blue-100/78">{fmt(category.amount)}</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#020a1c]">
                    <div
                      className={`h-full rounded-full ${index === 0 ? "bg-yellow-300" : index === 1 ? "bg-blue-400" : index === 2 ? "bg-red-400" : "bg-blue-600"}`}
                      style={{ width: `${Math.max(category.pct, 3)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.08em] text-blue-100/32">{Math.round(category.pct)}% of spending</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[12px] font-semibold text-blue-100/45">No spending categories recorded for this period.</p>
          )}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-blue-300/16 bg-[#071b3d] p-3.5">
            <ShieldCheck className="h-5 w-5 text-blue-200" />
            <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/45">Unplanned spending</p>
            <p className="mt-1.5 text-[19px] font-black text-white">{fmt(unplannedAmount)}</p>
            <p className="mt-1 text-[10px] font-semibold text-blue-100/45">{unplannedExpenses.length} recorded item{unplannedExpenses.length === 1 ? "" : "s"}</p>
          </div>

          <div className="rounded-[22px] border border-red-300/14 bg-[#17132a] p-3.5">
            {isSpendingDown ? <ArrowDownRight className="h-5 w-5 text-blue-200" /> : <ArrowUpRight className="h-5 w-5 text-red-300" />}
            <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/45">Vs previous period</p>
            <p className={`mt-1.5 text-[19px] font-black ${isSpendingDown ? "text-blue-100" : "text-red-200"}`}>
              {previousExpenseTotal > 0 ? `${Math.abs(Math.round(spendingChangePct))}% ${isSpendingDown ? "less" : "more"}` : "—"}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-blue-100/45">{previousExpenseTotal > 0 ? `Previous: ${fmt(previousExpenseTotal)}` : "Not enough prior data"}</p>
          </div>
        </section>

        {savingsTotals.target > 0 ? (
          <section className="mt-4 rounded-[26px] border border-yellow-300/16 bg-[linear-gradient(145deg,#16182f,#081a3d)] p-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-yellow-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/55">Savings Progress</p>
              <span className="ml-auto text-[12px] font-black text-yellow-300">{Math.round((savingsTotals.saved / savingsTotals.target) * 100)}%</span>
            </div>
            <p className="mt-3 text-[23px] font-black tracking-[-0.03em] text-white">{fmt(savingsTotals.saved)} saved</p>
            <p className="mt-1 text-[11px] font-semibold text-yellow-100/48">Across savings goals and emergency fund · target {fmt(savingsTotals.target)}</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#020a1c]">
              <div
                className="h-full rounded-full bg-yellow-300"
                style={{ width: `${Math.min((savingsTotals.saved / savingsTotals.target) * 100, 100)}%` }}
              />
            </div>
          </section>
        ) : null}

        <section className="relative mt-4 overflow-hidden rounded-[28px] border border-yellow-300/22 bg-[linear-gradient(145deg,#0b397d_0%,#071f49_54%,#15132c_100%)] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.25)]">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-300/10 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-300/24 bg-yellow-300/10 text-yellow-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-yellow-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/70">CLARA Insight</p>
              </div>
              <p className="mt-2 text-[13px] font-bold leading-relaxed text-white/90">{insight}</p>
            </div>
          </div>
        </section>

        <p className="mx-auto mt-4 max-w-md text-center text-[10px] font-semibold leading-relaxed text-blue-100/32">
          The CLARA Money Discipline Score is a behavior indicator for personal reflection. It is not a credit score or a measure of wealth.
        </p>
      </div>
    </div>
  );
}
