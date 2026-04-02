import { useMemo, useState } from "react";
import { CalendarDays, Lock, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "../components/PageHeader";
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

// TEMP MOCK DATA
const MOCK_DATA = {
  expenses: [],
  incomes: [],
  loading: false,
};

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

function filterByRange(items, dateField, start, end) {
  return items.filter((item) => {
    const value = item?.[dateField];
    if (!value) return false;

    try {
      return isWithinInterval(parseISO(value), { start, end });
    } catch {
      return false;
    }
  });
}

export default function Analytics() {
  const isFree = false;
  const data = MOCK_DATA;

  const [timeframe, setTimeframe] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const FREE_ALLOWED = ["this_month", "last_month", "last_3"];

  const availableTimeframes = isFree
    ? ALL_TIMEFRAMES.map((item) => ({
        ...item,
        locked: !FREE_ALLOWED.includes(item.id),
      }))
    : ALL_TIMEFRAMES;

  const activeTimeframe =
    isFree && !FREE_ALLOWED.includes(timeframe) ? "this_month" : timeframe;

  const { start, end } = useMemo(
    () => getDateRange(activeTimeframe, customStart, customEnd),
    [activeTimeframe, customStart, customEnd]
  );

  const filteredExpenses = useMemo(
    () => filterByRange(data.expenses, "date", start, end),
    [data.expenses, start, end]
  );

  const filteredIncomes = useMemo(
    () => filterByRange(data.incomes, "date", start, end),
    [data.incomes, start, end]
  );

  const totalIncome = filteredIncomes.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const totalExpenses = filteredExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  const net = totalIncome - totalExpenses;

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto text-white">
      <PageHeader
        title="Analytics"
        subtitle="Your complete financial picture"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {availableTimeframes.map((item) => {
          const locked = !!item.locked;
          const active = activeTimeframe === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              onClick={() => !locked && setTimeframe(item.id)}
              className={`px-3 py-2 rounded-xl text-sm border transition ${
                active
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-[#0F172A] text-white/70 border-white/10 hover:bg-white/5"
              } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="inline-flex items-center gap-2">
                {locked ? <Lock className="w-3.5 h-3.5" /> : null}
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {activeTimeframe === "custom" && (
        <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/60 block mb-1">Start Date</label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 block mb-1">End Date</label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
          <CalendarDays className="w-4 h-4" />
          {format(start, "MMM d, yyyy")} - {format(end, "MMM d, yyyy")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[linear-gradient(135deg,#052a23_0%,#0a4d3a_100%)] p-4 border border-emerald-400/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-emerald-100 uppercase">Income</p>
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            </div>
            <p className="font-bold text-white text-2xl">{fmt(totalIncome)}</p>
          </div>

          <div className="rounded-2xl bg-[linear-gradient(135deg,#5a4300_0%,#7a5d00_100%)] p-4 border border-yellow-400/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-yellow-100 uppercase">Expenses</p>
              <TrendingDown className="w-4 h-4 text-yellow-300" />
            </div>
            <p className="font-bold text-white text-2xl">{fmt(totalExpenses)}</p>
          </div>

          <div className="rounded-2xl bg-[linear-gradient(135deg,#0f1f4d_0%,#15357d_100%)] p-4 border border-blue-400/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-blue-100 uppercase">Net</p>
              <Zap className="w-4 h-4 text-blue-300" />
            </div>
            <p className="font-bold text-white text-2xl">{fmt(net)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0F172A] p-8 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          More analytics coming soon
        </h3>
        <p className="text-sm text-white/60 max-w-md mx-auto">
          Your charts, category breakdowns, and trend views will appear here once data is connected.
        </p>
      </div>
    </div>
  );
}