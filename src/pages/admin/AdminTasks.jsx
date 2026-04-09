import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
  Power,
  PowerOff,
  RefreshCw,
  FileText,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import TaskFormModal, { TASK_BLANK } from "../../components/TaskFormModal";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".avif"];

function isImageUrl(url = "") {
  const lower = String(url).toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext)) || lower.includes("image/");
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [subDialog, setSubDialog] = useState(null);

  const [form, setForm] = useState(TASK_BLANK);
  const [editId, setEditId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [toggleLoadingMap, setToggleLoadingMap] = useState({});
  const [reviewLoading, setReviewLoading] = useState(false);

  const [tasksTable, setTasksTable] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setReviewNotes(subDialog?.admin_notes || "");
  }, [subDialog]);

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

  const toTaskPayload = (data = {}) => {
    const normalized = normalizeTask(data);
    const points = normalized.difficulty_mode_enabled
      ? Number(normalized.hard_points || 0)
      : Number(normalized.main_points || 0);

    return {
      title: normalized.title?.trim() || "",
      week: Number(normalized.week || 1),
      day: Number(normalized.day || 1),
      sort_order: Number(normalized.sort_order || 0),

      is_active: !!normalized.is_active,
      status: normalized.is_active ? "active" : "inactive",

      difficulty_mode_enabled: !!normalized.difficulty_mode_enabled,

      main_action_instruction: normalized.main_action_instruction || "",
      main_instruction: normalized.main_action_instruction || "",
      description: normalized.main_action_instruction || "",

      main_why_it_matters: normalized.main_why_it_matters || "",
      why_it_matters: normalized.main_why_it_matters || "",

      main_optional_guidance: normalized.main_optional_guidance || "",
      optional_guidance: normalized.main_optional_guidance || "",

      main_points: Number(normalized.main_points || 0),

      easy_action_instruction: normalized.easy_action_instruction || "",
      easy_why_it_matters: normalized.easy_why_it_matters || "",
      easy_optional_guidance: normalized.easy_optional_guidance || "",
      easy_points: Number(normalized.easy_points || 0),

      medium_action_instruction: normalized.medium_action_instruction || "",
      medium_why_it_matters: normalized.medium_why_it_matters || "",
      medium_optional_guidance: normalized.medium_optional_guidance || "",
      medium_points: Number(normalized.medium_points || 0),

      hard_action_instruction: normalized.hard_action_instruction || "",
      hard_why_it_matters: normalized.hard_why_it_matters || "",
      hard_optional_guidance: normalized.hard_optional_guidance || "",
      hard_points: Number(normalized.hard_points || 0),

      proof_required: normalized.proof_required || "none",
      require_detailed_answer: !!normalized.require_detailed_answer,
      interview_candidate_task: !!normalized.interview_candidate_task,

      points,
    };
  };

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

    throw new Error(
      "Could not find task table. Make sure challenge_tasks or tasks exists in Supabase."
    );
  };

  const loadData = async (soft = false) => {
    try {
      if (soft) setRefreshing(true);
      else setLoading(true);

      const table = await resolveTasksTable();

      const tasksRes = await supabase
        .from(table)
        .select("*")
        .order("week", { ascending: true })
        .order("day", { ascending: true })
        .order("sort_order", { ascending: true });

      if (tasksRes.error) throw tasksRes.error;

      let subsData = [];
      const subsRes = await supabase
        .from("task_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (!subsRes.error) {
        subsData = Array.isArray(subsRes.data) ? subsRes.data : [];
      }

      const normalizedTasks = Array.isArray(tasksRes.data)
        ? sortTasks(tasksRes.data.map(normalizeTask))
        : [];

      setTasks(normalizedTasks);
      setSubmissions(subsData);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load admin tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setForm(TASK_BLANK);
    setEditId(null);
    setOpen(false);
  };

  const handleSave = async (data, duplicate = false) => {
    try {
      const table = await resolveTasksTable();
      const payload = toTaskPayload(data);

      if (editId && !duplicate) {
        const { data: updated, error } = await supabase
          .from(table)
          .update(payload)
          .eq("id", editId)
          .select()
          .single();

        if (error) throw error;

        setTasks((prev) =>
          sortTasks(prev.map((t) => (t.id === editId ? normalizeTask(updated) : t)))
        );
      } else {
        const { data: created, error } = await supabase
          .from(table)
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setTasks((prev) => sortTasks([...prev, normalizeTask(created)]));
      }

      resetForm();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save task.");
    }
  };

  const handleEdit = (task) => {
    setForm({
      ...TASK_BLANK,
      ...normalizeTask(task),
    });
    setEditId(task.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;

    try {
      const table = await resolveTasksTable();
      const { error } = await supabase.from(table).delete().eq("id", id);

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete task.");
    }
  };

  const handleToggleTask = async (task) => {
    const currentIsActive =
      typeof task?.is_active === "boolean"
        ? task.is_active
        : true;

    const nextIsActive = !currentIsActive;

    try {
      const table = await resolveTasksTable();
      setToggleLoadingMap((prev) => ({ ...prev, [task.id]: true }));

      const { data: updated, error } = await supabase
        .from(table)
        .update({
          is_active: nextIsActive,
          status: nextIsActive ? "active" : "inactive",
        })
        .eq("id", task.id)
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) =>
        sortTasks(prev.map((t) => (t.id === task.id ? normalizeTask(updated) : t)))
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update task status.");
    } finally {
      setToggleLoadingMap((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  const updateSubmission = async (id, data) => {
    const { data: updated, error } = await supabase
      .from("task_submissions")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const handleSubmissionReview = async (sub, status) => {
    try {
      setReviewLoading(true);

      const task = tasks.find((t) => t.id === sub.task_id);
      const approvedPoints = Number(
        sub?.points_earned || task?.points || task?.main_points || 0
      );

      await updateSubmission(sub.id, {
        status,
        admin_notes: reviewNotes?.trim() || null,
        points_earned: status === "approved" ? approvedPoints : 0,
      });

      setSubDialog(null);
      setReviewNotes("");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to review submission.");
    } finally {
      setReviewLoading(false);
    }
  };

  const stats = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.is_active).length;
    const inactiveTasks = tasks.length - activeTasks;
    const pendingSubs = submissions.filter(
      (s) => !s.status || s.status === "pending" || s.status === "submitted"
    ).length;

    return {
      activeTasks,
      inactiveTasks,
      pendingSubs,
    };
  }, [tasks, submissions]);

  const selectedFileUrl =
    subDialog?.file_url || subDialog?.proof_url || subDialog?.image_url || "";

  if (loading) {
    return (
      <div className="flex justify-center h-32 items-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TaskFormModal
        open={open}
        onClose={resetForm}
        editId={editId}
        initialForm={form}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            Active {stats.activeTasks}
          </Badge>
          <Badge className="border border-red-500/30 bg-red-500/15 text-red-300">
            Inactive {stats.inactiveTasks}
          </Badge>
          <Badge variant="outline">Pending Reviews {stats.pendingSubs}</Badge>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setForm({
                ...TASK_BLANK,
                is_active: true,
                week: 1,
                day: 1,
                sort_order: 0,
              });
              setEditId(null);
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="subs">Submissions ({submissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No tasks found.
              </div>
            ) : (
              tasks.map((t) => {
                const isActive = typeof t?.is_active === "boolean" ? t.is_active : true;
                const weekValue = t.week || "—";
                const dayValue = t.day || "—";
                const toggleBusy = !!toggleLoadingMap[t.id];

                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{t.title || "Untitled Task"}</p>

                        <Badge
                          className={
                            isActive
                              ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                              : "border border-red-500/30 bg-red-500/15 text-red-300"
                          }
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        Week {weekValue} • Day {dayValue}
                      </div>

                      {t.main_action_instruction || t.main_instruction || t.description ? (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {t.main_action_instruction || t.main_instruction || t.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={isActive ? "destructive" : "outline"}
                        onClick={() => handleToggleTask(t)}
                        disabled={toggleBusy}
                      >
                        {toggleBusy ? (
                          "Updating..."
                        ) : isActive ? (
                          <>
                            <PowerOff className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => handleEdit(t)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="subs">
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                No submissions yet.
              </div>
            ) : (
              submissions.map((s) => {
                const relatedTask = tasks.find((t) => t.id === s.task_id);
                const relatedTaskActive =
                  typeof relatedTask?.is_active === "boolean"
                    ? relatedTask.is_active
                    : true;

                return (
                  <div
                    key={s.id}
                    className="p-4 border rounded-2xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">
                          {s.student_name || s.created_by || "Unknown Student"}
                        </p>

                        {s.status ? (
                          <Badge variant="outline" className="capitalize">
                            {String(s.status).replaceAll("_", " ")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}

                        {!relatedTaskActive ? (
                          <Badge className="border border-red-500/30 bg-red-500/15 text-red-300">
                            Task Inactive
                          </Badge>
                        ) : null}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        {relatedTask?.title || "Unknown Task"}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {s.content || s.answer || s.reflection || "No content"}
                      </p>
                    </div>

                    <Button size="sm" onClick={() => setSubDialog(s)}>
                      <Eye className="w-3 h-3 mr-1" /> Review
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <Dialog
            open={!!subDialog}
            onOpenChange={(next) => {
              if (!next) {
                setSubDialog(null);
                setReviewNotes("");
              }
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Submission</DialogTitle>
              </DialogHeader>

              {subDialog && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground mb-1">Student</div>
                    <div className="text-sm font-medium">
                      {subDialog.student_name || subDialog.created_by || "Unknown Student"}
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <div className="text-sm font-medium capitalize">
                      {String(subDialog.status || "pending").replaceAll("_", " ")}
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground mb-1">Submission</div>
                    <p className="text-sm whitespace-pre-wrap">
                      {subDialog.content || subDialog.answer || subDialog.reflection || "No content"}
                    </p>
                  </div>

                  {selectedFileUrl ? (
                    <div className="rounded-xl border p-3 space-y-3">
                      <div className="text-xs text-muted-foreground">Uploaded Proof</div>

                      {isImageUrl(selectedFileUrl) ? (
                        <img
                          src={selectedFileUrl}
                          alt="submission proof"
                          className="w-full max-h-[420px] rounded-xl border object-contain bg-black/5"
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          File preview not available. Open the file below.
                        </div>
                      )}

                      <a href={selectedFileUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open File
                        </Button>
                      </a>
                    </div>
                  ) : null}

                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Feedback"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleSubmissionReview(subDialog, "approved")}
                      disabled={reviewLoading}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {reviewLoading ? "Saving..." : "Approve"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleSubmissionReview(subDialog, "needs_revision")}
                      disabled={reviewLoading}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {reviewLoading ? "Saving..." : "Revise"}
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => handleSubmissionReview(subDialog, "rejected")}
                      disabled={reviewLoading}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {reviewLoading ? "Saving..." : "Reject"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}