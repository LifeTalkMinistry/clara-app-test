import { useState, useEffect, useMemo, useCallback } from "react";
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

const normalizeString = (value) => String(value ?? "").trim();

const isOwnedByUser = (item, user) => {
  if (!user || !item) return false;

  const userId = normalizeString(user?.id);
  const userEmail = normalizeString(user?.email).toLowerCase();

  const possibleIds = [
    item?.user_id,
    item?.owner_id,
    item?.profile_id,
  ]
    .map(normalizeString)
    .filter(Boolean);

  const possibleEmails = [
    item?.created_by,
    item?.user_email,
    item?.owner_email,
    item?.email,
  ]
    .map((value) => normalizeString(value).toLowerCase())
    .filter(Boolean);

  if (userId && possibleIds.includes(userId)) return true;
  if (userEmail && possibleEmails.includes(userEmail)) return true;

  return false;
};

const firstValidNumber = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
};

export default function Dashboard() {
  const { user, isPaid, isFree, isPending, refreshUser } = useUserRole();

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [survivalExpense, setSurvivalExpense] = useState(0);
  const [walletMoney, setWalletMoney] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fmt = useCallback((n) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));
  }, []);

  const loadWalletBalance = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setWalletMoney(0);
      return;
    }

    try {
      const { data, error } = await supabase.from("wallets").select("*");

      if (error) throw error;

      const ownedWallets = (data || []).filter((wallet) =>
        isOwnedByUser(wallet, user)
      );

      const total = ownedWallets.reduce((sum, wallet) => {
        return (
          sum +
          firstValidNumber(
            wallet?.balance,
            wallet?.current_balance,
            wallet?.wallet_balance,
            wallet?.available_balance,
            wallet?.amount
          )
        );
      }, 0);

      setWalletMoney(total);
    } catch (error) {
      console.error("Failed to load wallets:", error);
      setWalletMoney(0);
    }
  }, [user]);

  const loadDashboardData = useCallback(async () => {
    if (!user?.email && !user?.id) {
      setTasks([]);
      setSubmissions([]);
      setBillboards([]);
      setExpenses([]);
      setWalletMoney(0);
      setSurvivalExpense(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [
        tasksRes,
        submissionsRes,
        billboardsRes,
        expensesRes,
        profilesRes,
        walletsRes,
      ] = await Promise.all([
        supabase
          .from("challenge_tasks")
          .select("*")
          .eq("is_active", true)
          .order("week", { ascending: true })
          .order("day", { ascending: true }),

        supabase.from("task_submissions").select("*"),

        supabase
          .from("billboards")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5),

        supabase.from("expenses").select("*"),

        supabase.from("profiles").select("*"),

        supabase.from("wallets").select("*"),
      ]);

      if (tasksRes.error) {
        console.error("Failed to load tasks:", tasksRes.error);
      }
      if (submissionsRes.error) {
        console.error("Failed to load submissions:", submissionsRes.error);
      }
      if (billboardsRes.error) {
        console.error("Failed to load billboards:", billboardsRes.error);
      }
      if (expensesRes.error) {
        console.error("Failed to load expenses:", expensesRes.error);
      }
      if (profilesRes.error) {
        console.error("Failed to load profiles:", profilesRes.error);
      }
      if (walletsRes.error) {
        console.error("Failed to load wallets:", walletsRes.error);
      }

      const userSubmissions = (submissionsRes.data || []).filter((item) =>
        isOwnedByUser(item, user)
      );

      const userExpenses = (expensesRes.data || [])
        .filter((expense) => isOwnedByUser(expense, user))
        .map((expense) => ({
          ...expense,
          amount: Number(expense.amount) || 0,
          date: expense.date || expense.created_at || "",
        }));

      const userProfile =
        (profilesRes.data || []).find((profile) => isOwnedByUser(profile, user)) ||
        null;

      const userWallets = (walletsRes.data || []).filter((wallet) =>
        isOwnedByUser(wallet, user)
      );

      const totalWalletMoney = userWallets.reduce((sum, wallet) => {
        return (
          sum +
          firstValidNumber(
            wallet?.balance,
            wallet?.current_balance,
            wallet?.wallet_balance,
            wallet?.available_balance,
            wallet?.amount
          )
        );
      }, 0);

      setTasks(tasksRes.data || []);
      setSubmissions(userSubmissions);
      setBillboards(billboardsRes.data || []);
      setExpenses(userExpenses);
      setSurvivalExpense(
        Number(userProfile?.monthly_survival_expense) || 0
      );
      setWalletMoney(totalWalletMoney);
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    const channel = supabase
      .channel(`dashboard-live-${user?.id || user?.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        () => {
          loadWalletBalance();
          loadDashboardData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        () => {
          loadWalletBalance();
          loadDashboardData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_tasks" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_submissions" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billboards" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => loadDashboardData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, loadDashboardData, loadWalletBalance]);

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
            onSurvivalSaved={async (val) => {
              const nextValue = Number(val) || 0;
              setSurvivalExpense(nextValue);

              try {
                if (!user?.id) return;

                const { error } = await supabase
                  .from("profiles")
                  .update({ monthly_survival_expense: nextValue })
                  .eq("id", user.id);

                if (error) {
                  console.error("Failed to save survival expense:", error);
                  return;
                }

                refreshUser?.();
                loadDashboardData();
              } catch (error) {
                console.error("Failed to save survival expense:", error);
              }
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
            sub="Synced with wallets"
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

                {loading && (
                  <p className="text-[11px] text-white/40 mt-2">Refreshing…</p>
                )}
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl p-4 bg-[#0F172A] border border-white/10 text-xs text-white/60">
              {loading ? "Loading tasks..." : "No active tasks"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}