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
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Gauge,
  Lightbulb,
  ShieldCheck,
  Sparkles,
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
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const TOOLTIP_STYLE = {
  borderRadius: "14px",
  border: "1px solid rgba(126,181,255,0.22)",
  background: "rgba(2,10,28,0.96)",
  color: "#fff",
};

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanLower(value) {
  return clean(value).toLowerCase();
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
  };
}

function phLocalPartsToUtcDate({ year, month, day, hour = 0, minute = 0, second = 0 }) {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) - PH_OFFSET_MINUTES * 60 * 1000,
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

function getDateRange(timeframe) {
  if (timeframe === "last_month") return getPHMonthRange(-1);
  if (timeframe === "last_3_months") {
    return { start: getPHMonthRange(-2).start, end: getPHMonthRange(0).end };
  }
  if (timeframe === "last_6_months") {
    return { start: getPHMonthRange(-5).start, end: getPHMonthRange(0).end };
  }
  return getPHMonthRange(0);
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

function getIncomeFallback(walletTransactions = []) {
  const allowed = new Set(["income", "add", "cash_in", "deposit", "opening_balance", "credit"]);
  return walletTransactions.filter((item) =>
    allowed.has(cleanLower(item.type || item.transaction_type || item.kind)),
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
      0,
  );
}

function getBudgetMonth(budget = {}) {
  return clean(budget.month || budget.budget_month || budget.month_key || budget.monthKey || "");
}

function isMonthlyBudgetHeader(budget = {}) {
  const title = cleanLower(
    budget.category || budget.name || budget.title || budget.label || budget.budget_category,
  );
  return Boolean(
    title === "__monthly_budget__" ||
      budget.is_plan_header === true ||
      cleanLower(budget.plan_type) === "monthly_budget" ||
      cleanLower(budget.type) === "monthly_budget"
  );
}

function getPHMonthKey(value = new Date()) {
  const parts = getPHParts(value);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
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

function getExpenseCategory(expense = {}) {
  return clean(
    expense.category ||
      expense.category_name ||
      expense.budgetCategory ||
      expense.budget_category ||
      expense.expense_category ||
      expense.tag ||
      "Undocumented Spending",
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
    .map(cleanLower)
    .join(" ");

  return Boolean(
    expense.unplanned_reason ||
      expense.unplannedReason ||
      text.includes("unplanned") ||
      text.includes("outside budget") ||
      text.includes("over budget"),
  );
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

function buildTrend({ expenses, incomes, currentMoneyLeft, start, end, anchored }) {
  const dayCount = daysInclusive(start, end);
  const incomeByDay = new Map();
  const expenseByDay = new Map();
  const add = (map, key, amount) => map.set(key, (map.get(key) || 0) + amount);

  incomes.forEach((item) => {
    const date = safeDate(getItemDate(item));
    if (date) add(incomeByDay, format(date, "yyyy-MM-dd"), toNumber(item.amount));
  });

  expenses.forEach((item) => {
    const date = safeDate(getItemDate(item));
    if (date) add(expenseByDay, format(date, "yyyy-MM-dd"), toNumber(item.amount));
  });

  const incomeTotal = incomes.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + toNumber(item.amount), 0);
  let running = anchored ? currentMoneyLeft - incomeTotal + expenseTotal : 0;

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start.getTime() + index * 86400000);
    const key = format(date, "yyyy-MM-dd");
    running += (incomeByDay.get(key) || 0) - (expenseByDay.get(key) || 0);
    return {
      label: format(date, dayCount > 45 ? "MMM d" : "d"),
      value: Math.round(running),
    };
  });
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-200/75" />
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/55">{children}</p>
    </div>
  );
}

export default function ClaraAnalyticsSimple() {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const data = useFinancialData(user);
  const [timeframe, setTimeframe] = useState("this_month");

  const fmt = useCallback((value) => CURRENCY_FORMATTER.format(toNumber(value)), []);
  const { start, end } = useMemo(() => getDateRange(timeframe), [timeframe]);
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

  const periodDays = daysInclusive(start, effectiveEnd);
  const avgDailySpending = totalExpenses / Math.max(periodDays, 1);
  const currentMoneyLeft = toNumber(data.totalSpendableWalletBalance ?? data.totalWalletBalance ?? 0);

  const currentMonthKey = getPHMonthKey(new Date());
  const targetMonthKey = getPHMonthKey(start);
  const budgetTotal =
    timeframe === "this_month" || timeframe === "last_month"
      ? resolveBudgetTotal(
          Array.isArray(data.budgets) ? data.budgets : [],
          targetMonthKey,
          targetMonthKey === currentMonthKey,
        )
      : 0;

  const budgetUsedPct = budgetTotal > 0 ? (totalExpenses / budgetTotal) * 100 : 0;
  const budgetRemaining = Math.max(budgetTotal - totalExpenses, 0);
  const monthParts = getPHParts(start);
  const daysInTargetMonth = monthParts
    ? new Date(Date.UTC(monthParts.year, monthParts.month, 0)).getUTCDate()
    : 30;
  const remainingDays =
    timeframe === "this_month" ? Math.max(daysInTargetMonth - periodDays + 1, 1) : 1;
  const safeDailyAllowance = budgetTotal > 0 ? budgetRemaining / remainingDays : 0;
  const calendarPacePct =
    timeframe === "this_month" ? clamp((periodDays / Math.max(daysInTargetMonth, 1)) * 100) : 100;

  const unplannedExpenses = useMemo(
    () => periodExpenses.filter(isUnplannedExpense),
    [periodExpenses],
  );
  const unplannedAmount = useMemo(
    () => unplannedExpenses.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [unplannedExpenses],
  );
  const unplannedShare = totalExpenses > 0 ? unplannedAmount / totalExpenses : 0;

  const topCategory = useMemo(() => {
    const totals = new Map();
    periodExpenses.forEach((expense) => {
      const category = getExpenseCategory(expense);
      totals.set(category, (totals.get(category) || 0) + toNumber(expense.amount));
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0] || null;
  }, [periodExpenses]);

  const savingsTotals = useMemo(() => {
    const goals = Array.isArray(data.savingsGoals) ? data.savingsGoals : [];
    const saved =
      goals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0) + getEmergencySaved(data.emergencyFund);
    const target =
      goals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0) + getEmergencyTarget(data.emergencyFund);
    return { saved, target };
  }, [data.savingsGoals, data.emergencyFund]);

  const savingsProgress = savingsTotals.target > 0
    ? clamp((savingsTotals.saved / savingsTotals.target) * 100)
    : totalIncome > 0
      ? clamp(((totalIncome - totalExpenses) / totalIncome) * 100)
      : 0;

  const budgetDiscipline = budgetTotal > 0
    ? clamp(100 - Math.max(budgetUsedPct - calendarPacePct, 0) * 1.2)
    : 70;
  const spendingControl = clamp(100 - unplannedShare * 70);
  const disciplineScore = Math.round(
    budgetDiscipline * 0.45 + spendingControl * 0.35 + savingsProgress * 0.2,
  );

  const healthLabel =
    disciplineScore >= 85
      ? "Strong"
      : disciplineScore >= 70
        ? "Healthy"
        : disciplineScore >= 55
          ? "Building"
          : "Needs Attention";

  const trend = useMemo(
    () =>
      buildTrend({
        expenses: periodExpenses,
        incomes: periodIncomes,
        currentMoneyLeft,
        start,
        end: effectiveEnd,
        anchored: timeframe === "this_month",
      }),
    [periodExpenses, periodIncomes, currentMoneyLeft, start, effectiveEnd, timeframe],
  );

  const dailyStatus =
    budgetTotal <= 0
      ? "Set a budget to unlock a safe daily pace."
      : avgDailySpending <= safeDailyAllowance
        ? "You’re within your safe pace."
        : "You’re spending above your safe pace.";

  const moneyStatus =
    budgetTotal <= 0
      ? "Your current spendable money."
      : budgetRemaining > 0 && budgetUsedPct <= calendarPacePct + 8
        ? "Your money is currently stable."
        : budgetRemaining > 0
          ? "Your budget is moving faster than the calendar."
          : "Your budget needs attention.";

  const insight =
    !periodExpenses.length
      ? "Start logging your spending and CLARA will show you the pattern that matters most."
      : unplannedShare >= 0.25
        ? `${fmt(unplannedAmount)} of your recorded spending was unplanned. Your clearest next move is to pause before the next unplanned purchase.`
        : budgetTotal > 0 && avgDailySpending > safeDailyAllowance
          ? `Your daily spending is above your safe pace. Aim closer to ${fmt(safeDailyAllowance)} per day for the rest of the month.`
          : savingsProgress < 20
            ? "Your spending pace is manageable. The next improvement is to direct more of what remains toward savings."
            : "Your money behavior is moving in a healthy direction. Keep the same pace and protect it from unplanned spending.";

  if (data.loading) {
    return (
      <div className="min-h-[70dvh] bg-[#010217] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-300/20 border-t-yellow-300" />
      </div>
    );
  }

  const scoreDegrees = `${disciplineScore * 3.6}deg`;

  return (
    <div className="min-h-[100dvh] bg-[#010217] pb-24 text-white">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-4 sm:px-5 sm:pt-6">
        <header className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-300/20 bg-[#071a3b] text-blue-100 transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <h1 className="text-[24px] font-black tracking-[-0.035em] text-white">Analytics</h1>
        </header>

        <section className="relative overflow-hidden rounded-[26px] border border-blue-300/20 bg-[linear-gradient(145deg,#0a356f_0%,#08275b_56%,#17113d_100%)] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#0867ff_0%,#0867ff_58%,#ffd84a_58%,#ffd84a_78%,#f32645_78%,#f32645_100%)]" />
          <div className="flex items-center gap-4">
            <div
              className="flex h-[82px] w-[82px] shrink-0 items-center justify-center rounded-full p-[5px]"
              style={{
                background: `conic-gradient(#ffd84a ${scoreDegrees}, rgba(126,181,255,0.14) 0deg)`,
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#04142f]">
                <span className="text-[25px] font-black leading-none">{disciplineScore}</span>
                <span className="mt-1 text-[8px] font-black text-blue-100/45">/ 100</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <SectionLabel icon={ShieldCheck}>Money Discipline</SectionLabel>
              <h2 className="mt-2 text-[24px] font-black tracking-[-0.03em]">{healthLabel}</h2>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-blue-100/60">
                Your overall control based on budget, spending, and savings.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-3 py-2.5 text-[10px] font-black">
            <span className="text-blue-100/60">Budget <strong className="text-white">{Math.round(budgetDiscipline)}%</strong></span>
            <span className="text-blue-100/60">Spending <strong className="text-yellow-200">{Math.round(spendingControl)}%</strong></span>
            <span className="text-blue-100/60">Savings <strong className="text-red-200">{Math.round(savingsProgress)}%</strong></span>
          </div>
        </section>

        <section className="mt-3 rounded-[22px] border border-blue-300/14 bg-[#06172f] p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-200/70" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/50">Timeframe</p>
            <span className="ml-auto text-[10px] font-bold text-blue-100/40">
              {format(start, "MMM d")} — {format(effectiveEnd, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TIMEFRAMES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTimeframe(option.id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${
                  timeframe === option.id
                    ? "border-yellow-300/45 bg-yellow-300/10 text-yellow-200"
                    : "border-blue-300/14 bg-[#04142f] text-blue-100/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-3 overflow-hidden rounded-[25px] border border-blue-300/18 bg-[linear-gradient(145deg,#08275b_0%,#061a3d_70%,#04142f_100%)] p-4">
          <SectionLabel icon={BarChart3}>{timeframe === "this_month" ? "Money Left" : "Net Cash Flow"}</SectionLabel>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[29px] font-black tracking-[-0.04em]">
                {fmt(timeframe === "this_month" ? currentMoneyLeft : totalIncome - totalExpenses)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-blue-100/50">{moneyStatus}</p>
            </div>
          </div>

          <div className="mt-3 h-[128px] w-full">
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 5, right: 2, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="claraSimpleTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2b86ff" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#2b86ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={18}
                    tick={{ fill: "rgba(191,219,254,0.45)", fontSize: 9, fontWeight: 700 }}
                  />
                  <Tooltip
                    formatter={(value) => fmt(value)}
                    labelStyle={{ color: "rgba(191,219,254,0.65)" }}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#58a6ff"
                    strokeWidth={2.5}
                    fill="url(#claraSimpleTrendFill)"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </section>

        <section className="mt-3 rounded-[24px] border border-blue-300/16 bg-[#06172f] p-4">
          <SectionLabel icon={Gauge}>Daily Pace</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/45">Spent / day</p>
              <p className="mt-1 text-[24px] font-black">{fmt(avgDailySpending)}</p>
            </div>
            <div className="border-l border-blue-200/10 pl-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/45">Safe / day</p>
              <p className="mt-1 text-[24px] font-black text-yellow-200">
                {budgetTotal > 0 ? fmt(safeDailyAllowance) : "—"}
              </p>
            </div>
          </div>
          <p className={`mt-3 rounded-xl px-3 py-2.5 text-[11px] font-bold ${
            budgetTotal > 0 && avgDailySpending <= safeDailyAllowance
              ? "bg-emerald-300/[0.08] text-emerald-200"
              : "bg-yellow-300/[0.08] text-yellow-100"
          }`}>
            {dailyStatus}
          </p>
        </section>

        <section className="mt-3 rounded-[24px] border border-blue-300/16 bg-[#06172f] p-4">
          <SectionLabel icon={BarChart3}>Budget & Spending</SectionLabel>

          <div className="mt-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/45">Budget left</p>
                <p className="mt-1 text-[25px] font-black">{budgetTotal > 0 ? fmt(budgetRemaining) : "No budget"}</p>
              </div>
              {budgetTotal > 0 ? (
                <p className="text-[18px] font-black text-yellow-200">{Math.round(budgetUsedPct)}% used</p>
              ) : null}
            </div>

            {budgetTotal > 0 ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#020b1b]">
                <div
                  className="h-full rounded-full bg-[#2b86ff]"
                  style={{ width: `${clamp(budgetUsedPct)}%` }}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-4 divide-y divide-blue-200/10 rounded-2xl border border-blue-200/10 bg-[#04142f] px-3">
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/40">Top spending</p>
                <p className="mt-1 text-[12px] font-bold text-white">{topCategory?.[0] || "No spending yet"}</p>
              </div>
              <strong className="text-[14px] text-white">{topCategory ? fmt(topCategory[1]) : "—"}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/40">Unplanned</p>
                <p className="mt-1 text-[12px] font-bold text-blue-100/60">
                  {unplannedExpenses.length ? `${unplannedExpenses.length} recorded item${unplannedExpenses.length === 1 ? "" : "s"}` : "No unplanned spending recorded"}
                </p>
              </div>
              <strong className="text-[14px] text-yellow-200">{fmt(unplannedAmount)}</strong>
            </div>
          </div>
        </section>

        <section className="relative mt-3 overflow-hidden rounded-[24px] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(7,89,101,0.78),rgba(19,39,92,0.92)_58%,rgba(66,22,95,0.82))] p-4">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-red-400/10 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-300/35 bg-yellow-300/10 text-yellow-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SectionLabel icon={Lightbulb}>CLARA Insight</SectionLabel>
              <p className="mt-2 text-[14px] font-black leading-relaxed text-white">{insight}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
