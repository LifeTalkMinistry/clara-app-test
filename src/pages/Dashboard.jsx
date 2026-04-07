import { useState, useEffect, useMemo } from "react";
import {
  TrendingDown,
  PiggyBank,
  Newspaper,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import EmergencyFundCard from "../components/EmergencyFundCard";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import DailyTipCard from "../components/DailyTipCard";
import useUserRole from "../hooks/useUserRole";
import { getTotalBalance } from "@/utils/financialEngine";

const STORAGE_KEYS = {
  challengeTasks: "clara_challenge_tasks",
  taskSubmissions: "clara_task_submissions",
  billboards: "clara_billboards",
  expenses: "clara_expenses",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const normalizeString = (value) => String(value ?? "").trim();

const isOwnedByUser = (item, user) => {
  if (!user) return false;

  const itemEmail = normalizeString(
    item?.created_by ?? item?.user_email ?? item?.owner_email ?? item?.email
  ).toLowerCase();

  const userEmail = normalizeString(user?.email).toLowerCase();

  const itemUserId = normalizeString(
    item?.user_id ?? item?.owner_id ?? item?.profile_id
  );
  const currentUserId = normalizeString(user?.id);

  if (itemEmail && userEmail && itemEmail === userEmail) return true;
  if (itemUserId && currentUserId && itemUserId === currentUserId) return true;

  return false;
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

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [survivalExpense, setSurvivalExpense] = useState(0);
  const [walletMoney, setWalletMoney] = useState(0);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const update = () => {
      setWalletMoney(getTotalBalance());
    };

    update();
    window.addEventListener("storage", update);
    window.addEventListener("clara-wallets-updated", update);
    window.addEventListener("clara-expenses-updated", update);

    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("clara-wallets-updated", update);
      window.removeEventListener("clara-expenses-updated", update);
    };
  }, []);

  useEffect(() => {
    const syncSurvivalExpense = async () => {
      const fromUser = Number(user?.monthly_survival_expense) || 0;
      const fromLocal = getLocalSurvivalExpense();

      const finalValue = fromUser || fromLocal || 0;
      setSurvivalExpense(finalValue);

      if (user?.id && fromLocal > 0 && fromUser === 0) {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ monthly_survival_expense: fromLocal })
            .eq("id", user.id);

          if (!error) refreshUser?.();
        } catch {}
      }
    };

    syncSurvivalExpense();
  }, [user, refreshUser]);

  useEffect(() => {
    if (!user?.email && !user?.id) {
      setTasks([]);
      setSubmissions([]);
      setBillboards([]);
      setExpenses([]);
      return;
    }

    const loadDashboardData = () => {
      const allTasks = getStoredData(STORAGE_KEYS.challengeTasks);
      const allSubmissions = getStoredData(STORAGE_KEYS.taskSubmissions);
      const allBillboards = getStoredData(STORAGE_KEYS.billboards);
      const allExpenses = getStoredData(STORAGE_KEYS.expenses);

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
        .slice(0, 5);

      const userExpenses = allExpenses
        .filter((expense) => isOwnedByUser(expense, user))
        .map((expense) => ({
          ...expense,
          amount: Number(expense.amount) || 0,
          date: expense.date || expense.created_at || "",
        }));

      setTasks(activeTasks || []);
      setSubmissions(userSubmissions || []);
      setBillboards(activeBillboards || []);
      setExpenses(userExpenses || []);
    };

    loadDashboardData();

    window.addEventListener("storage", loadDashboardData);
    window.addEventListener("clara-expenses-updated", loadDashboardData);
    window.addEventListener("clara-wallets-updated", loadDashboardData);

    return () => {
      window.removeEventListener("storage", loadDashboardData);
      window.removeEventListener("clara-expenses-updated", loadDashboardData);
      window.removeEventListener("clara-wallets-updated", loadDashboardData);
    };
  }, [user?.email, user?.id]);

  const thisMonthSpent = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.reduce((sum, expense) => {
      const expenseDate = new Date(expense.date);
      if (Number.isNaN(expenseDate.getTime())) return sum;

      const sameYear = expenseDate.getFullYear() === currentYear;
      const sameMonth = expenseDate.getMonth() === currentMonth;

      return sameYear && sameMonth ? sum + Number(expense.amount || 0) : sum;
    }, 0);
  }, [expenses]);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n || 0);

  const submittedIds = new Set(submissions.map((s) => s.task_id));
  const pendingTasks = tasks.filter((t) => !submittedIds.has(t.id));
  const pendingCount = pendingTasks.length;
  const activeTask = tasks.length > 0 ? tasks[0] : null;

  return (
    <div className="min-h-full relative z-0 isolate">
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
            moneyLeft={walletMoney}
            survivalExpense={survivalExpense}
            retentionRate={0}
            onSurvivalSaved={(val) => {
              setSurvivalExpense(Number(val) || 0);
              refreshUser?.();
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <DailyTipCard
            isPaid={isPaid}
            isPending={isPending}
            isFree={isFree}
            user={user}
          />

          <StatCard
            label="Money Left"
            value={fmt(walletMoney)}
            sub="Available money"
            icon={PiggyBank}
            variant="yellow"
          />

          <StatCard
            label="This Month Spent"
            value={fmt(thisMonthSpent)}
            sub={
              thisMonthSpent > 0
                ? "Synced with current month expenses"
                : "No expenses recorded this month"
            }
            icon={TrendingDown}
            variant="blue"
          />

          {activeTask ? (
            <Link to="/tasks" className="block h-full">
              <div className="rounded-2xl p-4 bg-[#0F172A] border border-white/10 h-full">
                <p className="text-sm font-semibold text-white">
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
            </Link>
          ) : (
            <div className="rounded-2xl p-4 bg-[#0F172A] border border-white/10 text-xs text-white/60">
              No active tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}