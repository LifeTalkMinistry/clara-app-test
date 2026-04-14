import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  TrendingDown,
  PiggyBank,
  Newspaper,
  Clock,
  Sparkles,
  Play,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Rocket,
  CheckCircle2,
  ShieldCheck,
  CalendarDays,
  Flag,
  Bell,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import EmergencyFundCard from "../components/EmergencyFundCard";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import DailyTipCard from "../components/DailyTipCard";
import useUserRole from "../hooks/useUserRole";

const normalizeString = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeString(value).toLowerCase();

const ENROLLMENT_PENDING_STATUSES = new Set([
  "pending",
  "under_review",
  "payment_pending",
]);

const ENROLLMENT_APPROVED_STATUSES = new Set([
  "approved",
  "active",
  "enrolled",
]);

const ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES = new Set([
  "",
  "none",
  "free",
  "rejected",
  "resubmit_required",
  "cancelled",
]);

const isOwnedByUser = (item, user) => {
  if (!user || !item) return false;

  const userId = normalizeString(user?.id);
  const userEmail = normalizeString(user?.email).toLowerCase();

  const possibleIds = [item?.user_id, item?.owner_id, item?.profile_id, item?.id]
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

const isTruthyActive = (value) => {
  return value === true || value === "true" || value === 1 || value === "1";
};

const getBillboardMediaType = (item) => {
  const explicitType = normalizeString(item?.media_type).toLowerCase();
  if (explicitType) return explicitType;

  const url = normalizeString(
    item?.media_url ||
      item?.image_url ||
      item?.thumbnail_url ||
      item?.photo_url ||
      ""
  ).toLowerCase();

  if (!url) return "none";

  if (
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes(".mov") ||
    url.includes(".m4v") ||
    url.includes("video")
  ) {
    return "video";
  }

  if (
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".webp") ||
    url.includes(".gif") ||
    url.includes(".svg")
  ) {
    return "image";
  }

  if (url.includes(".pdf")) return "pdf";

  return "file";
};

const getOnboardingStorageKey = (userId) =>
  `clara_program_onboarding_completed_${userId || "guest"}`;

const getDashboardPrefsStorageKey = (userId) =>
  `clara_dashboard_prefs_${userId || "guest"}`;

function readDashboardPrefs(userId) {
  if (!userId) {
    return {
      reminderTime: "",
      financialGoal: "",
    };
  }

  try {
    const raw = localStorage.getItem(getDashboardPrefsStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      reminderTime: normalizeString(parsed?.reminderTime || ""),
      financialGoal: normalizeString(parsed?.financialGoal || ""),
    };
  } catch (error) {
    console.error("Failed to read dashboard prefs:", error);
    return {
      reminderTime: "",
      financialGoal: "",
    };
  }
}

function persistDashboardPrefs(userId, updates) {
  if (!userId) return;

  try {
    const current = readDashboardPrefs(userId);
    localStorage.setItem(
      getDashboardPrefsStorageKey(userId),
      JSON.stringify({
        ...current,
        ...updates,
      })
    );
  } catch (error) {
    console.error("Failed to save dashboard prefs:", error);
  }
}

function readStoredSurvivalExpense() {
  try {
    const direct = Number(localStorage.getItem("monthly_survival_expense"));
    if (Number.isFinite(direct) && direct > 0) return direct;

    const clara = Number(localStorage.getItem("clara_survival_expense"));
    if (Number.isFinite(clara) && clara > 0) return clara;

    const user = JSON.parse(localStorage.getItem("clara_user") || "null");
    const userValue = Number(user?.monthly_survival_expense);
    if (Number.isFinite(userValue) && userValue > 0) return userValue;
  } catch (error) {
    console.error("Failed to read survival expense:", error);
  }

  return 0;
}

const isProgramApproved = (profile, isPaid, enrollmentRecord = null) => {
  const status = normalizeLower(profile?.status);
  const enrollmentStatus = normalizeLower(
    enrollmentRecord?.status || profile?.enrollment_status
  );
  const plan = normalizeLower(profile?.plan);
  const role = normalizeLower(profile?.role);

  return (
    isPaid === true ||
    profile?.is_enrolled === true ||
    profile?.program_active === true ||
    role === "paid_user" ||
    (plan && plan !== "free") ||
    ENROLLMENT_APPROVED_STATUSES.has(status) ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus)
  );
};

const shouldForceToEnroll = (profile, enrollmentRecord, isPaid) => {
  const role = normalizeLower(profile?.role);
  const plan = normalizeLower(profile?.plan);
  const profileStatus = normalizeLower(profile?.status);
  const enrollmentStatus = normalizeLower(
    enrollmentRecord?.status || profile?.enrollment_status
  );

  const hasApproved =
    isProgramApproved(profile, isPaid, enrollmentRecord) ||
    ENROLLMENT_APPROVED_STATUSES.has(profileStatus) ||
    ENROLLMENT_APPROVED_STATUSES.has(enrollmentStatus);

  const pending =
    ENROLLMENT_PENDING_STATUSES.has(profileStatus) ||
    ENROLLMENT_PENDING_STATUSES.has(enrollmentStatus);

  if (hasApproved || pending) return false;

  const freeRole = !role || role === "free_user" || role === "user";
  const freePlan = !plan || plan === "free";

  if (!enrollmentRecord) return false;

  if (
    freeRole &&
    freePlan &&
    ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES.has(enrollmentStatus)
  ) {
    return true;
  }

  if (
    freeRole &&
    freePlan &&
    ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES.has(profileStatus)
  ) {
    return true;
  }

  return false;
};

const OnboardingActionBar = ({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextDisabled = false,
  nextClassName = "",
}) => {
  return (
    <div className="sticky bottom-0 z-20 -mx-5 mt-6 border-t border-white/10 bg-[#071120]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl md:-mx-6 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="w-full rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/5 sm:w-auto"
          >
            {backLabel}
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        <button
          onClick={onNext}
          disabled={nextDisabled}
          className={`w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${nextClassName}`}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isPaid, isFree, isPending, refreshUser } = useUserRole();

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [billboards, setBillboards] = useState([]);
  const [survivalExpense, setSurvivalExpense] = useState(0);
  const [walletMoney, setWalletMoney] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profileData, setProfileData] = useState(null);
  const [latestEnrollment, setLatestEnrollment] = useState(null);
  const [guardChecked, setGuardChecked] = useState(false);

  const [showProgramStart, setShowProgramStart] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [commitmentChecked, setCommitmentChecked] = useState(false);
  const [nickname, setNickname] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [financialGoal, setFinancialGoal] = useState("");

  const refreshTimeoutRef = useRef(null);
  const trackedViewIdsRef = useRef(new Set());
  const trackedClickIdsRef = useRef(new Set());
  const clickInFlightIdsRef = useRef(new Set());
  const approvalTriggeredRef = useRef(false);

  const fmt = useCallback((n) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(n || 0));
  }, []);

  const markOnboardingCompleted = useCallback(async () => {
    if (!user?.id) return;

    try {
      localStorage.setItem(getOnboardingStorageKey(user.id), "true");
    } catch (error) {
      console.error("Failed to persist onboarding completion:", error);
    }

    try {
      const updates = {
        onboarding_completed: true,
        onboarding_step: 999,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.warn("Profiles table does not accept onboarding fields yet:", error);
      }
    } catch (error) {
      console.error("Failed to save onboarding completion:", error);
    }
  }, [user?.id]);

  const isOnboardingCompleted = useCallback(() => {
    if (!user?.id) return false;

    const dbCompleted =
      profileData?.onboarding_completed === true ||
      Number(profileData?.onboarding_step) >= 999;

    if (dbCompleted) return true;

    try {
      return localStorage.getItem(getOnboardingStorageKey(user.id)) === "true";
    } catch (error) {
      console.error("Failed to read onboarding completion:", error);
      return false;
    }
  }, [user?.id, profileData]);

  const saveOnboardingDraft = useCallback(async () => {
    if (!user?.id) return true;

    setSavingOnboarding(true);

    try {
      const nextName = normalizeString(nickname);
      persistDashboardPrefs(user.id, {
        reminderTime,
        financialGoal,
      });

      const updates = {
        onboarding_step: onboardingStep,
      };

      if (nextName) {
        updates.full_name = nextName;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) {
        console.warn("Optional onboarding fields were not saved to DB:", error);
      }

      return true;
    } catch (error) {
      console.error("Failed to save onboarding draft:", error);
      return false;
    } finally {
      setSavingOnboarding(false);
    }
  }, [user?.id, nickname, reminderTime, financialGoal, onboardingStep]);

  const goToNextOnboardingStep = useCallback(async () => {
    await saveOnboardingDraft();
    setOnboardingStep((prev) => prev + 1);
  }, [saveOnboardingDraft]);

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
      setProfileData(null);
      setLatestEnrollment(null);
      setLoading(false);
      setGuardChecked(true);
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
        enrollmentsRes,
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
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(10),

        supabase.from("expenses").select("*"),

        supabase.from("profiles").select("*"),

        supabase.from("wallets").select("*"),

        supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
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
      if (profilesRes.error) {
        console.error("Failed to load profiles:", profilesRes.error);
      }
      if (walletsRes.error) {
        console.error("Failed to load wallets:", walletsRes.error);
      }
      if (enrollmentsRes.error) {
        console.error("Failed to load enrollments:", enrollmentsRes.error);
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

      const enrollmentRecord = (enrollmentsRes.data || [])[0] || null;

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

      const activeBillboards = (billboardsRes.data || []).filter(
        (item) =>
          isTruthyActive(item?.is_active) ||
          item?.is_active === null ||
          item?.is_active === undefined
      );

      setTasks(tasksRes.data || []);
      setSubmissions(userSubmissions);
      setBillboards(activeBillboards);
      setExpenses(userExpenses);
      setProfileData(userProfile);
      setLatestEnrollment(enrollmentRecord);
      setSurvivalExpense(readStoredSurvivalExpense());
      setWalletMoney(totalWalletMoney);

      if (!nickname) {
        setNickname(
          normalizeString(userProfile?.full_name || user?.full_name || "")
        );
      }

      const storedPrefs = readDashboardPrefs(user?.id);

      if (!reminderTime) {
        setReminderTime(storedPrefs.reminderTime);
      }

      if (!financialGoal) {
        setFinancialGoal(storedPrefs.financialGoal);
      }

      const approved = isProgramApproved(userProfile, isPaid, enrollmentRecord);
      const onboardingDone =
        userProfile?.onboarding_completed === true ||
        Number(userProfile?.onboarding_step) >= 999 ||
        (user?.id
          ? localStorage.getItem(getOnboardingStorageKey(user.id)) === "true"
          : false);

      if (approved && !onboardingDone && !showOnboarding) {
        setShowProgramStart(true);
      } else if (onboardingDone) {
        setShowProgramStart(false);
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
      setGuardChecked(true);
    }
  }, [
    user,
    isPaid,
    nickname,
    reminderTime,
    financialGoal,
    showOnboarding,
  ]);

  const loadEverything = useCallback(() => {
    loadWalletBalance();
    loadDashboardData();
  }, [loadWalletBalance, loadDashboardData]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      loadEverything();
    }, 350);
  }, [loadEverything]);

  const trackBillboardView = useCallback(
    async (billboardId) => {
      if (!billboardId || !user?.id) return;
      if (trackedViewIdsRef.current.has(billboardId)) return;

      trackedViewIdsRef.current.add(billboardId);

      try {
        const { data: existing, error: existingError } = await supabase
          .from("billboard_views")
          .select("id")
          .eq("billboard_id", billboardId)
          .eq("viewer_user_id", user.id)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing) return;

        const { error: insertError } = await supabase
          .from("billboard_views")
          .insert({
            billboard_id: billboardId,
            viewer_user_id: user.id,
          });

        if (insertError) throw insertError;
      } catch (error) {
        console.error("View tracking failed:", error);
      }
    },
    [user?.id]
  );

  const trackBillboardClick = useCallback(
    async (billboardId) => {
      if (!billboardId || !user?.id) return false;

      if (trackedClickIdsRef.current.has(billboardId)) {
        return false;
      }

      if (clickInFlightIdsRef.current.has(billboardId)) {
        return false;
      }

      clickInFlightIdsRef.current.add(billboardId);

      try {
        const { data: existing, error: existingError } = await supabase
          .from("billboard_clicks")
          .select("id")
          .eq("billboard_id", billboardId)
          .eq("viewer_user_id", user.id)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
          trackedClickIdsRef.current.add(billboardId);
          return false;
        }

        const { error: insertError } = await supabase
          .from("billboard_clicks")
          .insert({
            billboard_id: billboardId,
            viewer_user_id: user.id,
          });

        if (insertError) {
          const message = String(insertError?.message || "").toLowerCase();
          const details = String(insertError?.details || "").toLowerCase();

          if (
            message.includes("duplicate") ||
            message.includes("unique") ||
            details.includes("duplicate") ||
            details.includes("unique")
          ) {
            trackedClickIdsRef.current.add(billboardId);
            return false;
          }

          throw insertError;
        }

        trackedClickIdsRef.current.add(billboardId);
        return true;
      } catch (error) {
        console.error("Click tracking failed:", error);
        return false;
      } finally {
        clickInFlightIdsRef.current.delete(billboardId);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    window.addEventListener("clara-expenses-updated", scheduleRefresh);
    window.addEventListener("clara-finance-updated", scheduleRefresh);
    window.addEventListener("clara-wallets-updated", scheduleRefresh);
    window.addEventListener(
      "clara-wallet-transactions-updated",
      scheduleRefresh
    );

    const channel = supabase
      .channel(`dashboard-live-${user?.id || user?.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_tasks" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_submissions" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billboards" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async (payload) => {
          scheduleRefresh();

          const newData = payload?.new || {};
          const oldData = payload?.old || {};
          const belongsToUser =
            normalizeString(newData?.id) === normalizeString(user?.id) ||
            normalizeString(newData?.email).toLowerCase() ===
              normalizeString(user?.email).toLowerCase();

          if (!belongsToUser) return;

          const wasApproved = isProgramApproved(oldData, false, latestEnrollment);
          const nowApproved = isProgramApproved(newData, isPaid, latestEnrollment);

          if (!wasApproved && nowApproved && !approvalTriggeredRef.current) {
            approvalTriggeredRef.current = true;

            try {
              const completed =
                localStorage.getItem(getOnboardingStorageKey(user.id)) === "true";

              if (!completed) {
                setShowProgramStart(true);
                setShowOnboarding(false);
                setOnboardingStep(Number(newData?.onboarding_step) || 0);
              }
            } catch (error) {
              console.error("Failed handling approval transition:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("clara-expenses-updated", scheduleRefresh);
      window.removeEventListener("clara-finance-updated", scheduleRefresh);
      window.removeEventListener("clara-wallets-updated", scheduleRefresh);
      window.removeEventListener(
        "clara-wallet-transactions-updated",
        scheduleRefresh
      );

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, scheduleRefresh, isPaid, latestEnrollment]);

  useEffect(() => {
    if (!guardChecked || !profileData) return;

    const shouldRedirect = shouldForceToEnroll(profileData, latestEnrollment, isPaid);

    if (shouldRedirect) {
      navigate("/enroll", { replace: true });
    }
  }, [guardChecked, profileData, latestEnrollment, isPaid, navigate]);

  useEffect(() => {
    if (!user?.id) return;

    const approved = isProgramApproved(profileData, isPaid, latestEnrollment);
    const onboardingDone = isOnboardingCompleted();

    if (approved && !onboardingDone && !showOnboarding) {
      setShowProgramStart(true);
    }

    if (onboardingDone) {
      setShowProgramStart(false);
    }
  }, [
    user?.id,
    profileData,
    latestEnrollment,
    isPaid,
    showOnboarding,
    isOnboardingCompleted,
  ]);

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
        ? "You are in control this month."
        : walletMoney > safeSurvivalExpense * 0.5
          ? "Careful — protect your essentials."
          : "You are near your limit — adjust now.";

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
      : "You are caught up for now";

  const activeBillboard =
    billboards.find((item) => isTruthyActive(item?.is_active)) ||
    billboards[0] ||
    null;

  useEffect(() => {
    if (activeBillboard?.id) {
      trackBillboardView(activeBillboard.id);
    }
  }, [activeBillboard?.id, trackBillboardView]);

  const billboardMediaUrl = normalizeString(
    activeBillboard?.media_url ||
      activeBillboard?.image_url ||
      activeBillboard?.thumbnail_url ||
      activeBillboard?.photo_url ||
      ""
  );

  const billboardTitle = normalizeString(
    activeBillboard?.title ||
      activeBillboard?.headline ||
      activeBillboard?.name ||
      ""
  );

  const billboardSubtitle = normalizeString(
    activeBillboard?.body ||
      activeBillboard?.subtitle ||
      activeBillboard?.description ||
      activeBillboard?.caption ||
      ""
  );

  const billboardTag = normalizeString(
    activeBillboard?.tag_label ||
      activeBillboard?.tag ||
      activeBillboard?.badge ||
      ""
  );

  const billboardCta = normalizeString(
    activeBillboard?.cta_label ||
      activeBillboard?.button_text ||
      ""
  );

  const billboardTargetUrl = normalizeString(
    activeBillboard?.cta_url || billboardMediaUrl || ""
  );

  const billboardMediaType = getBillboardMediaType(activeBillboard);
  const hasBillboardContent =
    !!billboardMediaUrl || !!billboardTitle || !!billboardSubtitle;

  const billboardClickable = !!billboardTargetUrl;

  const openBillboardTarget = useCallback(async () => {
    if (!billboardTargetUrl) return;

    if (activeBillboard?.id) {
      await trackBillboardClick(activeBillboard.id);
    }

    window.open(billboardTargetUrl, "_blank", "noopener,noreferrer");
  }, [billboardTargetUrl, activeBillboard?.id, trackBillboardClick]);

  const startProgramFlow = () => {
    setShowProgramStart(false);
    setShowOnboarding(true);
    setOnboardingStep(Number(profileData?.onboarding_step) || 0);
  };

  const closeProgramStart = () => {
    setShowProgramStart(false);
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
  };

  const finishOnboarding = async () => {
    await saveOnboardingDraft();
    await markOnboardingCompleted();
    setShowOnboarding(false);
    setShowProgramStart(false);
    refreshUser?.();
    navigate("/tasks");
  };

  if (!guardChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061018] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
          <p className="text-sm text-white/75">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate z-0 min-h-full">
      <div className="grad-green px-4 pb-2 pt-4 md:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 pr-12">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-white/50">Welcome back,</p>
            <h1 className="truncate text-xl font-bold leading-tight text-white">
              {user?.full_name || nickname || "Financial Champion"}
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

      <div className="mx-auto mt-2 max-w-4xl space-y-3 px-4 pb-8 md:space-y-4 md:px-6">
        {isPending && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-secondary/20 p-3">
            <Clock className="h-5 w-5 shrink-0" />
            <div className="flex-1 text-sm">Enrollment Under Review</div>
            <Link to="/enroll">
              <Button size="sm">View</Button>
            </Link>
          </div>
        )}

        {hasBillboardContent && (
          <div
            className={`overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1228] shadow-[0_0_25px_rgba(16,185,129,0.08)] ${
              billboardClickable ? "cursor-pointer" : ""
            }`}
            onClick={billboardClickable ? openBillboardTarget : undefined}
            role={billboardClickable ? "button" : undefined}
            tabIndex={billboardClickable ? 0 : undefined}
            onKeyDown={
              billboardClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBillboardTarget();
                    }
                  }
                : undefined
            }
          >
            <div className="relative h-[132px] sm:h-[160px]">
              {billboardMediaUrl ? (
                billboardMediaType === "video" ? (
                  <video
                    src={billboardMediaUrl}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : billboardMediaType === "image" ? (
                  <img
                    src={billboardMediaUrl}
                    alt={billboardTitle || "Billboard"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-[#141B3A] via-[#251B4A] to-[#0E3A54]">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/85">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        {billboardMediaType === "pdf" ? "PDF Attached" : "File Attached"}
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full w-full bg-gradient-to-r from-[#141B3A] via-[#251B4A] to-[#0E3A54]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />

              <div className="absolute inset-0 flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 max-w-[72%]">
                  {!!billboardTag && (
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                      {billboardTag}
                    </p>
                  )}

                  {!!billboardTitle && (
                    <h3 className="mt-1 line-clamp-1 text-base font-bold leading-tight text-white">
                      {billboardTitle}
                    </h3>
                  )}

                  {!!billboardSubtitle && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/80">
                      {billboardSubtitle}
                    </p>
                  )}

                  {!!billboardCta && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/90">
                        <span>{billboardCta}</span>
                        {billboardClickable && <ExternalLink className="h-3 w-3" />}
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/25 backdrop-blur-sm">
                    {billboardMediaType === "video" ? (
                      <Play className="h-5 w-5 fill-emerald-300 text-emerald-300" />
                    ) : billboardMediaType === "image" ? (
                      <ImageIcon className="h-5 w-5 text-emerald-300" />
                    ) : billboardMediaType === "pdf" || billboardMediaType === "file" ? (
                      <FileText className="h-5 w-5 text-emerald-300" />
                    ) : (
                      <Play className="h-5 w-5 fill-emerald-300 text-emerald-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>
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
            }}
          />
        )}

        <div
          className={`rounded-3xl border bg-gradient-to-br p-4 shadow-[0_0_25px_rgba(16,185,129,0.08)] backdrop-blur-sm ${moneyLeftTone}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
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
                  <div className="min-w-0 flex-1">
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
                  <p className="mt-2 text-[11px] text-white/35">Refreshing...</p>
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

      {showProgramStart && (
        <div className="fixed bottom-24 right-4 z-[70] w-[88%] max-w-[290px] animate-[bounce_2.6s_infinite] md:bottom-8 md:right-5">
          <div className="rounded-3xl border border-emerald-400/30 bg-[#06111F]/95 p-4 shadow-[0_20px_60px_rgba(16,185,129,0.25)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg">
                <Rocket className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
                  Program Unlocked
                </p>
                <h3 className="mt-1 text-sm font-bold leading-snug text-white">
                  Start your coaching program now
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  Your payment has been approved. Complete your initial onboarding and begin Day 1.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={startProgramFlow}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:scale-[1.02]"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Start Now
                  </button>

                  <button
                    onClick={closeProgramStart}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/5"
                  >
                    Later
                  </button>
                </div>
              </div>

              <button
                onClick={closeProgramStart}
                className="rounded-full p-1 text-white/45 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm">
          <div className="flex min-h-screen items-end justify-center p-3 sm:items-center sm:p-4">
            <div className="flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#071120] text-white shadow-[0_25px_80px_rgba(0,0,0,0.45)] sm:h-auto sm:max-h-[90vh]">
              <div className="border-b border-white/10 bg-gradient-to-r from-emerald-700/30 via-green-600/20 to-transparent px-5 py-4 md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">
                      CLARA Program Onboarding
                    </p>
                    <h2 className="mt-1 text-xl font-bold">
                      {onboardingStep === 0 && "Commitment Agreement"}
                      {onboardingStep === 1 && "Rules & Expectations"}
                      {onboardingStep === 2 && "Initial Setup"}
                      {onboardingStep === 3 && "Coaching & Support"}
                      {onboardingStep === 4 && "Dashboard Introduction"}
                      {onboardingStep === 5 && "How CLARA Helps You Daily"}
                      {onboardingStep === 6 && "Start Day 1"}
                    </h2>
                  </div>

                  <button
                    onClick={closeOnboarding}
                    className="shrink-0 rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-300"
                      style={{ width: `${((onboardingStep + 1) / 7) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-white/55">
                    Step {onboardingStep + 1} of 7
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
                {onboardingStep === 0 && (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-emerald-400/15 bg-emerald-500/10 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">Welcome to your 30-day transformation</h3>
                          <p className="mt-2 text-sm leading-relaxed text-white/75">
                            CLARA is not just a tracker. This is a guided behavior-change program built around structure, consistency, accountability, and action.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm leading-relaxed text-white/80">
                        By continuing, you acknowledge that you are entering a guided financial coaching experience and you are expected to complete your tasks honestly and consistently.
                      </p>

                      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent"
                          checked={commitmentChecked}
                          onChange={(e) => setCommitmentChecked(e.target.checked)}
                        />
                        <span className="text-sm text-white/80">
                          I commit to completing the CLARA program, following the daily process, and taking responsibility for my progress.
                        </span>
                      </label>
                    </div>

                    <OnboardingActionBar
                      onNext={goToNextOnboardingStep}
                      nextDisabled={!commitmentChecked || savingOnboarding}
                      nextLabel="Continue"
                    />
                  </div>
                )}

                {onboardingStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <ShieldCheck className="h-4 w-4" />
                          <p className="text-sm font-semibold">Behavior First</p>
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          This program is not just knowledge. It is designed to change behavior through repeated action.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <Flag className="h-4 w-4" />
                          <p className="text-sm font-semibold">Complete in Order</p>
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          Daily tasks are sequential. Missed tasks should be completed before moving forward.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <Bell className="h-4 w-4" />
                          <p className="text-sm font-semibold">Stay Accountable</p>
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          Progress depends on consistency, not intensity. Small actions done daily matter.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <CalendarDays className="h-4 w-4" />
                          <p className="text-sm font-semibold">Modules Unlock Weekly</p>
                        </div>
                        <p className="mt-2 text-sm text-white/75">
                          Weekly modules support your journey while tasks train the habit in real life.
                        </p>
                      </div>
                    </div>

                    <OnboardingActionBar
                      onBack={() => setOnboardingStep(0)}
                      onNext={goToNextOnboardingStep}
                      nextDisabled={savingOnboarding}
                      nextLabel="I Understand"
                    />
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-semibold text-white">Complete your initial setup</p>
                      <p className="mt-1 text-sm text-white/65">
                        This helps personalize your coaching journey from Day 1.
                      </p>

                      <div className="mt-5 grid gap-4">
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                            Name or Nickname
                          </label>
                          <input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="What should CLARA call you?"
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                            Preferred Reminder Time
                          </label>
                          <input
                            type="time"
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-wide text-white/50">
                            Main Financial Goal
                          </label>
                          <textarea
                            value={financialGoal}
                            onChange={(e) => setFinancialGoal(e.target.value)}
                            placeholder="Example: Build emergency fund, stop impulsive spending, save my first ₱50,000..."
                            className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                          />
                        </div>
                      </div>
                    </div>

                    <OnboardingActionBar
                      onBack={() => setOnboardingStep(1)}
                      onNext={goToNextOnboardingStep}
                      nextDisabled={savingOnboarding}
                      nextLabel="Save & Continue"
                    />
                  </div>
                )}

                {onboardingStep === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-emerald-400/15 bg-emerald-500/10 p-5">
                      <p className="text-sm font-semibold text-white">Your support system</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/75">
                        If your tier includes coaching, book your first session within Day 1 to Day 3. That first session acts as your onboarding alignment and sets the tone for the rest of the program.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">What happens next</p>
                        <ul className="mt-3 space-y-2 text-sm text-white/70">
                          <li>• Access your first weekly module</li>
                          <li>• Start completing daily tasks in order</li>
                          <li>• Track money using your dashboard tools</li>
                        </ul>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Coaching users</p>
                        <ul className="mt-3 space-y-2 text-sm text-white/70">
                          <li>• Book your session early</li>
                          <li>• Bring your honest money habits</li>
                          <li>• Use the session for clarity and accountability</li>
                        </ul>
                      </div>
                    </div>

                    <OnboardingActionBar
                      onBack={() => setOnboardingStep(2)}
                      onNext={goToNextOnboardingStep}
                      nextDisabled={savingOnboarding}
                      nextLabel="Continue"
                    />
                  </div>
                )}

                {onboardingStep === 4 && (
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Dashboard</p>
                        <p className="mt-2 text-sm text-white/70">
                          This is your main control center for progress, money tracking, and daily action.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Day Mission</p>
                        <p className="mt-2 text-sm text-white/70">
                          Your next task is always visible so you know exactly what to do next.
                        </p>
                      </div>
                    </div>

                    <OnboardingActionBar
                      onBack={() => setOnboardingStep(3)}
                      onNext={goToNextOnboardingStep}
                      nextDisabled={savingOnboarding}
                      nextLabel="Continue"
                    />
                  </div>
                )}

                {onboardingStep === 5 && (
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Money Tools</p>
                        <p className="mt-2 text-sm text-white/70">
                          Use wallets, expenses, budgets, and savings goals to support real behavior change.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">Weekly Modules</p>
                        <p className="mt-2 text-sm text-white/70">
                          Learn weekly, act daily, and let the repetition build your new financial identity.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4">
                      <p className="text-sm font-semibold text-white">Important</p>
                      <p className="mt-2 text-sm text-white/75">
                        Your first real activation is not reading more. It is completing your Day 1 task.
                      </p>
                    </div>

                    <OnboardingActionBar
                      onBack={() => setOnboardingStep(4)}
                      onNext={goToNextOnboardingStep}
                      nextDisabled={savingOnboarding}
                      nextLabel="Got It"
                    />
                  </div>
                )}

                {onboardingStep === 6 && (
                  <div className="space-y-5">
                    <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 to-green-600/10 p-6 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-xl">
                        <Rocket className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-2xl font-bold">You are now officially inside CLARA</h3>
                      <p className="mt-3 text-sm leading-relaxed text-white/75">
                        Your next move is simple: start your first task and begin building the behavior that will shape the rest of your financial journey.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-semibold text-white">Your Day 0 checklist</p>
                      <ul className="mt-3 space-y-2 text-sm text-white/75">
                        <li>• Commitment accepted</li>
                        <li>• Rules understood</li>
                        <li>• Initial setup completed</li>
                        <li>• Ready for Day 1 action</li>
                      </ul>
                    </div>

                    <OnboardingActionBar
                      onBack={() => setOnboardingStep(5)}
                      onNext={finishOnboarding}
                      nextDisabled={savingOnboarding}
                      nextLabel="Start Day 1 Now"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
