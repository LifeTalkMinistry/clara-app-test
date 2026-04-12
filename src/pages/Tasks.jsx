import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Circle,
  ListChecks,
  Zap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ChallengeModal from "../components/ChallengeModal";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";

function StatusBadge({ sub }) {
  if (!sub) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
        Not Started
      </span>
    );
  }

  const map = {
    pending: "bg-secondary/20 text-secondary",
    submitted: "bg-secondary/20 text-secondary",
    reviewed: "bg-blue-500/10 text-blue-400",
    approved: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
    needs_revision: "bg-yellow-500/10 text-yellow-400",
  };

  const labels = {
    pending: "Pending",
    submitted: "Submitted",
    reviewed: "Reviewed",
    approved: "Approved ✓",
    rejected: "Rejected",
    needs_revision: "Needs Revision",
  };

  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full font-semibold",
        map[sub.status] || "bg-secondary/20 text-secondary"
      )}
    >
      {labels[sub.status] || "Submitted"}
    </span>
  );
}

const sortTasks = (items = []) => {
  return [...items].sort((a, b) => {
    const weekDiff = Number(a.week || 0) - Number(b.week || 0);
    if (weekDiff !== 0) return weekDiff;

    const dayDiff = Number(a.day || 0) - Number(b.day || 0);
    if (dayDiff !== 0) return dayDiff;

    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
};

const normalizeTask = (task = {}) => {
  const week = Number(task.week ?? task.week_number ?? 1);
  const day = Number(task.day ?? task.day_number ?? 1);
  const sortOrder = Number(task.sort_order ?? 0);

  const isActive =
    typeof task.is_active === "boolean"
      ? task.is_active
      : task.status === "inactive"
        ? false
        : true;

  return {
    ...task,
    week,
    day,
    sort_order: sortOrder,
    week_number: week,
    day_number: day,
    is_active: isActive,

    difficulty_mode_enabled: !!task.difficulty_mode_enabled,

    main_action_instruction:
      task.main_action_instruction || task.main_instruction || task.description || "",
    main_why_it_matters: task.main_why_it_matters || task.why_it_matters || "",
    main_optional_guidance: task.main_optional_guidance || task.optional_guidance || "",
    main_points: Number(task.main_points ?? task.points ?? 10),

    easy_action_instruction: task.easy_action_instruction || "",
    easy_why_it_matters: task.easy_why_it_matters || "",
    easy_optional_guidance: task.easy_optional_guidance || "",
    easy_points: Number(task.easy_points ?? 5),

    medium_action_instruction: task.medium_action_instruction || "",
    medium_why_it_matters: task.medium_why_it_matters || "",
    medium_optional_guidance: task.medium_optional_guidance || "",
    medium_points: Number(task.medium_points ?? 10),

    hard_action_instruction: task.hard_action_instruction || "",
    hard_why_it_matters: task.hard_why_it_matters || "",
    hard_optional_guidance: task.hard_optional_guidance || "",
    hard_points: Number(task.hard_points ?? 20),

    proof_required: task.proof_required || "none",
    require_detailed_answer: !!task.require_detailed_answer,
    interview_candidate_task: !!task.interview_candidate_task,
  };
};

export default function Tasks() {
  const { user, isPaid } = useUserRole();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [tasksTable, setTasksTable] = useState(null);

  const resolveTasksTable = async () => {
    if (tasksTable) return tasksTable;

    const challengeCheck = await supabase.from("challenge_tasks").select("id").limit(1);

    if (!challengeCheck.error) {
      setTasksTable("challenge_tasks");
      return "challenge_tasks";
    }

    const tasksCheck = await supabase.from("tasks").select("id").limit(1);

    if (!tasksCheck.error) {
      setTasksTable("tasks");
      return "tasks";
    }

    throw new Error("Could not find challenge_tasks or tasks table.");
  };

  const loadData = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      const table = await resolveTasksTable();

      const tasksRes = await supabase
        .from(table)
        .select("*")
        .or("is_active.eq.true,status.eq.active")
        .order("week", { ascending: true })
        .order("day", { ascending: true })
        .order("sort_order", { ascending: true });

      if (tasksRes.error) throw tasksRes.error;

      const subsRes = await supabase
        .from("task_submissions")
        .select("*")
        .eq("created_by", user.email)
        .order("created_at", { ascending: false });

      if (subsRes.error) throw subsRes.error;

      const normalizedTasks = Array.isArray(tasksRes.data)
        ? sortTasks(tasksRes.data.map(normalizeTask))
        : [];

      setTasks(normalizedTasks);
      setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
    } catch (err) {
      console.error("Failed loading tasks:", err);
      setTasks([]);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.email]);

  const getSubmission = (taskId) => submissions.find((s) => s.task_id === taskId);

  const handleSubmitted = async () => {
    setSelected(null);
    await loadData();
  };

  const groupedTasks = useMemo(() => {
    const groups = {};

    for (const task of tasks) {
      const key = `Week ${task.week}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }

    return groups;
  }, [tasks]);

  if (!isPaid) {
    return (
      <div
        className="p-4 md:p-6 max-w-4xl mx-auto cursor-pointer"
        onClick={() => navigate("/enroll")}
      >
        <EmptyState
          icon={ListChecks}
          title="Tasks are PRO 🔒"
          description="Tap to upgrade and unlock challenge tasks."
        />
      </div>
    );
  }

  if (loading) {
    return <div className="h-64 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-10">
      <PageHeader
        title="Daily Challenge Tasks"
        subtitle={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="No active tasks are available right now."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([weekLabel, weekTasks]) => (
            <div key={weekLabel} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">{weekLabel}</h2>
                <span className="text-xs text-muted-foreground">
                  {weekTasks.length} task{weekTasks.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {weekTasks.map((task) => {
                  const sub = getSubmission(task.id);
                  const isExpanded = !!expanded[task.id];

                  const status = sub?.status || null;
                  const isApproved = status === "approved";
                  const isNeedsRevision = status === "needs_revision";
                  const isPending =
                    status === "submitted" || status === "pending" || status === "reviewed";
                  const hasSubmission = !!sub;
                  const done = hasSubmission;

                  const actionLabel = !sub
                    ? "Start"
                    : isNeedsRevision
                      ? "Resubmit"
                      : isPending
                        ? "Under Review"
                        : isApproved
                          ? "Completed"
                          : status === "rejected"
                            ? "View"
                            : "Open";

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-2xl p-4 border transition-all",
                        done ? "bg-muted border-border" : "bg-card border-border"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            isApproved
                              ? "text-primary"
                              : isNeedsRevision
                                ? "text-yellow-400"
                                : done
                                  ? "text-primary"
                                  : "text-muted-foreground"
                          )}
                        >
                          {isApproved ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : isNeedsRevision ? (
                            <RotateCcw className="w-5 h-5" />
                          ) : done ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm">{task.title || "Untitled Task"}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Week {task.week} • Day {task.day}
                              </p>
                            </div>
                            <StatusBadge sub={sub} />
                          </div>

                          <p className="text-xs text-muted-foreground mt-2">
                            {task.main_action_instruction || "Complete this task"}
                          </p>

                          {!!task.main_why_it_matters && (
                            <p className="text-[11px] text-muted-foreground mt-2">
                              <span className="font-medium text-foreground/80">Why it matters:</span>{" "}
                              {task.main_why_it_matters}
                            </p>
                          )}

                          {!!task.main_optional_guidance && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              <span className="font-medium text-foreground/80">Guidance:</span>{" "}
                              {task.main_optional_guidance}
                            </p>
                          )}

                          {hasSubmission && sub && (
                            <div className="mt-3 space-y-2">
                              <button
                                onClick={() =>
                                  setExpanded((prev) => ({
                                    ...prev,
                                    [task.id]: !prev[task.id],
                                  }))
                                }
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    Hide submission
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    View submission
                                  </>
                                )}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-3 bg-background/60 rounded-xl text-xs border border-border space-y-2">
                                  <div>
                                    <span className="font-medium">Status:</span>{" "}
                                    {String(sub.status || "submitted").replaceAll("_", " ")}
                                  </div>

                                  {sub.content || sub.answer || sub.reflection ? (
                                    <div>
                                      <span className="font-medium">Your submission:</span>
                                      <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
                                        {sub.content || sub.answer || sub.reflection}
                                      </div>
                                    </div>
                                  ) : null}

                                  {sub.file_url || sub.proof_url || sub.image_url ? (
                                    <div>
                                      <span className="font-medium">Uploaded proof:</span>
                                      <div className="mt-2">
                                        <img
                                          src={sub.file_url || sub.proof_url || sub.image_url}
                                          alt="submission proof"
                                          className="max-h-52 rounded-lg border border-border object-contain bg-black/10"
                                        />
                                      </div>
                                    </div>
                                  ) : null}

                                  {sub.admin_notes ? (
                                    <div>
                                      <span className="font-medium">Coach feedback:</span>
                                      <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
                                        {sub.admin_notes}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!sub && (
                          <Button size="sm" onClick={() => setSelected(task)}>
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            Start
                          </Button>
                        )}

                        {isNeedsRevision && (
                          <Button size="sm" onClick={() => setSelected(task)}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Resubmit
                          </Button>
                        )}

                        {isPending && (
                          <Button size="sm" variant="outline" disabled>
                            <Clock3 className="w-3.5 h-3.5 mr-1" />
                            {actionLabel}
                          </Button>
                        )}

                        {isApproved && (
                          <Button size="sm" variant="outline" disabled>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            {actionLabel}
                          </Button>
                        )}

                        {status === "rejected" && (
                          <Button size="sm" variant="outline" onClick={() => setSelected(task)}>
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            {actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ChallengeModal
        task={selected}
        onClose={() => setSelected(null)}
        onSubmitted={handleSubmitted}
        user={user}
        existingSubmission={selected ? getSubmission(selected.id) : null}
      />
    </div>
  );
}