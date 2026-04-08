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

const toNumber = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (!Number.isNaN(num) && num !== 0) return num;
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

  const [wallpaper, setWallpaper] = useState("");
  const [wallpaperOpacity, setWallpaperOpacity] = useState(0.3);

  const loadWalletBalance = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setWalletMoney(0);
      return;
    }

    let query = supabase.from("wallets").select("*");

    if (user?.id) {
      query = query.or(
        `user_id.eq.${user.id},owner_id.eq.${user.id},profile_id.eq.${user.id}`
      );
    } else if (user?.email) {
      query = query.or(
        `created_by.eq.${user.email},user_email.eq.${user.email},owner_email.eq.${user.email},email.eq.${user.email}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load wallets:", error);
      setWalletMoney(0);
      return;
    }

    const total = (data || []).reduce((sum, wallet) => {
      return (
        sum +
        toNumber(
          wallet?.current_balance,
          wallet?.balance,
          wallet?.amount,
          wallet?.wallet_balance,
          wallet?.available_balance
        )
      );
    }, 0);

    setWalletMoney(total);
  }, [user?.id, user?.email]);

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
        profileRes,
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

        user?.id
          ? supabase
              .from("profiles")
              .select("monthly_survival_expense")
              .eq("id", user.id)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (tasksRes.error) console.error("Failed to load tasks:", tasksRes.error);
      if (submissionsRes.error) {
        console.error("Failed to load submissions:", submissionsRes.error);
      }
      if (billboardsRes.error) {
        console.error("Failed to load billboards:", billboardsRes.error);
      }
      if (expensesRes.error) {
        console.error("Failed to load expenses:", expensesRes.error);
      }
      if (profileRes?.error) {
        console.error("Failed to load profile:", profileRes.error);
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

      setTasks(tasksRes.data || []);
      setSubmissions(userSubmissions || []);
      setBillboards(billboardsRes.data || []);
      setExpenses(userExpenses || []);
      setSurvivalExpense(
        Number(profileRes?.data?.monthly_survival_expense) || 0
      );

      await loadWalletBalance();
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, [user, loadWalletBalance]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const savedWallpaper = localStorage.getItem("clara_wallpaper");
    const savedOpacity = localStorage.getItem("clara_wallpaper_opacity");

    if (savedWallpaper) setWallpaper(savedWallpaper);

    if (savedOpacity) {
      const num = Number(savedOpacity);
      if (!Number.isNaN(num)) {
        setWallpaperOpacity(Math.max(0, Math.min(num, 0.5)));
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    const channel = supabase
      .channel(`dashboard-live-${user?.id || user?.email}`)
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
        { event: "*", schema: "public", table: "wallets" },
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
  }, [user?.id, user?.email, loadDashboardData]);

  const handleWallpaperUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setWallpaper(result);
        localStorage.setItem("clara_wallpaper", result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpacityChange = (value) => {
    const num = Math.max(0, Math.min(Number(value) || 0.3, 0.5));
    setWallpaperOpacity(num);
    localStorage.setItem("clara_wallpaper_opacity", String(num));
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(n || 0);

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
          <>
            <div className="mb-3 rounded-2xl border border-white/10 bg-[#0F172A] p-3">
              <p className="text-xs font-semibold text-white mb-2">
                Emergency Fund Background
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={handleWallpaperUpload}
                className="block w-full text-xs text-white/80 mb-3"
              />

              <div>
                <p className="text-[11px] text-white/60 mb-1">
                  Background Opacity
                </p>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={wallpaperOpacity}
                  onChange={(e) => handleOpacityChange(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <EmergencyFundCard
              moneyLeft={walletMoney}
              survivalExpense={survivalExpense}
              retentionRate={0}
              wallpaperUrl={wallpaper}
              wallpaperOpacity={wallpaperOpacity}
              onSurvivalSaved={async (val) => {
                const nextValue = Number(val) || 0;
                setSurvivalExpense(nextValue);

                if (user?.id) {
                  const { error } = await supabase
                    .from("profiles")
                    .update({ monthly_survival_expense: nextValue })
                    .eq("id", user.id);

                  if (error) {
                    console.error("Failed to save survival expense:", error);
                  } else {
                    refreshUser?.();
                    loadDashboardData();
                  }
                }
              }}
            />
          </>
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