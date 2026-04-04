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
import EmergencyFundCard from "../components/EmergencyFundCard";
import VideoPlayer from "../components/VideoPlayer";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import DailyTipCard from "../components/DailyTipCard";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

export default function Dashboard() {
  const { user, isPaid, isFree, isPending, refreshUser } = useUserRole();
  const data = useFinancialData(user?.email);

  const survivalExpense = user?.monthly_survival_expense || 0;
  const targetMonths = 3;
  const targetAmount = survivalExpense * targetMonths;
  const progress =
    targetAmount > 0
      ? Math.min((data.totalRetained / targetAmount) * 100, 100)
      : 0;

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n || 0);

  const getStatus = () => {
    if (progress >= 100) return "Secure";
    if (progress >= 66) return "Stable";
    if (progress >= 33) return "Building";
    return "At Risk";
  };

  const status = getStatus();

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full text-white">
      <div className="mb-6 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(90deg,#0c4b25_0%,#13884a_50%,#1b9dcb_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 px-5 py-6 md:flex-row md:items-start md:justify-between md:px-8 md:py-8">
          <div>
            <p className="text-sm text-white/75">Welcome back,</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-white md:text-5xl">
              {user?.full_name || "Financial Champion"}
            </h1>
          </div>

          <Link
            to="/news"
            className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <Newspaper className="h-4 w-4" />
            News
          </Link>
        </div>
      </div>

      <div className="pb-10">
        {isPending && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex-1 text-sm text-white/80">
              Enrollment Under Review
            </div>
            <Link to="/enroll">
              <Button size="sm">View</Button>
            </Link>
          </div>
        )}

        {!isFree && !isPending ? (
          <div className="mb-6 rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,#1a0f27,#120a1a)] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:p-8">
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex items-center gap-2 text-white">
                  <Shield className="h-4 w-4 text-[#30e38c]" />
                  <span className="text-sm font-semibold">
                    Emergency Fund Progress
                  </span>
                </div>

                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-white/70">Goal:</span>

                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70"
                  >
                    −
                  </button>

                  <span className="text-3xl font-bold text-[#30e38c] md:text-4xl">
                    {targetMonths}
                  </span>

                  <span className="text-2xl font-bold text-[#30e38c]">
                    Months
                  </span>

                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70"
                  >
                    +
                  </button>

                  <span className="text-sm text-white/50">Basic Safety</span>
                </div>

                <h2 className="text-3xl font-bold text-white md:text-5xl">
                  {data.totalRetained > 0
                    ? "Keep building your fund"
                    : "Start building your fund"}
                </h2>
              </div>

              <div className="flex items-center gap-3 self-start">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    status === "Secure"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : status === "Stable"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : status === "Building"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-[#5b2330] text-[#ff8ea1]"
                  }`}
                >
                  {status}
                </span>

                <button
                  type="button"
                  className="text-white/45 transition hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-white/70">Progress to target</p>
              <p className="text-sm font-semibold text-white/75">
                {Math.round(progress)}%
              </p>
            </div>

            <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#25d366,#34d399)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mb-6 text-sm italic text-white/50">
              Start with 3 months of protection.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <p className="mb-1 text-xs text-white/50">Monthly Cost</p>
                <p className="text-2xl font-bold text-white">
                  {fmt(survivalExpense)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <p className="mb-1 text-xs text-white/50">Available</p>
                <p className="text-2xl font-bold text-white">
                  {fmt(data.totalRetained)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <p className="mb-1 text-xs text-white/50">Target</p>
                <p className="text-2xl font-bold text-white">
                  {fmt(targetAmount)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/60">
              Retention Rate:{" "}
              <span className="text-white">
                {data.totalIncome > 0
                  ? Math.round((data.totalRetained / data.totalIncome) * 100)
                  : 0}
                %
              </span>
            </p>
          </div>
        ) : (
          !isPending && (
            <EmergencyFundCard
              moneyLeft={data.totalRetained}
              survivalExpense={survivalExpense}
              retentionRate={
                data.totalIncome > 0
                  ? Math.round((data.totalRetained / data.totalIncome) * 100)
                  : 0
              }
              onSurvivalSaved={() => {
                refreshUser?.();
              }}
            />
          )
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="min-h-[210px] rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(135deg,#032418,#064e3b)] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.22)] md:col-span-2">
            <div className="mb-12 flex items-start justify-between">
              <span className="text-sm font-semibold uppercase text-white/70">
                Daily Money Tip
              </span>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Lightbulb className="h-5 w-5 text-emerald-300" />
              </div>
            </div>

            <div className="text-2xl font-semibold text-white">
              <DailyTipCard
                isPaid={isPaid}
                isPending={isPending}
                isFree={isFree}
                user={user}
              />
            </div>
          </div>

          <div className="min-h-[210px] rounded-[28px] border border-yellow-400/20 bg-[linear-gradient(135deg,#4a3607,#6a520c)] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
            <div className="mb-10 flex items-start justify-between">
              <span className="text-sm font-semibold uppercase text-white/70">
                Money Left
              </span>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <PiggyBank className="h-5 w-5 text-[#ffe082]" />
              </div>
            </div>

            <p className="text-4xl font-bold text-white">
              {fmt(data.totalRetained)}
            </p>
            <p className="mt-2 text-lg text-white/80">Retained amount</p>
          </div>

          <div className="min-h-[210px] rounded-[28px] border border-sky-400/20 bg-[linear-gradient(135deg,#0b214d,#173b8f)] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
            <div className="mb-10 flex items-start justify-between">
              <span className="text-sm font-semibold uppercase text-white/70">
                This Month Spent
              </span>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <TrendingDown className="h-5 w-5 text-[#d6e4ff]" />
              </div>
            </div>

            <p className="text-4xl font-bold text-white">
              {fmt(data.thisMonthSpent)}
            </p>
            <p className="mt-2 text-lg text-white/70">
              vs {fmt(data.thisMonthIncome)} income
            </p>
          </div>

          <Link to="/tasks" className="block md:col-span-2">
            <div className="min-h-[210px] rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#182742,#0f1e36)] p-6 shadow-[0_14px_36px_rgba(0,0,0,0.22)] transition hover:border-white/20">
              <div className="mb-12 flex items-start justify-between">
                <span className="text-sm font-semibold uppercase text-white/70">
                  Tasks
                </span>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <ListChecks className="h-5 w-5 text-white/80" />
                </div>
              </div>

              <p className="text-2xl font-semibold text-white">
                Continue your daily challenge
              </p>
              <p className="mt-1 text-lg text-white/60">
                Track your current task progress
              </p>
              <p className="mt-3 font-semibold text-[#ffd84d]">
                Open tasks page
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}