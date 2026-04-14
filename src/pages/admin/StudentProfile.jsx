import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  User,
  Target,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lock,
  MessageSquare,
  Users,
  FileText,
  Power,
  PowerOff,
  ExternalLink,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { resetUserAccount } from "@/lib/admin-user-reset";
import useUserRole from "../../hooks/useUserRole";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const formatMoney = (value) => peso.format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

const getInitials = (name, email) => {
  const base = String(name || email || "U").trim();
  const parts = base.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
};

function getCoachStatus({
  savingsRate = 0,
  taskCompletion = 0,
  moduleCompletion = 0,
  emergencyProgress = 0,
  coachingHealth = 0,
  referralActivity = 0,
}) {
  const score =
    savingsRate * 0.22 +
    taskCompletion * 0.24 +
    moduleCompletion * 0.22 +
    emergencyProgress * 0.16 +
    coachingHealth * 0.1 +
    referralActivity * 0.06;

  if (score >= 70) {
    return {
      key: "on_track",
      label: "On Track",
      score: Math.round(score),
      note: "Healthy progress and strong consistency.",
    };
  }

  if (score >= 40) {
    return {
      key: "needs_attention",
      label: "Needs Attention",
      score: Math.round(score),
      note: "Progress exists but needs stronger follow-through.",
    };
  }

  return {
    key: "at_risk",
    label: "At Risk",
    score: Math.round(score),
    note: "Low activity or weak progress. Needs coach support.",
  };
}

function PremiumCard({ title, icon: Icon, right, children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-[#0b1220]/90 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-300">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#111827] px-4 py-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 text-[1.7rem] font-semibold leading-tight text-white">{value}</div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#111827] px-4 py-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 break-words text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-4 text-sm font-medium transition ${
        active
          ? "border-emerald-400 text-emerald-300"
          : "border-transparent text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

async function maybeSingle(queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) return null;
  return data;
}

async function maybeMany(queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) return [];
  return data || [];
}

function isMissingRelationError(error) {
  const message = String(error?.message || "");
  return error?.code === "PGRST205" || /Could not find the table|schema cache/i.test(message);
}

export default function StudentProfile() {
  const { id, userId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const profileId = id || userId;

  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [resettingAccount, setResettingAccount] = useState(false);
  const [taskToggleLoading, setTaskToggleLoading] = useState({});
  const [moduleToggleLoading, setModuleToggleLoading] = useState({});
  const [activeTab, setActiveTab] = useState("overview");

  const [student, setStudent] = useState(null);
  const [emergencyFund, setEmergencyFund] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [coaching, setCoaching] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [noteText, setNoteText] = useState("");

  const loadStudentProfile = useCallback(async () => {
    if (!profileId) return;

    setLoading(true);

    try {
      const profile =
        (await maybeSingle(
          supabase.from("profiles").select("*").eq("id", profileId).maybeSingle()
        )) || null;

      const enrollment =
        (await maybeSingle(
          supabase
            .from("enrollments")
            .select("*")
            .eq("user_id", profileId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        )) || null;

      const emergencyGoal =
        (await maybeSingle(
          supabase
            .from("savings_goals")
            .select("*")
            .eq("user_id", profileId)
            .ilike("goal_type", "emergency%")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        )) ||
        (await maybeSingle(
          supabase
            .from("savings_goals")
            .select("*")
            .eq("created_by", profile?.email || "")
            .ilike("goal_type", "emergency%")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        )) ||
        null;

      const allModules = await maybeMany(
        supabase.from("modules").select("*").order("week_number", { ascending: true })
      );

      const moduleProgress =
        (await maybeMany(
          supabase.from("module_progress").select("*").eq("user_id", profileId)
        )) ||
        (await maybeMany(
          supabase.from("module_progress").select("*").eq("created_by", profile?.email || "")
        ));

      const moduleAccessRows = await maybeMany(
        supabase.from("student_module_access").select("*").eq("user_id", profileId)
      );

      const moduleMap = new Map(moduleProgress.map((item) => [item.module_id, item]));
      const moduleAccessMap = new Map(moduleAccessRows.map((item) => [item.module_id, item]));

      const mergedModules = allModules.map((module) => {
        const progress = moduleMap.get(module.id);
        const access = moduleAccessMap.get(module.id);

        const isGloballyActive =
          module.is_active !== false &&
          module.active !== false &&
          module.status !== "inactive" &&
          module.is_locked !== true;

        const isActiveForStudent =
          typeof access?.is_active === "boolean" ? access.is_active : true;

        const finalIsActive = isGloballyActive && isActiveForStudent;

        let status = "locked";
        if (!finalIsActive) status = "locked";
        else if (progress?.status) status = progress.status;
        else if (progress?.completed || progress?.completed_at) status = "completed";
        else if (progress?.started_at || progress?.updated_at) status = "in_progress";
        else status = "available";

        return {
          ...module,
          progress_status: status,
          progress_percent:
            Number(progress?.progress_percent) ||
            (status === "completed" ? 100 : status === "in_progress" ? 50 : 0),
          last_activity_at:
            progress?.updated_at ||
            progress?.last_watched_at ||
            progress?.completed_at ||
            null,
          is_globally_active: isGloballyActive,
          is_active_for_student: isActiveForStudent,
          final_is_active: finalIsActive,
        };
      });

      let allTasks = await maybeMany(
        supabase
          .from("challenge_tasks")
          .select("*")
          .order("week_number", { ascending: true })
          .order("day_number", { ascending: true })
      );

      if (!allTasks.length) {
        allTasks = await maybeMany(
          supabase
            .from("tasks")
            .select("*")
            .order("week_number", { ascending: true })
            .order("day_number", { ascending: true })
        );
      }

      const submissions =
        (await maybeMany(
          supabase.from("task_submissions").select("*").eq("user_id", profileId)
        )) ||
        (await maybeMany(
          supabase.from("task_submissions").select("*").eq("created_by", profile?.email || "")
        ));

      const taskAccessRows = await maybeMany(
        supabase.from("student_task_access").select("*").eq("user_id", profileId)
      );

      const submissionMap = new Map(submissions.map((item) => [item.task_id, item]));
      const taskAccessMap = new Map(taskAccessRows.map((item) => [item.task_id, item]));

      const mergedTasks = allTasks.map((task) => {
        const submission = submissionMap.get(task.id);
        const access = taskAccessMap.get(task.id);

        const isGloballyActive =
          task.is_active !== false &&
          task.active !== false &&
          task.status !== "inactive";

        const isActiveForStudent =
          typeof access?.is_active === "boolean" ? access.is_active : true;

        const finalIsActive = isGloballyActive && isActiveForStudent;

        return {
          ...task,
          submission_status: submission ? "submitted" : "pending",
          reflection: submission?.reflection || submission?.answer || "",
          proof_url: submission?.proof_url || submission?.image_url || "",
          submitted_at: submission?.created_at || submission?.updated_at || null,
          is_globally_active: isGloballyActive,
          is_active_for_student: isActiveForStudent,
          final_is_active: finalIsActive,
        };
      });

      const coachingRows = await maybeMany(
        supabase
          .from("coaching_requests")
          .select("*")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
      );

      const referralRows =
        (await maybeMany(
          supabase
            .from("referrals")
            .select("*")
            .or(`user_id.eq.${profileId},referrer_id.eq.${profileId}`)
            .order("created_at", { ascending: false })
        )) ||
        (await maybeMany(
          supabase
            .from("referrals")
            .select("*")
            .or(`created_by.eq.${profile?.email || ""},referrer_email.eq.${profile?.email || ""}`)
            .order("created_at", { ascending: false })
        ));

      const notesRows = await maybeMany(
        supabase
          .from("admin_notes")
          .select("*")
          .eq("student_id", profileId)
          .order("created_at", { ascending: false })
      );

      setStudent({ profile, enrollment });
      setEmergencyFund(emergencyGoal);
      setModules(mergedModules);
      setTasks(mergedTasks);
      setCoaching(coachingRows);
      setReferrals(referralRows);
      setAdminNotes(notesRows);
    } catch (error) {
      console.error("Failed to load student profile:", error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  async function toggleTaskAccess(task) {
    if (!profileId || !task?.id) return;

    const nextValue = !task.is_active_for_student;

    try {
      setTaskToggleLoading((prev) => ({ ...prev, [task.id]: true }));

      const { data: existing, error: existingError } = await supabase
        .from("student_task_access")
        .select("*")
        .eq("user_id", profileId)
        .eq("task_id", task.id)
        .maybeSingle();

      if (existingError && existingError.code !== "PGRST116") {
        throw existingError;
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("student_task_access")
          .update({
            is_active: nextValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("student_task_access").insert([
          {
            user_id: profileId,
            task_id: task.id,
            is_active: nextValue,
          },
        ]);

        if (insertError) throw insertError;
      }

      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...item,
                is_active_for_student: nextValue,
                final_is_active: item.is_globally_active && nextValue,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to toggle task access:", error);
      alert(error.message || "Failed to update task access.");
    } finally {
      setTaskToggleLoading((prev) => ({ ...prev, [task.id]: false }));
    }
  }

  async function toggleModuleAccess(module) {
    if (!profileId || !module?.id) return;

    const nextValue = !module.is_active_for_student;

    try {
      setModuleToggleLoading((prev) => ({ ...prev, [module.id]: true }));

      const { data: existing, error: existingError } = await supabase
        .from("student_module_access")
        .select("*")
        .eq("user_id", profileId)
        .eq("module_id", module.id)
        .maybeSingle();

      if (existingError && existingError.code !== "PGRST116") {
        throw existingError;
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("student_module_access")
          .update({
            is_active: nextValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("student_module_access").insert([
          {
            user_id: profileId,
            module_id: module.id,
            is_active: nextValue,
          },
        ]);

        if (insertError) throw insertError;
      }

      setModules((prev) =>
        prev.map((item) => {
          if (item.id !== module.id) return item;

          const finalIsActive = item.is_globally_active && nextValue;
          let nextStatus = item.progress_status;

          if (!finalIsActive) nextStatus = "locked";
          else if (
            item.progress_status === "locked" ||
            item.progress_status === "available"
          )
            nextStatus = "available";

          return {
            ...item,
            is_active_for_student: nextValue,
            final_is_active: finalIsActive,
            progress_status: nextStatus,
          };
        })
      );
    } catch (error) {
      console.error("Failed to toggle module access:", error);
      alert(
        error.message ||
          "Failed to update module access. Make sure student_module_access table exists."
      );
    } finally {
      setModuleToggleLoading((prev) => ({ ...prev, [module.id]: false }));
    }
  }

  async function saveAdminNote() {
    if (!noteText.trim()) return;

    try {
      setSavingNote(true);

      const { error } = await supabase.from("admin_notes").insert([
        {
          student_id: profileId,
          note: noteText.trim(),
        },
      ]);

      if (error) throw error;

      setNoteText("");
      await loadStudentProfile();
      setActiveTab("notes");
    } catch (error) {
      console.error("Failed to save admin note:", error);
      alert(
        isMissingRelationError(error)
          ? "Admin notes are not enabled in this database yet."
          : error.message || "Failed to save note."
      );
    } finally {
      setSavingNote(false);
    }
  }

  async function handleResetAccount() {
    if (!student?.profile?.id || resettingAccount) return;

    const confirmReset = window.confirm(
      "Fully reset this account?\n\nThis will send the user back to the start by:\n- resetting onboarding and program onboarding\n- removing enrollment and paid access\n- deleting progress, wallets, goals, submissions, notes, referrals, and coaching history\n- forcing the user to sign in again"
    );

    if (!confirmReset) return;

    try {
      setResettingAccount(true);

      await resetUserAccount({
        userId: student.profile.id,
        email: student.profile.email || null,
      });

      await loadStudentProfile();
      setActiveTab("overview");
      alert("Account reset complete. This user will start from onboarding again after signing in.");
    } catch (error) {
      console.error("Failed to reset account:", error);
      alert(error.message || "Failed to reset account.");
    } finally {
      setResettingAccount(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || !profileId) return;
    loadStudentProfile();
  }, [isAdmin, loadStudentProfile, profileId]);

  const summary = useMemo(() => {
    const selectedMonths =
      Number(
        emergencyFund?.target_months ||
          emergencyFund?.months_target ||
          emergencyFund?.goal_months ||
          3
      ) || 3;

    const monthlyNeed =
      Number(
        emergencyFund?.monthly_need ||
          emergencyFund?.monthly_expense ||
          emergencyFund?.monthly_target ||
          0
      ) || 0;

    const currentAmount =
      Number(
        emergencyFund?.current_amount ||
          emergencyFund?.saved_amount ||
          emergencyFund?.current_saved ||
          emergencyFund?.balance ||
          0
      ) || 0;

    const targetAmount =
      Number(
        emergencyFund?.target_amount ||
          emergencyFund?.goal_amount ||
          monthlyNeed * selectedMonths
      ) || 0;

    const currentMonthsCovered = monthlyNeed > 0 ? currentAmount / monthlyNeed : 0;
    const emergencyProgress =
      targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;

    const completedModules = modules.filter((m) => m.progress_status === "completed").length;
    const inProgressModules = modules.filter((m) => m.progress_status === "in_progress").length;
    const activeModules = modules.filter((m) => m.final_is_active).length;
    const moduleCompletion = modules.length > 0 ? (completedModules / modules.length) * 100 : 0;

    const submittedTasks = tasks.filter((t) => t.submission_status === "submitted").length;
    const activeTasks = tasks.filter((t) => t.final_is_active).length;
    const taskCompletion = tasks.length > 0 ? (submittedTasks / tasks.length) * 100 : 0;

    const incomeTotal =
      Number(student?.profile?.total_income || student?.profile?.income_total || 0) || 0;

    const savingsTotal =
      Number(student?.profile?.total_savings || student?.profile?.savings_total || currentAmount || 0) ||
      0;

    const savingsRate = incomeTotal > 0 ? Math.min(100, (savingsTotal / incomeTotal) * 100) : 0;

    const approvedCoaching = coaching.filter(
      (item) => String(item.status || "").toLowerCase() === "approved"
    ).length;

    const completedCoaching = coaching.filter(
      (item) => String(item.status || "").toLowerCase() === "completed"
    ).length;

    const lastCoachingDate =
      coaching[0]?.scheduled_at || coaching[0]?.session_date || coaching[0]?.created_at || null;

    const coachingHealth = coaching.length
      ? Math.min(100, completedCoaching * 35 + approvedCoaching * 15)
      : 0;

    const approvedReferrals = referrals.filter((item) =>
      ["approved", "converted", "paid", "successful"].includes(
        String(item.status || "").toLowerCase()
      )
    ).length;

    const pendingReferrals = referrals.filter(
      (item) => String(item.status || "").toLowerCase() === "pending"
    ).length;

    const referralAmount = referrals.reduce((sum, item) => {
      return sum + Number(item.amount_paid || item.commission || item.reward_amount || 0);
    }, 0);

    const referralActivity = Math.min(100, approvedReferrals * 40 + pendingReferrals * 15);

    const coach = getCoachStatus({
      savingsRate,
      taskCompletion,
      moduleCompletion,
      emergencyProgress,
      coachingHealth,
      referralActivity,
    });

    return {
      selectedMonths,
      monthlyNeed,
      currentAmount,
      targetAmount,
      currentMonthsCovered,
      emergencyProgress,
      completedModules,
      inProgressModules,
      activeModules,
      moduleCompletion,
      submittedTasks,
      activeTasks,
      taskCompletion,
      incomeTotal,
      savingsTotal,
      savingsRate,
      approvedCoaching,
      completedCoaching,
      lastCoachingDate,
      coachingHealth,
      approvedReferrals,
      pendingReferrals,
      referralAmount,
      referralActivity,
      coach,
    };
  }, [student, emergencyFund, modules, tasks, coaching, referrals]);

  if (!isAdmin) {
    return <div className="p-6 text-center text-white">Admin only</div>;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-300/20 border-t-emerald-300" />
      </div>
    );
  }

  if (!student?.profile) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Button variant="outline" className="mb-6" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-400" />
          <h1 className="text-xl font-bold text-white">Student not found</h1>
          <p className="mt-2 text-slate-300">This student record could not be loaded.</p>
        </div>
      </div>
    );
  }

  const fullName =
    student.profile.full_name ||
    student.profile.name ||
    student.profile.username ||
    student.profile.display_name ||
    student.profile.email;

  const email = student.profile.email || "—";

  const role =
    student.profile.role === "paid_user"
      ? "Paid User"
      : student.profile.role === "free_user"
      ? "Free User"
      : student.profile.role || "User";

  const plan =
    student.enrollment?.plan ||
    student.profile.plan ||
    student.profile.plan_key ||
    "free";

  const enrollmentStatus =
    student.enrollment?.status ||
    student.profile.enrollment_status ||
    "unknown";

  const heroBadgeClass =
    summary.coach.key === "on_track"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
      : summary.coach.key === "needs_attention"
      ? "bg-amber-500/15 text-amber-300 border border-amber-400/20"
      : "bg-red-500/15 text-red-300 border border-red-400/20";

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#060b16] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_30%),linear-gradient(90deg,#041c18_0%,#0c5c35_45%,#1797b8_100%)] px-6 pb-8 pt-6 text-white">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="h-auto px-0 text-white hover:bg-transparent hover:text-white/90"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>

            <Button
              variant="ghost"
              onClick={loadStudentProfile}
              className="h-auto px-0 text-white hover:bg-transparent hover:text-white/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button
              variant="destructive"
              onClick={handleResetAccount}
              disabled={resettingAccount}
              className="rounded-2xl"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {resettingAccount ? "Resetting Account..." : "Reset Account"}
            </Button>
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 text-3xl font-bold text-white backdrop-blur">
                {getInitials(fullName, email)}
              </div>

              <div>
                <h1 className="text-4xl font-bold leading-none">{fullName}</h1>
                <div className="mt-2 text-xl text-white/90">{email}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-yellow-300 px-3 py-1 text-sm font-semibold text-slate-900 hover:bg-yellow-300">
                    {String(plan).charAt(0).toUpperCase() + String(plan).slice(1)}
                  </Badge>

                  <Badge className={`rounded-full px-3 py-1 text-sm font-semibold ${heroBadgeClass}`}>
                    {summary.coach.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
              <div className="text-sm text-white/70">Control Score</div>
              <div className="text-3xl font-bold">{summary.coach.score}%</div>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-[#0a1220] px-6">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={activeTab === "financial"} onClick={() => setActiveTab("financial")}>
              Financial
            </TabButton>
            <TabButton
              active={activeTab === "tasks-modules"}
              onClick={() => setActiveTab("tasks-modules")}
            >
              Tasks & Modules
            </TabButton>
            <TabButton
              active={activeTab === "enrollment"}
              onClick={() => setActiveTab("enrollment")}
            >
              Enrollment
            </TabButton>
            <TabButton active={activeTab === "notes"} onClick={() => setActiveTab("notes")}>
              Notes
            </TabButton>
          </div>
        </div>

        <div className="space-y-6 bg-[#060b16] p-6">
          {activeTab === "overview" && (
            <>
              <PremiumCard title="Student Details" icon={User}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <DetailBox label="Full Name" value={fullName} />
                  <DetailBox label="Email" value={email} />
                  <DetailBox label="Role" value={role} />
                  <DetailBox label="Plan / Tier" value={plan} />
                  <DetailBox
                    label="Date Joined"
                    value={formatDate(student.enrollment?.created_at || student.profile.created_at)}
                  />
                  <DetailBox label="Enrollment Status" value={String(enrollmentStatus)} />
                </div>
              </PremiumCard>

              <PremiumCard title="Main Monitoring Snapshot" icon={Target}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoBox label="Task Completion" value={formatPercent(summary.taskCompletion)} />
                  <InfoBox label="Module Completion" value={formatPercent(summary.moduleCompletion)} />
                  <InfoBox label="Coaching Sessions" value={String(coaching.length)} />
                  <InfoBox label="Referrals" value={String(referrals.length)} />
                </div>
              </PremiumCard>
            </>
          )}

          {activeTab === "financial" && (
            <PremiumCard
              title="Emergency Fund Progress"
              icon={Target}
              right={
                <Badge className="rounded-full border border-yellow-300/20 bg-yellow-300 px-3 py-1 text-slate-900 hover:bg-yellow-300">
                  {summary.selectedMonths} Month Goal
                </Badge>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoBox label="Monthly Need" value={formatMoney(summary.monthlyNeed)} />
                <InfoBox label="Current Fund" value={formatMoney(summary.currentAmount)} />
                <InfoBox label="Target Fund" value={formatMoney(summary.targetAmount)} />
                <InfoBox label="Months Covered" value={`${summary.currentMonthsCovered.toFixed(1)}`} />
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-[#111827] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Emergency fund completion</span>
                  <span className="text-sm font-semibold text-white">
                    {Math.round(summary.emergencyProgress)}%
                  </span>
                </div>
                <Progress value={summary.emergencyProgress} className="h-3" />
              </div>
            </PremiumCard>
          )}

          {activeTab === "tasks-modules" && (
            <>
              <PremiumCard title="Tasks Monitoring" icon={CheckCircle2}>
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  <InfoBox label="Task Completion" value={formatPercent(summary.taskCompletion)} />
                  <InfoBox label="Submitted" value={`${summary.submittedTasks}/${tasks.length}`} />
                  <InfoBox label="Active Tasks" value={`${summary.activeTasks}/${tasks.length}`} />
                </div>

                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827] p-5 text-sm text-slate-400">
                      No tasks found.
                    </div>
                  ) : (
                    tasks.map((task) => {
                      const submitted = task.submission_status === "submitted";
                      const toggleBusy = !!taskToggleLoading[task.id];

                      return (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-white/8 bg-[#111827] p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <div className="text-sm text-slate-400">
                                Week {task.week_number || "—"} • Day {task.day_number || "—"}
                              </div>
                              <div className="text-lg font-semibold text-white">
                                {task.title || task.name || "Untitled Task"}
                              </div>
                              <div className="mt-1 text-sm text-slate-400">
                                {submitted
                                  ? `Submitted ${formatDate(task.submitted_at)}`
                                  : "Not submitted yet"}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge
                                  className={
                                    submitted
                                      ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15"
                                      : "border border-slate-600 bg-slate-700/50 text-slate-200 hover:bg-slate-700/50"
                                  }
                                >
                                  {submitted ? "Submitted" : "Pending"}
                                </Badge>

                                <Badge
                                  className={
                                    task.final_is_active
                                      ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15"
                                      : "border border-red-400/20 bg-red-500/15 text-red-300 hover:bg-red-500/15"
                                  }
                                >
                                  {task.final_is_active ? "Active for Student" : "Deactivated"}
                                </Badge>

                                {!task.is_globally_active && (
                                  <Badge className="border border-amber-400/20 bg-amber-500/15 text-amber-300 hover:bg-amber-500/15">
                                    Globally Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={task.final_is_active ? "destructive" : "outline"}
                                onClick={() => toggleTaskAccess(task)}
                                disabled={toggleBusy || !task.is_globally_active}
                                className="min-w-[145px]"
                              >
                                {toggleBusy ? (
                                  "Updating..."
                                ) : task.final_is_active ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {task.reflection ? (
                            <div className="mt-3 rounded-2xl border border-white/8 bg-[#0b1220] p-3">
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Reflection
                              </div>
                              <div className="mt-1 text-sm text-slate-200">{task.reflection}</div>
                            </div>
                          ) : null}

                          {task.proof_url ? (
                            <a
                              href={task.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex items-center text-sm font-medium text-emerald-300 hover:underline"
                            >
                              View proof upload
                              <ExternalLink className="ml-1 h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </PremiumCard>

              <PremiumCard title="Modules Monitoring" icon={BookOpen}>
                <div className="mb-5 grid gap-4 md:grid-cols-4">
                  <InfoBox label="Completion" value={formatPercent(summary.moduleCompletion)} />
                  <InfoBox label="Completed" value={`${summary.completedModules}/${modules.length}`} />
                  <InfoBox label="In Progress" value={String(summary.inProgressModules)} />
                  <InfoBox label="Active Modules" value={`${summary.activeModules}/${modules.length}`} />
                </div>

                <div className="space-y-3">
                  {modules.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827] p-5 text-sm text-slate-400">
                      No modules found.
                    </div>
                  ) : (
                    modules.map((module) => {
                      const status = module.progress_status;
                      const toggleBusy = !!moduleToggleLoading[module.id];

                      const StatusIcon =
                        status === "completed"
                          ? CheckCircle2
                          : status === "in_progress"
                          ? Clock3
                          : Lock;

                      return (
                        <div
                          key={module.id}
                          className="rounded-2xl border border-white/8 bg-[#111827] p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-sm text-slate-400">
                                Week {module.week_number || "—"}
                              </div>
                              <div className="text-lg font-semibold text-white">
                                {module.title || module.name || "Untitled Module"}
                              </div>
                              <div className="mt-1 text-sm text-slate-400">
                                Last activity: {formatDate(module.last_activity_at)}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge className="border border-slate-600 bg-slate-700/50 text-slate-200 hover:bg-slate-700/50">
                                  <StatusIcon className="mr-1 h-3.5 w-3.5" />
                                  {status === "completed"
                                    ? "Completed"
                                    : status === "in_progress"
                                    ? "In Progress"
                                    : status === "available"
                                    ? "Available"
                                    : "Locked"}
                                </Badge>

                                <Badge
                                  className={
                                    module.final_is_active
                                      ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15"
                                      : "border border-red-400/20 bg-red-500/15 text-red-300 hover:bg-red-500/15"
                                  }
                                >
                                  {module.final_is_active ? "Active for Student" : "Deactivated"}
                                </Badge>

                                {!module.is_globally_active && (
                                  <Badge className="border border-amber-400/20 bg-amber-500/15 text-amber-300 hover:bg-amber-500/15">
                                    Globally Inactive
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <Button
                                type="button"
                                size="sm"
                                variant={module.final_is_active ? "destructive" : "outline"}
                                onClick={() => toggleModuleAccess(module)}
                                disabled={toggleBusy || !module.is_globally_active}
                                className="min-w-[145px]"
                              >
                                {toggleBusy ? (
                                  "Updating..."
                                ) : module.final_is_active ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3">
                            <Progress value={module.progress_percent || 0} className="h-2.5" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </PremiumCard>
            </>
          )}

          {activeTab === "enrollment" && (
            <>
              <PremiumCard title="Enrollment & Coaching" icon={MessageSquare}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoBox label="Plan" value={String(plan)} />
                  <InfoBox label="Enrollment Status" value={String(enrollmentStatus)} />
                  <InfoBox label="Coaching Sessions" value={String(coaching.length)} />
                  <InfoBox label="Last Coaching" value={formatDate(summary.lastCoachingDate)} />
                </div>

                <div className="mt-5 space-y-3">
                  {coaching.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827] p-5 text-sm text-slate-400">
                      No coaching sessions yet.
                    </div>
                  ) : (
                    coaching.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/8 bg-[#111827] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold capitalize text-white">
                            {item.status || "pending"}
                          </div>
                          <div className="text-sm text-slate-400">
                            {formatDate(item.scheduled_at || item.session_date || item.created_at)}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-slate-300">
                          {item.topic || item.title || "Coaching request"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PremiumCard>

              <PremiumCard title="Referrals" icon={Users}>
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  <InfoBox label="Total Referrals" value={String(referrals.length)} />
                  <InfoBox label="Approved" value={String(summary.approvedReferrals)} />
                  <InfoBox label="Tracked Value" value={formatMoney(summary.referralAmount)} />
                </div>

                <div className="space-y-3">
                  {referrals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827] p-5 text-sm text-slate-400">
                      No referrals found.
                    </div>
                  ) : (
                    referrals.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/8 bg-[#111827] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold text-white">
                            {item.name ||
                              item.referred_name ||
                              item.referral_name ||
                              item.email ||
                              item.referred_email ||
                              "Referral"}
                          </div>
                          <Badge className="capitalize border border-slate-600 bg-slate-700/50 text-slate-200 hover:bg-slate-700/50">
                            {item.status || "pending"}
                          </Badge>
                        </div>

                        <div className="mt-2 text-sm text-slate-400">
                          {item.plan || item.plan_key || "Plan not set"} • {formatDate(item.created_at)}
                        </div>

                        <div className="mt-1 text-sm text-slate-200">
                          Amount: {formatMoney(item.amount_paid || item.commission || item.reward_amount || 0)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PremiumCard>
            </>
          )}

          {activeTab === "notes" && (
            <PremiumCard title="Admin Notes" icon={FileText}>
              <div className="space-y-4">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a private coaching note..."
                  className="min-h-[120px] border-white/10 bg-[#111827] text-white placeholder:text-slate-500"
                />

                <Button
                  onClick={saveAdminNote}
                  disabled={savingNote || !noteText.trim()}
                  className="rounded-2xl"
                >
                  {savingNote ? "Saving..." : "Save Note"}
                </Button>

                <div className="space-y-3">
                  {adminNotes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111827] p-5 text-sm text-slate-400">
                      No private notes yet.
                    </div>
                  ) : (
                    adminNotes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-2xl border border-white/8 bg-[#111827] p-4"
                      >
                        <div className="text-sm text-slate-400">{formatDate(note.created_at)}</div>
                        <div className="mt-2 text-slate-100">{note.note}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </PremiumCard>
          )}
        </div>
      </div>
    </div>
  );
}
