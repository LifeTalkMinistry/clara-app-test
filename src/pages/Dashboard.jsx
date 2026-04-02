import { useState } from "react";
import { TrendingDown, PiggyBank, ListChecks, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";

import EmergencyFundCard from "../components/EmergencyFundCard";
import StatCard from "../components/StatCard";
import DailyTipCard from "../components/DailyTipCard";

// TEMP MOCK DATA
const useUserRole = () => ({
  user: { full_name: "Max" },
  isPaid: true,
  isFree: false,
  isPending: false,
});

const useFinancialData = () => ({
  loading: false,
  totalRetained: 12000,
  thisMonthSpent: 8000,
  thisMonthIncome: 20000,
});

export default function Dashboard() {
  const { user, isFree, isPending } = useUserRole();
  const data = useFinancialData();

  const [survivalExpense, setSurvivalExpense] = useState(5000);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="grad-green px-4 md:px-6 pt-8 pb-6">
        <div className="max-w-4xl mx-auto flex justify-between">
          <div>
            <p className="text-white/50 text-sm">Welcome back,</p>
            <h1 className="text-3xl font-bold text-white">
              {user?.full_name || "Financial Champion"}
            </h1>
          </div>

          <Link to="/news">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-semibold">
              <Newspaper className="w-4 h-4" /> News
            </button>
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-6 mt-2 max-w-4xl mx-auto pb-8">
        {!isFree && !isPending && (
          <EmergencyFundCard
            moneyLeft={data.totalRetained}
            survivalExpense={survivalExpense}
            retentionRate={
              data.thisMonthIncome > 0
                ? Math.round((data.totalRetained / data.thisMonthIncome) * 100)
                : 0
            }
            onSurvivalSaved={(val) => setSurvivalExpense(val)}
          />
        )}

        <div className="grid grid-cols-2 gap-3 mb-4 auto-rows-fr">
          <DailyTipCard />

          <StatCard
            label="Money Left"
            value={fmt(data.totalRetained)}
            sub="Retained amount"
            icon={PiggyBank}
            variant="yellow"
          />

          <StatCard
            label="This Month Spent"
            value={fmt(data.thisMonthSpent)}
            sub={`vs ${fmt(data.thisMonthIncome)} income`}
            icon={TrendingDown}
            variant="blue"
          />

          <Link to="/tasks" className="block h-full">
            <div className="rounded-2xl p-4 bg-[#0F172A] border border-white/10 h-full flex flex-col justify-between">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-white/60">TASKS</span>
                <ListChecks className="w-4 h-4 text-white/60" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Complete your Day 1 task
                </p>
                <p className="text-xs text-white/60">Week 1 • Day 1</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}