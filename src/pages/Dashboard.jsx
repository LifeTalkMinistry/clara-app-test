import { useState, useEffect } from "react";
import {
  TrendingDown,
  PiggyBank,
  ListChecks,
  Newspaper,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import EmergencyFundCard from "../components/EmergencyFundCard";
import VideoPlayer from "../components/VideoPlayer";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import DailyTipCard from "../components/DailyTipCard";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "../hooks/useFinancialData";

const STORAGE_KEYS = {
  challengeTasks: "clara_challenge_tasks",
  taskSubmissions: "clara_task_submissions",
  billboards: "clara_billboards",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getLocalSurvivalExpense = () => {
  try {
    const monthly = localStorage.getItem("monthly_survival_expense");
    if (monthly && Number(monthly) > 0) return Number(monthly);

    const clara = localStorage.getItem("clara_survival_expense");
    if (clara && Number(clara) > 0) return Number(clara);

    const user = JSON.parse(localStorage.getItem("clara_user") || "null");
    if (
      user?.monthly_survival_expense &&
      Number(user.monthly_survival_expense) > 0
    ) {
      return Number(user.monthly_survival_expense);
    }

    return 0;
  } catch {
    return 0;
  }
};

export default function Dashboard() {
  const { user, isPaid, isFree, isPending, refreshUser } = useUserRole();
  const data = useFinancialData(user?.email);

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [survivalExpense, setSurvivalExpense] = useState(0);

  useEffect(() => {
    const syncSurvivalExpense = async () => {
      const fromUser = Number(user?.monthly_survival_expense) || 0;
      const fromLocal = getLocalSurvivalExpense();

      const finalValue = fromUser || fromLocal || 0;
      setSurvivalExpense(finalValue);

      // auto-sync local -> supabase if db is still empty
      if (user?.id && fromLocal > 0 && fromUser === 0) {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ monthly_survival_expense: fromLocal })
            .eq("id", user.id);

          if (error) {
            console.error("Auto-sync failed:", error);
            return;
          }

          refreshUser?.();
        } catch (err) {
          console.error("Auto-sync failed:", err);
        }
      }
    };

    syncSurvivalExpense();
  }, [user, refreshUser]);

  useEffect(() => {
    const syncFromLocal = () => {
      const fromLocal = getLocalSurvivalExpense();
      if (fromLocal > 0) {
        setSurvivalExpense(fromLocal);
      }
    };

    syncFromLocal();
    window.addEventListener("focus", syncFromLocal);

    return () => {
      window.removeEventListener("focus", syncFromLocal);
    };
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const allTasks = getStoredData(STORAGE_KEYS.challengeTasks);
    const allSubmissions = getStoredData(STORAGE_KEYS.taskSubmissions);
    const allBillboards = getStoredData(STORAGE_KEYS.billboards);

    const activeTasks = allTasks
      .filter((item) => item.is_active)
      .sort((a, b) => {
        const weekDiff = (a.week || 0) - (b.week || 0);
        if (weekDiff !== 0) return weekDiff;
        return (a.day || 0) - (b.day || 0);
      });

    const userSubmissions = allSubmissions.filter(
      (item) => item.created_by === user.email
    );

    const activeBillboards = allBillboards
      .filter((item) => item.is_active)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0, 5);

    setTasks(activeTasks || []);
    setSubmissions(userSubmissions || []);
    setBillboards(activeBillboards || []);
  }, [user?.email]);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n || 0);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const submittedIds = new Set(submissions.map((s) => s.task_id));
  const pendingTasks = tasks.filter((t) => !submittedIds.has(t.id));
  const pendingCount = pendingTasks.length;
  const activeTask = tasks.length > 0 ? tasks[0] : null;

  return (
    <div className="min-h-full relative z-0 isolate">
      <div className="grad-green px-4 md:px-6 pt-8 pb-6 relative z-0">
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

      <div className="px-4 md:px-6 mt-2 max-w-4xl mx-auto pb-8 relative z-0">
        {isPending && (
          <div className="mb-3 p-3 rounded-2xl bg-secondary/20 border flex items-center gap-3">
            <Clock className="w-5 h-5" />
            <div className="flex-1 text-sm">Enrollment Under Review</div>
            <Link to="/enroll">
              <Button size="sm">View</Button>
            </Link>
          </div>
        )}

        {!!user && (
          <EmergencyFundCard
            moneyLeft={data.totalRetained}
            survivalExpense={survivalExpense}
            retentionRate={
              data.totalIncome > 0
                ? Math.round((data.totalRetained / data.totalIncome) * 100)
                : 0
            }
            onSurvivalSaved={(val) => {
              setSurvivalExpense(Number(val) || 0);
              refreshUser?.();
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-3 mb-4 auto-rows-fr">
          <DailyTipCard
            isPaid={isPaid}
            isPending={isPending}
            isFree={isFree}
            user={user}
          />

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

          {activeTask ? (
            <Link to="/tasks" className="block h-full">
              <div className="rounded-2xl p-4 bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 shadow-lg h-full flex flex-col justify-between">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-white/60">TASKS</span>
                  <ListChecks className="w-4 h-4 text-white/60" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white line-clamp-2">
                    {activeTask.title}
                  </p>

                  <p className="text-xs text-white/60">
                    Week {activeTask.week} • Day {activeTask.day}
                  </p>

                  {pendingCount > 0 && (
                    <p className="text-xs text-amber-400 mt-1">
                      {pendingCount} pending
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl p-4 bg-[#0F172A] border border-white/10 h-full flex items-center justify-center text-xs text-white/60">
              No active tasks
            </div>
          )}
        </div>

        {billboards.length > 0 && (
          <div className="space-y-3">
            {billboards.slice(0, 2).map((bb) => (
              <div
                key={bb.id}
                className="bg-white rounded-2xl border overflow-hidden"
              >
                {bb.media_url && (
                  <VideoPlayer url={bb.media_url} label={bb.title} />
                )}
                <div className="p-4">
                  <p className="font-bold text-sm">{bb.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}