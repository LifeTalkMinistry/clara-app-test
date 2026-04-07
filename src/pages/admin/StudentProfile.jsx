import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Shield,
  CalendarDays,
  Target,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lock,
  AlertCircle,
  FileText,
  MessageSquare,
  Award,
  TrendingUp,
  RefreshCw,
  Power,
  PowerOff,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
    month: "short",
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

const statusTone = {
  on_track: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  needs_attention: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  at_risk: "bg-red-500/15 text-red-300 border-red-500/30",
};

function getCoachStatus({
  savingsRate = 0,
  taskCompletion = 0,
  moduleCompletion = 0,
  emergencyProgress = 0,
}) {
  const score =
    savingsRate * 0.35 +
    taskCompletion * 0.25 +
    moduleCompletion * 0.2 +
    emergencyProgress * 0.2;

  if (score >= 70) {
    return {
      key: "on_track",
      label: "On Track",
      score: Math.round(score),
      note: "Good consistency and healthy progress.",
    };
  }

  if (score >= 40) {
    return {
      key: "needs_attention",
      label: "Needs Attention",
      score: Math.round(score),
      note: "Making progress, but needs stronger follow-through.",
    };
  }

  return {
    key: "at_risk",
    label: "At Risk",
    score: Math.round(score),
    note: "Low consistency or low savings progress. Needs coaching support.",
  };
}

function SectionCard({ title, icon: Icon, right, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#081126]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2">
            <Icon className="h-4 w-4 text-emerald-300" />
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({ label, value, subtext }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {subtext ? <div className="mt-1 text-sm text-white/55">{subtext}</div> : null}
    </div>
  );
}

export default function StudentProfile() {
  const { id, userId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const profileId = id || userId;

  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [taskToggleLoading, setTaskToggleLoading] = useState({});

  const [student, setStudent] = useState(null);
  const [emergencyFund, setEmergencyFund] = useState(null);
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [coaching, setCoaching] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [noteText, setNoteText] = useState("");

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

  async function loadStudentProfile() {
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
          supabase
            .from("module_progress")
            .select("*")
            .eq("created_by", profile?.email || "")
        ));

      const moduleMap = new Map(moduleProgress.map((item) => [item.module_id, item]));

      const mergedModules = allModules.map((module) => {
        const progress = moduleMap.get(module.id);

        let status = "locked";
        if (progress?.status) status = progress.status;
        else if (progress?.completed || progress?.completed_at) status = "completed";
        else if (progress?.started_at || progress?.updated_at) status = "in_progress";
        else if (module.is_locked === false || module.active === true) status = "available";

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
          supabase
            .from("task_submissions")
            .select("*")
            .eq("created_by", profile?.email || "")
        ));

      const taskAccessRows = await maybeMany(
        supabase
          .from("student_task_access")
          .select("*")
          .eq("user_id", profileId)
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

      const notesRows = await maybeMany(
        supabase
          .from("admin_notes")
          .select("*")
          .eq("student_id", profileId)
          .order("created_at", { ascending: false })
      );

      setStudent({
        profile,
        enrollment,
      });
      setEmergencyFund(emergencyGoal);
      setModules(mergedModules);
      setTasks(mergedTasks);
      setCoaching(coachingRows);
      setAdminNotes(notesRows);
    } catch (error) {
      console.error("Failed to load student profile:", error);
    } finally {
      setLoading(false);
    }
  }

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
        const { error: insertError } = await supabase
          .from("student_task_access")
          .insert([
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

  useEffect(() => {
    if (!isAdmin || !profileId) return;
    loadStudentProfile();
  }, [isAdmin, profileId]);

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

    const currentMonthsCovered =
      monthlyNeed > 0 ? currentAmount / monthlyNeed : 0;

    const emergencyProgress =
      targetAmount > 0
        ? Math.min(100, (currentAmount / targetAmount) * 100)
        : 0;

    const completedModules = modules.filter(
      (m) => m.progress_status === "completed"
    ).length;

    const inProgressModules = modules.filter(
      (m) => m.progress_status === "in_progress"
    ).length;

    const moduleCompletion =
      modules.length > 0 ? (completedModules / modules.length) * 100 : 0;

    const submittedTasks = tasks.filter(
      (t) => t.submission_status === "submitted"
    ).length;

    const taskCompletion =
      tasks.length > 0 ? (submittedTasks / tasks.length) * 100 : 0;

    const incomeTotal =
      Number(student?.profile?.total_income || student?.profile?.income_total || 0) || 0;

    const savingsTotal =
      Number(
        student?.profile?.total_savings ||
          student?.profile?.savings_total ||
          currentAmount ||
          0
      ) || 0;

    const savingsRate =
      incomeTotal > 0 ? Math.min(100, (savingsTotal / incomeTotal) * 100) : 0;

    const coach = getCoachStatus({
      savingsRate,
      taskCompletion,
      moduleCompletion,
      emergencyProgress,
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
      moduleCompletion,
      submittedTasks,
      taskCompletion,
      incomeTotal,
      savingsTotal,
      savingsRate,
      coach,
    };
  }, [student, emergencyFund, modules, tasks]);

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
    } catch (error) {
      console.error("Failed to save admin note:", error);
      alert(error.message || "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  }

  if (!isAdmin) {
    return <div className="p-6 text-center text-white">Admin only</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!student?.profile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="outline" className="mb-6" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-300" />
          <h1 className="text-xl font-bold">Student not found</h1>
          <p className="mt-2 text-muted-foreground">
            This student record could not be loaded.
          </p>
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button variant="outline" onClick={loadStudentProfile}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Badge className={`border px-3 py-1 text-xs ${statusTone[summary.coach.key]}`}>
          {summary.coach.label} • Control Score {summary.coach.score}%
        </Badge>
      </div>

      <div className="rounded-3xl border border-white/10 bg-background/60 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {getInitials(fullName, email)}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {email}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {role}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Joined {formatDate(student.enrollment?.created_at || student.profile.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Plan</div>
              <div className="mt-1 text-lg font-semibold capitalize">{plan}</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Enrollment</div>
              <div className="mt-1 text-lg font-semibold capitalize">{enrollmentStatus}</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Privacy Mode</div>
              <div className="mt-1 text-lg font-semibold">No raw spending</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Income"
            value={formatMoney(summary.incomeTotal)}
            subtext="Safe summary only"
          />
          <StatCard
            label="Total Savings"
            value={formatMoney(summary.savingsTotal)}
            subtext="No transaction details shown"
          />
          <StatCard
            label="Savings Rate"
            value={formatPercent(summary.savingsRate)}
            subtext="Based on total income vs savings"
          />
          <StatCard
            label="Available Money"
            value={formatMoney(summary.currentAmount)}
            subtext="Progress view only"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <SectionCard
            title="Emergency Fund Progress"
            icon={Target}
            right={
              <Badge variant="outline">
                {summary.selectedMonths} Month Goal
              </Badge>
            }
          >
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                label="Current Covered"
                value={`${summary.currentMonthsCovered.toFixed(1)} months`}
                subtext="Protection level now"
              />
              <StatCard
                label="Monthly Need"
                value={formatMoney(summary.monthlyNeed)}
                subtext="Survival monthly amount"
              />
              <StatCard
                label="Current Fund"
                value={formatMoney(summary.currentAmount)}
                subtext="Visible to admin"
              />
              <StatCard
                label="Target Fund"
                value={formatMoney(summary.targetAmount)}
                subtext={`${summary.selectedMonths} months target`}
              />
            </div>

            <div className="mt-5 rounded-2xl border p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Emergency fund completion</span>
                <span className="font-semibold">{Math.round(summary.emergencyProgress)}%</span>
              </div>
              <Progress value={summary.emergencyProgress} className="h-3" />
              <p className="mt-3 text-sm text-muted-foreground">
                {summary.emergencyProgress >= 100
                  ? "Emergency fund goal reached."
                  : `Needs ${formatMoney(
                      Math.max(0, summary.targetAmount - summary.currentAmount)
                    )} more to complete this target.`}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Modules Progress"
            icon={BookOpen}
            right={
              <div className="text-sm text-muted-foreground">
                {summary.completedModules}/{modules.length} completed
              </div>
            }
          >
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <StatCard
                label="Completion"
                value={formatPercent(summary.moduleCompletion)}
                subtext="Module completion rate"
              />
              <StatCard
                label="Completed"
                value={String(summary.completedModules)}
                subtext="Finished modules"
              />
              <StatCard
                label="In Progress"
                value={String(summary.inProgressModules)}
                subtext="Currently active"
              />
            </div>

            <div className="space-y-3">
              {modules.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                  No modules found.
                </div>
              ) : (
                modules.map((module) => {
                  const status = module.progress_status;

                  const Icon =
                    status === "completed"
                      ? CheckCircle2
                      : status === "in_progress"
                      ? Clock3
                      : Lock;

                  return (
                    <div key={module.id} className="rounded-2xl border p-4 space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Week {module.week_number || "—"}
                          </div>
                          <div className="text-base font-semibold">
                            {module.title || module.name || "Untitled Module"}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Last activity: {formatDate(module.last_activity_at)}
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                          <Icon className="h-3.5 w-3.5" />
                          {status === "completed"
                            ? "Completed"
                            : status === "in_progress"
                            ? "In Progress"
                            : status === "available"
                            ? "Available"
                            : "Locked"}
                        </div>
                      </div>

                      <Progress value={module.progress_percent || 0} className="h-2.5" />
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Tasks & Submissions"
            icon={CheckCircle2}
            right={
              <div className="text-sm text-muted-foreground">
                {summary.submittedTasks}/{tasks.length} submitted
              </div>
            }
          >
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <StatCard
                label="Task Completion"
                value={formatPercent(summary.taskCompletion)}
                subtext="Behavior consistency"
              />
              <StatCard
                label="Consistency Score"
                value={String(Math.round(summary.taskCompletion))}
                subtext="Based on submitted tasks"
              />
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                  No tasks found.
                </div>
              ) : (
                tasks.map((task) => {
                  const submitted = task.submission_status === "submitted";
                  const toggleBusy = !!taskToggleLoading[task.id];

                  return (
                    <div key={task.id} className="rounded-2xl border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Week {task.week_number || "—"} • Day {task.day_number || "—"}
                          </div>
                          <div className="text-base font-semibold">
                            {task.title || task.name || "Untitled Task"}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {submitted
                              ? `Submitted ${formatDate(task.submitted_at)}`
                              : "Not submitted yet"}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                              className={
                                task.final_is_active
                                  ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                                  : "border border-red-500/30 bg-red-500/15 text-red-300"
                              }
                            >
                              {task.final_is_active ? "Active for Student" : "Deactivated for Student"}
                            </Badge>

                            {!task.is_globally_active && (
                              <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                                Globally Inactive
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch gap-2 md:items-end">
                          <Badge variant={submitted ? "default" : "outline"}>
                            {submitted ? "Submitted" : "Pending"}
                          </Badge>

                          <Button
                            type="button"
                            size="sm"
                            variant={task.final_is_active ? "destructive" : "outline"}
                            onClick={() => toggleTaskAccess(task)}
                            disabled={toggleBusy || !task.is_globally_active}
                            className="min-w-[150px]"
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

                      {!task.is_globally_active ? (
                        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                          This task is globally inactive in the task system, so it cannot be activated here until the main task is active again.
                        </div>
                      ) : null}

                      {!task.final_is_active ? (
                        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                          Student should not be able to submit this task while it is deactivated.
                        </div>
                      ) : null}

                      {task.reflection ? (
                        <div className="mt-3 rounded-xl border p-3 text-sm">
                          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Reflection
                          </div>
                          {task.reflection}
                        </div>
                      ) : null}

                      {task.proof_url ? (
                        <a
                          href={task.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                        >
                          View proof upload
                        </a>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Behavior Insights" icon={TrendingUp}>
            <div className="space-y-3">
              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Coach Status</div>
                <p className="mt-2 text-sm text-muted-foreground">{summary.coach.note}</p>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Savings Signal</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Current savings rate is <span className="font-semibold text-foreground">{formatPercent(summary.savingsRate)}</span>.
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Discipline Signal</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Task consistency is <span className="font-semibold text-foreground">{formatPercent(summary.taskCompletion)}</span>.
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Learning Signal</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Module completion is <span className="font-semibold text-foreground">{formatPercent(summary.moduleCompletion)}</span>.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Coaching Sessions"
            icon={MessageSquare}
            right={<div className="text-sm text-muted-foreground">{coaching.length} total</div>}
          >
            <div className="space-y-3">
              {coaching.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  No coaching sessions yet.
                </div>
              ) : (
                coaching.map((item) => (
                  <div key={item.id} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold capitalize">
                        {item.status || "pending"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {item.topic || item.title || "Coaching request"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Achievements" icon={Award}>
            <div className="space-y-3">
              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">First Milestone</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {summary.currentAmount >= 10000
                    ? "Reached ₱10,000 savings milestone."
                    : "Working toward first ₱10,000 savings milestone."}
                </p>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Program Completion</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Modules {summary.completedModules}/{modules.length} • Tasks {summary.submittedTasks}/{tasks.length}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Admin Notes" icon={FileText}>
            <div className="space-y-3">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a private coaching note..."
                className="min-h-[110px]"
              />

              <Button onClick={saveAdminNote} disabled={savingNote || !noteText.trim()} className="w-full">
                {savingNote ? "Saving..." : "Save Note"}
              </Button>

              <div className="space-y-3 pt-2">
                {adminNotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    No private notes yet.
                  </div>
                ) : (
                  adminNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl border p-4">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(note.created_at)}
                      </div>
                      <div className="mt-2 text-sm">{note.note}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Privacy Boundaries" icon={Shield}>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>• Admin can view savings progress and emergency fund status.</div>
              <div>• Admin can view modules, tasks, and coaching activity.</div>
              <div>• Raw expense logs and exact spending history stay private.</div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}