import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingDown,
  PiggyBank,
  Newspaper,
  Clock,
  Sparkles,
  Play,
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

  const possibleIds = [item?.user_id, item?.owner_id, item?.profile_id]
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
      setSurvivalExpense(Number(userProfile?.monthly_survival_expense) || 0);
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
  const activeTask = pendingTasks.length > 0 ? pendingTasks[0] : tasks[0] || null;

  const safeSurvivalExpense = Number(survivalExpense) || 0;

  const moneyLeftStatus =
    safeSurvivalExpense <= 0
      ? "Set your survival expense to unlock smarter guidance."
      : walletMoney >= safeSurvivalExpense
        ? "You’re in control this month."
        : walletMoney > safeSurvivalExpense * 0.5
          ? "Careful — protect your essentials."
          : "You’re near your limit — adjust now.";

  const moneyLeftTone =
    safeSurvivalExpense <= 0
      ? "from-cyan-500/20 to-emerald-500/20 border-cyan-400/20"
      : walletMoney >= safeSurvivalExpense
        ? "from-emerald-500/20 to-teal-500/20 border-emerald-400/20"
        : walletMoney > safeSurvivalExpense * 0.5
          ? "from-yellow-500/20 to-amber-500/20 border-yellow-400/20"
          : "from-rose-500/20 to-red-500/20 border-rose-400/20";

  const moneyLeftBadge =
    safeSurvivalExpense <= 0
      ? "Smart Guide"
      : walletMoney >= safeSurvivalExpense
        ? "Safe"
        : walletMoney > safeSurvivalExpense * 0.5
          ? "Watch"
          : "Alert";

  const missionLabel = activeTask
    ? `Week ${activeTask.week} • Day ${activeTask.day}`
    : "No active mission";

  const missionTitle = activeTask?.title || "No active tasks right now";

  const missionSub =
    pendingCount > 0
      ? `${pendingCount} pending task${pendingCount > 1 ? "s" : ""}`
      : "You’re caught up for now";

  const activeBillboard = billboards[0] || null;
  const billboardImage =
    activeBillboard?.image_url ||
    activeBillboard?.thumbnail_url ||
    activeBillboard?.media_url ||
    activeBillboard?.photo_url ||
    "";

  const billboardTitle =
    activeBillboard?.title ||
    activeBillboard?.headline ||
    activeBillboard?.name ||
    "Featured Spotlight";

  const billboardSubtitle =
    activeBillboard?.subtitle ||
    activeBillboard?.description ||
    activeBillboard?.caption ||
    "Your future ad or promo space can live here.";

  const billboardCta =
    activeBillboard?.cta_label ||
    activeBillboard?.button_text ||
    "Learn more";

  return (
    <div className="relative isolate z-0 min-h-full">
      <div className="grad-green px-4 pb-2 pt-4 md:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 pr-12">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-white/50">Welcome back,</p>
            <h1 className="truncate text-xl font-bold leading-tight text-white">
              {user?.full_name || "Financial Champion"}
            </h1>
          </div>

          <Link to="/news" className="mr-2 shrink-0">
            <button className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/15">
              <Newspaper className="h-3.5 w-3.5" />
              News
            </button>
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-4xl space-y-4 px-4 pb-8 md:px-6">
        {isPending && (
          <div className="flex items-center gap-3 rounded-2xl border bg-secondary/20 p-3">
            <Clock className="h-5 w-5" />
            <div className="flex-1 text-sm">Enrollment Under Review</div>
            <Link to="/enroll">
              <Button size="sm">View</Button>
            </Link>
          </div>
        )}

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1228] shadow-[0_0_25px_rgba(16,185,129,0.08)]">
          <div className="relative h-[118px] sm:h-[126px]">
            {billboardImage ? (
              <img
                src={billboardImage}
                alt={billboardTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-[#141B3A] via-[#251B4A] to-[#0E3A54]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />

            <div className="absolute inset-0 flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 max-w-[72%]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                  Sponsored
                </p>
                <h3 className="mt-1 line-clamp-1 text-base font-bold leading-tight text-white">
                  {billboardTitle}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/80">
                  {billboardSubtitle}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-white/90">
                    {billboardCta}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/25 backdrop-blur-sm">
                  <Play className="h-5 w-5 fill-emerald-300 text-emerald-300" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 bg-black/20 py-2">
            <span className="h-1.5 w-4 rounded-full bg-emerald-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>
        </div>

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

        <div
          className={`rounded-3xl border bg-gradient-to-br p-4 shadow-[0_0_25px_rgba(16,185,129,0.08)] backdrop-blur-sm ${moneyLeftTone}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                Money Left
              </p>
              <h2 className="mt-2 text-3xl font-bold text-white">
                {fmt(walletMoney)}
              </h2>
              <p className="mt-2 max-w-[28rem] text-sm text-white/75">
                {moneyLeftStatus}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                {moneyLeftBadge}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <PiggyBank className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          {safeSurvivalExpense > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-white/50">
                  Survival Need
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {fmt(safeSurvivalExpense)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-white/50">
                  Wallet Sync
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Live from wallets
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="This Month Spent"
            value={fmt(thisMonthSpent)}
            sub={
              thisMonthSpent > 0
                ? "Within current month expenses"
                : "No expenses recorded this month"
            }
            icon={TrendingDown}
            variant="blue"
          />

          {activeTask ? (
            <Link to="/tasks" className="block h-full">
              <div className="h-full rounded-2xl border border-white/10 bg-[#0B1228] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                      Day Mission
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-snug text-white">
                      {missionTitle}
                    </p>
                    <p className="mt-1 text-xs text-white/55">{missionLabel}</p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                  </div>
                </div>

                <p className="mt-4 text-xs text-white/70">
                  Build awareness. Build control.
                </p>

                <p className="mt-2 text-xs text-amber-300">{missionSub}</p>

                {loading && (
                  <p className="mt-2 text-[11px] text-white/35">Refreshing…</p>
                )}
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0B1228] p-4 text-xs text-white/60">
              {loading ? "Loading tasks..." : "No active tasks"}
            </div>
          )}
        </div>

        <DailyTipCard
          isPaid={isPaid}
          isPending={isPending}
          isFree={isFree}
          user={user}
        />
      </div>
    </div>
  );
}