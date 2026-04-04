import {
  TrendingDown,
  PiggyBank,
  ListChecks,
  Newspaper,
  Shield,
  Pencil,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const user = { full_name: "Max" };

  const data = {
    monthlyCost: 8000,
    available: 0,
    targetMonths: 3,
    thisMonthSpent: 0,
    thisMonthIncome: 0,
    pendingTasks: 4,
    currentTaskTitle: "Sample",
    currentTaskWeek: 1,
    currentTaskDay: 15,
    tip: "Flip for today's tip",
    retentionRate: 0,
  };

  const targetAmount = data.monthlyCost * data.targetMonths;
  const progress =
    targetAmount > 0 ? Math.min((data.available / targetAmount) * 100, 100) : 0;

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="bg-[#061018]">

      {/* HEADER — FULL WIDTH */}
      <div className="w-full px-6 pt-6 pb-6 bg-gradient-to-r from-[#0b3d1f] via-[#11844a] to-[#1a9dcc]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h1 className="text-5xl font-bold text-white leading-tight">
              {user?.full_name || "Financial Champion"}
            </h1>
          </div>

          <Link
            to="/news"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-2 text-sm font-semibold text-white border border-white/10 hover:bg-white/20 transition"
          >
            <Newspaper className="w-4 h-4" />
            News
          </Link>
        </div>
      </div>

      {/* CONTENT — NO CENTER LIMIT */}
      <div className="px-6 mt-6 pb-12">

        {/* EMERGENCY FUND */}
        <div className="rounded-[32px] border border-[#8b5cf6]/20 bg-gradient-to-br from-[#1a0f27] via-[#160d22] to-[#1b1022] p-8 mb-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <Shield className="w-4 h-4 text-[#30e38c]" />
                <span className="text-sm font-semibold">Emergency Fund Progress</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap mb-6">
                <span className="text-white/70 text-sm font-medium">Goal:</span>

                <button className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white/70 flex items-center justify-center">
                  −
                </button>

                <span className="text-[#30e38c] text-4xl font-bold">
                  {data.targetMonths}
                </span>

                <span className="text-[#30e38c] text-2xl font-bold">
                  Months
                </span>

                <button className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white/70 flex items-center justify-center">
                  +
                </button>

                <span className="text-white/50 text-sm">Basic Safety</span>
              </div>

              <h2 className="text-5xl font-bold text-white mb-4">
                Start building your fund
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#5b2330] text-[#ff8ea1] text-sm font-semibold">
                At Risk
              </span>
              <button className="text-white/50 hover:text-white transition">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-white/70 text-sm">Progress to target</p>
            <p className="text-white/70 text-sm font-semibold">
              {Math.round(progress)}%
            </p>
          </div>

          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#25d366] to-[#34d399]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm italic text-white/50 mb-6">
            Start with 3 months of protection.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-xs text-white/50 mb-1">Monthly Cost</p>
              <p className="text-2xl font-bold text-white">{fmt(data.monthlyCost)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-xs text-white/50 mb-1">Available</p>
              <p className="text-2xl font-bold text-white">{fmt(data.available)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-xs text-white/50 mb-1">Target</p>
              <p className="text-2xl font-bold text-white">{fmt(targetAmount)}</p>
            </div>
          </div>

          <p className="text-sm text-white/60 mt-4">
            Retention Rate: <span className="text-white">{data.retentionRate}%</span>
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="md:col-span-2 rounded-[28px] p-6 bg-gradient-to-br from-[#03271f] to-[#06352c] border border-[#0f7a60] min-h-[200px]">
            <div className="flex items-start justify-between mb-10">
              <span className="text-sm font-semibold text-white/70 uppercase">
                Daily Money Tip
              </span>
              <div className="w-11 h-11 rounded-2xl bg-[#0f7a60]/30 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-[#59f0c0]" />
              </div>
            </div>

            <p className="text-2xl font-semibold text-white">
              {data.tip}
            </p>
          </div>

          <div className="rounded-[28px] p-6 bg-gradient-to-br from-[#5a4500] to-[#6d5607] border border-[#8f7416] min-h-[200px]">
            <div className="flex items-start justify-between mb-8">
              <span className="text-sm font-semibold text-white/70 uppercase">
                Money Left
              </span>
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-[#ffe082]" />
              </div>
            </div>

            <p className="text-4xl font-bold text-white">{fmt(data.available)}</p>
            <p className="text-white/80 mt-2 text-lg">Retained amount</p>
          </div>

          <div className="rounded-[28px] p-6 bg-gradient-to-br from-[#0d2b6b] to-[#12285a] border border-[#274690] min-h-[200px]">
            <div className="flex items-start justify-between mb-8">
              <span className="text-sm font-semibold text-white/70 uppercase">
                This Month Spent
              </span>
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-[#d6e4ff]" />
              </div>
            </div>

            <p className="text-4xl font-bold text-white">{fmt(data.thisMonthSpent)}</p>
            <p className="text-white/70 mt-2 text-lg">
              vs {fmt(data.thisMonthIncome)} income
            </p>
          </div>

          <Link to="/tasks" className="block md:col-span-2">
            <div className="rounded-[28px] p-6 bg-gradient-to-br from-[#182742] to-[#0f1e36] border border-white/10 min-h-[200px] hover:border-white/20 transition">
              <div className="flex items-start justify-between mb-10">
                <span className="text-sm font-semibold text-white/70 uppercase">
                  Tasks
                </span>
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-white/80" />
                </div>
              </div>

              <p className="text-2xl font-semibold text-white">
                {data.currentTaskTitle}
              </p>
              <p className="text-white/60 mt-1 text-lg">
                Week {data.currentTaskWeek} • Day {data.currentTaskDay}
              </p>
              <p className="text-[#ffd84d] mt-3 font-semibold">
                {data.pendingTasks} pending
              </p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}